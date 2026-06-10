import { Injectable } from '@nestjs/common';
import { MyPokemonRepository } from './myPokemon.repository';
import { CapturePokemonDto, LeavePokemonDto, UpdatePokemonTeamDto } from './dto';

@Injectable()
export class MyPokemonService {
    constructor(
        private readonly myPokemonRepository: MyPokemonRepository,
    ) { }

    async getAllPokemonsOfUser(dto: { userId: string }) {
        const pokemon = await this.myPokemonRepository.getAllPokemonsOfUser(dto);
        return pokemon;
    }

    async capturePokemon(dto: CapturePokemonDto) {
        const pokemon = await this.myPokemonRepository.capturePokemon(dto);
        return pokemon;
    }

    async leavePokemon(dto: LeavePokemonDto) {
        const result = await this.myPokemonRepository.leavePokemon(dto);
        return result;
    }

    async updatePokemonTeam(dto: UpdatePokemonTeamDto) {
        const result = await this.myPokemonRepository.updatePokemonTeam(dto);
        return result;
    }

}