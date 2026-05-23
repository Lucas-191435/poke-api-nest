import { Controller, Get, Query } from '@nestjs/common';
import { PokemonService } from './pokemon.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';


@ApiTags('pokemon')
@Controller("pokemon")
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista paginada de Pokémon' })
  @ApiQuery({
    name: 'page',
    description: 'Número da página para paginação',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Número de itens por página',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'query',
    description: 'Consulta de pesquisa',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'types',
    description: 'Tipos de Pokémon para filtragem',
    required: false,
    type: [String],
  })
  @ApiQuery({
    name: 'weight',
    description: 'Peso do Pokémon para filtragem',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de Pokémon retornada com sucesso',
  })
  async getPokemons(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('types') types?: string[],
    @Query('weight') weight?: string,
    @Query('query') query?: string,
  ){
    return this.pokemonService.getPokemons({ page, pageSize, types, weight, query, });
  }
}
