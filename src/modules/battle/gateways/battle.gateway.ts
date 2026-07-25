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
import { BattleService } from "../services/battle.services";

import { User } from "src/generated/prisma/client";
import { SubmitActionDto } from "../dto/submit-action.dto";

// Socket.io data é tipado como `any` por padrão; usamos Omit para sobrescrever
type AuthenticatedSocket = Omit<Socket, 'data'> & { data: { user: User } };

@WebSocketGateway({
    namespace: "battle",
    cors: {
        origin: "*",
    },
})
export class BattleGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    constructor(private readonly battleService: BattleService) { }

    afterInit() { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token as string | undefined;
            if (!token) { client.disconnect(); return; }
            const user = await this.battleService.validateToken(token);
            (client.data as { user: User }).user = user;
        } catch {
            client.disconnect();
        }
    }

    @SubscribeMessage("join-battle")
        joinBattle(
            @ConnectedSocket() client: AuthenticatedSocket,
            @MessageBody() dto: {battleId: string},
        ) {
            const user = client.data.user;
            if (!user) throw new WsException('Não autenticado.');
    
    
            return {};
        }

    @SubscribeMessage("select-lead")
        selectLead(
            @ConnectedSocket() client: AuthenticatedSocket,
            @MessageBody() dto: {battlePokemonId : string},
        ) {
            const user = client.data.user;
            if (!user) throw new WsException('Não autenticado.');
    
    
            return {};
        }

    @SubscribeMessage("ready")
        ready(
            @ConnectedSocket() client: AuthenticatedSocket,
            @MessageBody() dto: {battlePokemonId : string},
        ) {
            const user = client.data.user;
            if (!user) throw new WsException('Não autenticado.');
    
    
            return {};
        }

    @SubscribeMessage("submit-action")
        submitAction(
            @ConnectedSocket() client: AuthenticatedSocket,
            @MessageBody() dto: SubmitActionDto,
        ) {
            const user = client.data.user;
            if (!user) throw new WsException('Não autenticado.');
            
    
            return {};
        }

    handleDisconnect() { }
}

