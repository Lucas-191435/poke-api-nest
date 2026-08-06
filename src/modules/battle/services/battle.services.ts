import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { BattleRepository, ParticipantForResolution, TeamName } from '../repositories/battle.repository';
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '../battle.constants';
import { BattleTurnState } from 'src/generated/prisma/enums';
import {
    BattleEngineService,
    EngineAction,
    EngineParticipant,
    ResolveTurnResult,
} from './battle-engine.service';
import { parsePokemonTypes } from './type-chart';
import { parseStatChanges, StatStages } from './stat-stage-moves';

export type SubmitActionInput = {
    type: 'MOVE' | 'SWITCH' | 'ITEM' | 'FORFEIT';
    moveId?: string;
    targetPokemonId?: string;
    itemId?: string;
};

export type SubmitActionResult =
    | { status: 'waiting-for-opponent' }
    | { status: 'forced-switch-resolved' }
    | (ResolveTurnResult & { status: 'turn-resolved'; turnNumber: number; winnerUserId: string | null });

@Injectable()
export class BattleService {
    private readonly logger = new Logger(BattleService.name);

    constructor(
        private readonly battleRepository: BattleRepository,
        private readonly battleEngineService: BattleEngineService,
    ) { }

    async validateToken(token: string) {
        return this.battleRepository.validateToken(token);
    }

    async createBattle({ userId, teamName }: { userId: string; teamName: TeamName }) {
        this.logger.log(`Criando batalha para userId=${userId} teamName=${teamName}`);
        const team = await this.battleRepository.getTeamForBattle({ userId, teamName });
        this.assertValidTeamSize(team.length);

        const battle = await this.battleRepository.createBattle({
            playerAId: userId,
            teamName,
            team,
        });

        this.logger.log(`Batalha criada battleId=${battle.id} playerAId=${userId}`);
        return { id: battle.id };
    }

    async joinBattle({
        battleId,
        userId,
        teamName,
    }: {
        battleId: string;
        userId: string;
        teamName: TeamName;
    }) {
        this.logger.log(`userId=${userId} entrando na batalha battleId=${battleId} teamName=${teamName}`);
        const team = await this.battleRepository.getTeamForBattle({ userId, teamName });
        this.assertValidTeamSize(team.length);

        const battle = await this.battleRepository.joinBattle({
            battleId,
            userId,
            teamName,
            team,
        });

        this.logger.log(`userId=${userId} entrou na batalha battleId=${battle.id}`);
        return { id: battle.id };
    }

    async deleteAllBattles() {
        this.logger.warn('Apagando todas as batalhas do sistema.');
        const result = await this.battleRepository.deleteAllBattles();
        this.logger.warn(`Batalhas apagadas count=${result.count}`);
        return result;
    }

    async findBattleRooms({
        page,
        pageSize,
        search,
    }: {
        page?: number;
        pageSize?: number;
        search?: string;
    }) {
        return this.battleRepository.findBattleRooms({
            page: page ? parseInt(String(page)) : 1,
            pageSize: pageSize ? parseInt(String(pageSize)) : 10,
            search,
        });
    }

    async getBattleSnapshot({ battleId, userId }: { battleId: string; userId: string }) {
        const battle = await this.battleRepository.getBattleSnapshot(battleId);
        this.assertIsParticipant(battle, userId);
        return battle;
    }

    async getParticipantOrThrow(battleId: string, userId: string) {
        const participant = await this.battleRepository.findParticipantByUser(battleId, userId);
        if (!participant) {
            throw new ForbiddenException('Você não participa desta batalha.');
        }
        return participant;
    }

    async selectLead({
        battleId,
        userId,
        battlePokemonId,
    }: {
        battleId: string;
        userId: string;
        battlePokemonId: string;
    }) {
        const participant = await this.getParticipantOrThrow(battleId, userId);
        this.logger.log(
            `selectLead battleId=${battleId} userId=${userId} battlePokemonId=${battlePokemonId}`,
        );
        return this.battleRepository.selectLead({
            participantId: participant.id,
            battlePokemonId,
        });
    }

