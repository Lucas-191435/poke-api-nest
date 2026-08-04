import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import { BattleStatus } from "src/generated/prisma/enums";

const userSafeSelect = {
    id: true,
    email: true,
    name: true,
    avatar: true,
    description: true,
    role: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    findUserById = async (id: string) => {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userSafeSelect,
        });

        if (!user) {
            throw new NotFoundException("Usuário não encontrado");
        }

        return user;
    }

    getUserStats = async (userId: string) => {
        const [wins, losses, pokemonLength] = await Promise.all([
            this.prisma.battle.count({
                where: { status: BattleStatus.FINISHED, winnerId: userId },
            }),
            this.prisma.battle.count({
                where: {
                    status: BattleStatus.FINISHED,
                    winnerId: { not: null, notIn: [userId] },
                    OR: [{ playerAId: userId }, { playerBId: userId }],
                },
            }),
            this.prisma.myPokemon.count({ where: { userId } }),
        ]);

        const totalFinished = wins + losses;
        const winRate = totalFinished > 0 ? Number((wins / totalFinished).toFixed(4)) : 0;

        return { wins, losses, pokemonLength, winRate };
    }

    findUsers = async ({ page, pageSize, query }: { page: number; pageSize: number; query?: string }) => {
        const where: Prisma.UserWhereInput | undefined = query
            ? {
                OR: [
                    { name: { contains: query } },
                    { email: { contains: query } },
                ],
            }
            : undefined;

        const [rows, count] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: userSafeSelect,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.user.count({ where }),
        ]);

        return { count, rows };
    }

    findUsersTest = async () => {
        const users = this.prisma.user.findMany({
                where: {
                    role: "TEST"
                },
                select: userSafeSelect,
            });

        return users;
    }

    createUser = async ({ email, password, name, avatar, description }: {
        email: string;
        password: string;
        name: string;
        avatar?: string;
        description?: string;
    }) => {
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictException("Já existe um usuário com esse e-mail");
        }

        const user = await this.prisma.user.create({
            data: { email, password, name, avatar, description },
            select: userSafeSelect,
        });

        return user;
    }

    updateUser = async ({ id, name, description, avatar }: {
        id: string;
        name?: string;
        description?: string;
        avatar?: string;
    }) => {
        await this.findUserById(id);

        const user = await this.prisma.user.update({
            where: { id },
            data: { name, description, avatar },
            select: userSafeSelect,
        });

        return user;
    }

    deleteUser = async (id: string) => {
        await this.findUserById(id);

        await this.prisma.user.delete({ where: { id } });

        return { message: "Usuário deletado com sucesso" };
    }
}
