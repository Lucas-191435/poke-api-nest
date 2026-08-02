import { Injectable } from "@nestjs/common";
import {
    BURN_ATTACK_MULTIPLIER,
    CONFUSION_SELF_HIT_POWER,
    DAMAGE_MULTIPLIER,
    FIXED_LEVEL,
    PARALYSIS_SPEED_MULTIPLIER,
} from "../battle.constants";
import { describeEffectiveness, EffectivenessLabel, getTypeEffectiveness, PokemonType } from "./type-chart";
import {
    getBurnDamage,
    getPoisonDamage,
    mapAilmentToStatusCondition,
    rollConfusionSelfHit,
    rollConfusionTurns,
    rollFreezeThaw,
    rollFullParalysis,
    rollSleepTurns,
    StatusConditionValue,
} from "./status-conditions";
import {
    clampStage,
    getAccuracyMultiplier,
    getStatMultiplier,
    STAT_STAGE_MOVES,
    StatKey,
    StatStages,
} from "./stat-stage-moves";

/**
 * Motor de resolução de turno — Fase 1 e 2 (ver docs/battle-plan.md, seção 6.4):
 * dano básico + tipos + PP + troca + desmaio + vitória, condições de status
 * (paralisia, veneno, queimadura, sono, congelamento, confusão) e stat stages
 * de um conjunto curado de moves de status. Sem itens reais — isso fica pra
 * fases seguintes.
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
    name: string;
    power: number | null;
    accuracy: number | null;
    priority: number | null;
    type: string | null;
    damageClass: DamageClass | null;
    /** Estágio de crítico vindo de Move.crit_rate (0 = normal, 1+ = golpes de crítico alto). */
    critRate: number | null;
    /** Nome do ailment vindo da PokeAPI (Move.ailment), ex. "paralysis", "poison". */
    ailment: string | null;
    /** Chance (0-100) do ailment se aplicar em golpes de dano (Move.effect_chance). `null` = sempre. */
    ailmentChance: number | null;
    /** % do HP máximo que o próprio atacante recupera (Move.healing), ex. Recover = 50. `0` = não cura. */
    healing: number;
    /**
     * % do dano causado que o atacante recupera (Move.drain), ex. Giga Drain = 75.
     * Negativo = recuo/dano em si mesmo (ex. Take Down = -25). `0` = sem drain/recuo.
     */
    drain: number;
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
    statusCondition: StatusConditionValue;
    statusCounter: number;
    statStages: StatStages;
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

