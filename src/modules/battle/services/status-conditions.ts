import {
    BURN_DAMAGE_FRACTION,
    CONFUSION_MAX_TURNS,
    CONFUSION_MIN_TURNS,
    CONFUSION_SELF_HIT_CHANCE,
    FREEZE_THAW_CHANCE,
    FULL_PARALYSIS_CHANCE,
    POISON_DAMAGE_FRACTION,
    SLEEP_MAX_TURNS,
    SLEEP_MIN_TURNS,
} from "../battle.constants";

/**
 * Condições de status — Fase 2 do battle-engine (ver docs/battle-plan.md).
 *
 * Simplificações assumidas: só uma condição por vez (confusão incluída, sem
 * stackar com uma condição não-volátil como no jogo real); veneno é sempre
 * "normal" (sem veneno grave incremental do Toxic); ailments fora deste enum
 * (flinch, trap, disable, leech-seed, nightmare, yawn, torment, heal-block,
 * embargo, no-ailment, unknown) são ignorados nesta fase.
 */
export type StatusConditionValue =
    | "NONE"
    | "PARALYZED"
    | "POISONED"
    | "BURNED"
    | "ASLEEP"
    | "FROZEN"
    | "CONFUSED";

const AILMENT_TO_STATUS: Record<string, StatusConditionValue> = {
    paralysis: "PARALYZED",
    poison: "POISONED",
    burn: "BURNED",
    sleep: "ASLEEP",
    freeze: "FROZEN",
    confusion: "CONFUSED",
};

/** Traduz `Move.ailment` (nome vindo da PokeAPI) pra condição do enum. `null` se fora de escopo. */
export function mapAilmentToStatusCondition(ailment: string | null): StatusConditionValue | null {
    if (!ailment) return null;
    return AILMENT_TO_STATUS[ailment] ?? null;
}

export function rollFullParalysis(): boolean {
    return Math.random() < FULL_PARALYSIS_CHANCE;
}

export function rollFreezeThaw(): boolean {
    return Math.random() < FREEZE_THAW_CHANCE;
}

function randomIntBetween(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

export function rollSleepTurns(): number {
    return randomIntBetween(SLEEP_MIN_TURNS, SLEEP_MAX_TURNS);
}

export function rollConfusionTurns(): number {
    return randomIntBetween(CONFUSION_MIN_TURNS, CONFUSION_MAX_TURNS);
}

export function rollConfusionSelfHit(): boolean {
    return Math.random() < CONFUSION_SELF_HIT_CHANCE;
}

export function getPoisonDamage(maxHp: number): number {
    return Math.max(1, Math.floor(maxHp * POISON_DAMAGE_FRACTION));
}

export function getBurnDamage(maxHp: number): number {
    return Math.max(1, Math.floor(maxHp * BURN_DAMAGE_FRACTION));
}
