import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { MyPokemonService } from './myPokemon.service';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { CapturePokemonDto, LeavePokemonDto, UpdatePokemonTeamDto } from './dto';
import { GetUser } from 'src/common/guard/getuser.decorator';

@ApiTags('my-pokemon')
@Controller("my-pokemon")
export class MyPokemonController {
    constructor(private readonly myPokemonService: MyPokemonService) { }

    @Get()
    @HttpCode(200)
    @ApiOperation({ summary: 'Obtém todos os Pokémons de um usuário' })
    @ApiResponse({ status: 200, description: 'Pokémons obtidos com sucesso' })
    @ApiResponse({ status: 400, description: 'Erro ao obter Pokémons' })
    getAllPokemonsOfUser(@GetUser('id') userId: string) {
        return this.myPokemonService.getAllPokemonsOfUser({ userId });
    }

    @Post('capture')
    @HttpCode(200)
    @ApiOperation({ summary: 'Captura um Pokémon' })
    @ApiResponse({ status: 200, description: 'Pokémon capturado com sucesso' })
    @ApiResponse({ status: 400, description: 'Erro ao capturar Pokémon' })
    capturePokemon(@Body() dto: CapturePokemonDto) {
        return this.myPokemonService.capturePokemon(dto);
    }


    @Delete('leave')
    @HttpCode(200)
    @ApiOperation({ summary: 'Libera um Pokémon' })
    @ApiResponse({ status: 200, description: 'Pokémon liberado com sucesso' })
    @ApiResponse({ status: 400, description: 'Erro ao liberar Pokémon' })
    leavePokemon(@Body() dto: LeavePokemonDto) {
        return this.myPokemonService.leavePokemon(dto);
    }


    @Put('update-team')
    @HttpCode(200)
    @ApiOperation({ summary: 'Atualiza o time de Pokémons' })
    @ApiResponse({ status: 200, description: 'Time atualizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Erro ao atualizar o time' })
    updatePokemonTeam(@Body() dto: UpdatePokemonTeamDto) {
        return this.myPokemonService.updatePokemonTeam(dto);
    }
}