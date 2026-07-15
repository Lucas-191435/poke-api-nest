import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './services/chat.service';
import { GetUser } from 'src/common/guard/getuser.decorator';

@ApiTags('chat')
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('messages/:chatRoomId')
    async getMessages(
        @GetUser('id') userId: string,
        @Param('chatRoomId') chatRoomId: string,
        @Query('cursor') cursor?: string,
        @Query('limit') limit = 50,
    ) {
        return this.chatService.getMessages(
            userId,
            chatRoomId,
            cursor,
            Number(limit),
        );
    }

    @Get('rooms')
    async getChatRoomOfUser(
        @GetUser('id') userId: string,
    ) {
        return this.chatService.getChatRoomOfUser(
            userId,
        );
    }
}