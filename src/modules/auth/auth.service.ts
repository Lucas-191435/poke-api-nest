import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import authConfig from 'src/config/authConfig';
import { JsonWebTokenError, sign } from "jsonwebtoken";
@Injectable()
export class AuthService {
  constructor(
          private readonly authRepository: AuthRepository,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async login(email: string, password: string){
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      Logger.warn(`User not found: ${email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) {
      Logger.warn(`Invalid password for user: ${email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const token = sign({ id: user.id }, String(authConfig.secret), { expiresIn: '64h', algorithm: "HS512", })

    return {
        user: {
          id: user.id,
          avatar: user.avatar,
          email: user.email,
          name: user.name,
          role: user.role,
        }, 
        token: token
      };
  }
}
