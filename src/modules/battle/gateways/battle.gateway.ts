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
import { Logger } from "@nestjs/common";
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
    private readonly logger = new Logger(BattleGateway.name);

    @WebSocketServer()
    server!: Server;

    // Estado efêmero de "pronto" antes do início da partida (SELECTING_LEAD).
    // Não persiste em banco porque BattleParticipant não tem esse campo hoje;
    // se o servidor reiniciar no meio da seleção, os dois precisam clicar "ready" de novo.
    private readonly readyParticipants = new Map<string, Set<string>>();

    constructor(private readonly battleService: BattleService) { }

    afterInit() {
        this.logger.log('Gateway de batalha inicializado');
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token as string | undefined;
            if (!token) {
                this.logger.warn(`Conexão recusada (sem token) clientId=${client.id}`);
                client.disconnect();
                return;
            }
            const user = await this.battleService.validateToken(token);
            (client.data as { user: User }).user = user;
            this.logger.log(`Cliente conectado clientId=${client.id} userId=${user.id}`);
        } catch (error) {
            this.logger.warn(`Falha na autenticação clientId=${client.id}: ${(error as Error).message}`);
            client.disconnect();
        }
    }

    @SubscribeMessage("join-battle")
    async joinBattle(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: { battleId: string },
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado, no join-battle.');

        const battle = await this.battleService.getBattleSnapshot({
            battleId: dto.battleId,
            userId: user.id,
        });

        client.data.battleId = dto.battleId;
        await client.join(this.roomName(dto.battleId));

        this.logger.log(`join-battle userId=${user.id} battleId=${dto.battleId} clientId=${client.id}`);

        return battle;
    }

    @SubscribeMessage("select-lead")
    async selectLead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: SelectLeadDto,
    ) {
        const user = client.data.user;
        if (!user) throw new WsException('Não autenticado no select-lead.');
        const battleId = this.getBattleIdOrThrow(client);

        const participant = await this.battleService.selectLead({
            battleId,
            userId: user.id,
            battlePokemonId: dto.battlePokemonId,
        });

        this.logger.log(
            `select-lead battleId=${battleId} userId=${user.id} battlePokemonId=${dto.battlePokemonId}`,
        );

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
        if (!user) throw new WsException('Não autenticado, no ready.');
        const battleId = this.getBattleIdOrThrow(client);

        const participant = await this.battleService.getParticipantOrThrow(battleId, user.id);

        const ready = this.readyParticipants.get(battleId) ?? new Set<string>();
        ready.add(participant.id);
        this.readyParticipants.set(battleId, ready);

        this.logger.log(
            `ready battleId=${battleId} userId=${user.id} participantId=${participant.id} readyCount=${ready.size}`,
        );

        this.server.to(this.roomName(battleId)).emit('battle-updated', {
            participantId: participant.id,
            ready: true,
        });

        // Bot nunca conecta via socket, então nunca manda "ready" de verdade — se o oponente é bot,
        // basta o humano estar pronto (ver docs/battle-bot-trainer-plan.md seção 5.1).
        const snapshot = await this.battleService.getBattleSnapshot({ battleId, userId: user.id });
        const opponentIsBot = snapshot.participants.some((p) => p.isBot);

        if (ready.size >= 2 || opponentIsBot) {
            this.readyParticipants.delete(battleId);
            const battle = await this.battleService.startBattle(battleId);
            this.logger.log(`battle-started battleId=${battleId} status=${battle.status}`);
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
        if (!user) throw new WsException('Não autenticado, no submit-action.');
        const battleId = this.getBattleIdOrThrow(client);
        const room = this.roomName(battleId);

        this.logger.log(`submit-action battleId=${battleId} userId=${user.id} type=${dto.type}`);

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

        this.logger.log(
            `turn-resolved battleId=${battleId} turnNumber=${result.turnNumber} finished=${result.finished}`,
        );

        this.server.to(room).emit('turn-resolved', {
            turnNumber: result.turnNumber,
            log: result.log,
            forcedSwitchParticipantIds: result.forcedSwitchParticipantIds,
        });

        if (result.finished) {
            this.logger.log(`battle-ended battleId=${battleId} winnerId=${result.winnerUserId ?? '-'}`);
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

    handleDisconnect(client: Socket) {
        this.logger.log(`Cliente desconectado clientId=${client.id}`);
    }

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
