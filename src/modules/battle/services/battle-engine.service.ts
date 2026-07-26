import { Injectable } from "@nestjs/common";
import { FIXED_LEVEL } from "../battle.constants";
import { describeEffectiveness, EffectivenessLabel, getTypeEffectiveness, PokemonType } from "./type-chart";

/**
 * Motor de resolução de turno — Fase 1 (ver docs/battle-plan.md, seção 6.4):
 * dano básico + tipos + PP + troca + desmaio + vitória. Sem condições de
 * status, sem itens reais — isso fica pras fases seguintes.
 *
 * Serviço puro: não conhece Prisma, não persiste nada. Recebe o estado atual
 * dos dois participantes + a ação que cada um submeteu, devolve o novo
 * estado + um log estruturado do que aconteceu. Quem chama (battle.service.ts)
 * é responsável por montar esse input a partir do banco e persistir o output
 * numa transação.
 */

export type DamageClass = "physical" | "special" | "status";

export interface EngineMove {
    id: string;
    power: number | null;
    accuracy: number | null;
    priority: number | null;
    type: string | null;
    damageClass: DamageClass | null;
    /** Estágio de crítico vindo de Move.crit_rate (0 = normal, 1+ = golpes de crítico alto). */
    critRate: number | null;
}

export interface EngineBattlePokemonMove {
    battlePokemonMoveId: string;
    move: EngineMove;
    currentPp: number;
}

export interface EngineBattlePokemon {
    battlePokemonId: string;
    position: number;
    types: PokemonType[];
    maxHp: number;
    currentHp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    speed: number;
    fainted: boolean;
    moves: EngineBattlePokemonMove[];
}

export interface EngineParticipant {
    participantId: string;
    activeSlot: number;
    pokemons: EngineBattlePokemon[];
}

export type EngineAction =
    | { type: "MOVE"; moveId: string }
    | { type: "SWITCH"; targetBattlePokemonId: string }
    | { type: "FORFEIT" };

export interface SubmittedAction {
    participantId: string;
    action: EngineAction;
}

export interface ResolveTurnInput {
    turnNumber: number;
    participants: [EngineParticipant, EngineParticipant];
    actions: [SubmittedAction, SubmittedAction];
}

export type TurnLogEntry =
    | { event: "switch"; participantId: string; battlePokemonId: string }
    | { event: "forfeit"; participantId: string }
    | { event: "move-failed"; participantId: string; moveId: string; reason: "no-pp" | "invalid-target" }
    | {
        event: "move";
        participantId: string;
        moveId: string;
        targetParticipantId: string;
        targetBattlePokemonId: string;
        missed: boolean;
        damage: number;
        effectiveness: EffectivenessLabel;
        critical: boolean;
        targetFainted: boolean;
    }
    | { event: "battle-ended"; winnerParticipantId: string | null; reason: "faint" | "forfeit" };

export interface ResolveTurnResult {
    log: TurnLogEntry[];
    participants: [EngineParticipant, EngineParticipant];
    forcedSwitchParticipantIds: string[];
    winnerParticipantId: string | null;
    finished: boolean;
}

@Injectable()
export class BattleEngineService {
    resolveTurn(input: ResolveTurnInput): ResolveTurnResult {
        const participants = this.cloneParticipants(input.participants);
        const log: TurnLogEntry[] = [];

        const forfeited = input.actions.find((submitted) => submitted.action.type === "FORFEIT");
        if (forfeited) {
            const winner = participants.find((p) => p.participantId !== forfeited.participantId) ?? null;
            log.push({ event: "forfeit", participantId: forfeited.participantId });
            log.push({ event: "battle-ended", winnerParticipantId: winner?.participantId ?? null, reason: "forfeit" });
            return {
                log,
                participants,
                forcedSwitchParticipantIds: [],
                winnerParticipantId: winner?.participantId ?? null,
                finished: true,
            };
        }

        this.applySwitches(participants, input.actions, log);

        const orderedMoves = this.orderMoveActions(participants, input.actions);

        for (const submitted of orderedMoves) {
            const attackerParticipant = this.getParticipant(participants, submitted.participantId);
            const defenderParticipant = participants.find((p) => p.participantId !== submitted.participantId)!;

            if (this.battleAlreadyDecided(participants)) break;

            const attacker = this.getActivePokemon(attackerParticipant);
            if (!attacker || attacker.fainted) continue;

            if (submitted.action.type !== "MOVE") continue;
            const moveId = submitted.action.moveId;
            const usedMove = attacker.moves.find((m) => m.move.id === moveId);

            if (!usedMove) {
                log.push({ event: "move-failed", participantId: submitted.participantId, moveId, reason: "invalid-target" });
                continue;
            }
            if (usedMove.currentPp <= 0) {
                log.push({ event: "move-failed", participantId: submitted.participantId, moveId, reason: "no-pp" });
                continue;
            }

            usedMove.currentPp -= 1;

            const defender = this.getActivePokemon(defenderParticipant);
            if (!defender || defender.fainted) {
                log.push({ event: "move-failed", participantId: submitted.participantId, moveId, reason: "invalid-target" });
                continue;
            }

            const { missed, damage, effectiveness, critical } = this.resolveMoveAgainst(attacker, defender, usedMove.move);

            if (!missed) {
                defender.currentHp = Math.max(0, defender.currentHp - damage);
                if (defender.currentHp === 0) defender.fainted = true;
            }

            log.push({
                event: "move",
                participantId: submitted.participantId,
                moveId,
                targetParticipantId: defenderParticipant.participantId,
                targetBattlePokemonId: defender.battlePokemonId,
                missed,
                damage: missed ? 0 : damage,
                effectiveness,
                critical,
                targetFainted: defender.fainted,
            });

            if (defender.fainted && !this.hasAlivePokemon(defenderParticipant)) break;
        }

        const forcedSwitchParticipantIds = participants
            .filter((p) => this.getActivePokemon(p)?.fainted && this.hasAlivePokemon(p))
            .map((p) => p.participantId);

        const loser = participants.find((p) => !this.hasAlivePokemon(p));
        const winnerParticipantId = loser
            ? participants.find((p) => p.participantId !== loser.participantId)!.participantId
            : null;

        if (winnerParticipantId) {
            log.push({ event: "battle-ended", winnerParticipantId, reason: "faint" });
        }

        return {
            log,
            participants,
            forcedSwitchParticipantIds,
            winnerParticipantId,
            finished: winnerParticipantId !== null,
        };
    }

