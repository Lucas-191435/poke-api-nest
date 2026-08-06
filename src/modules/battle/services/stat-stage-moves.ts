/**
 * Stat stages — Fase 2 do battle-engine (ver docs/battle-plan.md).
 *
 * Os stat changes de cada move vêm de `Move.stat_changes` (JSON capturado do
 * campo `stat_changes` da PokeAPI no seed — ver `prisma/seeds/insert-move-in-db.seed.ts`),
 * não mais de uma tabela curada. Isso cobre tanto moves de status puro (Swords
 * Dance, Growl, ...) quanto efeitos secundários de stat em golpes de dano
 * (ex.: Bubble com chance de baixar speed do alvo) — todo move que a PokeAPI
 * marcar com stat_changes passa a funcionar, sem precisar listar cada um à mão.
 */

export type StatKey = "atk" | "def" | "spAtk" | "spDef" | "speed" | "accuracy" | "evasion";

export type StatStages = Record<StatKey, number>;

export function createEmptyStatStages(): StatStages {
    return { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

export interface StatChange {
    stat: StatKey;
    stages: number;
}

/** Nome do stat como vem da PokeAPI (`stat.name` dentro de `stat_changes`) → `StatKey` interno. */
const POKEAPI_STAT_TO_KEY: Record<string, StatKey> = {
    attack: "atk",
    defense: "def",
    "special-attack": "spAtk",
    "special-defense": "spDef",
    speed: "speed",
    accuracy: "accuracy",
    evasion: "evasion",
};

/**
 * Converte o JSON cru salvo em `Move.stat_changes` (`{ stat: string; change: number }[]`,
 * nomes de stat exatamente como a PokeAPI devolve) pro formato interno do engine.
 * Entradas com stat desconhecido (ex. "hp", que não tem stage) são ignoradas.
 */
export function parseStatChanges(raw: unknown): StatChange[] {
    if (!Array.isArray(raw)) return [];

    const result: StatChange[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;
        const { stat, change } = entry as { stat?: unknown; change?: unknown };
        if (typeof stat !== "string" || typeof change !== "number") continue;

        const key = POKEAPI_STAT_TO_KEY[stat];
        if (!key) continue;

        result.push({ stat: key, stages: change });
    }
    return result;
}

export function clampStage(value: number): number {
    return Math.max(-6, Math.min(6, value));
}

/** Multiplicador padrão pra atk/def/spAtk/spDef/speed a partir do stage (-6..6). */
export function getStatMultiplier(stage: number): number {
    const clamped = clampStage(stage);
    return clamped >= 0 ? (2 + clamped) / 2 : 2 / (2 - clamped);
}

/** Multiplicador de accuracy/evasion a partir do stage combinado (-6..6), base 3 em vez de 2. */
export function getAccuracyMultiplier(stage: number): number {
    const clamped = clampStage(stage);
    return clamped >= 0 ? (3 + clamped) / 3 : 3 / (3 - clamped);
}
