import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";

@Injectable()
export class ItemsRepository {
    constructor(private readonly prisma: PrismaService) { }

    getItems = async ({ page, pageSize, query, pokeItemPocketId }) => {
        console.log("Fetching items with query:", query, "page:", page, "pageSize:", pageSize, "pokeItemPocketId:", pokeItemPocketId);
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

        if (pokeItemPocketId) {
            conditions.push({
                pokeItemPocketId: pokeItemPocketId,
            });
        }

        const where: Prisma.ItemFindManyArgs["where"] = {
            AND: conditions.length > 0 ? conditions : undefined,
        };

        // const items = await this.prisma.item.findMany({
        //     where,
        //     orderBy: {
        //         pokeItemId: 'asc',
        //     },
        //     skip: ((page ?? 1) - 1) * (pageSize ?? 20),
        //     take: pageSize ?? 20,
        // });

        // const itemsCount = await this.prisma.item.count({
        //     where,
        // });

        const [items, itemsCount] = await Promise.all([
            this.prisma.item.findMany({
            where,
            orderBy: {
                pokeItemId: 'asc',
            },
            skip: ((page ?? 1) - 1) * (pageSize ?? 20),
            take: pageSize ?? 20,
        }),
            this.prisma.item.count({
            where,
        })
        ]);

        return {
            count: itemsCount,
            rows: items,
        };
    }

}