    private resolveMoveAgainst(
        attacker: EngineBattlePokemon,
        defender: EngineBattlePokemon,
        move: EngineMove,
    ): { missed: boolean; damage: number; effectiveness: EffectivenessLabel; critical: boolean } {
        const accuracy = move.accuracy ?? 100;
        const missed = Math.random() * 100 >= accuracy;

        const typeMultiplier = move.type ? getTypeEffectiveness(move.type, defender.types) : 1;
        const effectiveness = describeEffectiveness(typeMultiplier);

        if (missed || !move.power || typeMultiplier === 0) {
            return { missed, damage: 0, effectiveness, critical: false };
        }

        const critical = Math.random() < this.getCritChance(move.critRate);
        const isPhysical = (move.damageClass ?? "physical") === "physical";
        const attackStat = isPhysical ? attacker.atk : attacker.spAtk;
        const defenseStat = isPhysical ? defender.def : defender.spDef;
        const stab = move.type && attacker.types.includes(move.type as PokemonType) ? 1.5 : 1;
        const randomFactor = 0.85 + Math.random() * 0.15;

        const base =
            ((2 * FIXED_LEVEL) / 5 + 2) * move.power * (attackStat / Math.max(1, defenseStat)) / 50 + 2;
        const damage = Math.max(1, Math.floor(base * stab * typeMultiplier * (critical ? 1.5 : 1) * randomFactor));

        return { missed: false, damage, effectiveness, critical };
    }

    private getCritChance(critRateStage: number | null): number {
        const stage = critRateStage ?? 0;
        if (stage >= 3) return 1;
        if (stage === 2) return 0.5;
        if (stage === 1) return 1 / 8;
        return 1 / 24;
    }

    private applySwitches(
        participants: [EngineParticipant, EngineParticipant],
        actions: [SubmittedAction, SubmittedAction],
        log: TurnLogEntry[],
    ) {
        for (const submitted of actions) {
            const action = submitted.action;
            if (action.type !== "SWITCH") continue;

            const participant = this.getParticipant(participants, submitted.participantId);
            const target = participant.pokemons.find(
                (p) => p.battlePokemonId === action.targetBattlePokemonId,
            );

            if (!target || target.fainted) continue;

            participant.activeSlot = target.position;
            log.push({ event: "switch", participantId: participant.participantId, battlePokemonId: target.battlePokemonId });
        }
    }

    /** Ordena as ações de MOVE por Move.priority (desc) e depois por speed (desc, empate = sorteio). */
    private orderMoveActions(
        participants: [EngineParticipant, EngineParticipant],
        actions: [SubmittedAction, SubmittedAction],
    ): SubmittedAction[] {
        const moveActions = actions.filter((a) => a.action.type === "MOVE");

        return [...moveActions].sort((a, b) => {
            const participantA = this.getParticipant(participants, a.participantId);
            const participantB = this.getParticipant(participants, b.participantId);
            const moveA = this.findMove(participantA, a.action);
            const moveB = this.findMove(participantB, b.action);

            const priorityDiff = (moveB?.move.priority ?? 0) - (moveA?.move.priority ?? 0);
            if (priorityDiff !== 0) return priorityDiff;

            const speedA = this.getActivePokemon(participantA)?.speed ?? 0;
            const speedB = this.getActivePokemon(participantB)?.speed ?? 0;
            if (speedA !== speedB) return speedB - speedA;

            return Math.random() < 0.5 ? -1 : 1;
        });
    }

    private findMove(participant: EngineParticipant, action: EngineAction): EngineBattlePokemonMove | undefined {
        if (action.type !== "MOVE") return undefined;
        return this.getActivePokemon(participant)?.moves.find((m) => m.move.id === action.moveId);
    }

    private getActivePokemon(participant: EngineParticipant): EngineBattlePokemon | undefined {
        return participant.pokemons.find((p) => p.position === participant.activeSlot);
    }

    private getParticipant(participants: [EngineParticipant, EngineParticipant], participantId: string): EngineParticipant {
        const participant = participants.find((p) => p.participantId === participantId);
        if (!participant) throw new Error(`Participante ${participantId} não faz parte desta batalha.`);
        return participant;
    }

    private hasAlivePokemon(participant: EngineParticipant): boolean {
        return participant.pokemons.some((p) => !p.fainted);
    }

    private battleAlreadyDecided(participants: [EngineParticipant, EngineParticipant]): boolean {
        return participants.some((p) => !this.hasAlivePokemon(p));
    }

    private cloneParticipants(participants: [EngineParticipant, EngineParticipant]): [EngineParticipant, EngineParticipant] {
        return participants.map((participant) => ({
            ...participant,
            pokemons: participant.pokemons.map((pokemon) => ({
                ...pokemon,
                types: [...pokemon.types],
                moves: pokemon.moves.map((move) => ({ ...move, move: { ...move.move } })),
            })),
        })) as [EngineParticipant, EngineParticipant];
    }
}
