import { Module } from '@nestjs/common';
import { PokemonController } from './pokemon.controller';
import { PokemonService } from './pokemon.service';
import { PokemonRepository } from './pokemon.repository';
import { PokeApiService } from './pokeApi/pokeApi.service';

@Module({
  imports: [],
  controllers: [PokemonController],
  providers: [PokemonService, PokeApiService, PokemonRepository],
})
export class PokemonModule {}
