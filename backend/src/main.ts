import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { join } from 'node:path';
import { AppModule, ObserveInstrument } from './app.module.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

// Par défaut Node abandonne chaque tentative de connexion sortante après 250 ms ; sur un réseau
// lent ou sans IPv6, l'appel à Google (échange du code OAuth) échouait alors en ETIMEDOUT.
setDefaultAutoSelectFamilyAttemptTimeout(5000);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // L'API ne sert que du JSON et des images : on masque la technologie et on ferme les usages détournés.
  app.disable('x-powered-by');
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Un fichier téléversé ouvert directement (ex. un SVG) ne peut exécuter aucun script ; l'affichage dans <img> n'est pas touché.
    response.setHeader('Content-Security-Policy', request.path.startsWith('/uploads/') ? "default-src 'none'; style-src 'unsafe-inline'; sandbox" : "default-src 'none'; frame-ancestors 'none'");
    next();
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
  // Logos des établissements : affichés dans la page étudiant, donc publics eux aussi.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'establishments'), { prefix: '/uploads/establishments' });
  // Photos de profil du personnel : affichées dans l'en-tête, adresses non devinables (UUID).
  app.useStaticAssets(join(process.cwd(), 'uploads', 'avatars'), { prefix: '/uploads/avatars' });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
