import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "src/common/auth/jwt.strategy";
import { PrismaService } from "src/common/database/prisma.service";
import { GLOBAL_CHAT_ROOM_NAME } from "../chat.constants";

@Injectable()
export class ChatRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateToken(token: string) {
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException('Token inválido ou expirado.');
        }

        // console.log('ChatRepository.validateToken called with payload:', payload);
        const user = await this.prisma.user.findFirst({
            where: { id: payload?.id },
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado.');
        }

        return user;
    }

    async getOrCreateGlobalRoom() {
        let room = await this.prisma.chatRoom.findFirst({
            where: { name: GLOBAL_CHAT_ROOM_NAME },
        });

        if (!room) {
            room = await this.prisma.chatRoom.create({
                data: { name: GLOBAL_CHAT_ROOM_NAME },
            });
        }

        return room;
    }

    getChatRoom(chatRoomId: string) {
        return this.prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
        });
    }

    addUserToRoom(userId: string, chatRoomId: string) {
        return this.prisma.chatRoomUser.upsert({
            where: { userId_chatRoomId: { userId, chatRoomId } },
            create: { userId, chatRoomId },
            update: {},
        });
    }

    async isUserInRoom(userId: string, chatRoomId: string): Promise<boolean> {
        const membership = await this.prisma.chatRoomUser.findUnique({
            where: { userId_chatRoomId: { userId, chatRoomId } },
        });
        return !!membership;
    }

    createMessage(userId: string, chatRoomId: string, text: string) {
        return this.prisma.chatMessage.create({
            data: { userId, chatRoomId, text },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });
    }

    async getMessages(
        chatRoomId: string,
        cursor?: string,
        limit = 25,
    ) {
        const messages = await this.prisma.chatMessage.findMany({
            where: {
                chatRoomId,
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
        });

        const nextCursor =
            messages.length === limit
                ? messages[messages.length - 1].id
                : null;

        return {
            messages: messages,
            nextCursor,
            hasMore: !!nextCursor,
        };
    }


    async getChatRoomOfUser(userId: string) {
        const chatRooms = await this.prisma.chatRoomUser.findMany({
            where: {
                userId,
            },
            include: {
                chatRoom: true,
            },
        });

        // console.log(chatRooms);

        return chatRooms.map((cru) => cru.chatRoom);
    }

    async deleteMessage(userId: string, chatRoomId: string, messageId: string) {
        const isOfUser = await this.prisma.chatMessage.findFirst({
            where: { id: messageId, userId, chatRoomId },
        });

        if (!isOfUser) {
            throw new UnauthorizedException('Você não tem permissão para deletar esta mensagem.');
        }
        return this.prisma.chatMessage.delete({
            where: { id: messageId, userId, chatRoomId },
        });
    }
}