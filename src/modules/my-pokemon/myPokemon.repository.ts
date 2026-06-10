import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import { UpdatePokemonMovesDto } from "./dto";

@Injectable()
export class MyPokemonRepository {
    constructor(private readonly prisma: PrismaService) { }

    getAllPokemonsOfUser = async ({ userId }: { userId: string }) => {
        const pokemons = await this.prisma.myPokemon.findMany({
            where: {
                userId,
            },
            include: {
                pokemon: {
                    select: {
                        id: true,
                        pokeId: true,
                        name: true,
                        img1: true,
                        types: true,
                    },
                },
            },
        });

        return pokemons;
    }

    capturePokemon = async ({
        userId, pokemonId, nickname
    }: {
        userId: string,
        pokemonId: string,
        nickname: string,
    }) => {
        const existingPokemon = await this.prisma.myPokemon.findFirst({
            where: {
                userId,
                pokemonId
            }
        });

        if (existingPokemon) {
            console.log(existingPokemon);
            throw new BadRequestException("Pokemon já capturado pelo usuário");
        }

        const countAllCapturedPokemons = await this.prisma.myPokemon.count({
            where: {
                userId
            }
        });

        if (countAllCapturedPokemons >= 20) {
            throw new BadRequestException("Usuário não pode capturar mais de 20 pokemons");
        }

        const pokemon = await this.prisma.myPokemon.create({
            data: {
                userId,
                pokemonId,
                nickname
            }
        });

        return pokemon;
    }

    leavePokemon = async ({ userId, pokemonId }: { userId: string, pokemonId: string }) => {
        await this.prisma.myPokemon.delete({
            where: {
                userId,
                id: pokemonId
            }
        });

        Logger.log(`Remove Pokémon with ID ${pokemonId} in collection of user ${userId}`);
        return {
            message: "Pokemon liberado com sucesso"
        };
    }

    updatePokemonTeam = async ({ userId, teamName, team }: { userId: string, teamName: string, team: string[] }) => {
        if (!teamName || !Array.isArray(team)) {
            throw new BadRequestException("Parâmetros inválidos: 'teamName' deve ser uma string e 'team' deve ser um array.");
        }

        const result = await this.prisma.$transaction(async (prisma) => {
            const changePokemon = await prisma.myPokemon.updateMany({
                where: {
                    userId,
                    [teamName]: true,
                    id: {
                        notIn: team, // Exclui os itens com IDs no array
                    },
                },
                data: {
                    [teamName]: false,
                },
            });

            Logger.log(`${changePokemon.count} pokémons removidos do time '${teamName}' para o usuário ${userId}.`);

            const updatePokemon = await prisma.myPokemon.updateMany({
                where: {
                    userId,
                    [teamName]: false,
                    id: {
                        in: team,
                    },
                },
                data: {
                    [teamName]: true,
                },
            });

            Logger.log(`${updatePokemon.count} pokémons adicionados ao time '${teamName}' para o usuário ${userId}.`);

            return {
                removed: changePokemon.count,
                added: updatePokemon.count,
            };
        });

        return {
            message: "Team updated successfully",
            details: result,
        };
    };

    updatePokemonMoves = async ({ userId, data }: { userId: string, data: UpdatePokemonMovesDto }) => {
        const { myPokemonId, teamName, moves } = data;

        const result = await this.prisma.myPokemon.update({
            where: {
                userId: userId,
                id: myPokemonId
            },
            data: {
                [teamName + "Move"]: moves
            }
        });
        return result;
    }
}