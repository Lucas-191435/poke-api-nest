import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import { transformPokemonData } from "./util";
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
@Injectable()
export class PokemonRepository {
    constructor(private readonly prisma: PrismaService) { }


    async getPokemons({
        page = 1,
        pageSize = 10,
        query = '',
        types,
        weight,
    }: { page?: number; pageSize?: number; query?: string; types?: string[]; weight?: string }) {
        const conditions: Array<Record<string, any>> = [];
        if (query) {
            conditions.push({
                OR: [
                    {
                        name: {
                            contains: `${query}`,
                        }
                    },
                ],
            });
        }
        if (types && types.length > 0) {
            conditions.push({
                OR: types.map((type) => ({
                    types: {
                        contains: type,
                    },
                })),
            });
        }

        if (weight) {
            // if (weight === 'small') {
            //     conditions.push({
            //         weight: {
            //             gte: 0,
            //             lte: 300,
            //         }
            //     });
            // } else if (weight === 'medium') {
            //     conditions.push({
            //         weight: {
            //             gte: 300,
            //             lte: 850,
            //         }
            //     });
            // } else if (weight === 'large') {
            //     conditions.push({
            //         weight: {
            //             gte: 850,
            //             // lte: 900,
            //         }
            //     });
            // }
        }

        const where: Prisma.PokemonFindManyArgs["where"] = {
            AND: conditions.length > 0 ? conditions : undefined,
        };


        const [pokes, count] = await Promise.all([
            this.prisma.pokemon.findMany({
                orderBy: {
                    pokeId: 'asc',
                },
                where,
                skip: ((page ?? 1) - 1) * (pageSize ?? 20),
                take: pageSize ?? 20,
            }),
            this.prisma.pokemon.count({ where }),
        ]);

        const pokedex = pokes.map(p => transformPokemonData(p))

        return { pokemon: pokedex, count };
    }

    async getPokemon(Id: string) {
        const value = Id;

        const isNumeric = !isNaN(Number(value));
        const pokeId = isNumeric ? Number(value) : undefined;
        const id = !isNumeric ? value : undefined;

        const conditions: Array<Record<string, any>> = [];
        if (id) conditions.push({ id });
        if (pokeId !== undefined) conditions.push({ pokeId });

        const pokemon = await this.prisma.pokemon.findFirst({
            where: {
                OR: conditions,
            },
        });

        if (!pokemon) {
            throw new UnauthorizedException('Pokémon não encontrado')
        }

        const pk = transformPokemonData(pokemon);
        return pk
    }
}