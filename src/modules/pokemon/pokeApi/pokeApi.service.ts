/* eslint-disable prefer-const */
import { Injectable, Logger } from '@nestjs/common';
import { PokeAPIClient } from 'src/services/pokeApiService';
import IPokemonSpecies from './types/IPokemonSpecies';


const sprite = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const spriteDefault = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const spriteShiny = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
const spriteBack = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`;



@Injectable()
export class PokeApiService {
    
    async pokemonInfos(id: string){
        Logger.log(`Fetching infos for Pokemon ID: ${id}`)

        const [pokemon, pokemonSpecies]: [
            {
                status: number,
                statusText: string,
                data: {
                    stats: {
                        base_stat: number,
                        stat: {
                            name: string;
                        }
                    }[]
                }
            },
            {
                status: number,
                statusText: string,
                data: IPokemonSpecies
            }
        ] = await Promise.all([
            PokeAPIClient.get(`pokemon/${id}`),
            PokeAPIClient.get(`pokemon-species/${id}`)
        ]);

        let infos: {
            descriptions: {
                version: string,
                description: string;
            }[],
            evolutionChain: { name: string, id: number, level: number | null }[]
            sprites: {
                label: string,
                url: string,
            }[],
            regions: string[],
            stats: {
                name: string,
                value: number
            }[]
        } = {
            descriptions: [],
            evolutionChain: [],
            sprites: [],
            regions: [],
            stats: []
        }

        const descriptions = pokemonSpecies.data.flavor_text_entries.filter((e) => e.language.name === 'en').map((e) => {
            infos.regions.push(e.version.name);
            return {
                version: e.version.name,
                description: e.flavor_text
            }
        });

        infos['descriptions'] = descriptions;

        const evolutionChainId = pokemonSpecies.data.evolution_chain.url.replace("https://pokeapi.co/api/v2/evolution-chain/", "").replace("/", "");
        const evolutionChain = await PokeAPIClient.get(`evolution-chain/${evolutionChainId}`);

        const extractEvolutionChain = (chain: any, evolutions: { name: string, id: number, level: number | null }[] = []) => {
            const pokemonId = parseInt(chain.species.url.replace("https://pokeapi.co/api/v2/pokemon-species/", "").replace("/", ""));
            const pokename = chain.species.name;
            const level = chain.evolution_details[0]?.min_level || null;
            evolutions.push({ name: pokename, id: pokemonId, level });
            if (chain.evolves_to.length > 0) {
                chain.evolves_to.forEach((evolution: any) => {
                    extractEvolutionChain(evolution, evolutions);
                });
            }
        }

        const evolutions: { name: string, id: number, level: number | null }[] = [];
        extractEvolutionChain(evolutionChain.data.chain, evolutions);
        infos['evolutionChain'] = evolutions;

        infos['sprites'] = [
            {
                label: "official",
                url: sprite(parseInt(id))
            },
            {
                label: "default",
                url: spriteDefault(parseInt(id))
            },
            {
                label: "shiny",
                url: spriteShiny(parseInt(id))
            },
            {
                label: "back",
                url: spriteBack(parseInt(id))
            }
        ];

        const stats = pokemon.data.stats.map((stat) => {
            return {
                name: stat.stat.name,
                value: stat.base_stat
            }
        });
        infos['stats'] = stats;

        // console.log(infos)


        return infos
    }
      
}