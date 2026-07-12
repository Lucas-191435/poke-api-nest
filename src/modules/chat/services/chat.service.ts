import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable()
export class ChatService {
    constructor(
        private readonly chatRepository: ChatRepository,
    ) { }


    async validateToken(token: string) {
        return this.chatRepository.validate(token);
    }

}