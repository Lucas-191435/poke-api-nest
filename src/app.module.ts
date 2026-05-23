import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PokemonModule } from './modules/pokemon/pokemon.module';
import { PrismaModule } from './common/database/prisma.module';
import { AuthModule } from './common/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PokemonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
