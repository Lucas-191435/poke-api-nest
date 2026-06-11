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

@ApiTags('pokemon-move')
@Controller("pokemon-move")
export class PokemonMoveController {
    constructor(private readonly pokemonMoveService: PokemonMoveService) { }

    @Get(':id')
    @HttpCode(200)
    @ApiOperation({ summary: 'Obtém todos os Pokémons de um usuário' })
    @ApiResponse({ status: 200, description: 'Pokémons obtidos com sucesso' })
    @ApiResponse({ status: 400, description: 'Erro ao obter Pokémons' })
    getAllPokemonsOfUser(@Param('id') id: string) {
        return this.pokemonMoveService.getPokemonMove({ id });
    }
}