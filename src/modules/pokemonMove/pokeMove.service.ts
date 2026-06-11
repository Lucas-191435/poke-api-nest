import { Injectable } from '@nestjs/common';
import { PokemonMoveRepository } from './pokeMove.repository';

@Injectable()
export class PokemonMoveService {
    constructor(
        private readonly pokemonMoveRepository: PokemonMoveRepository,
    ) { }

    async getPokemonMove({ id }: { id: string }) {
        const pokeMove = await this.pokemonMoveRepository.getPokemonMove(id);

        return pokeMove
    }
}