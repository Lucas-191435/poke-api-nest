import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async savePasswordResetToken(userId: string, token: string, expires: Date) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                resetToken: token,
                resetTokenExpiry: expires,
            },
        });
    }
}