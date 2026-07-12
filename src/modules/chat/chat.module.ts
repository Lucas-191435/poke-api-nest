import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './services/chat.service';
import { ChatRepository } from './repositories/chat.repository';
import { ChatGateway } from './gateways/chat.gateway';
import authConfig from 'src/config/authConfig';

@Module({
  imports: [
    JwtModule.register({
      secret: authConfig.secret,
      signOptions: {
        expiresIn: authConfig.expiresIn,
        algorithm: authConfig.algorithm,
      },
    }),
  ],
  providers: [ChatGateway, ChatService, ChatRepository],
})
export class ChatModule {}

