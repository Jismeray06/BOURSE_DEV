import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { MailService } from './mail.service.js';
import { PrismaService } from './prisma.service.js';

const scrypt = promisify(scryptCallback);
const tokenLifetimeInSeconds = 8 * 60 * 60;
const emailVerificationLifetimeInHours = 24;
const STAFF_ROLES = [UserRole.ETABLISSEMENT, UserRole.ADMIN_ETABLISSEMENT, UserRole.SECRETAIRE, UserRole.SCOLARITE_CENTRALE];
type TokenPayload = { sub: string; role: UserRole; exp: number };
type Actor = { id: string; fullName: string };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly mailService: MailService) {}

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
    await this.sendEmailVerification(user);
    return { message: 'Compte créé. Consultez votre boîte e-mail pour vérifier votre adresse avant de vous connecter.' };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(email) } });
    if (!user?.passwordHash || !(await this.passwordMatches(password, user.passwordHash))) {
      throw new UnauthorizedException('Adresse e-mail ou mot de passe incorrect.');
    }
    if (!user.active) throw new UnauthorizedException('Ce compte est désactivé. Contactez un administrateur.');
    if (!user.emailVerified) throw new UnauthorizedException("Votre adresse e-mail n'est pas encore vérifiée. Consultez votre boîte de réception ou renvoyez l'e-mail de vérification.");
    return this.loginResponse(user);
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashVerificationToken(token);
    const verification = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!verification || verification.expiresAt <= new Date()) {
      if (verification) await this.prisma.emailVerificationToken.delete({ where: { id: verification.id } });
      throw new BadRequestException('Ce lien de vérification est invalide ou a expiré.');
    }
    try {
      await this.prisma.$transaction(async (transaction) => {
        // La suppression par clé unique consomme le jeton avant la mise à jour.
        // Une seconde requête concurrente ne peut donc pas l'utiliser à nouveau.
        await transaction.emailVerificationToken.delete({ where: { id: verification.id } });
        await transaction.user.update({ where: { id: verification.userId }, data: { emailVerified: true } });
        await transaction.emailVerificationToken.deleteMany({ where: { userId: verification.userId } });
      });
    } catch (error: unknown) {
      if (this.isMissingRecordError(error)) throw new BadRequestException('Ce lien de vérification est invalide ou a déjà été utilisé.');
      throw error;
    }
    return { message: 'Votre adresse e-mail a été vérifiée. Vous pouvez maintenant vous connecter.' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(email) } });
    if (!user) return { message: "Si un compte non vérifié correspond à cette adresse, un e-mail de vérification vient d'être envoyé." };
    if (user.emailVerified) return { message: 'Cette adresse e-mail est déjà vérifiée.' };
    await this.sendEmailVerification(user);
    return { message: "Un nouvel e-mail de vérification vient d'être envoyé." };
  }

  async loginWithGoogle(fullName: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    let user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { fullName: fullName.trim(), email: normalizedEmail, emailVerified: true },
      });
    }
    if (!user.emailVerified) user = await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    return this.loginResponse(user);
  }

  async requireAdmin(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.ADMIN) throw new UnauthorizedException('Accès réservé aux administrateurs.');
    return user;
  }

  async requireEstablishmentManager(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.ETABLISSEMENT && user.role !== UserRole.ADMIN_ETABLISSEMENT && user.role !== UserRole.SECRETAIRE) throw new UnauthorizedException('Accès réservé à l’espace établissement.');
    return user;
  }

  async requireEstablishmentAdmin(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.ADMIN_ETABLISSEMENT && user.role !== UserRole.ETABLISSEMENT) throw new UnauthorizedException('Accès réservé à l’administrateur de l’établissement.');
    return user;
  }

  async requireCentralRegistrar(authorization?: string) {
    const user = await this.userFromAuthorization(authorization);
    if (user.role !== UserRole.SCOLARITE_CENTRALE) throw new UnauthorizedException('Accès réservé à la scolarité centrale.');
    return user;
  }

  async createStaffAccount(actor: Actor, fullName: string, email: string, password: string, role: Extract<UserRole, 'ETABLISSEMENT' | 'ADMIN_ETABLISSEMENT' | 'SECRETAIRE' | 'SCOLARITE_CENTRALE'>, establishment?: string) {
    const normalizedEmail = this.normalizeEmail(email);
    let account;
    try {
      account = await this.prisma.user.create({
        data: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          passwordHash: await this.hashPassword(password),
          emailVerified: true,
          role,
          establishment: establishment?.trim() || null,
        },
        select: { id: true, fullName: true, email: true, role: true, establishment: true, active: true, createdAt: true },
      });
    } catch (error: unknown) {
      if (this.isUniqueEmailError(error)) throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
      throw error;
    }
    await this.logAudit('STAFF_ACCOUNT_CREATED', actor, account.id, account.fullName);
    return account;
  }

  async requireUser(authorization?: string) {
    return this.userFromAuthorization(authorization);
  }

  async setStaffAccountActive(actor: Actor, id: string, active: boolean) {
    const account = await this.findStaffAccount(id);
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { active }, select: { id: true, active: true } });
    await this.logAudit('STAFF_ACCOUNT_STATUS_CHANGED', actor, account.id, account.fullName, active ? 'Compte réactivé' : 'Compte désactivé');
    return updated;
  }

  async updateStaffAccountName(actor: Actor, id: string, fullName: string) {
    const account = await this.findStaffAccount(id);
    const trimmed = fullName.trim();
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { fullName: trimmed }, select: { id: true, fullName: true } });
    await this.logAudit('STAFF_ACCOUNT_NAME_UPDATED', actor, account.id, trimmed, `Ancien nom : ${account.fullName}`);
    return updated;
  }

  async resetStaffPassword(actor: Actor, id: string, password: string) {
    const account = await this.findStaffAccount(id);
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { passwordHash: await this.hashPassword(password) }, select: { id: true } });
    await this.logAudit('STAFF_ACCOUNT_PASSWORD_RESET', actor, account.id, account.fullName);
    return updated;
  }

  async trashStaffAccount(actor: Actor, id: string) {
    const account = await this.findStaffAccount(id);
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { deletedAt: new Date(), active: false }, select: { id: true } });
    await this.logAudit('STAFF_ACCOUNT_TRASHED', actor, account.id, account.fullName);
    return updated;
  }

  async restoreStaffAccount(actor: Actor, id: string) {
    const account = await this.findAnyAccount(id, { includeTrashed: true, requireTrashed: true });
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { deletedAt: null, active: true }, select: { id: true, fullName: true } });
    await this.logAudit('STAFF_ACCOUNT_RESTORED', actor, account.id, account.fullName);
    return updated;
  }

  async purgeStaffAccount(actor: Actor, id: string) {
    const account = await this.findAnyAccount(id, { includeTrashed: true, requireTrashed: true });
    try {
      await this.prisma.user.delete({ where: { id: account.id } });
    } catch (error: unknown) {
      if (this.isForeignKeyError(error)) throw new ConflictException('Ce compte est lié à des données existantes (quitus émis…) et ne peut pas être supprimé définitivement.');
      throw error;
    }
    await this.logAudit('STAFF_ACCOUNT_PURGED', actor, account.id, account.fullName);
    return { id: account.id };
  }

  async setAccountActive(actor: Actor, id: string, active: boolean) {
    const account = await this.findAnyAccount(id);
    this.assertNotSelf(actor, account, active ? 'réactiver' : 'désactiver');
    if (!active) await this.assertNotLastAdmin(account);
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { active }, select: { id: true, active: true } });
    await this.logAudit('STAFF_ACCOUNT_STATUS_CHANGED', actor, account.id, account.fullName, active ? 'Compte réactivé' : 'Compte désactivé');
    return updated;
  }

  async trashAccount(actor: Actor, id: string) {
    const account = await this.findAnyAccount(id);
    this.assertNotSelf(actor, account, 'supprimer');
    await this.assertNotLastAdmin(account);
    const updated = await this.prisma.user.update({ where: { id: account.id }, data: { deletedAt: new Date(), active: false }, select: { id: true } });
    await this.logAudit('STAFF_ACCOUNT_TRASHED', actor, account.id, account.fullName);
    return updated;
  }

  private async findAnyAccount(id: string, options: { includeTrashed?: boolean; requireTrashed?: boolean } = {}) {
    const account = await this.prisma.user.findFirst({
      where: {
        id,
        ...(options.requireTrashed ? { deletedAt: { not: null } } : options.includeTrashed ? {} : { deletedAt: null }),
      },
    });
    if (!account) throw new NotFoundException(options.requireTrashed ? 'Compte introuvable dans la corbeille.' : 'Compte introuvable.');
    return account;
  }

  private assertNotSelf(actor: Actor, account: { id: string }, action: string) {
    if (actor.id === account.id) throw new BadRequestException(`Vous ne pouvez pas ${action} votre propre compte.`);
  }

  private async assertNotLastAdmin(account: { id: string; role: UserRole }) {
    if (account.role !== UserRole.ADMIN) return;
    const otherActiveAdmins = await this.prisma.user.count({ where: { role: UserRole.ADMIN, active: true, deletedAt: null, id: { not: account.id } } });
    if (otherActiveAdmins === 0) throw new BadRequestException('Impossible de désactiver ou supprimer le dernier compte administrateur.');
  }

  async listTrashedStaffAccounts() {
    return this.prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, fullName: true, email: true, role: true, establishment: true, deletedAt: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async listAuditLog(limit = 200) {
    return this.prisma.auditLogEntry.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }

  private async findStaffAccount(id: string, options: { includeTrashed?: boolean; requireTrashed?: boolean } = {}) {
    const account = await this.prisma.user.findFirst({
      where: {
        id,
        role: { in: STAFF_ROLES },
        ...(options.requireTrashed ? { deletedAt: { not: null } } : options.includeTrashed ? {} : { deletedAt: null }),
      },
    });
    if (!account) throw new NotFoundException(options.requireTrashed ? 'Compte introuvable dans la corbeille.' : 'Compte du personnel introuvable.');
    return account;
  }

  private async logAudit(action: AuditAction, actor: Actor, targetId: string | null, targetName: string, detail?: string) {
    await this.prisma.auditLogEntry.create({ data: { action, actorId: actor.id, actorName: actor.fullName, targetId, targetName, detail } });
  }

  async updateStaffAccount(id: string, fullName?: string, password?: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(fullName === undefined ? {} : { fullName: fullName.trim() }),
        ...(password === undefined ? {} : { passwordHash: await this.hashPassword(password) }),
      },
      select: { id: true, fullName: true, email: true, active: true, createdAt: true },
    });
  }

  private async userFromAuthorization(authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Connexion requise.');
    const payload = this.verifyToken(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== payload.role) throw new UnauthorizedException('Session invalide.');
    if (!user.active) throw new UnauthorizedException('Ce compte est désactivé.');
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
  private async sendEmailVerification(user: { id: string; email: string; fullName: string }) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: this.hashVerificationToken(token), expiresAt: new Date(Date.now() + emailVerificationLifetimeInHours * 60 * 60 * 1000) } });
    await this.mailService.sendVerificationEmail(user.email, user.fullName, token);
  }
  private hashVerificationToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
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
  private isForeignKeyError(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003'; }
  private isMissingRecordError(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025'; }
}
