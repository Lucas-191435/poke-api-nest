import { Injectable } from '@nestjs/common';
import { PokemonRepository } from './pokemon.repository';

@Injectable()
export class PokemonService {

    constructor(
        private readonly pokemonRepository: PokemonRepository,
    ) { }

    async getPokemons({
        page = 1,
        pageSize =30,
        query = '',
        types,
        weight,
    }: { page?: number; pageSize?: number; query?: string; types?: string[]; weight?: string }) {

        const pokemons = await this.pokemonRepository.getPokemons({ page, pageSize, query, types, weight });
        return pokemons;
    }
}

