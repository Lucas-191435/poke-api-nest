import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "src/common/auth/jwt.strategy";
import { PrismaService } from "src/common/database/prisma.service";
import { Move, MyPokemon, Pokemon, Prisma } from "src/generated/prisma/client";
import { BattleActionType, BattleStatus, BattleTurnState } from "src/generated/prisma/enums";
import { RECENT_TURN_LOGS_LIMIT } from "../battle.constants";
import { EngineParticipant, ResolveTurnResult, TurnLogEntry } from "../services/battle-engine.service";

// Margem pra latência do banco remoto; o padrão do Prisma (5s) não cobre turnos com muitos updates.
const TURN_TRANSACTION_TIMEOUT_MS = 15_000;

export type TeamName = "teamAlpha" | "teamBeta" | "teamGamma";

export type TeamMemberForBattle = {
    myPokemon: MyPokemon;
    pokemon: Pokemon;
    moves: Move[];
};

const participantForResolutionInclude = {
    pokemons: {
        orderBy: { position: "asc" },
        include: {
            moves: { include: { move: true } },
            myPokemon: { include: { pokemon: { select: { pokeId: true, name: true, img1: true, types: true } } } },
        },
    },
} satisfies Prisma.BattleParticipantInclude;

export type ParticipantForResolution = Prisma.BattleParticipantGetPayload<{
    include: typeof participantForResolutionInclude;
}>;

