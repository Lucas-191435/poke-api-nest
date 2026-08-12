import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BattleService } from './services/battle.services';
import { GetUser } from 'src/common/guard/getuser.decorator';
import { CreateBattleDto } from './dto/create-battle.dto';
import { JoinBattleDto } from './dto/join-battle.dto';
import { JoinBattleBotDto } from './dto/join-battle-bot.dto';
import { Throttle } from '@nestjs/throttler';
import { AllowTestRole } from 'src/common/auth/allow-test-role.decorator';

@ApiTags('battle')
@Controller("battle")
export class BattleController {
    constructor(private readonly battleService: BattleService) { }

    @Post()
    @HttpCode(200)
    @AllowTestRole()
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
    async deleteAllBattles() {
        return this.battleService.deleteAllBattles();
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
    async getBattle(
        @Param('id') battleId: string,
        @GetUser('id') userId: string,
    ) {
        return this.battleService.getBattleSnapshot({ battleId, userId });
    }
}
