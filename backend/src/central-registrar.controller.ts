import { BadRequestException, Body, Controller, Delete, Get, Headers, Logger, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { DocumentRequirementContext, RegistrationStatus } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { ALL_ESTABLISHMENTS, documentTypeSlug } from './document-type.js';
import { MailService } from './mail.service.js';
import { PrismaService } from './prisma.service.js';

type DecisionBody = { status?: unknown; note?: unknown };
type ModeBody = { uniform?: unknown };
type DocumentRequirementBody = { establishment?: unknown; label?: unknown; active?: unknown };

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
    await this.authService.requireCentralRegistrar(authorization);
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
    await this.authService.requireCentralRegistrar(authorization);
    const establishment = await this.knownEstablishment(body.establishment);
    const label = this.label(body.label);
    const type = documentTypeSlug(undefined, label);
    const duplicate = await this.prisma.documentRequirement.findFirst({ where: { establishment, context: DocumentRequirementContext.CANDIDATURE, type }, select: { id: true } });
    if (duplicate) throw new BadRequestException('Cette pièce existe déjà pour cet établissement.');
    return this.prisma.documentRequirement.create({ data: { establishment, context: DocumentRequirementContext.CANDIDATURE, type, label } });
  }

  @Patch('document-requirements/:id')
  async updateDocumentRequirement(@Param('id') id: string, @Body() body: DocumentRequirementBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrar(authorization);
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
    await this.authService.requireCentralRegistrar(authorization);
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
