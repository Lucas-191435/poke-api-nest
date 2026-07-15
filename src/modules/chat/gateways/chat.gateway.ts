import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "../services/chat.service";
import { SendMessageDto } from "../dto/send-message.dto";
import { JoinRoomDto } from "../dto/join-room.dto";
import { GetMessagesDto } from "../dto/get-messages.dto";
import { User } from "src/generated/prisma/client";

// Socket.io data é tipado como `any` por padrão; usamos Omit para sobrescrever
type AuthenticatedSocket = Omit<Socket, 'data'> & { data: { user: User } };

@WebSocketGateway({
    namespace: "chat",
    cors: {
        origin: "*",
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    constructor(private readonly chatService: ChatService) { }

    afterInit() { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token as string | undefined;

            // console.log('ChatGateway.handleConnection called with token:', token);

            if (!token) {
                client.disconnect();
                return;
            }

            const user = await this.chatService.validateToken(token);
            (client.data as { user: User }).user = user;

            // Adiciona automaticamente ao chat global
            const globalRoom = await this.chatService.joinGlobalRoom(user.id);
            await client.join(globalRoom.id);
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect() { }

    @SubscribeMessage("join-room")
    async joinRoom(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: JoinRoomDto,
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado.');

        const room = await this.chatService.joinRoom(user.id, dto.chatRoomId);
        client.join(room.id);

        return { roomId: room.id, name: room.name };
    }

    @SubscribeMessage("send-message")
    async send(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: SendMessageDto,
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado.');

        console.log('ChatGateway.send called with:', { userId: user.id, roomId: dto.roomId, message: dto.message });
        const message = await this.chatService.sendMessage(user.id, dto.roomId, dto.message);

        // Emite para todos na sala (incluindo o remetente)
        this.server.to(dto.roomId).emit('new-message', message);

        return message;
    }

    // @SubscribeMessage("get-messages")
    // async getMessages(
    //     @ConnectedSocket() client: AuthenticatedSocket,
    //     @MessageBody() dto: GetMessagesDto,
    // ) {
    //     const user = client.data.user;
    //     if (!user) throw new WsException('Não autenticado.');

    //     return this.chatService.getMessages(user.id, dto.chatRoomId, dto.page, dto.limit);
    // }
}

