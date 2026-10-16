import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BattleService } from './services/battle.services';
import { GetUser } from 'src/common/guard/getuser.decorator';
import { CreateBattleDto } from './dto/create-battle.dto';
import { JoinBattleDto } from './dto/join-battle.dto';
import { JoinBattleBotDto } from './dto/join-battle-bot.dto';
import { Throttle } from '@nestjs/throttler';
import { AllowTestRole } from 'src/common/auth/allow-test-role.decorator';
import {
    BattleSnapshotResponseDto,
    CancelBattleResponseDto,
    CreateOrJoinBattleResponseDto,
    DeleteAllBattlesResponseDto,
    FindBattleRoomsResponseDto,
    JoinBattleBotResponseDto,
} from './dto/battleResponse.dto';

@ApiTags('battle')
@Controller("battle")
export class BattleController {
    constructor(private readonly battleService: BattleService) { }

    @Post()
    @HttpCode(200)
    @AllowTestRole()
    @ApiOperation({ summary: 'Cria uma nova batalha' })
    @ApiResponse({ status: 200, description: 'Batalha criada com sucesso', type: CreateOrJoinBattleResponseDto })
    async createBattle(
        @GetUser('id') userId: string,
        @Body() dto: CreateBattleDto,
    ) {
        return this.battleService.createBattle({
            userId,
            teamName: dto.teamName,
        });
    }

    @Post(':id/join')
    @HttpCode(200)
    @AllowTestRole()
    @ApiOperation({ summary: 'Entra em uma batalha existente' })
    @ApiResponse({ status: 200, description: 'Entrou na batalha com sucesso', type: CreateOrJoinBattleResponseDto })
    async joinBattle(
        @Param('id') battleId: string,
        @GetUser('id') userId: string,
        @Body() dto: JoinBattleDto,
    ) {
        return this.battleService.joinBattle({
            battleId,
            userId,
            teamName: dto.teamName,
        });
    }

    @Post(':id/join-bot')
    @HttpCode(200)
    @AllowTestRole()
    @ApiOperation({ summary: 'Entra na batalha com um treinador de teste (bot) como oponente' })
    @ApiResponse({ status: 200, description: 'Bot entrou na batalha com sucesso', type: JoinBattleBotResponseDto })
    async joinBattleWithBot(
        @Param('id') battleId: string,
        @GetUser('id') userId: string,
        @Body() dto: JoinBattleBotDto,
    ) {
        return this.battleService.joinBattleWithBot({
            battleId,
            userId,
            trainerId: dto.trainerId,
        });
    }

    @Delete('all')
    @HttpCode(200)
    @ApiOperation({ summary: 'Exclui todas as batalhas do sistema (irreversível)' })
    @ApiResponse({ status: 200, description: 'Batalhas excluídas com sucesso', type: DeleteAllBattlesResponseDto })
    async deleteAllBattles() {
        return this.battleService.deleteAllBattles();
    }

    // Declarada depois de `DELETE all` pra não capturar "all" como :id.
    @Delete(':id')
    @HttpCode(200)
    @AllowTestRole()
    @ApiOperation({ summary: 'Cancela uma sala que ainda está aguardando oponente (só o criador)' })
    @ApiResponse({ status: 200, description: 'Sala cancelada com sucesso', type: CancelBattleResponseDto })
    async cancelBattle(
        @Param('id') battleId: string,
        @GetUser('id') userId: string,
    ) {
        return this.battleService.cancelBattle({ battleId, userId });
    }

    @Get('rooms')
    @Throttle({
        default: {
            limit: 100,
            ttl: 60000,
        },
    })
    @ApiOperation({ summary: 'Lista salas de batalha aguardando oponente' })
    @ApiQuery({
        name: 'page',
        description: 'Número da página para paginação',
        required: false,
        type: Number,
    })
    @ApiQuery({
        name: 'pageSize',
        description: 'Número de itens por página (padrão 10)',
        required: false,
        type: Number,
    })
    @ApiQuery({
        name: 'search',
        description: 'Filtra pelo nome ou e-mail de quem criou a sala',
        required: false,
        type: String,
    })
    @ApiResponse({ status: 200, description: 'Salas retornadas com sucesso', type: FindBattleRoomsResponseDto })
    async findBattleRooms(
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ) {
        return this.battleService.findBattleRooms({ page, pageSize, search });
    }

    @Get(':id')
      @Throttle({
      default: {
        limit: 100,
        ttl: 60000,
      },
    })
    @ApiOperation({ summary: 'Obtém o snapshot completo de uma batalha' })
    @ApiResponse({ status: 200, description: 'Batalha retornada com sucesso', type: BattleSnapshotResponseDto })
    async getBattle(
        @Param('id') battleId: string,
        @GetUser('id') userId: string,
    ) {
        return this.battleService.getBattleSnapshot({ battleId, userId });
    }
}
