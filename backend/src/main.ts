import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import 'dotenv/config';
import { join } from 'node:path';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    // Le formulaire étudiant enregistre son brouillon avec PUT à chaque étape.
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // Logo / image de fond du site : ressources publiques (page d'accueil non connectée),
  // contrairement aux documents étudiants qui restent servis en privé via un endpoint authentifié.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'site-settings'), { prefix: '/uploads/site-settings' });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
