/**
 * Moves que alteram stat stages — Fase 2 do battle-engine (ver docs/battle-plan.md).
 *
 * `Move` guarda `stat_chance` (a chance do efeito) mas não guarda qual stat
 * muda nem por quanto — o campo `stat_changes` da PokeAPI nunca foi capturado
 * no seed. Por decisão do usuário, cobrimos aqui só os moves de status puro
 * mais conhecidos com uma tabela fixa, em vez de migrar o schema agora.
 * Efeitos secundários de stat em golpes de dano (ex.: Bubble com 10% de
 * chance de baixar speed) ficam fora de escopo.
 */

export type StatKey = "atk" | "def" | "spAtk" | "spDef" | "speed" | "accuracy" | "evasion";

export type StatStages = Record<StatKey, number>;

export function createEmptyStatStages(): StatStages {
    return { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

export interface StatStageEffect {
    stat: StatKey;
    stages: number;
    target: "self" | "target";
}

/** Chave = `Move.name` (slug da PokeAPI, ex. "swords-dance"). */
export const STAT_STAGE_MOVES: Record<string, StatStageEffect[]> = {
    // Buffs no próprio usuário
    "swords-dance": [{ stat: "atk", stages: 2, target: "self" }],
    "dragon-dance": [
        { stat: "atk", stages: 1, target: "self" },
        { stat: "speed", stages: 1, target: "self" },
    ],
    "nasty-plot": [{ stat: "spAtk", stages: 2, target: "self" }],
    "calm-mind": [
        { stat: "spAtk", stages: 1, target: "self" },
        { stat: "spDef", stages: 1, target: "self" },
    ],
    "bulk-up": [
        { stat: "atk", stages: 1, target: "self" },
        { stat: "def", stages: 1, target: "self" },
    ],
    agility: [{ stat: "speed", stages: 2, target: "self" }],
    "iron-defense": [{ stat: "def", stages: 2, target: "self" }],
    amnesia: [{ stat: "spDef", stages: 2, target: "self" }],
    growth: [
        { stat: "atk", stages: 1, target: "self" },
        { stat: "spAtk", stages: 1, target: "self" },
    ],
    "work-up": [
        { stat: "atk", stages: 1, target: "self" },
        { stat: "spAtk", stages: 1, target: "self" },
    ],
    harden: [{ stat: "def", stages: 1, target: "self" }],
    withdraw: [{ stat: "def", stages: 1, target: "self" }],
    "acid-armor": [{ stat: "def", stages: 2, target: "self" }],
    barrier: [{ stat: "def", stages: 2, target: "self" }],
    "double-team": [{ stat: "evasion", stages: 1, target: "self" }],
    minimize: [{ stat: "evasion", stages: 2, target: "self" }],

    // Debuffs no oponente
    growl: [{ stat: "atk", stages: -1, target: "target" }],
    leer: [{ stat: "def", stages: -1, target: "target" }],
    "tail-whip": [{ stat: "def", stages: -1, target: "target" }],
    "sand-attack": [{ stat: "accuracy", stages: -1, target: "target" }],
    smokescreen: [{ stat: "accuracy", stages: -1, target: "target" }],
    screech: [{ stat: "def", stages: -2, target: "target" }],
    "scary-face": [{ stat: "speed", stages: -2, target: "target" }],
    "cotton-spore": [{ stat: "speed", stages: -2, target: "target" }],
    "string-shot": [{ stat: "speed", stages: -1, target: "target" }],
    "metal-sound": [{ stat: "spDef", stages: -2, target: "target" }],
    charm: [{ stat: "atk", stages: -2, target: "target" }],
    "feather-dance": [{ stat: "atk", stages: -2, target: "target" }],
};

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
