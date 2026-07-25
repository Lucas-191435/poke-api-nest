import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BattleRepository } from '../repositories/battle.repository';

@Injectable()
export class BattleService {
    constructor(
        private readonly battleRepository: BattleRepository,
    ) { }

    async validateToken(token: string) {
        return this.battleRepository.validateToken(token);
    }

}