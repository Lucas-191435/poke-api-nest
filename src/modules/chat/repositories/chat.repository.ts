import { Injectable, BadRequestException, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtPayload } from "src/common/auth/jwt.strategy";
import { PrismaService } from "src/common/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";

@Injectable()
export class ChatRepository {
    constructor(private readonly prisma: PrismaService) { }


    async validate(token: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: token },
        });

        if (!user) {
            throw new UnauthorizedException('O token é inválido.');
        }

        return user;
    }

}