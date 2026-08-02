export const MIN_TEAM_SIZE = 1;
export const MAX_TEAM_SIZE = 6;
export const FIXED_LEVEL = 50;
export const RECENT_TURN_LOGS_LIMIT = 20;

/** Multiplicador global aplicado a todo dano calculado, para deixar as batalhas menos rápidas. */
export const DAMAGE_MULTIPLIER = 0.55;

// Condições de status — ver docs/battle-plan.md e services/status-conditions.ts
export const FULL_PARALYSIS_CHANCE = 0.25;
export const PARALYSIS_SPEED_MULTIPLIER = 0.5;
export const FREEZE_THAW_CHANCE = 0.2;
export const SLEEP_MIN_TURNS = 1;
export const SLEEP_MAX_TURNS = 3;
export const CONFUSION_MIN_TURNS = 2;
export const CONFUSION_MAX_TURNS = 4;
export const CONFUSION_SELF_HIT_CHANCE = 1 / 3;
export const CONFUSION_SELF_HIT_POWER = 40;
export const POISON_DAMAGE_FRACTION = 1 / 8;
export const BURN_DAMAGE_FRACTION = 1 / 16;
export const BURN_ATTACK_MULTIPLIER = 0.5;
