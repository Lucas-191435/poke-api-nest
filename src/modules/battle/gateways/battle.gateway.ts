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
import { SelectLeadDto } from "../dto/select-lead.dto";

// Socket.io data é tipado como `any` por padrão; usamos Omit para sobrescrever
type AuthenticatedSocket = Omit<Socket, 'data'> & {
    data: { user: User; battleId?: string };
};

@WebSocketGateway({
    namespace: "battle",
    cors: {
        origin: "*",
    },
})
export class BattleGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    // Estado efêmero de "pronto" antes do início da partida (SELECTING_LEAD).
    // Não persiste em banco porque BattleParticipant não tem esse campo hoje;
    // se o servidor reiniciar no meio da seleção, os dois precisam clicar "ready" de novo.
    private readonly readyParticipants = new Map<string, Set<string>>();

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
    async joinBattle(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: { battleId: string },
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado.');

        const battle = await this.battleService.getBattleSnapshot({
            battleId: dto.battleId,
            userId: user.id,
        });

        client.data.battleId = dto.battleId;
        await client.join(this.roomName(dto.battleId));

        return battle;
    }

    @SubscribeMessage("select-lead")
    async selectLead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: SelectLeadDto,
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado.');
        const battleId = this.getBattleIdOrThrow(client);

        const participant = await this.battleService.selectLead({
            battleId,
            userId: user.id,
            battlePokemonId: dto.battlePokemonId,
        });

        this.server.to(this.roomName(battleId)).emit('battle-updated', {
            participantId: participant.id,
            activeSlot: participant.activeSlot,
        });

        return participant;
    }

    @SubscribeMessage("ready")
    async ready(
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado.');
        const battleId = this.getBattleIdOrThrow(client);

        const participant = await this.battleService.getParticipantOrThrow(battleId, user.id);

        const ready = this.readyParticipants.get(battleId) ?? new Set<string>();
        ready.add(participant.id);
        this.readyParticipants.set(battleId, ready);

        this.server.to(this.roomName(battleId)).emit('battle-updated', {
            participantId: participant.id,
            ready: true,
        });

        if (ready.size >= 2) {
            this.readyParticipants.delete(battleId);
            const battle = await this.battleService.startBattle(battleId);
            this.server.to(this.roomName(battleId)).emit('battle-updated', {
                status: battle.status,
                turnNumber: battle.turnNumber,
            });
        }

        return {};
    }

    @SubscribeMessage("submit-action")
    async submitAction(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: SubmitActionDto,
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado.');
        const battleId = this.getBattleIdOrThrow(client);
        const room = this.roomName(battleId);

        const result = await this.battleService.submitAction({
            battleId,
            userId: user.id,
            action: { ...dto },
        });

        if (result.status === 'waiting-for-opponent') {
            this.server.to(room).emit('opponent-action-submitted', { userId: user.id });
            return { received: true };
        }

        if (result.status === 'forced-switch-resolved') {
            this.server.to(room).emit('battle-updated', { userId: user.id, forcedSwitchResolved: true });
            return { received: true };
        }

        this.server.to(room).emit('turn-resolved', {
            turnNumber: result.turnNumber,
            log: result.log,
            forcedSwitchParticipantIds: result.forcedSwitchParticipantIds,
        });

        if (result.finished) {
            this.server.to(room).emit('battle-ended', {
                winnerId: result.winnerUserId,
                reason: 'faint',
            });
        } else {
            for (const participantId of result.forcedSwitchParticipantIds) {
                this.server.to(room).emit('forced-switch-required', { participantId });
            }
        }

        return { received: true };
    }

    handleDisconnect() { }

    private getBattleIdOrThrow(client: AuthenticatedSocket): string {
        if (!client.data.battleId) {
            throw new WsException('Entre na batalha com "join-battle" antes.');
        }
        return client.data.battleId;
    }

    private roomName(battleId: string) {
        return `battle:${battleId}`;
    }
}
