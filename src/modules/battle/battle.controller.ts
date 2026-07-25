import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BattleService } from './services/battle.services';
import { GetUser } from 'src/common/guard/getuser.decorator';
import { CreateBattleDto } from './dto/create-battle.dto';
import { JoinBattleDto } from './dto/join-battle.dto';

@ApiTags('battle')
@Controller("battle")
export class BattleController {
    constructor(private readonly battleService: BattleService) { }

    @Post()
    @HttpCode(200)
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

    @Get(':id')
    async getBattle(
        @Param('id') battleId: string,
        @GetUser('id') userId: string,
    ) {
        return this.battleService.getBattleSnapshot({ battleId, userId });
    }
}
