import { Module } from '@nestjs/common';
// import { ChatController } from './chat.controller';
import { ChatService } from './services/chat.service';
import { ChatRepository } from './repositories/chat.repository';

@Module({
  imports: [],
  // controllers: [ChatController],
  providers: [ChatService, ChatRepository],
})
export class ChatModule {}
