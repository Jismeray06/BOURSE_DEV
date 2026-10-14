import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { RateLimiter } from './rate-limiter.js';

type Credentials = { email?: unknown; password?: unknown };
type Registration = Credentials & { fullName?: unknown };
type Verification = { token?: unknown };
type GoogleExchange = { code?: unknown };

const fifteenMinutes = 15 * 60 * 1000;

@Controller('auth')
export class AuthController {
  // Limites par adresse IP (en mémoire). Derrière un proxy, activer « trust proxy » pour que l'IP du client soit lue.
  private readonly loginAttempts = new RateLimiter(30, fifteenMinutes, 'Trop de tentatives de connexion. Réessayez dans quelques minutes.');
  // Échecs de connexion pour un même couple IP + adresse e-mail : ralentit le devinage d'un mot de passe sans bloquer le vrai titulaire du compte depuis un autre appareil.
  private readonly loginFailures = new RateLimiter(5, fifteenMinutes, 'Trop d’échecs de connexion pour ce compte. Réessayez dans 15 minutes.');
  private readonly registrations = new RateLimiter(5, 60 * 60 * 1000, 'Trop de créations de compte depuis cette adresse. Réessayez dans une heure.');

  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Post('register')
  register(@Body() body: Registration, @Req() request: Request) {
    this.registrations.consume(this.client(request));
    const fullName = this.requiredString(body.fullName, 'Le nom complet');
    const email = this.email(body.email);
    const password = this.password(body.password);
    return this.authService.register(fullName, email, password);
  }

  @Post('login')
  async login(@Body() body: Credentials, @Req() request: Request) {
    const client = this.client(request);
    this.loginAttempts.consume(client);
    const email = this.email(body.email);
    const failureKey = `${client}|${email.trim().toLowerCase()}`;
    this.loginFailures.check(failureKey);
    try {
      const response = await this.authService.login(email, this.requiredString(body.password, 'Le mot de passe'));
      this.loginFailures.clear(failureKey);
      return response;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) this.loginFailures.record(failureKey);
      throw error;
    }
  }

  @Post('verify-email')
  verifyEmail(@Body() body: Verification) {
    return this.authService.verifyEmail(this.requiredString(body.token, 'Le jeton de vérification'));
  }

  @Post('resend-verification-email')
  resendVerificationEmail(@Body() body: Pick<Credentials, 'email'>) {
    return this.authService.resendVerificationEmail(this.email(body.email));
  }

  @Get('google')
  googleLogin(@Res() response: Response) {
    const state = randomBytes(32).toString('hex');
    response.cookie('google_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/auth/google',
    });
    response.redirect(this.googleAuthService.getAuthorizationUrl(state));
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const cookieState = this.cookieValue(request.headers.cookie, 'google_oauth_state');
    response.clearCookie('google_oauth_state', { path: '/auth/google' });

    if (!code || !state || !cookieState || !this.statesMatch(state, cookieState)) {
      throw new UnauthorizedException('La vérification de la connexion Google a échoué.');
    }

    const profile = await this.googleAuthService.getVerifiedProfile(code);
    const result = await this.authService.loginWithGoogle(profile.fullName, profile.email);
    const loginCode = this.authService.createGoogleLoginCode(result);
    response.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login/google?code=${encodeURIComponent(loginCode)}`);
  }

  @Post('google/exchange')
  googleExchange(@Body() body: GoogleExchange) {
    return this.authService.exchangeGoogleLoginCode(this.requiredString(body.code, 'Le code de connexion'));
  }

  private client(request: Request) {
    return request.ip ?? request.socket.remoteAddress ?? 'inconnu';
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} est obligatoire.`);
    }
    return value.trim();
  }

  private email(value: unknown) {
    const email = this.requiredString(value, "L'adresse e-mail");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException("L'adresse e-mail est invalide.");
    }
    return email;
  }

  private password(value: unknown) {
    const password = this.requiredString(value, 'Le mot de passe');
    if (password.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    }
    return password;
  }

  private cookieValue(header: string | undefined, name: string) {
    return header
      ?.split(';')
      .map((value) => value.trim().split('='))
      .find(([key]) => key === name)?.[1];
  }

  private statesMatch(state: string, cookieState: string) {
    const stateValue = Buffer.from(state);
    const cookieValue = Buffer.from(cookieState);
    return (
      stateValue.length === cookieValue.length &&
      timingSafeEqual(stateValue, cookieValue)
    );
  }
}
