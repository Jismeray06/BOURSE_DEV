import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from './prisma.service.js';

const scrypt = promisify(scryptCallback);
const tokenLifetimeInSeconds = 8 * 60 * 60;
type TokenPayload = { sub: string; role: UserRole; exp: number };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(fullName: string, email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          fullName: fullName.trim(), email: normalizedEmail, passwordHash: await this.hashPassword(password), role: UserRole.ETUDIANT,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueEmailError(error)) throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
      throw error;
    }
    return { ...this.loginResponse(user), message: 'Compte étudiant créé avec succès.' };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(email) } });
    if (!user?.passwordHash || !(await this.passwordMatches(password, user.passwordHash))) {
      throw new UnauthorizedException('Adresse e-mail ou mot de passe incorrect.');
    }
    return this.loginResponse(user);
  }

  async loginWithGoogle(fullName: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    let user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { fullName: fullName.trim(), email: normalizedEmail },
      });
    }
    return this.loginResponse(user);
  }

  async requireAdmin(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.ADMIN) throw new UnauthorizedException('Accès réservé aux administrateurs.');
    return user;
  }

  async requireEstablishmentManager(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.ETABLISSEMENT) throw new UnauthorizedException('Accès réservé au responsable d’établissement.');
    return user;
  }

  async requireCentralRegistrar(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.SCOLARITE_CENTRALE) throw new UnauthorizedException('Accès réservé à la scolarité centrale.');
    return user;
  }

  async requireUser(authorization?: string) {
    return this.userFromAuthorization(authorization);
  }

  private async userFromAuthorization(authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Connexion requise.');
    const payload = this.verifyToken(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== payload.role) throw new UnauthorizedException('Session invalide.');
    return user;
  }

  private loginResponse(user: { id: string; fullName: string; email: string; role: UserRole }) {
    return { message: 'Connexion réussie.', accessToken: this.createToken(user.id, user.role), user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } };
  }

  private createToken(id: string, role: UserRole) {
    const payload = Buffer.from(JSON.stringify({ sub: id, role, exp: Math.floor(Date.now() / 1000) + tokenLifetimeInSeconds })).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  private verifyToken(token: string): TokenPayload {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature || !this.signaturesMatch(signature, this.sign(encodedPayload))) throw new UnauthorizedException('Session invalide.');
    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TokenPayload;
      if (!payload.sub || !Object.values(UserRole).includes(payload.role) || payload.exp <= Date.now() / 1000) throw new Error('Invalid payload');
      return payload;
    } catch { throw new UnauthorizedException('Session expirée ou invalide.'); }
  }

  private sign(value: string) { return createHmac('sha256', this.tokenSecret()).update(value).digest('base64url'); }
  private tokenSecret() {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('AUTH_TOKEN_SECRET doit être configuré.');
    return secret ?? 'development-only-secret-change-before-production';
  }
  private signaturesMatch(left: string, right: string) {
    const a = Buffer.from(left); const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex'); const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${key.toString('hex')}`;
  }
  private async passwordMatches(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(':'); if (!salt || !hash) return false;
    const key = (await scrypt(password, salt, 64)) as Buffer; const expected = Buffer.from(hash, 'hex');
    return expected.length === key.length && timingSafeEqual(expected, key);
  }
  private isUniqueEmailError(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
}
