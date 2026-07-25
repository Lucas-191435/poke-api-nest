import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
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
    async getMessages(
        @GetUser('id') userId: string,
        @Body() dto: CreateBattleDto,
    ) {

    }

    @Post('/:id/join')
    @HttpCode(200)
    async joinBattle(
        @Param('id')
        @GetUser('id') userId: string,
        @Body() dto: JoinBattleDto,
    ) {

    }

    @Get('/battle/:id')
    async getChatRoomOfUser(
        @Param('id')
        @GetUser('id') userId: string,
    ) {

    }
}