    async startBattle(battleId: string) {
        this.logger.log(`Iniciando batalha battleId=${battleId}`);
        return this.battleRepository.startBattle(battleId);
    }

    async submitAction({
        battleId,
        userId,
        action,
    }: {
        battleId: string;
        userId: string;
        action: SubmitActionInput;
    }): Promise<SubmitActionResult> {
        const participant = await this.getParticipantOrThrow(battleId, userId);

        this.logger.log(
            `submitAction battleId=${battleId} userId=${userId} type=${action.type} turnState=${participant.turnState}`,
        );

        if (participant.turnState === BattleTurnState.WAITING_FORCED_SWITCH) {
            if (action.type !== 'SWITCH' || !action.targetPokemonId) {
                throw new BadRequestException('Seu Pokémon desmaiou — escolha outro pra continuar.');
            }

            const battle = await this.battleRepository.getBattleSnapshot(battleId);
            await this.battleRepository.applyForcedSwitch({
                battleId,
                turnNumber: battle.turnNumber,
                participantId: participant.id,
                battlePokemonId: action.targetPokemonId,
            });

            this.logger.log(
                `Troca forçada resolvida battleId=${battleId} participantId=${participant.id} novoPokemon=${action.targetPokemonId}`,
            );

            return { status: 'forced-switch-resolved' };
        }

        if (participant.turnState !== BattleTurnState.WAITING_ACTION) {
            throw new BadRequestException('Não é possível enviar uma ação agora.');
        }

        if (action.type === 'FORFEIT') {
            this.logger.log(`participantId=${participant.id} desistiu da batalha battleId=${battleId}`);
            return this.resolveWithActions(battleId, {
                [participant.id]: { type: 'FORFEIT' },
            });
        }

        // Valida o formato antes de gravar — não suporta ITEM ainda (fase 3 do roadmap).
        this.toEngineAction(action);

        await this.battleRepository.savePendingAction(participant.id, action);

        return this.tryResolveTurn(battleId);
    }

    private async tryResolveTurn(battleId: string): Promise<SubmitActionResult> {
        const participants = await this.battleRepository.getParticipantsForResolution(battleId);
        const [p1, p2] = participants;

        if (!p1?.pendingAction || !p2?.pendingAction) {
            this.logger.log(`battleId=${battleId} aguardando ação do oponente`);
            return { status: 'waiting-for-opponent' };
        }

        return this.resolveWithActions(battleId, {
            [p1.id]: this.toEngineAction(p1.pendingAction as SubmitActionInput),
            [p2.id]: this.toEngineAction(p2.pendingAction as SubmitActionInput),
        });
    }

    private async resolveWithActions(
        battleId: string,
        actionsByParticipantId: Record<string, EngineAction>,
    ): Promise<SubmitActionResult> {
        const participants = await this.battleRepository.getParticipantsForResolution(battleId);
        if (participants.length !== 2) {
            throw new BadRequestException('Batalha precisa de dois participantes pra resolver o turno.');
        }
        const [p1, p2] = participants;

        const battle = await this.battleRepository.getBattleSnapshot(battleId);

        this.logger.log(`Resolvendo turno battleId=${battleId} turnNumber=${battle.turnNumber}`);

        const result = this.battleEngineService.resolveTurn({
            turnNumber: battle.turnNumber,
            participants: [this.toEngineParticipant(p1), this.toEngineParticipant(p2)],
            actions: [
                { participantId: p1.id, action: actionsByParticipantId[p1.id] ?? { type: 'FORFEIT' } },
                { participantId: p2.id, action: actionsByParticipantId[p2.id] ?? { type: 'FORFEIT' } },
            ],
        });

        await this.battleRepository.persistTurnResolution({
            battleId,
            turnNumber: battle.turnNumber,
            result,
            participantUserIds: { [p1.id]: p1.userId, [p2.id]: p2.userId },
        });

        const winnerUserId = result.winnerParticipantId
            ? ({ [p1.id]: p1.userId, [p2.id]: p2.userId }[result.winnerParticipantId] ?? null)
            : null;

        this.logger.log(
            `Turno resolvido battleId=${battleId} turnNumber=${battle.turnNumber} finished=${result.finished} winnerUserId=${winnerUserId ?? '-'}`,
        );

        return { ...result, status: 'turn-resolved', turnNumber: battle.turnNumber, winnerUserId };
    }

