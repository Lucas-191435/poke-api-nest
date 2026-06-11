import { Pokemon } from "src/generated/prisma/browser";

export const transformPokemonData = (pokemon: Pokemon )  => {
    return {
        id: pokemon.id,
        number: pokemon.pokeId,
        name: pokemon.name,
        types: JSON.parse(pokemon.types || "[]") as string[],
        abilities: JSON.parse(pokemon.abilities || "[]") as string[],
        region: pokemon.region,
        height: pokemon.height,
        weight: pokemon.weight,
        img1: pokemon.img1 || "",
        img2: pokemon.img2 || "",
        img3: pokemon.img3 || "",
    }
}