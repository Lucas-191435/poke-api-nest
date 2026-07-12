import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { SendMessageDto } from "../dto/send-message.dto";
import { ChatService } from "../services/chat.service";
import { Server, Socket } from "socket.io";
import { ConnectedSocket } from "@nestjs/websockets";

@WebSocketGateway({
    namespace: "chat",
    cors: {
        origin: "*",
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    constructor(
        private readonly chatService: ChatService,
    ) { }

    afterInit(server: Server) { }

    async handleConnection(client: Socket) {

        const token =
            client.handshake.auth.token;

        const user =
            await this.chatService.validateToken(token);

        client.data.user = user;

    }

    handleDisconnect(client: Socket) { }


    @SubscribeMessage("send-message")
    send(
        @ConnectedSocket() client: Socket,
        @MessageBody() dto: SendMessageDto
    ) {
        const user = client.data.user;
    }
}