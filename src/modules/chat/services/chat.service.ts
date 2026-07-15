import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable()
export class ChatService {
    constructor(
        private readonly chatRepository: ChatRepository,
    ) { }

    async validateToken(token: string) {
        return this.chatRepository.validateToken(token);
    }

    async joinGlobalRoom(userId: string) {
        const room = await this.chatRepository.getOrCreateGlobalRoom();
        await this.chatRepository.addUserToRoom(userId, room.id);
        return room;
    }

    async joinRoom(userId: string, chatRoomId: string) {
        const room = await this.chatRepository.getChatRoom(chatRoomId);
        if (!room) throw new NotFoundException('Sala não encontrada.');
        await this.chatRepository.addUserToRoom(userId, chatRoomId);
        return room;
    }

    async sendMessage(userId: string, chatRoomId: string, text: string) {
        const inRoom = await this.chatRepository.isUserInRoom(userId, chatRoomId);
        if (!inRoom) throw new ForbiddenException('Você não está nessa sala de chat.');
        return this.chatRepository.createMessage(userId, chatRoomId, text);
    }

    async getMessages(
        userId: string,
        chatRoomId: string,
        cursor?: string,
        limit = 50,
    ) {
        const inRoom = await this.chatRepository.isUserInRoom(
            userId,
            chatRoomId,
        );

        if (!inRoom) {
            throw new ForbiddenException(
                'Você não está nessa sala de chat.',
            );
        }

        return this.chatRepository.getMessages(
            chatRoomId,
            cursor,
            limit,
        );
    }

    async getChatRoomOfUser(userId: string) {
        return this.chatRepository.getChatRoomOfUser(userId);
    }
}