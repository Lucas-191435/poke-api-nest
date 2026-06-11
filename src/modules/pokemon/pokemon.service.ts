import { Injectable } from '@nestjs/common';
import { PokemonRepository } from './pokemon.repository';
import { PokeApiService } from './pokeApi/pokeApi.service';

@Injectable()
export class PokemonService {

    constructor(
        private readonly pokemonRepository: PokemonRepository,
        private readonly pokeAPIService: PokeApiService,
    ) { }

    async getPokemons({
        page = 1,
        pageSize = 30,
        query = '',
        types,
        weight,
    }: { page?: number; pageSize?: number; query?: string; types?: string[]; weight?: string }) {
        const pokemons = await this.pokemonRepository.getPokemons({
            page: parseInt(String(page)),
            pageSize: parseInt(String(pageSize)),
            query,
            types,
            weight
        });
        return pokemons;
    }

    async getPokemon(id: string) {
        const pokemon = await this.pokemonRepository.getPokemon(id);

        const pokemonInfos = await this.pokeAPIService.pokemonInfos(id);

        return { ...pokemon, ...pokemonInfos }
    }
}
