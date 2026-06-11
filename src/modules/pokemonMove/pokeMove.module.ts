import { Module } from '@nestjs/common';
import { PokemonMoveService } from './pokeMove.service';
import { PokemonMoveRepository } from './pokeMove.repository';
import { PokemonMoveController } from './pokeMove.controller';

@Module({
  imports: [],
  controllers: [PokemonMoveController],
  providers: [PokemonMoveService, PokemonMoveRepository],
})
export class PokemonMoveModule {}
