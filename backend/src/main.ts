import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    // Le formulaire étudiant enregistre son brouillon avec PUT à chaque étape.
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
