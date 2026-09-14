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

type Credentials = { email?: unknown; password?: unknown };
type Registration = Credentials & { fullName?: unknown };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Post('register')
  register(@Body() body: Registration) {
    const fullName = this.requiredString(body.fullName, 'Le nom complet');
    const email = this.email(body.email);
    const password = this.password(body.password);
    return this.authService.register(fullName, email, password);
  }

  @Post('login')
  login(@Body() body: Credentials) {
    return this.authService.login(
      this.email(body.email),
      this.requiredString(body.password, 'Le mot de passe'),
    );
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
    const destination = result.user.role === 'ADMIN' ? '/admin' : result.user.role === 'ETABLISSEMENT' ? '/etablissement' : '/student';
    response.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:3000'}${destination}`);
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