const battleSnapshotInclude = {
    participants: {
        include: {
            pokemons: {
                orderBy: { position: "asc" },
                include: {
                    moves: {
                        include: { move: true },
                    },
                    myPokemon: { include: { pokemon: { select: { pokeId: true, name: true, img1: true, types: true } } } }
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

    /**
     * Escolhe o treinador de teste que vai virar o bot: um específico (validado como role TEST),
     * ou um sorteado entre os `role: TEST` existentes, excluindo o próprio usuário que está chamando
     * `join-bot` (caso ele mesmo seja uma conta TEST).
     */
    async pickTestTrainer({
        excludeUserId,
        trainerId,
    }: {
        excludeUserId: string;
        trainerId?: string;
    }) {
        if (trainerId) {
            const trainer = await this.prisma.user.findFirst({
                where: { id: trainerId, role: "TEST" },
            });
            if (!trainer) {
                throw new BadRequestException("Treinador de teste não encontrado.");
            }
            return trainer;
        }

        const candidates = await this.prisma.user.findMany({
            where: { role: "TEST", id: { not: excludeUserId } },
        });
        if (candidates.length === 0) {
            throw new BadRequestException("Nenhum treinador de teste disponível.");
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /** Mesma validação/transação de `joinBattle`, mas quem entra é um treinador de teste marcado `isBot: true`. */
    async joinBattleWithBot({
        battleId,
        callerUserId,
        trainerUserId,
        teamName,
        team,
    }: {
        battleId: string;
        callerUserId: string;
        trainerUserId: string;
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
            if (battle.playerAId !== callerUserId) {
                throw new ForbiddenException("Só quem criou a batalha pode adicionar um bot.");
            }

            await tx.battleParticipant.create({
                data: {
                    battleId,
                    userId: trainerUserId,
                    teamName,
                    isBot: true,
                    pokemons: {
                        create: this.buildBattlePokemonsCreateInput(team),
                    },
                },
            });

            return tx.battle.update({
                where: { id: battleId },
                data: {
                    playerBId: trainerUserId,
                    status: BattleStatus.SELECTING_LEAD,
                },
                include: battleSnapshotInclude,
            });
        });
    }

    /** Apaga todas as batalhas do sistema (e registros dependentes), sem distinção de status. */
    async deleteAllBattles() {
        return this.prisma.$transaction(async (tx) => {
            await tx.battlePokemonMove.deleteMany({});
            await tx.battlePokemon.deleteMany({});
            await tx.battleTurnLog.deleteMany({});
            await tx.battleParticipant.deleteMany({});
            const { count } = await tx.battle.deleteMany({});
            return { count };
        });
    }

    async findBattleRooms({
        page = 1,
        pageSize = 10,
        search,
    }: {
        page?: number;
        pageSize?: number;
        search?: string;
    }) {
        const where: Prisma.BattleWhereInput = {
            status: BattleStatus.WAITING_OPPONENT,
            ...(search
                ? {
                    playerA: {
                        OR: [
                            { name: { contains: search } },
                            { email: { contains: search } },
                        ],
                    },
                }
                : {}),
        };

        const [battles, count] = await Promise.all([
            this.prisma.battle.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    playerA: { select: { id: true, name: true, email: true } },
                },
            }),
            this.prisma.battle.count({ where }),
        ]);

        return { battles, count, page, pageSize };
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
                turnState: BattleTurnState.ACTION_SUBMITTED,
            },
        });
    }

    /** Estado completo dos dois participantes (Pokémon, PP, tipos da espécie) pra montar o input do battle-engine. */
    getParticipantsForResolution(battleId: string) {
        return this.prisma.battleParticipant.findMany({
            where: { battleId },
            include: participantForResolutionInclude,
        });
    }

    /** Troca aplicada fora do fluxo normal de turno, quando o Pokémon ativo acabou de desmaiar. */
    async applyForcedSwitch({
        battleId,
        turnNumber,
        participantId,
        battlePokemonId,
    }: {
        battleId: string;
        turnNumber: number;
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

        return this.prisma.$transaction(async (tx) => {
            const participant = await tx.battleParticipant.update({
                where: { id: participantId },
                data: { activeSlot: pokemon.position, turnState: BattleTurnState.WAITING_ACTION },
            });

            await tx.battleTurnLog.create({
                data: {
                    battleId,
                    turnNumber,
                    actorParticipantId: participantId,
                    actionType: BattleActionType.SWITCH,
                    payload: { event: "switch", participantId, battlePokemonId },
                },
            });

            return participant;
        });
    }

    /**
     * Persiste o resultado do battle-engine numa transação: HP/PP/fainted, log do turno e o avanço da batalha.
     * Só grava Pokémon e golpes que mudaram em relação a `previousParticipants` (o input do engine):
     * gravar os 6 Pokémon × 4 golpes dos dois lados a cada turno estourava o timeout da transação
     * com o banco remoto.
     */
    async persistTurnResolution({
        battleId,
        turnNumber,
        result,
        previousParticipants,
        participantUserIds,
    }: {
        battleId: string;
        turnNumber: number;
        result: ResolveTurnResult;
        previousParticipants: EngineParticipant[];
        participantUserIds: Record<string, string>;
    }) {
        const previousPokemons = new Map(
            previousParticipants.flatMap((p) => p.pokemons).map((pokemon) => [pokemon.battlePokemonId, pokemon]),
        );

        return this.prisma.$transaction(async (tx) => {
            for (const participant of result.participants) {
                const turnState = result.finished
                    ? BattleTurnState.WAITING_ACTION
                    : result.forcedSwitchParticipantIds.includes(participant.participantId)
                        ? BattleTurnState.WAITING_FORCED_SWITCH
                        : BattleTurnState.WAITING_ACTION;

                await tx.battleParticipant.update({
                    where: { id: participant.participantId },
                    data: {
                        activeSlot: participant.activeSlot,
                        pendingAction: Prisma.JsonNull,
                        turnState,
                    },
                });

                for (const pokemon of participant.pokemons) {
                    const previous = previousPokemons.get(pokemon.battlePokemonId);
                    const pokemonChanged =
                        !previous ||
                        previous.currentHp !== pokemon.currentHp ||
                        previous.fainted !== pokemon.fainted ||
                        previous.statusCondition !== pokemon.statusCondition ||
                        previous.statusCounter !== pokemon.statusCounter ||
                        JSON.stringify(previous.statStages) !== JSON.stringify(pokemon.statStages);

                    if (pokemonChanged) {
                        await tx.battlePokemon.update({
                            where: { id: pokemon.battlePokemonId },
                            data: {
                                currentHp: pokemon.currentHp,
                                fainted: pokemon.fainted,
                                statusCondition: pokemon.statusCondition,
                                statusCounter: pokemon.statusCounter,
                                statStages: pokemon.statStages,
                            },
                        });
                    }

                    for (const move of pokemon.moves) {
                        const previousPp = previous?.moves.find(
                            (m) => m.battlePokemonMoveId === move.battlePokemonMoveId,
                        )?.currentPp;
                        if (previousPp === move.currentPp) continue;

                        await tx.battlePokemonMove.update({
                            where: { id: move.battlePokemonMoveId },
                            data: { currentPp: move.currentPp },
                        });
                    }
                }
            }

            const logEntries = result.log.filter((entry) => entry.event !== "battle-ended");

            if (logEntries.length) {
                await tx.battleTurnLog.createMany({
                    data: logEntries.map((entry) => ({
                        battleId,
                        turnNumber,
                        actorParticipantId: "participantId" in entry ? entry.participantId : null,
                        actionType: this.mapLogEventToActionType(entry),
                        payload: entry,
                    })),
                });
            }

            return tx.battle.update({
                where: { id: battleId },
                data: {
                    turnNumber: turnNumber + 1,
                    ...(result.finished
                        ? {
                            status: BattleStatus.FINISHED,
                            winnerId: result.winnerParticipantId
                                ? participantUserIds[result.winnerParticipantId]
                                : null,
                        }
                        : {}),
                },
                include: battleSnapshotInclude,
            });
        }, { timeout: TURN_TRANSACTION_TIMEOUT_MS });
    }

    private mapLogEventToActionType(entry: Exclude<TurnLogEntry, { event: "battle-ended" }>): BattleActionType {
        switch (entry.event) {
            case "switch":
                return BattleActionType.SWITCH;
            // O Prisma não tem um BattleActionType dedicado pra eventos de status/stat —
            // o payload já carrega o `event` específico pra quem consome o log.
            case "move":
            case "move-failed":
            case "status-applied":
            case "status-blocked":
            case "confusion-hit":
            case "status-tick":
            case "status-cured":
            case "stat-change":
            case "heal":
            case "recoil":
                return BattleActionType.MOVE;
            case "forfeit":
                return BattleActionType.FORFEIT;
        }
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
