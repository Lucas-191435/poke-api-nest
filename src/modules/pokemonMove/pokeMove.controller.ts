import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { GetUser } from 'src/common/guard/getuser.decorator';
import { PokemonMoveService } from './pokeMove.service';
import { GetPokemonMoveResponseDto } from './dto/pokeMoveResponse.dto';

@ApiTags('pokemon-move')
@Controller("pokemon-move")
export class PokemonMoveController {
    constructor(private readonly pokemonMoveService: PokemonMoveService) { }

    @Get(':id')
    @HttpCode(200)
    @ApiOperation({ summary: 'Obtém os movimentos de um Pokémon' })
    @ApiResponse({ status: 200, description: 'Movimentos obtidos com sucesso', type: GetPokemonMoveResponseDto })
    @ApiResponse({ status: 400, description: 'Erro ao obter movimentos' })
    getAllPokemonsOfUser(@Param('id') id: string) {
        return this.pokemonMoveService.getPokemonMove({ id });
    }
}