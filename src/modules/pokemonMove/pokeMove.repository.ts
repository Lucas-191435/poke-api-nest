import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";

@Injectable()
export class PokemonMoveRepository {
    constructor(private readonly prisma: PrismaService) { }


    // Busca um movimento do banco pelo nome
    getMoveByName = async (moveName: string) => {
        const move = await this.prisma.move.findFirst({
            where: {
                name: moveName
            },
            select: {
                id: true,
                name: true
            }
        });
        return move;
    }

    getPokemonMove = async (id: string) => {
        console.log("Fetched pokemon:", id);

        const pokemon = await this.prisma.pokemon.findFirst({
            where: {
                pokeId: parseInt(id)
            },
        })
        console.log("Fetched pokemon:", pokemon);
        const pokeMoves = await this.prisma.pokemonMove.findMany({
            where: {
                pokemonId: pokemon?.id
            },
            include: {
                move: true
            }
        });

        const moves = pokeMoves.map(move => {
            return {
                learn_method: move.learn_method,
                level: move.level,
                ...move.move
            }
        });

        return { name: pokemon?.name, moves };

    }
}