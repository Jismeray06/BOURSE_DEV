import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuthService } from './auth.service.js';
import { MailService } from './mail.service.js';
import { PrismaService } from './prisma.service.js';

const changeLifetimeInMs = 60 * 60 * 1000;
const failureWindowInMs = 15 * 60 * 1000;
const maximumFailures = 5;
const maximumAvatarSize = 3 * 1024 * 1024;
const avatarPrefix = '/uploads/avatars/';
const avatarTypes: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

type Self = { id: string; fullName: string; email: string };

// Un utilisateur modifie son propre mot de passe ou sa propre adresse e-mail.
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  // Échecs de saisie du mot de passe actuel, par utilisateur (en mémoire) : bloque les essais répétés.
  private readonly failures = new Map<string, number[]>();
  private readonly avatarDirectory = join(process.cwd(), 'uploads', 'avatars');

  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService, private readonly mailService: MailService) {}

  async changePassword(user: Self, currentPassword: string, newPassword: string) {
    await this.assertCurrentPassword(user.id, currentPassword);
    if (newPassword.length < 8) throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (newPassword === currentPassword) throw new BadRequestException("Le nouveau mot de passe doit être différent de l'actuel.");
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await this.authService.hashPassword(newPassword) } });
    await this.audit('ACCOUNT_PASSWORD_CHANGED', user, user.fullName, 'Modifié par l’utilisateur lui-même');
    return { message: 'Votre mot de passe a été modifié.' };
  }

  // Étape 1 : un lien de confirmation part vers la NOUVELLE adresse ; rien ne change avant le clic.
  async requestEmailChange(user: Self, newEmailRaw: string, currentPassword: string) {
    await this.assertCurrentPassword(user.id, currentPassword);
    const newEmail = newEmailRaw.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) throw new BadRequestException("L'adresse e-mail est invalide.");
    if (newEmail === user.email.toLowerCase()) throw new BadRequestException("C'est déjà l'adresse de votre compte.");
    if (await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })) throw new ConflictException('Cette adresse e-mail est déjà utilisée.');

    const token = randomBytes(32).toString('base64url');
    await this.prisma.emailChangeRequest.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailChangeRequest.create({ data: { userId: user.id, newEmail, tokenHash: this.hash(token), expiresAt: new Date(Date.now() + changeLifetimeInMs) } });
    await this.deliverConfirmation(newEmail, user.fullName, token);
    return { message: `Un lien de confirmation vient d'être envoyé à ${newEmail}. Il est valable 1 heure.` };
  }

  // Étape 2 : le clic sur le lien prouve que la nouvelle boîte est bien accessible.
  async confirmEmailChange(token: string) {
    const request = await this.prisma.emailChangeRequest.findUnique({ where: { tokenHash: this.hash(token) }, include: { user: { select: { id: true, fullName: true, email: true } } } });
    if (!request || request.expiresAt <= new Date()) {
      if (request) await this.prisma.emailChangeRequest.delete({ where: { id: request.id } });
      throw new BadRequestException('Ce lien de confirmation est invalide ou a expiré.');
    }
    const oldEmail = request.user.email;
    try {
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id: request.userId }, data: { email: request.newEmail, emailVerified: true } }),
        this.prisma.emailChangeRequest.deleteMany({ where: { userId: request.userId } }),
      ]);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictException('Cette adresse e-mail est désormais utilisée par un autre compte.');
      throw error;
    }
    await this.audit('ACCOUNT_EMAIL_CHANGED', { id: request.userId, fullName: request.user.fullName }, request.user.fullName, `${oldEmail} → ${request.newEmail}`);
    this.mailService.sendEmailChangedNotice(oldEmail, request.user.fullName, request.newEmail).catch((error: unknown) => this.logger.warn(`Alerte non envoyée à ${oldEmail} : ${error instanceof Error ? error.message : error}`));
    return { message: 'Votre nouvelle adresse e-mail est confirmée.', email: request.newEmail, userId: request.userId };
  }

  // Photo de profil : un fichier image par utilisateur, le précédent est supprimé.
  async setAvatar(user: Self, file: { buffer: Buffer; mimetype: string; size: number } | undefined) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const extension = avatarTypes[file.mimetype];
    if (!extension) throw new BadRequestException('Format accepté : PNG, JPG ou WebP.');
    if (file.size > maximumAvatarSize) throw new BadRequestException('La photo ne doit pas dépasser 3 Mo.');
    if (!this.looksLikeImage(file.buffer, file.mimetype)) throw new BadRequestException("Ce fichier n'est pas une image valide.");
    const previous = (await this.prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } }))?.avatarUrl;
    await mkdir(this.avatarDirectory, { recursive: true });
    const storageName = `${randomUUID()}${extension}`;
    await writeFile(join(this.avatarDirectory, storageName), file.buffer, { flag: 'wx' });
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: `${avatarPrefix}${storageName}` }, select: { avatarUrl: true } });
    await this.deleteAvatarFile(previous);
    return updated;
  }

  async removeAvatar(user: Self) {
    const previous = (await this.prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } }))?.avatarUrl;
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null }, select: { avatarUrl: true } });
    await this.deleteAvatarFile(previous);
    return updated;
  }

  // Vérifie les premiers octets : le type annoncé par le navigateur ne suffit pas.
  private looksLikeImage(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    return buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }

  private async deleteAvatarFile(url: string | null | undefined) {
    if (!url?.startsWith(avatarPrefix)) return;
    await unlink(join(this.avatarDirectory, url.slice(avatarPrefix.length))).catch(() => undefined);
  }

  private async assertCurrentPassword(userId: string, password: string) {
    const now = Date.now();
    const recent = (this.failures.get(userId) ?? []).filter((time) => now - time < failureWindowInMs);
    if (recent.length >= maximumFailures) throw new HttpException('Trop de mots de passe incorrects. Réessayez dans quelques minutes.', HttpStatus.TOO_MANY_REQUESTS);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user?.passwordHash) throw new BadRequestException('Ce compte se connecte avec Google et n’a pas de mot de passe à modifier ici.');
    if (!(await this.authService.passwordMatches(password, user.passwordHash))) {
      recent.push(now);
      this.failures.set(userId, recent);
      throw new UnauthorizedException('Le mot de passe actuel est incorrect.');
    }
    this.failures.delete(userId);
  }

  private async deliverConfirmation(email: string, fullName: string, token: string) {
    // Hors production, le lien est aussi écrit dans les journaux (l'envoi d'e-mail peut ne pas être configuré).
    if (process.env.NODE_ENV !== 'production') {
      const link = new URL('/confirm-email-change', process.env.FRONTEND_URL ?? 'http://localhost:3000');
      link.searchParams.set('token', token);
      this.logger.warn(`Lien de confirmation du nouvel e-mail (développement) pour ${email} : ${link.toString()}`);
    }
    try {
      await this.mailService.sendEmailChangeEmail(email, fullName, token);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'production' || !(error instanceof ServiceUnavailableException)) throw error;
      this.logger.warn(`E-mail non envoyé (développement) : ${error.message}`);
    }
  }

  private audit(action: AuditAction, actor: { id: string; fullName: string }, targetName: string, detail: string) {
    return this.prisma.auditLogEntry.create({ data: { action, actorId: actor.id, actorName: actor.fullName, targetId: actor.id, targetName, detail } });
  }
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
}
