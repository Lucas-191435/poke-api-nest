/**
 * Tabela de efetividade de tipos (Gen 6+, com Fairy).
 * Dado imutável do jogo — gerado uma vez a partir da PokeAPI e congelado aqui,
 * no mesmo espírito dos seeds em prisma/seeds/, mas sem precisar de tabela no banco.
 */

export const POKEMON_TYPES = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

type TypeEffectivenessRow = Partial<Record<PokemonType, number>>;

// Linha = tipo do golpe, coluna = tipo do defensor. Combinações omitidas são neutras (1x).
const TYPE_CHART: Record<PokemonType, TypeEffectivenessRow> = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: {
        fire: 0.5,
        water: 2,
        grass: 0.5,
        poison: 0.5,
        ground: 2,
        flying: 0.5,
        bug: 0.5,
        rock: 2,
        dragon: 0.5,
        steel: 0.5,
    },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: {
        normal: 2,
        ice: 2,
        poison: 0.5,
        flying: 0.5,
        psychic: 0.5,
        bug: 0.5,
        rock: 2,
        ghost: 0,
        dark: 2,
        steel: 2,
        fairy: 0.5,
    },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: {
        fire: 0.5,
        grass: 2,
        fighting: 0.5,
        poison: 0.5,
        flying: 0.5,
        psychic: 2,
        ghost: 0.5,
        dark: 2,
        steel: 0.5,
        fairy: 0.5,
    },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

function isPokemonType(value: string): value is PokemonType {
    return (POKEMON_TYPES as readonly string[]).includes(value);
}

/** Multiplicador de um golpe de `attackingType` contra um único tipo defensor. 1x se algum dos tipos for desconhecido. */
export function getTypeMultiplier(attackingType: string, defendingType: string): number {
    if (!isPokemonType(attackingType) || !isPokemonType(defendingType)) return 1;
    return TYPE_CHART[attackingType][defendingType] ?? 1;
}

/** Multiplicador combinado de um golpe contra um Pokémon com 1 ou 2 tipos. */
export function getTypeEffectiveness(attackingType: string, defendingTypes: string[]): number {
    return defendingTypes.reduce(
        (total, defendingType) => total * getTypeMultiplier(attackingType, defendingType),
        1,
    );
}

/** `Pokemon.types`/`MyPokemon` chegam do banco como `JSON.stringify(string[])` — ver prisma/seeds/insert-pokemon-in-db.seed.ts. */
export function parsePokemonTypes(rawTypes: string | null | undefined): PokemonType[] {
    if (!rawTypes) return [];
    try {
        const parsed: unknown = JSON.parse(rawTypes);
        return Array.isArray(parsed) ? parsed.filter((t): t is PokemonType => typeof t === "string" && isPokemonType(t)) : [];
    } catch {
        return [];
    }
}

export type EffectivenessLabel = "no_effect" | "not_very_effective" | "effective" | "super_effective";

export function describeEffectiveness(multiplier: number): EffectivenessLabel {
    if (multiplier === 0) return "no_effect";
    if (multiplier < 1) return "not_very_effective";
    if (multiplier > 1) return "super_effective";
    return "effective";
}
