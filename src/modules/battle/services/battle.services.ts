import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { BattleRepository, TeamName } from '../repositories/battle.repository';
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '../battle.constants';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class BattleService {
    constructor(
        private readonly battleRepository: BattleRepository,
    ) { }

    async validateToken(token: string) {
        return this.battleRepository.validateToken(token);
    }

    async createBattle({ userId, teamName }: { userId: string; teamName: TeamName }) {
        const team = await this.battleRepository.getTeamForBattle({ userId, teamName });
        this.assertValidTeamSize(team.length);

        const battle = await this.battleRepository.createBattle({
            playerAId: userId,
            teamName,
            team,
        });

        return { id: battle.id };
    }

    async joinBattle({
        battleId,
        userId,
        teamName,
    }: {
        battleId: string;
        userId: string;
        teamName: TeamName;
    }) {
        const team = await this.battleRepository.getTeamForBattle({ userId, teamName });
        this.assertValidTeamSize(team.length);

        const battle = await this.battleRepository.joinBattle({
            battleId,
            userId,
            teamName,
            team,
        });

        return { id: battle.id };
    }

    async getBattleSnapshot({ battleId, userId }: { battleId: string; userId: string }) {
        const battle = await this.battleRepository.getBattleSnapshot(battleId);
        this.assertIsParticipant(battle, userId);
        return battle;
    }

    async getParticipantOrThrow(battleId: string, userId: string) {
        const participant = await this.battleRepository.findParticipantByUser(battleId, userId);
        if (!participant) {
            throw new ForbiddenException('Você não participa desta batalha.');
        }
        return participant;
    }

    async selectLead({
        battleId,
        userId,
        battlePokemonId,
    }: {
        battleId: string;
        userId: string;
        battlePokemonId: string;
    }) {
        const participant = await this.getParticipantOrThrow(battleId, userId);
        return this.battleRepository.selectLead({
            participantId: participant.id,
            battlePokemonId,
        });
    }

    async submitAction({
        battleId,
        userId,
        action,
    }: {
        battleId: string;
        userId: string;
        action: Prisma.InputJsonValue;
    }) {
        const participant = await this.getParticipantOrThrow(battleId, userId);
        return this.battleRepository.savePendingAction(participant.id, action);
    }

    startBattle(battleId: string) {
        return this.battleRepository.startBattle(battleId);
    }

    private assertValidTeamSize(size: number) {
        if (size < MIN_TEAM_SIZE || size > MAX_TEAM_SIZE) {
            throw new BadRequestException(
                `O time deve ter entre ${MIN_TEAM_SIZE} e ${MAX_TEAM_SIZE} Pokémon.`,
            );
        }
    }

    private assertIsParticipant(
        battle: { playerAId: string; playerBId: string | null },
        userId: string,
    ) {
        if (battle.playerAId !== userId && battle.playerBId !== userId) {
            throw new ForbiddenException('Você não participa desta batalha.');
        }
    }
}
