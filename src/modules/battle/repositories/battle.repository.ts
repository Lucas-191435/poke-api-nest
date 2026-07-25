import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "src/common/auth/jwt.strategy";
import { PrismaService } from "src/common/database/prisma.service";

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

}