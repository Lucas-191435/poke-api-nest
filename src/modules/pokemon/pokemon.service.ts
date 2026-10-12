import { Injectable } from '@nestjs/common';
import { PokemonRepository } from './pokemon.repository';
import { PokeApiService } from './pokeApi/pokeApi.service';
import { GetPokemonsQueryDto } from './dto/getPokemonsQuery.dto';

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
        regions,
    }: GetPokemonsQueryDto) {
        const pokemons = await this.pokemonRepository.getPokemons({
            page,
            pageSize,
            query,
            types,
            regions,
        });
        return pokemons;
    }

    async getPokemon(id: string) {
        const pokemon = await this.pokemonRepository.getPokemon(id);

        const pokemonInfos = await this.pokeAPIService.pokemonInfos(id);

        return { ...pokemon, ...pokemonInfos }
    }
}
