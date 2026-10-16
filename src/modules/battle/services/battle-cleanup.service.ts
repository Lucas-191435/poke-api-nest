import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BattleRepository } from '../repositories/battle.repository';
import { STALE_BATTLE_TIMEOUT_MS } from '../battle.constants';

/**
 * Remove batalhas abandonadas: sala criada e nunca iniciada, jogador que saiu no meio
 * da seleção de lead ou da partida. Ver `BattleRepository.deleteStaleBattles`.
 */
@Injectable()
export class BattleCleanupService {
    private readonly logger = new Logger(BattleCleanupService.name);
    private running = false;

    constructor(private readonly battleRepository: BattleRepository) { }

    @Cron(CronExpression.EVERY_10_MINUTES, { name: 'delete-stale-battles' })
    async deleteStaleBattles() {
        // Evita duas execuções sobrepostas se o banco remoto estiver lento.
        if (this.running) return;
        this.running = true;

        try {
            const inactiveSince = new Date(Date.now() - STALE_BATTLE_TIMEOUT_MS);
            const { count } = await this.battleRepository.deleteStaleBattles(inactiveSince);
            if (count > 0) {
                this.logger.log(`Batalhas abandonadas apagadas count=${count}`);
            }
        } catch (error) {
            this.logger.error(`Falha ao apagar batalhas abandonadas: ${(error as Error).message}`);
        } finally {
            this.running = false;
        }
    }
}
