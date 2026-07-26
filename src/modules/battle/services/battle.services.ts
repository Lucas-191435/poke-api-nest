import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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
    constructor(
        private readonly battleRepository: BattleRepository,
        private readonly battleEngineService: BattleEngineService,
    ) { }

    async validateToken(token: string) {
        return this.battleRepository.validateToken(token);
    }

    async createBattle({ userId, teamName }: { userId: string; teamName: TeamName }) {
        const team = await this.battleRepository.getTeamForBattle({ userId, teamName });
        this.assertValidTeamSize(team.length);

        const battle = await this.battleRepository.createBattle({
            playerAId: userId,
            teamName,
            team,
        });

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
        const team = await this.battleRepository.getTeamForBattle({ userId, teamName });
        this.assertValidTeamSize(team.length);

        const battle = await this.battleRepository.joinBattle({
            battleId,
            userId,
            teamName,
            team,
        });

        return { id: battle.id };
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
        return this.battleRepository.selectLead({
            participantId: participant.id,
            battlePokemonId,
        });
    }

    async startBattle(battleId: string) {
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

            return { status: 'forced-switch-resolved' };
        }

        if (participant.turnState !== BattleTurnState.WAITING_ACTION) {
            throw new BadRequestException('Não é possível enviar uma ação agora.');
        }

        if (action.type === 'FORFEIT') {
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
                moves: pokemon.moves.map((move) => ({
                    battlePokemonMoveId: move.id,
                    currentPp: move.currentPp,
                    move: {
                        id: move.move.id,
                        power: move.move.power,
                        accuracy: move.move.accuracy,
                        priority: move.move.priority,
                        type: move.move.type,
                        damageClass:
                            move.move.damage_class === 'physical' || move.move.damage_class === 'special'
                                ? move.move.damage_class
                                : null,
                        critRate: move.move.crit_rate,
                    },
                })),
            })),
        };
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
        if (battle.playerAId !== userId && battle.playerBId !== userId) {
            throw new ForbiddenException('Você não participa desta batalha.');
        }
    }
}
