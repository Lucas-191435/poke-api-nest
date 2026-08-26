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
import { ChatRoomDto, GetMessagesResponseDto } from './dto/chatResponse.dto';

@ApiTags('chat')
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('messages/:chatRoomId')
    @ApiOperation({ summary: 'Lista as mensagens de uma sala de chat' })
    @ApiQuery({ name: 'cursor', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Mensagens retornadas com sucesso', type: GetMessagesResponseDto })
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
    @ApiOperation({ summary: 'Lista as salas de chat que o usuário participa' })
    @ApiResponse({ status: 200, description: 'Salas retornadas com sucesso', type: ChatRoomDto, isArray: true })
    async getChatRoomOfUser(
        @GetUser('id') userId: string,
    ) {
        return this.chatService.getChatRoomOfUser(
            userId,
        );
    }
}