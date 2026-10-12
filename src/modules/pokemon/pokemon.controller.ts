import { BadRequestException, Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { PokemonService } from './pokemon.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { FindPokemonsResponseDto, PokemonDetailResponseDto } from './dto/pokemonResponse.dto';
import { GetPokemonsQueryDto } from './dto/getPokemonsQuery.dto';


@ApiTags('pokemon')
@Controller("pokemon")
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) { }


  @Get()
  @Throttle({
  default: {
    limit: 100,
    ttl: 60000,
  },
})
  @ApiOperation({ summary: 'Lista paginada de Pokémon' })
  @ApiResponse({
    status: 200,
    description: 'Lista de Pokémon retornada com sucesso',
    type: FindPokemonsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Filtro inválido' })
  async getPokemons(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) params: GetPokemonsQueryDto,
  ) {
    return this.pokemonService.getPokemons(params);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Detalhes do Pokémon retornados com sucesso',
    type: PokemonDetailResponseDto,
  })
  @ApiOperation({ summary: 'Detalhes de um Pokémon' })
  async getPokemon(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('ID é obrigatório');
    }
    return this.pokemonService.getPokemon(id);
  }
}