    private toEngineParticipant(participant: ParticipantForResolution): EngineParticipant {
        return {
            participantId: participant.id,
            activeSlot: participant.activeSlot,
            pokemons: participant.pokemons.map((pokemon) => ({
                battlePokemonId: pokemon.id,
                position: pokemon.position,
                types: parsePokemonTypes(pokemon.myPokemon.pokemon.types),
                maxHp: pokemon.maxHp,
                currentHp: pokemon.currentHp,
                atk: pokemon.atk,
                def: pokemon.def,
                spAtk: pokemon.spAtk,
                spDef: pokemon.spDef,
                speed: pokemon.speed,
                fainted: pokemon.fainted,
                statusCondition: pokemon.statusCondition,
                statusCounter: pokemon.statusCounter,
                statStages: this.parseStatStages(pokemon.statStages),
                moves: pokemon.moves.map((move) => ({
                    battlePokemonMoveId: move.id,
                    currentPp: move.currentPp,
                    move: {
                        id: move.move.id,
                        name: move.move.name,
                        power: move.move.power,
                        accuracy: move.move.accuracy,
                        priority: move.move.priority,
                        type: move.move.type,
                        damageClass:
                            move.move.damage_class === 'physical' ||
                                move.move.damage_class === 'special' ||
                                move.move.damage_class === 'status'
                                ? move.move.damage_class
                                : null,
                        critRate: move.move.crit_rate,
                        ailment: move.move.ailment,
                        ailmentChance: move.move.effect_chance,
                        target: move.move.target,
                        statChance: move.move.stat_chance,
                        statChanges: parseStatChanges(move.move.stat_changes),
                        healing: move.move.healing ?? 0,
                        drain: move.move.drain ?? 0,
                    },
                })),
            })),
        };
    }

    private parseStatStages(raw: unknown): StatStages {
        const empty: StatStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
        if (!raw || typeof raw !== 'object') return empty;

        const parsed = raw as Partial<Record<keyof StatStages, unknown>>;
        const result = { ...empty };
        for (const key of Object.keys(empty) as (keyof StatStages)[]) {
            const value = parsed[key];
            if (typeof value === 'number') result[key] = value;
        }
        return result;
    }

    private toEngineAction(raw: SubmitActionInput): EngineAction {
        if (raw.type === 'MOVE') {
            if (!raw.moveId) throw new BadRequestException('moveId é obrigatório pra uma ação de MOVE.');
            return { type: 'MOVE', moveId: raw.moveId };
        }
        if (raw.type === 'SWITCH') {
            if (!raw.targetPokemonId) throw new BadRequestException('targetPokemonId é obrigatório pra uma ação de SWITCH.');
            return { type: 'SWITCH', targetBattlePokemonId: raw.targetPokemonId };
        }
        if (raw.type === 'FORFEIT') {
            return { type: 'FORFEIT' };
        }
        throw new BadRequestException('Ações de ITEM ainda não são suportadas.');
    }

    private assertValidTeamSize(size: number) {
        if (size < MIN_TEAM_SIZE || size > MAX_TEAM_SIZE) {
            throw new BadRequestException(
                `O time deve ter entre ${MIN_TEAM_SIZE} e ${MAX_TEAM_SIZE} Pokémon.`,
            );
        }
    }

    private assertIsParticipant(
        battle: { playerAId: string; playerBId: string | null },
        userId: string,
    ) {
        const hasTwoParticipants = battle.playerBId !== null;
        const isParticipant = battle.playerAId === userId || battle.playerBId === userId;

        if (hasTwoParticipants && !isParticipant) {
            throw new ForbiddenException('Você não participa desta batalha.');
        }
    }
}