export type StatusBlockedReason = "asleep" | "paralyzed" | "frozen" | "confused-hit";

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
    | { event: "status-applied"; participantId: string; battlePokemonId: string; statusCondition: StatusConditionValue }
    | {
        event: "status-blocked";
        participantId: string;
        battlePokemonId: string;
        statusCondition: StatusConditionValue;
        reason: StatusBlockedReason;
    }
    | { event: "confusion-hit"; participantId: string; battlePokemonId: string; damage: number; targetFainted: boolean }
    | {
        event: "status-tick";
        participantId: string;
        battlePokemonId: string;
        statusCondition: StatusConditionValue;
        damage: number;
        targetFainted: boolean;
    }
    | { event: "status-cured"; participantId: string; battlePokemonId: string; statusCondition: StatusConditionValue }
    | { event: "stat-change"; participantId: string; battlePokemonId: string; stat: StatKey; stages: number; newStage: number }
    | { event: "heal"; participantId: string; battlePokemonId: string; amount: number }
    | { event: "recoil"; participantId: string; battlePokemonId: string; damage: number; targetFainted: boolean }
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

            const statusCheck = this.applyPreMoveStatusCheck(attacker, submitted.participantId, log);
            if (statusCheck !== "proceed") {
                if (this.battleAlreadyDecided(participants)) break;
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

            const { missed, damage, effectiveness, critical, isStatusMove } = this.resolveMoveAgainst(
                attacker,
                defender,
                usedMove.move,
            );

            if (!missed && !isStatusMove) {
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
                damage: missed || isStatusMove ? 0 : damage,
                effectiveness,
                critical,
                targetFainted: defender.fainted,
            });

            if (!missed) {
                this.applyMoveEffects({
                    attacker,
                    attackerParticipantId: submitted.participantId,
                    defender,
                    defenderParticipantId: defenderParticipant.participantId,
                    move: usedMove.move,
                    damageDealt: isStatusMove ? 0 : damage,
                    log,
                });
            }

            if (defender.fainted && !this.hasAlivePokemon(defenderParticipant)) break;
            if (attacker.fainted && !this.hasAlivePokemon(attackerParticipant)) break;
        }

        if (!this.battleAlreadyDecided(participants)) {
            this.applyEndOfTurnStatusTicks(participants, log);
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
    ): { missed: boolean; damage: number; effectiveness: EffectivenessLabel; critical: boolean; isStatusMove: boolean } {
        const isStatusMove = move.damageClass === "status";

        const accuracyStageDiff = clampStage(attacker.statStages.accuracy - defender.statStages.evasion);
        const accuracy = move.accuracy === null ? 100 : move.accuracy * getAccuracyMultiplier(accuracyStageDiff);
        const missed = Math.random() * 100 >= accuracy;

        const typeMultiplier = move.type ? getTypeEffectiveness(move.type, defender.types) : 1;
        const effectiveness = describeEffectiveness(typeMultiplier);

        if (isStatusMove) {
            return { missed, damage: 0, effectiveness, critical: false, isStatusMove: true };
        }

        if (missed || !move.power || typeMultiplier === 0) {
            return { missed, damage: 0, effectiveness, critical: false, isStatusMove: false };
        }

        const critical = Math.random() < this.getCritChance(move.critRate);
        const isPhysical = (move.damageClass ?? "physical") === "physical";
        const attackStat = isPhysical ? this.getEffectiveStat(attacker, "atk") : this.getEffectiveStat(attacker, "spAtk");
        const defenseStat = isPhysical ? this.getEffectiveStat(defender, "def") : this.getEffectiveStat(defender, "spDef");
        const stab = move.type && attacker.types.includes(move.type as PokemonType) ? 1.5 : 1;
        const randomFactor = 0.85 + Math.random() * 0.15;

        const damage = this.computeDamage(
            move.power,
            attackStat,
            defenseStat,
            stab * typeMultiplier * (critical ? 1.5 : 1),
            randomFactor,
        );

        return { missed: false, damage, effectiveness, critical, isStatusMove: false };
    }

    private computeDamage(power: number, attackStat: number, defenseStat: number, multiplier: number, randomFactor: number): number {
        const base = ((2 * FIXED_LEVEL) / 5 + 2) * power * (attackStat / Math.max(1, defenseStat)) / 50 + 2;
        return Math.max(1, Math.floor(base * multiplier * randomFactor * DAMAGE_MULTIPLIER));
    }

    private getCritChance(critRateStage: number | null): number {
        const stage = critRateStage ?? 0;
        if (stage >= 3) return 1;
        if (stage === 2) return 0.5;
        if (stage === 1) return 1 / 8;
        return 1 / 24;
    }

    /** Estatística efetiva de atk/def/spAtk/spDef considerando stat stage e a penalidade de ataque físico sob queimadura. */
    private getEffectiveStat(pokemon: EngineBattlePokemon, stat: "atk" | "def" | "spAtk" | "spDef"): number {
        const multiplier = getStatMultiplier(pokemon.statStages[stat]);
        const burnPenalty = stat === "atk" && pokemon.statusCondition === "BURNED" ? BURN_ATTACK_MULTIPLIER : 1;
        return pokemon[stat] * multiplier * burnPenalty;
    }

    /** Speed efetivo considerando stat stage e a penalidade de paralisia, usado na ordenação de turno. */
    private getEffectiveSpeed(pokemon: EngineBattlePokemon): number {
        const base = pokemon.speed * getStatMultiplier(pokemon.statStages.speed);
        return pokemon.statusCondition === "PARALYZED" ? base * PARALYSIS_SPEED_MULTIPLIER : base;
    }

    /**
     * Checa se a condição de status do atacante impede a ação deste turno
     * (congelado, dormindo, paralisado, confuso) antes de qualquer PP ser gasto.
     * Confusão pode resultar em dano contra o próprio atacante ("confusion-hit").
     */
    private applyPreMoveStatusCheck(
        attacker: EngineBattlePokemon,
        participantId: string,
        log: TurnLogEntry[],
    ): "proceed" | "blocked" | "confusion-hit" {
        switch (attacker.statusCondition) {
            case "FROZEN": {
                if (rollFreezeThaw()) {
                    this.cureStatus(attacker, participantId, log);
                    return "proceed";
                }
                log.push({
                    event: "status-blocked",
                    participantId,
                    battlePokemonId: attacker.battlePokemonId,
                    statusCondition: "FROZEN",
                    reason: "frozen",
                });
                return "blocked";
            }
            case "ASLEEP": {
                if (attacker.statusCounter > 0) {
                    attacker.statusCounter -= 1;
                    log.push({
                        event: "status-blocked",
                        participantId,
                        battlePokemonId: attacker.battlePokemonId,
                        statusCondition: "ASLEEP",
                        reason: "asleep",
                    });
                    return "blocked";
                }
                this.cureStatus(attacker, participantId, log);
                return "proceed";
            }
            case "PARALYZED": {
                if (rollFullParalysis()) {
                    log.push({
                        event: "status-blocked",
                        participantId,
                        battlePokemonId: attacker.battlePokemonId,
                        statusCondition: "PARALYZED",
                        reason: "paralyzed",
                    });
                    return "blocked";
                }
                return "proceed";
            }
            case "CONFUSED": {
                attacker.statusCounter -= 1;
                if (attacker.statusCounter <= 0) {
                    this.cureStatus(attacker, participantId, log);
                    return "proceed";
                }
                if (!rollConfusionSelfHit()) {
                    return "proceed";
                }

                const attackStat = this.getEffectiveStat(attacker, "atk");
                const defenseStat = this.getEffectiveStat(attacker, "def");
                const randomFactor = 0.85 + Math.random() * 0.15;
                const damage = this.computeDamage(CONFUSION_SELF_HIT_POWER, attackStat, defenseStat, 1, randomFactor);

                attacker.currentHp = Math.max(0, attacker.currentHp - damage);
                if (attacker.currentHp === 0) attacker.fainted = true;

                log.push({
                    event: "confusion-hit",
                    participantId,
                    battlePokemonId: attacker.battlePokemonId,
                    damage,
                    targetFainted: attacker.fainted,
                });
                return "confusion-hit";
            }
            default:
                return "proceed";
        }
    }

    private cureStatus(pokemon: EngineBattlePokemon, participantId: string, log: TurnLogEntry[]) {
        const previous = pokemon.statusCondition;
        pokemon.statusCondition = "NONE";
        pokemon.statusCounter = 0;
        log.push({ event: "status-cured", participantId, battlePokemonId: pokemon.battlePokemonId, statusCondition: previous });
    }

    /** Aplica ailment (condição de status), stat stages e cura/recuo de um golpe que acertou. */
    private applyMoveEffects(params: {
        attacker: EngineBattlePokemon;
        attackerParticipantId: string;
        defender: EngineBattlePokemon;
        defenderParticipantId: string;
        move: EngineMove;
        damageDealt: number;
        log: TurnLogEntry[];
    }) {
        const { attacker, attackerParticipantId, defender, defenderParticipantId, move, damageDealt, log } = params;

        if (!defender.fainted) {
            this.tryApplyAilment(defender, defenderParticipantId, move, log);
        }

        const statEffects = STAT_STAGE_MOVES[move.name];
        if (statEffects) {
            for (const effect of statEffects) {
                const isSelf = effect.target === "self";
                const target = isSelf ? attacker : defender;
                const targetParticipantId = isSelf ? attackerParticipantId : defenderParticipantId;
                if (target.fainted) continue;

                this.applyStatStage(target, targetParticipantId, effect.stat, effect.stages, log);
            }
        }

        this.applyHealingAndDrain(attacker, attackerParticipantId, move, damageDealt, log);
    }

    /**
     * Cura o próprio atacante (move de cura pura, ex. Recover) ou aplica drain/recuo a partir do
     * dano causado ao defensor (ex. Giga Drain cura, Take Down causa recuo). Um move nunca tem os
     * dois efeitos ao mesmo tempo na PokeAPI, então `healing` tem prioridade se ambos vierem preenchidos.
     */
    private applyHealingAndDrain(
        attacker: EngineBattlePokemon,
        attackerParticipantId: string,
        move: EngineMove,
        damageDealt: number,
        log: TurnLogEntry[],
    ) {
        if (attacker.fainted) return;

        if (move.healing) {
            const amount = Math.floor((attacker.maxHp * move.healing) / 100);
            this.healPokemon(attacker, attackerParticipantId, amount, log);
            return;
        }

        if (!move.drain || damageDealt <= 0) return;

        // Math.floor de um número negativo arredonda pra baixo (mais negativo), então usamos o
        // valor absoluto antes de arredondar pra cura e recuo terem a mesma regra de arredondamento.
        const amount = Math.floor((damageDealt * Math.abs(move.drain)) / 100);
        if (amount <= 0) return;

        if (move.drain > 0) {
            this.healPokemon(attacker, attackerParticipantId, amount, log);
        } else {
            this.applyRecoil(attacker, attackerParticipantId, amount, log);
        }
    }

    private healPokemon(pokemon: EngineBattlePokemon, participantId: string, amount: number, log: TurnLogEntry[]) {
        if (amount <= 0 || pokemon.fainted) return;

        const before = pokemon.currentHp;
        pokemon.currentHp = Math.min(pokemon.maxHp, pokemon.currentHp + amount);
        const applied = pokemon.currentHp - before;
        if (applied <= 0) return;

        log.push({ event: "heal", participantId, battlePokemonId: pokemon.battlePokemonId, amount: applied });
    }

    private applyRecoil(pokemon: EngineBattlePokemon, participantId: string, amount: number, log: TurnLogEntry[]) {
        if (amount <= 0) return;

        pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
        if (pokemon.currentHp === 0) pokemon.fainted = true;

        log.push({
            event: "recoil",
            participantId,
            battlePokemonId: pokemon.battlePokemonId,
            damage: amount,
            targetFainted: pokemon.fainted,
        });
    }

    private tryApplyAilment(defender: EngineBattlePokemon, defenderParticipantId: string, move: EngineMove, log: TurnLogEntry[]) {
        const status = mapAilmentToStatusCondition(move.ailment);
        if (!status) return;
        if (defender.statusCondition !== "NONE") return;

        const isPureStatusMove = move.damageClass === "status";
        const chance = isPureStatusMove ? 100 : (move.ailmentChance ?? 100);
        if (Math.random() * 100 >= chance) return;

        defender.statusCondition = status;
        defender.statusCounter = status === "ASLEEP" ? rollSleepTurns() : status === "CONFUSED" ? rollConfusionTurns() : 0;

        log.push({
            event: "status-applied",
            participantId: defenderParticipantId,
            battlePokemonId: defender.battlePokemonId,
            statusCondition: status,
        });
    }

    private applyStatStage(pokemon: EngineBattlePokemon, participantId: string, stat: StatKey, stages: number, log: TurnLogEntry[]) {
        const previous = pokemon.statStages[stat];
        const next = clampStage(previous + stages);
        pokemon.statStages[stat] = next;

        log.push({
            event: "stat-change",
            participantId,
            battlePokemonId: pokemon.battlePokemonId,
            stat,
            stages: next - previous,
            newStage: next,
        });
    }

    /** Dano de fim de turno por veneno/queimadura, aplicado ao ativo de cada participante. */
    private applyEndOfTurnStatusTicks(participants: [EngineParticipant, EngineParticipant], log: TurnLogEntry[]) {
        for (const participant of participants) {
            const pokemon = this.getActivePokemon(participant);
            if (!pokemon || pokemon.fainted) continue;
            if (pokemon.statusCondition !== "POISONED" && pokemon.statusCondition !== "BURNED") continue;

            const damage =
                pokemon.statusCondition === "POISONED" ? getPoisonDamage(pokemon.maxHp) : getBurnDamage(pokemon.maxHp);
            pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
            if (pokemon.currentHp === 0) pokemon.fainted = true;

            log.push({
                event: "status-tick",
                participantId: participant.participantId,
                battlePokemonId: pokemon.battlePokemonId,
                statusCondition: pokemon.statusCondition,
                damage,
                targetFainted: pokemon.fainted,
            });
        }
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

    /** Ordena as ações de MOVE por Move.priority (desc) e depois por speed efetivo (desc, empate = sorteio). */
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

            const speedA = this.getEffectiveSpeedFor(participantA);
            const speedB = this.getEffectiveSpeedFor(participantB);
            if (speedA !== speedB) return speedB - speedA;

            return Math.random() < 0.5 ? -1 : 1;
        });
    }

    private getEffectiveSpeedFor(participant: EngineParticipant): number {
        const pokemon = this.getActivePokemon(participant);
        return pokemon ? this.getEffectiveSpeed(pokemon) : 0;
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
                statStages: { ...pokemon.statStages },
                moves: pokemon.moves.map((move) => ({ ...move, move: { ...move.move } })),
            })),
        })) as [EngineParticipant, EngineParticipant];
    }
}
