import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Headers, Logger, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { DocumentRequirementContext, RegistrationStatus, UserRole } from '@prisma/client';
import { AuthService } from '../auth/auth.service.js';
import { ALL_ESTABLISHMENTS, documentTypeSlug } from '../documents/document-type.js';
import { MailService } from '../mail/mail.service.js';
import { assertPasswordNotCommon } from '../auth/password-policy.js';
import { PrismaService } from '../common/prisma.service.js';

type DecisionBody = { status?: unknown; note?: unknown };
type ModeBody = { uniform?: unknown };
type DocumentRequirementBody = { establishment?: unknown; label?: unknown; active?: unknown };
type SecretaryBody = { fullName?: unknown; email?: unknown; password?: unknown };
type SecretaryUpdateBody = { fullName?: unknown; email?: unknown; password?: unknown };

@Controller('scolarite')
export class CentralRegistrarController {
  private readonly logger = new Logger(CentralRegistrarController.name);

  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService, private readonly mailService: MailService) {}

  @Get('applications')
  async applications(@Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrar(authorization);
    return this.prisma.enrollmentApplication.findMany({
      where: { status: { in: [RegistrationStatus.SOUMIS, RegistrationStatus.EN_REVISION, RegistrationStatus.VALIDE, RegistrationStatus.REFUSE] } },
      include: {
        user: { select: { fullName: true, email: true } },
        quitus: { select: { code: true } },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // Pièces que l'étudiant doit téléverser à l'étape « Dépôt de dossier » : une liste par établissement, gérée ici.
  // Mode « identique pour tous » : une seule liste de pièces (clé d'établissement « * ») pour tous les étudiants.
  @Get('document-requirements-mode')
  async documentRequirementsMode(@Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrar(authorization);
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { uniformCandidatureDocuments: true } });
    return { uniform: settings?.uniformCandidatureDocuments ?? false };
  }

  @Put('document-requirements-mode')
  async setDocumentRequirementsMode(@Body() body: ModeBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrarAdmin(authorization);
    if (typeof body.uniform !== 'boolean') throw new BadRequestException('Le mode doit être vrai ou faux.');
    const settings = await this.prisma.siteSettings.upsert({
      where: { id: 'default' }, update: { uniformCandidatureDocuments: body.uniform }, create: { id: 'default', uniformCandidatureDocuments: body.uniform },
      select: { uniformCandidatureDocuments: true },
    });
    return { uniform: settings.uniformCandidatureDocuments };
  }

  @Get('document-requirements')
  async documentRequirements(@Query('establishment') establishment: string | undefined, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrar(authorization);
    return this.prisma.documentRequirement.findMany({
      where: { establishment: await this.knownEstablishment(establishment), context: DocumentRequirementContext.CANDIDATURE },
      orderBy: { label: 'asc' },
    });
  }

  @Post('document-requirements')
  async addDocumentRequirement(@Body() body: DocumentRequirementBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrarAdmin(authorization);
    const establishment = await this.knownEstablishment(body.establishment);
    const label = this.label(body.label);
    const type = documentTypeSlug(undefined, label);
    const duplicate = await this.prisma.documentRequirement.findFirst({ where: { establishment, context: DocumentRequirementContext.CANDIDATURE, type }, select: { id: true } });
    if (duplicate) throw new BadRequestException('Cette pièce existe déjà pour cet établissement.');
    return this.prisma.documentRequirement.create({ data: { establishment, context: DocumentRequirementContext.CANDIDATURE, type, label } });
  }

  @Patch('document-requirements/:id')
  async updateDocumentRequirement(@Param('id') id: string, @Body() body: DocumentRequirementBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrarAdmin(authorization);
    const existing = await this.prisma.documentRequirement.findFirst({ where: { id, context: DocumentRequirementContext.CANDIDATURE } });
    if (!existing) throw new BadRequestException('Pièce introuvable.');
    const data = {
      ...(typeof body.label === 'string' ? { label: this.label(body.label) } : {}),
      ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
    };
    if (!Object.keys(data).length) throw new BadRequestException('Aucune modification fournie.');
    return this.prisma.documentRequirement.update({ where: { id }, data });
  }

  @Delete('document-requirements/:id')
  async removeDocumentRequirement(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrarAdmin(authorization);
    const result = await this.prisma.documentRequirement.deleteMany({ where: { id, context: DocumentRequirementContext.CANDIDATURE } });
    if (!result.count) throw new BadRequestException('Pièce introuvable.');
    return { deleted: true };
  }

  @Patch('applications/:id/decision')
  async decide(@Param('id') id: string, @Body() body: DecisionBody, @Headers('authorization') authorization?: string) {
    const reviewer = await this.authService.requireCentralRegistrar(authorization);
    if (body.status !== RegistrationStatus.VALIDE && body.status !== RegistrationStatus.REFUSE) {
      throw new BadRequestException('La décision doit être VALIDE ou REFUSE.');
    }
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (body.status === RegistrationStatus.REFUSE && !note) throw new BadRequestException('Un motif de refus est obligatoire.');
    const application = await this.prisma.enrollmentApplication.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!application || (application.status !== RegistrationStatus.SOUMIS && application.status !== RegistrationStatus.EN_REVISION)) {
      throw new BadRequestException('Ce dossier ne peut pas être traité.');
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.enrollmentApplication.update({
        where: { id }, data: { status: body.status, reviewNote: note || null, reviewedAt: new Date(), reviewedById: reviewer.id },
        include: { user: { select: { fullName: true, email: true } }, quitus: { select: { code: true } }, reviewedBy: { select: { fullName: true } } },
      }),
      this.prisma.user.update({ where: { id: application.userId }, data: { registrationStatus: body.status } }),
      this.prisma.notification.create({
        data: body.status === RegistrationStatus.VALIDE
          ? { userId: application.userId, type: 'APPLICATION_VALIDATED', title: 'Dossier validé', message: `Votre dossier de bourse a été validé par la scolarité centrale.${note ? ` Remarque : ${note}` : ''}` }
          : { userId: application.userId, type: 'APPLICATION_REFUSED', title: 'Dossier refusé', message: `Votre dossier de bourse a été refusé. Motif : ${note}` },
      }),
    ]);
    // L'e-mail n'est pas bloquant : si l'envoi échoue, la décision reste enregistrée et l'erreur est journalisée.
    this.mailService
      .sendApplicationDecisionEmail(updated.user.email, updated.user.fullName, body.status === RegistrationStatus.VALIDE, note || null)
      .catch((error: unknown) => this.logger.error(`E-mail de décision non envoyé à ${updated.user.email} (dossier ${id}) : ${error instanceof Error ? error.message : error}`));
    return updated;
  }

  // Comptes des secrétaires de la scolarité : créés et gérés par le responsable de la scolarité centrale.
  // Un secrétaire traite les dossiers (consultation, validation, refus motivé) mais ne gère ni les comptes ni les pièces demandées.
  @Get('secretaries')
  async secretaries(@Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrarAdmin(authorization);
    return this.prisma.user.findMany({
      where: { role: UserRole.SECRETAIRE_SCOLARITE, deletedAt: null },
      select: { id: true, fullName: true, email: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('secretaries')
  async addSecretary(@Body() body: SecretaryBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    const fullName = this.required(body.fullName, 'Le nom complet');
    const email = this.required(body.email, 'L’adresse e-mail').toLowerCase();
    const password = this.password(body.password, email);
    const account = await this.authService.createStaffAccount(manager, fullName, email, password, UserRole.SECRETAIRE_SCOLARITE);
    // L'e-mail n'est pas bloquant : si l'envoi échoue, le compte reste créé et l'interface le signale au responsable.
    const emailSent = await this.mailService
      .sendCentralSecretaryCreatedEmail(account.email, account.fullName, manager.fullName)
      .then(() => true)
      .catch((error: unknown) => {
        this.logger.error(`E-mail de création de compte non envoyé à ${account.email} : ${error instanceof Error ? error.message : error}`);
        return false;
      });
    return { ...account, emailSent };
  }

  @Patch('secretaries/:id/status')
  async updateSecretaryStatus(@Param('id') id: string, @Body() body: { active?: unknown }, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    await this.secretaryAccount(id);
    if (typeof body.active !== 'boolean') throw new BadRequestException('L’état du compte est invalide.');
    return this.authService.setStaffAccountActive(manager, id, body.active);
  }

  // Modification du nom, de l'adresse e-mail et/ou du mot de passe (au moins un champ).
  @Patch('secretaries/:id')
  async updateSecretary(@Param('id') id: string, @Body() body: SecretaryUpdateBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    const account = await this.secretaryAccount(id);
    const fullName = body.fullName === undefined ? undefined : this.required(body.fullName, 'Le nom complet');
    const email = body.email === undefined ? undefined : this.required(body.email, 'L’adresse e-mail').toLowerCase();
    const password = body.password === undefined ? undefined : this.password(body.password, email ?? account.email);
    if (fullName === undefined && email === undefined && password === undefined) throw new BadRequestException('Aucune modification fournie.');
    // L'adresse est changée en premier : un doublon est refusé avant toute autre modification.
    const emailChange = email === undefined ? null : await this.authService.updateStaffAccountEmail(manager, id, email);
    if (fullName !== undefined) await this.authService.updateStaffAccountName(manager, id, fullName);
    if (password !== undefined) await this.authService.resetStaffPassword(manager, id, password);
    // Alerte de sécurité envoyée à l'ancienne adresse ; non bloquante.
    if (emailChange?.previousEmail) {
      this.mailService
        .sendEmailChangedNotice(emailChange.previousEmail, fullName ?? account.fullName, emailChange.email)
        .catch((error: unknown) => this.logger.error(`Alerte de changement d’adresse non envoyée à ${emailChange.previousEmail} : ${error instanceof Error ? error.message : error}`));
    }
    return { id };
  }

  // Renvoie l'e-mail « votre compte a été créé » (message perdu, adresse corrigée…).
  @Post('secretaries/:id/welcome-email')
  async resendSecretaryWelcome(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    const account = await this.secretaryAccount(id);
    const emailSent = await this.mailService
      .sendCentralSecretaryCreatedEmail(account.email, account.fullName, manager.fullName)
      .then(() => true)
      .catch((error: unknown) => {
        this.logger.error(`E-mail de création de compte non renvoyé à ${account.email} : ${error instanceof Error ? error.message : error}`);
        return false;
      });
    return { emailSent };
  }

  // Suppression en deux temps, comme pour les comptes du personnel : corbeille (restaurable), puis suppression définitive.
  @Get('secretaries/trash')
  async trashedSecretaries(@Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrarAdmin(authorization);
    return this.prisma.user.findMany({
      where: { role: UserRole.SECRETAIRE_SCOLARITE, deletedAt: { not: null } },
      select: { id: true, fullName: true, email: true, deletedAt: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  @Delete('secretaries/:id')
  async trashSecretary(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    await this.secretaryAccount(id);
    return this.authService.trashStaffAccount(manager, id);
  }

  @Post('secretaries/:id/restore')
  async restoreSecretary(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    await this.secretaryAccount(id, true);
    return this.authService.restoreStaffAccount(manager, id);
  }

  @Delete('secretaries/:id/purge')
  async purgeSecretary(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireCentralRegistrarAdmin(authorization);
    await this.secretaryAccount(id, true);
    // Les décisions déjà prises gardent le nom de l'agent : on ne supprime pas définitivement un compte qui a traité des dossiers.
    const decisions = await this.prisma.enrollmentApplication.count({ where: { reviewedById: id } });
    if (decisions > 0) {
      throw new ConflictException(`Ce secrétaire a traité ${decisions} dossier(s) : sa suppression définitive effacerait son nom de l’historique des décisions. Laissez-le dans la corbeille.`);
    }
    return this.authService.purgeStaffAccount(manager, id);
  }

  private async secretaryAccount(id: string, trashed = false) {
    const account = await this.prisma.user.findFirst({
      where: { id, role: UserRole.SECRETAIRE_SCOLARITE, deletedAt: trashed ? { not: null } : null },
      select: { id: true, fullName: true, email: true },
    });
    if (!account) throw new BadRequestException(trashed ? 'Compte introuvable dans la corbeille.' : 'Compte secrétaire introuvable.');
    return account;
  }

  private required(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value.trim();
  }

  private password(value: unknown, email: string) {
    const password = this.required(value, 'Le mot de passe');
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    assertPasswordNotCommon(password, email);
    return password;
  }

  private label(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('Le libellé est obligatoire.');
    return value.trim();
  }

  private async knownEstablishment(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('L’établissement est obligatoire.');
    const name = value.trim();
    if (name === ALL_ESTABLISHMENTS) return name;
    if (!(await this.prisma.establishment.findUnique({ where: { name }, select: { id: true } }))) throw new BadRequestException('Établissement introuvable.');
    return name;
  }
}
