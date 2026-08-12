import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BattleService } from './services/battle.services';
import { BattleEngineService } from './services/battle-engine.service';
import { BattleAiService } from './services/battle-ai.service';
import { BattleRepository } from './repositories/battle.repository';
import { BattleGateway } from './gateways/battle.gateway';
import { BattleController } from './battle.controller';
import authConfig from 'src/config/authConfig';

@Module({
  imports: [
    JwtModule.register({
      secret: authConfig.secret,
      signOptions: {
        expiresIn: authConfig.expiresIn,
        algorithm: authConfig.algorithm,
      },
    }),
  ],
  controllers: [BattleController],
  providers: [BattleGateway, BattleService, BattleEngineService, BattleAiService, BattleRepository],
})
export class BattleModule {}

