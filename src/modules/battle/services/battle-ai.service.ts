import { Injectable } from "@nestjs/common";
import {
    EngineAction,
    EngineBattlePokemon,
    EngineBattlePokemonMove,
    EngineMove,
    EngineParticipant,
} from "./battle-engine.service";
import { getTypeEffectiveness, PokemonType } from "./type-chart";
import { StatKey, StatStages } from "./stat-stage-moves";

/**
 * Decisão do bot — ver docs/battle-bot-behavior.md pra explicação completa (com exemplos) do
 * comportamento implementado aqui. Serviço puro, mesmo espírito do BattleEngineService: recebe o
 * estado dos dois lados (EngineParticipant), nunca conhece Prisma, nunca persiste nada.
 */

const STATUS_MOVE_SCORE = 20;
const STAB_MULTIPLIER = 1.5;

/** Stats que contam como "já debuffado" pro gatilho tático da seção 3.3 — evasion fica de fora. */
const DEBUFFABLE_STAT_KEYS: StatKey[] = ["atk", "def", "spAtk", "spDef", "speed", "accuracy"];

@Injectable()
export class BattleAiService {
    /** Chamado toda vez que é a vez do bot agir num turno normal (ver seção 2 do doc de comportamento). */
    decideAction(bot: EngineParticipant, opponent: EngineParticipant): EngineAction {
        const active = this.getActivePokemon(bot);
        const opponentActive = this.getActivePokemon(opponent);

        if (!active || !opponentActive) {
            return this.pickEmergencySwitchOrForfeit(bot, opponentActive);
        }

        const usableMoves = active.moves.filter((m) => m.currentPp > 0);
        if (usableMoves.length === 0) {
            return this.pickEmergencySwitchOrForfeit(bot, opponentActive);
        }

        const damageMoves = usableMoves.filter((m) => this.isDamageMove(m.move));
        const bestDamageEffectiveness = damageMoves.reduce(
            (best, m) => Math.max(best, getTypeEffectiveness(m.move.type ?? "", opponentActive.types)),
            0,
        );

        // Seção 3.3: em desvantagem de tipo, tenta debuffar o oponente antes de simplesmente
        // bater fraco — mas só uma vez por Pokémon adversário (lido do statStages atual dele).
        if (damageMoves.length > 0 && bestDamageEffectiveness < 1) {
            const debuffMove = this.findDebuffMoveAgainstOpponent(usableMoves);
            if (debuffMove && !this.opponentAlreadyDebuffed(opponentActive.statStages)) {
                return { type: "MOVE", moveId: debuffMove.move.id };
            }
        }

        const best = this.pickHighestScored(usableMoves, active, opponentActive);
        return { type: "MOVE", moveId: best.move.id };
    }

    /** Chamado só quando o Pokémon ativo do bot desmaia (WAITING_FORCED_SWITCH) — troca é obrigatória. */
    decideSwitch(bot: EngineParticipant, opponentActive: EngineBattlePokemon): string {
        const alive = bot.pokemons.filter((p) => !p.fainted);
        const best = this.bestMatchup(alive, opponentActive);

        if (!best) {
            throw new Error("Nenhum Pokémon vivo disponível pra troca forçada do bot.");
        }
        return best.battlePokemonId;
    }

    private pickHighestScored(
        moves: EngineBattlePokemonMove[],
        attacker: EngineBattlePokemon,
        defender: EngineBattlePokemon,
    ): EngineBattlePokemonMove {
        return moves.reduce((bestSoFar, current) =>
            this.scoreMove(current.move, attacker, defender) > this.scoreMove(bestSoFar.move, attacker, defender)
                ? current
                : bestSoFar,
        );
    }

    /** Seção 3.1/3.2 do doc de comportamento: dano = power×efetividade×STAB×accuracy, status = score fixo. */
    private scoreMove(move: EngineMove, attacker: EngineBattlePokemon, defender: EngineBattlePokemon): number {
        if (!this.isDamageMove(move)) return STATUS_MOVE_SCORE;

        const effectiveness = getTypeEffectiveness(move.type ?? "", defender.types);
        if (effectiveness === 0) return -1;

        const stab = move.type && attacker.types.includes(move.type as PokemonType) ? STAB_MULTIPLIER : 1;
        const accuracy = (move.accuracy ?? 100) / 100;

        return (move.power ?? 0) * effectiveness * stab * accuracy;
    }

    private isDamageMove(move: EngineMove): boolean {
        return move.damageClass !== "status" && !!move.power;
    }

    /** Seção 3.3, passo 3: golpe que mira o oponente e baixa algum stat dele. */
    private findDebuffMoveAgainstOpponent(moves: EngineBattlePokemonMove[]): EngineBattlePokemonMove | undefined {
        const candidates = moves.filter(
            (m) => m.move.target !== "user" && m.move.statChanges.some((c) => c.stages < 0),
        );
        if (candidates.length === 0) return undefined;

        return candidates.reduce((strongest, current) =>
            this.debuffStrength(current.move) > this.debuffStrength(strongest.move) ? current : strongest,
        );
    }

    private debuffStrength(move: EngineMove): number {
        return move.statChanges.filter((c) => c.stages < 0).reduce((sum, c) => sum + Math.abs(c.stages), 0);
    }

    /** Seção 3.3, passo 2: infere "já debuffado" do próprio statStages persistido — sem memória própria. */
    private opponentAlreadyDebuffed(statStages: StatStages): boolean {
        return DEBUFFABLE_STAT_KEYS.some((key) => statStages[key] < 0);
    }

    /** Seção 5 do doc de comportamento: ofensivo (melhor tipo do candidato vs oponente) − defensivo (pior tipo do oponente vs candidato). */
    private bestMatchupScore(candidate: EngineBattlePokemon, opponentActive: EngineBattlePokemon): number {
        const offensive = candidate.types.reduce(
            (best, type) => Math.max(best, getTypeEffectiveness(type, opponentActive.types)),
            0,
        );
        const defensive = opponentActive.types.reduce(
            (worst, type) => Math.max(worst, getTypeEffectiveness(type, candidate.types)),
            0,
        );
        return offensive - defensive;
    }

    private bestMatchup(
        candidates: EngineBattlePokemon[],
        opponentActive: EngineBattlePokemon,
    ): EngineBattlePokemon | undefined {
        if (candidates.length === 0) return undefined;
        return candidates.reduce((bestSoFar, current) =>
            this.bestMatchupScore(current, opponentActive) > this.bestMatchupScore(bestSoFar, opponentActive)
                ? current
                : bestSoFar,
        );
    }

    /** Seção 4 do doc de comportamento: sem golpe utilizável → troca pro melhor matchup vivo, ou FORFEIT. */
    private pickEmergencySwitchOrForfeit(bot: EngineParticipant, opponentActive?: EngineBattlePokemon): EngineAction {
        const currentActive = this.getActivePokemon(bot);
        const alive = bot.pokemons.filter((p) => !p.fainted && p.battlePokemonId !== currentActive?.battlePokemonId);

        if (alive.length === 0) {
            return { type: "FORFEIT" };
        }

        const best = opponentActive ? this.bestMatchup(alive, opponentActive) : alive[0];
        return { type: "SWITCH", targetBattlePokemonId: (best ?? alive[0]).battlePokemonId };
    }

    private getActivePokemon(participant: EngineParticipant): EngineBattlePokemon | undefined {
        return participant.pokemons.find((p) => p.position === participant.activeSlot);
    }
}
