import { Injectable } from '@nestjs/common';
import { MyPokemonRepository } from './myPokemon.repository';
import { CapturePokemonDto,  UpdatePokemonMovesDto, UpdatePokemonTeamDto } from './dto';

@Injectable()
export class MyPokemonService {
    constructor(
        private readonly myPokemonRepository: MyPokemonRepository,
    ) { }

    async getAllPokemonsOfUser(dto: { userId: string }) {
        const pokemon = await this.myPokemonRepository.getAllPokemonsOfUser(dto);
        return pokemon;
    }

    async capturePokemon(dto: CapturePokemonDto & { userId: string }) {
        const pokemon = await this.myPokemonRepository.capturePokemon(dto);
        return pokemon;
    }

    async leavePokemon(dto: { pokemonId: string, userId: string }) {
        const result = await this.myPokemonRepository.leavePokemon(dto);
        return result;
    }

    async updatePokemonTeam(dto: UpdatePokemonTeamDto & { userId: string }) {
        const result = await this.myPokemonRepository.updatePokemonTeam(dto);
        return result;
    }

    async updatePokemonMoves(dto:  { userId: string, data: UpdatePokemonMovesDto }) {
        const result = await this.myPokemonRepository.updatePokemonMoves(dto);
        return result;
    }
}