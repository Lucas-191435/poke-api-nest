import { Module } from '@nestjs/common';
import { MyPokemonController } from './myPokemon.controller';
import { MyPokemonService } from './myPokemon.service';
import { MyPokemonRepository } from './myPokemon.repository';

@Module({
  imports: [],
  controllers: [MyPokemonController],
  providers: [MyPokemonService, MyPokemonRepository],
})
export class MyPokemonModule {}
