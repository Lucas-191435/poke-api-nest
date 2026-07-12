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

        const user = await this.prisma.user.findFirst({
            where: { id: payload.sub },
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

    getMessages(chatRoomId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return this.prisma.chatMessage.findMany({
            where: { chatRoomId, deletedAt: null },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });
    }
}