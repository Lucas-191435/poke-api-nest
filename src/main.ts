import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

const config = new DocumentBuilder()
  .setTitle('🧩 Poké API')
  .setDescription(`
## 🧩 API RESTful desenvolvida por **Lucas-191435** com **Node.js**, **TypeScript** e **Prisma ORM**.

A API integra dados da PokéAPI e oferece recursos para gerenciamento de pokémons, movimentos, itens e usuários autenticados.

### 📦 Módulos disponíveis
- 🐾 Pokémon
- 🎒 My Pokémon
- ⚔️ Moves
- 🔗 Pokémon Moves
- 🧪 Items
- 👤 User

### 🔐 Autenticação
Os endpoints protegidos utilizam autenticação via **Bearer Token (JWT)**.
`)
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3333;
  await app.listen(port);

  const url = await app.getUrl();
  const baseUrl = process.env.APP_URL ?? url;

  logger.log('='.repeat(50));
  logger.log(`✅ PRONTO — API rodando em: ${baseUrl}`);
  logger.log(`📚 Swagger docs: ${baseUrl}/docs`);
  logger.log('='.repeat(50));
}
void bootstrap();
