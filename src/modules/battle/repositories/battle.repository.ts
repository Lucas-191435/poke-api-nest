import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "src/common/auth/jwt.strategy";
import { PrismaService } from "src/common/database/prisma.service";
import { Move, MyPokemon, Pokemon, Prisma } from "src/generated/prisma/client";
import { BattleStatus } from "src/generated/prisma/enums";
import { RECENT_TURN_LOGS_LIMIT } from "../battle.constants";

export type TeamName = "teamAlpha" | "teamBeta" | "teamGamma";

export type TeamMemberForBattle = {
    myPokemon: MyPokemon;
    pokemon: Pokemon;
    moves: Move[];
};

const battleSnapshotInclude = {
    participants: {
        include: {
            pokemons: {
                orderBy: { position: "asc" },
                include: {
                    moves: {
                        include: { move: true },
                    },
                },
            },
        },
    },
    turnLogs: {
        orderBy: { createdAt: "desc" },
        take: RECENT_TURN_LOGS_LIMIT,
    },
} satisfies Prisma.BattleInclude;

@Injectable()
export class BattleRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateToken(token: string) {
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException('Token inválido ou expirado.');
        }

        const user = await this.prisma.user.findFirst({
            where: { id: payload?.id },
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado.');
        }

        return user;
    }

    /**
     * Monta o snapshot do time (MyPokemon + espécie + movimentos escolhidos)
     * a partir do que já está salvo em MyPokemon.teamXMove — nunca lido "ao vivo"
     * depois disso, só no momento de criar/entrar na partida.
     */
    async getTeamForBattle({
        userId,
        teamName,
    }: {
        userId: string;
        teamName: TeamName;
    }): Promise<TeamMemberForBattle[]> {
        const myPokemons = await this.prisma.myPokemon.findMany({
            where: {
                userId,
                [teamName]: true,
            },
            include: {
                pokemon: true,
            },
        });

        if (myPokemons.length === 0) {
            throw new BadRequestException(`Time '${teamName}' está vazio.`);
        }

        const moveIds = Array.from(
            new Set(
                myPokemons.flatMap((mp) => this.getMoveIds(mp, teamName)),
            ),
        );

        const moves = moveIds.length
            ? await this.prisma.move.findMany({ where: { id: { in: moveIds } } })
            : [];
        const moveById = new Map(moves.map((move) => [move.id, move]));

        return myPokemons.map((mp) => {
            const { pokemon, ...myPokemon } = mp;
            const teamMoves = this.getMoveIds(mp, teamName)
                .map((id) => moveById.get(id))
                .filter((move): move is Move => !!move);

            if (teamMoves.length === 0) {
                throw new BadRequestException(
                    `${pokemon.name} não tem nenhum movimento configurado no time '${teamName}'.`,
                );
            }

            return { myPokemon, pokemon, moves: teamMoves };
        });
    }

    createBattle({
        playerAId,
        teamName,
        team,
    }: {
        playerAId: string;
        teamName: TeamName;
        team: TeamMemberForBattle[];
    }) {
        return this.prisma.battle.create({
            data: {
                playerAId,
                status: BattleStatus.WAITING_OPPONENT,
                participants: {
                    create: [
                        {
                            userId: playerAId,
                            teamName,
                            pokemons: {
                                create: this.buildBattlePokemonsCreateInput(team),
                            },
                        },
                    ],
                },
            },
            include: battleSnapshotInclude,
        });
    }

    async joinBattle({
        battleId,
        userId,
        teamName,
        team,
    }: {
        battleId: string;
        userId: string;
        teamName: TeamName;
        team: TeamMemberForBattle[];
    }) {
        return this.prisma.$transaction(async (tx) => {
            const battle = await tx.battle.findUnique({ where: { id: battleId } });

            if (!battle) {
                throw new NotFoundException("Batalha não encontrada.");
            }
            if (battle.status !== BattleStatus.WAITING_OPPONENT) {
                throw new BadRequestException("Batalha não está aguardando oponente.");
            }
            if (battle.playerAId === userId) {
                throw new BadRequestException("Você já é o criador desta batalha.");
            }

            await tx.battleParticipant.create({
                data: {
                    battleId,
                    userId,
                    teamName,
                    pokemons: {
                        create: this.buildBattlePokemonsCreateInput(team),
                    },
                },
            });

            return tx.battle.update({
                where: { id: battleId },
                data: {
                    playerBId: userId,
                    status: BattleStatus.SELECTING_LEAD,
                },
                include: battleSnapshotInclude,
            });
        });
    }

    async getBattleSnapshot(battleId: string) {
        const battle = await this.prisma.battle.findUnique({
            where: { id: battleId },
            include: battleSnapshotInclude,
        });

        if (!battle) {
            throw new NotFoundException("Batalha não encontrada.");
        }

        return battle;
    }

    findParticipantByUser(battleId: string, userId: string) {
        return this.prisma.battleParticipant.findUnique({
            where: { battleId_userId: { battleId, userId } },
            include: { pokemons: true },
        });
    }

    async selectLead({
        participantId,
        battlePokemonId,
    }: {
        participantId: string;
        battlePokemonId: string;
    }) {
        const pokemon = await this.prisma.battlePokemon.findFirst({
            where: { id: battlePokemonId, battleParticipantId: participantId },
        });

        if (!pokemon) {
            throw new BadRequestException("Esse Pokémon não pertence ao seu time nesta batalha.");
        }
        if (pokemon.fainted) {
            throw new BadRequestException("Não é possível escolher um Pokémon desmaiado.");
        }

        return this.prisma.battleParticipant.update({
            where: { id: participantId },
            data: { activeSlot: pokemon.position },
        });
    }

    startBattle(battleId: string) {
        return this.prisma.battle.update({
            where: { id: battleId },
            data: { status: BattleStatus.IN_PROGRESS },
            include: battleSnapshotInclude,
        });
    }

    savePendingAction(participantId: string, pendingAction: Prisma.InputJsonValue) {
        return this.prisma.battleParticipant.update({
            where: { id: participantId },
            data: {
                pendingAction,
                turnState: "ACTION_SUBMITTED",
            },
        });
    }

    private getMoveIds(myPokemon: MyPokemon, teamName: TeamName): string[] {
        const raw = myPokemon[`${teamName}Move` as const] as unknown;
        return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
    }

    private buildBattlePokemonsCreateInput(team: TeamMemberForBattle[]) {
        return team.map(({ myPokemon, pokemon, moves }, index) => ({
            myPokemonId: myPokemon.id,
            position: index,
            maxHp: pokemon.hp,
            currentHp: pokemon.hp,
            atk: pokemon.atk,
            def: pokemon.def,
            spAtk: pokemon.spAtk,
            spDef: pokemon.spDef,
            speed: pokemon.speed,
            moves: {
                create: moves.map((move) => ({
                    moveId: move.id,
                    maxPp: move.pp ?? 0,
                    currentPp: move.pp ?? 0,
                })),
            },
        }));
    }
}
