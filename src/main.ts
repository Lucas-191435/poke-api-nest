import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Poke API')
    .setDescription('API de Pokémon construída com NestJS')
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
