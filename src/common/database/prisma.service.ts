import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 5,
    });
    super({
      adapter,
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Conexão com banco de dados estabelecida');
    } catch (error: any) {
      this.logger.error(
        '❌ Erro ao conectar com banco de dados:',
        error.message,
      );
      throw error;
    }
  }
 
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Conexão com banco de dados fechada');
    } catch (error: any) {
      this.logger.error('❌ Erro ao fechar conexão com banco:', error.message);
    }
  }
}
