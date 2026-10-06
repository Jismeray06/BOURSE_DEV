import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { MailService } from './mail.service.js';
import { PrismaService } from './prisma.service.js';

const codeLifetimeInMs = 10 * 60 * 1000;
const resendDelayInMs = 60 * 1000;
const maximumCodesPerHour = 5;
const maximumAttempts = 5;
const requestWindowInMs = 10 * 60 * 1000;
const maximumRequestsPerWindow = 30;

type Requester = { id: string; email: string };

@Injectable()
export class QuitusService {
  private readonly logger = new Logger(QuitusService.name);
  // Limite les essais de vérification par utilisateur (en mémoire : remise à zéro au redémarrage).
  private readonly requests = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService, private readonly mailService: MailService) {}

  // Étape 1 : le quitus appartient-il à ce demandeur ? Sinon, envoi d'un code à l'e-mail de la fiche.
  async start(user: Requester, rawCode: string, establishment: string) {
    this.throttle(user.id);
    const { quitus, enrollment } = await this.load(user, rawCode, establishment);
    if (enrollment.userId === user.id) return this.result(quitus.code, establishment, false);

    // Même e-mail que celui enregistré par l'établissement : déjà vérifié à la création du compte.
    if (enrollment.email && enrollment.email.toLowerCase() === user.email.toLowerCase()) {
      await this.claim(user.id, enrollment.id);
      return this.result(quitus.code, establishment, false);
    }
    if (!enrollment.email) throw new BadRequestException("Aucune adresse e-mail n'est enregistrée pour ce quitus : contactez votre établissement.");

    await this.assertCanSend(user.id);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const challenge = await this.prisma.quitusChallenge.create({ data: { userId: user.id, quitusId: quitus.id, codeHash: 'pending', expiresAt: new Date(Date.now() + codeLifetimeInMs) } });
    await this.prisma.quitusChallenge.update({ where: { id: challenge.id }, data: { codeHash: this.hash(code, challenge.id) } });
    await this.deliver(enrollment.email, enrollment.fullName, code);
    return this.result(quitus.code, establishment, true, this.mask(enrollment.email));
  }

  // Étape 2 : le code reçu par e-mail rattache le quitus au compte.
  async confirm(user: Requester, rawCode: string, establishment: string, otp: string) {
    this.throttle(user.id);
    const { quitus, enrollment } = await this.load(user, rawCode, establishment);
    if (enrollment.userId === user.id) return this.result(quitus.code, establishment, false);

    const challenge = await this.prisma.quitusChallenge.findFirst({
      where: { userId: user.id, quitusId: quitus.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw new BadRequestException("Le code a expiré ou n'a pas été demandé. Redemandez un code.");
    if (challenge.attempts >= maximumAttempts) {
      await this.prisma.quitusChallenge.delete({ where: { id: challenge.id } });
      throw new BadRequestException('Trop d’essais incorrects. Redemandez un nouveau code.');
    }
    if (!this.hashesMatch(this.hash(otp.trim(), challenge.id), challenge.codeHash)) {
      await this.prisma.quitusChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Code incorrect.');
    }
    await this.claim(user.id, enrollment.id);
    await this.prisma.quitusChallenge.deleteMany({ where: { userId: user.id } });
    return this.result(quitus.code, establishment, false);
  }

  // Utilisé à l'enregistrement du dossier : le quitus doit avoir été vérifié par ce compte.
  async assertUsable(user: Requester, rawCode: string, establishment: string, currentQuitusId?: string | null) {
    const quitus = await this.prisma.quitus.findUnique({ where: { code: this.normalize(rawCode) }, include: { enrollment: { select: { userId: true } }, application: { select: { userId: true } } } });
    if (!quitus || quitus.establishment !== establishment) throw new BadRequestException('Le quitus ne correspond pas à l’établissement sélectionné.');
    if (quitus.application && quitus.application.userId !== user.id) throw new ConflictException('Ce quitus est déjà utilisé par un autre dossier.');
    // Dossier déjà rattaché à ce quitus (enregistré avant cette vérification), ou quitus vérifié par ce compte.
    if (quitus.id === currentQuitusId || quitus.enrollment?.userId === user.id) return quitus.id;
    throw new BadRequestException('Vérifiez d’abord ce quitus (étape « Vérifier le quitus »).');
  }

  private async load(user: Requester, rawCode: string, establishment: string) {
    const quitus = await this.prisma.quitus.findUnique({
      where: { code: this.normalize(rawCode) },
      include: { enrollment: { select: { id: true, fullName: true, email: true, userId: true, active: true } }, application: { select: { userId: true } } },
    });
    if (!quitus) throw new BadRequestException('Quitus introuvable. Vérifiez le code saisi.');
    if (quitus.establishment !== establishment) throw new BadRequestException('Ce quitus ne correspond pas à l’établissement sélectionné.');
    const enrollment = quitus.enrollment;
    if (!enrollment) throw new BadRequestException("Ce quitus n'est lié à aucun étudiant inscrit : contactez votre établissement.");
    if (!enrollment.active) throw new BadRequestException("L'inscription liée à ce quitus n'est pas active : contactez votre établissement.");
    if (quitus.application && quitus.application.userId !== user.id) throw new ConflictException('Ce quitus est déjà utilisé par un autre dossier.');
    if (enrollment.userId && enrollment.userId !== user.id) throw new ConflictException('Ce quitus est déjà rattaché à un autre compte : contactez votre établissement.');
    return { quitus, enrollment };
  }

  private async claim(userId: string, enrollmentId: string) {
    try {
      const result = await this.prisma.enrolledStudent.updateMany({ where: { id: enrollmentId, OR: [{ userId: null }, { userId }] }, data: { userId } });
      if (!result.count) throw new ConflictException('Ce quitus est déjà rattaché à un autre compte : contactez votre établissement.');
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Votre compte est déjà rattaché à un autre étudiant inscrit : contactez votre établissement.');
      }
      throw error;
    }
  }

  private async assertCanSend(userId: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.quitusChallenge.findMany({ where: { userId, createdAt: { gt: since } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    if (recent.length >= maximumCodesPerHour) throw new HttpException('Trop de codes demandés. Réessayez dans une heure.', HttpStatus.TOO_MANY_REQUESTS);
    if (recent[0] && Date.now() - recent[0].createdAt.getTime() < resendDelayInMs) {
      throw new HttpException('Un code vient d’être envoyé. Patientez une minute avant d’en redemander un.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async deliver(email: string, fullName: string, code: string) {
    // Hors production, le code est aussi écrit dans les journaux : les fiches de démonstration ont de fausses adresses.
    if (process.env.NODE_ENV !== 'production') this.logger.warn(`Code de vérification du quitus (développement) pour ${email} : ${code}`);
    try {
      await this.mailService.sendQuitusCodeEmail(email, fullName, code);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'production') throw error;
      if (!(error instanceof ServiceUnavailableException)) throw error;
      this.logger.warn(`E-mail non envoyé (développement) : ${error.message}`);
    }
  }

  private throttle(userId: string) {
    const now = Date.now();
    const recent = (this.requests.get(userId) ?? []).filter((time) => now - time < requestWindowInMs);
    if (recent.length >= maximumRequestsPerWindow) throw new HttpException('Trop de tentatives. Réessayez dans quelques minutes.', HttpStatus.TOO_MANY_REQUESTS);
    recent.push(now);
    this.requests.set(userId, recent);
  }

  private result(code: string, establishment: string, requiresCode: boolean, maskedEmail?: string) {
    return { verified: !requiresCode, requiresCode, code, establishment, ...(maskedEmail ? { maskedEmail } : {}) };
  }
  private normalize(code: string) { return code.trim().toUpperCase(); }
  private hash(code: string, challengeId: string) { return createHash('sha256').update(`${challengeId}:${code}`).digest('hex'); }
  private hashesMatch(left: string, right: string) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  private mask(email: string) {
    const [name, domain] = email.split('@');
    return `${name.slice(0, 1)}${'*'.repeat(Math.max(2, Math.min(name.length - 1, 6)))}@${domain}`;
  }
}
