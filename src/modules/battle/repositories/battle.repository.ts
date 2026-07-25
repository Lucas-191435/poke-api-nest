import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "src/common/auth/jwt.strategy";
import { PrismaService } from "src/common/database/prisma.service";
import { Pokemon } from "src/generated/prisma/client";

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

        // console.log('ChatRepository.validateToken called with payload:', payload);
        const user = await this.prisma.user.findFirst({
            where: { id: payload?.id },
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado.');
        }

        return user;
    }

    async getPokemonOfTeam({
        userId,
        teamName,
    }: {
        userId: string,
        teamName: string,
    }) {
        const pokemon = await this.prisma.pokemon.findMany({
            where: {
                myPokemons: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                myPokemons: {
                    where: {
                        userId,
                        [teamName]: true
                    },
                },
            },
        });

        return pokemon

    }
    async createBattle({
            playerAId,
            teamName,
            myPokemons,
        }: {
            playerAId: string,
            teamName: string,
            myPokemons: Pokemon[]
        }) {
            const battle = await this.prisma.battle.create({
                data: {
                    playerAId: playerAId,
                    status: 'WAITING_OPPONENT',
                    participants: {
                        create: [
                            {
                                userId: playerAId,
                                teamName: teamName,
                                pokemons: {
                                    create: myPokemons.map((mp, index) => ({
                                        myPokemonId: mp.id,
                                        position: index,
                                        maxHp: mp.hp,
                                        currentHp: mp.hp,
                                        atk: mp.atk,
                                        def: mp.def,
                                        spAtk: mp.spAtk,
                                        spDef: mp.spDef,
                                        speed: mp.speed,
                                    })),
                                },
                            },
                        ],
                    },
                },
                include: {
                    participants: {
                        include: {
                            pokemons: true,
                        },
                    },
                },
            });
        }


    }