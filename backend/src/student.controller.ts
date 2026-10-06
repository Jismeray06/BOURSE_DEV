import { BadRequestException, Body, Controller, Get, Headers, Post, Put, UnauthorizedException } from '@nestjs/common';
import { CurriculumOptionType, DocumentRequirementContext, RegistrationStatus, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { DocumentService } from './document.service.js';
import { PrismaService } from './prisma.service.js';
import { QuitusService } from './quitus.service.js';

type ApplicationBody = {
  establishment?: unknown;
  level?: unknown;
  program?: unknown;
  quitusCode?: unknown;
};

@Controller('student')
export class StudentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService, private readonly documents: DocumentService, private readonly quitusService: QuitusService) {}

  @Get('application')
  async application(@Headers('authorization') authorization?: string) {
    const user = await this.student(authorization);
    return this.prisma.enrollmentApplication.findUnique({
      where: { userId: user.id },
      include: { quitus: { select: { code: true } } },
    });
  }

  @Get('profile')
  async profile(@Headers('authorization') authorization?: string) {
    const user = await this.student(authorization);
    return {
      fullName: user.fullName,
      email: user.email,
      establishment: user.establishment,
      level: user.level,
      program: user.program,
    };
  }

  @Put('application')
  async save(@Body() body: ApplicationBody, @Headers('authorization') authorization?: string) {
    const user = await this.student(authorization);
    const existing = await this.prisma.enrollmentApplication.findUnique({ where: { userId: user.id } });
    const fields = await this.fields(body, user, existing);
    if (existing && existing.status !== RegistrationStatus.BROUILLON && existing.status !== RegistrationStatus.REFUSE) {
      throw new BadRequestException('Ce dossier est déjà soumis et ne peut plus être modifié.');
    }

    const application = await this.prisma.enrollmentApplication.upsert({
      where: { userId: user.id },
      update: { ...fields, status: RegistrationStatus.BROUILLON, submittedAt: null },
      create: { userId: user.id, ...fields },
      include: { quitus: { select: { code: true } } },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { establishment: fields.establishment, level: fields.level, program: fields.program, registrationStatus: RegistrationStatus.BROUILLON } });
    return application;
  }

  @Post('application/submit')
  async submit(@Body() body: ApplicationBody, @Headers('authorization') authorization?: string) {
    const user = await this.student(authorization);
    const existing = await this.prisma.enrollmentApplication.findUnique({ where: { userId: user.id } });
    const fields = await this.fields(body, user, existing, true);
    if (existing && existing.status !== RegistrationStatus.BROUILLON && existing.status !== RegistrationStatus.REFUSE) {
      throw new BadRequestException('Ce dossier a déjà été soumis.');
    }
    const storedTypes = new Set(existing ? (await this.documents.list(existing.id)).map((document) => document.type) : []);
    const isFirstYear = /licence\s*1|\bL1\b/i.test(fields.level);
    const requiredTypes = await this.requiredCandidatureDocumentTypes(fields.establishment, isFirstYear);
    if (requiredTypes.some((type) => !storedTypes.has(type))) throw new BadRequestException('Toutes les pièces obligatoires doivent être téléversées avant la soumission.');

    const [application] = await this.prisma.$transaction([
      this.prisma.enrollmentApplication.upsert({
        where: { userId: user.id },
        update: { ...fields, status: RegistrationStatus.SOUMIS, submittedAt: new Date() },
        create: { userId: user.id, ...fields, status: RegistrationStatus.SOUMIS, submittedAt: new Date() },
        include: { quitus: { select: { code: true } } },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { establishment: fields.establishment, level: fields.level, program: fields.program, registrationStatus: RegistrationStatus.SOUMIS } }),
      this.prisma.notification.create({ data: { userId: user.id, type: 'APPLICATION_SUBMITTED', title: 'Dossier soumis', message: `Votre dossier de bourse (${fields.establishment} · ${fields.level}) a été transmis à la scolarité centrale. Vous serez prévenu de la décision.` } }),
    ]);
    return application;
  }

  private async requiredCandidatureDocumentTypes(establishment: string, isFirstYear: boolean) {
    const fallback = ['cin', 'quitus', 'residence', ...(isFirstYear ? ['bac'] : [])];
    const configured = await this.prisma.documentRequirement.findMany({
      where: { establishment, context: DocumentRequirementContext.CANDIDATURE, active: true },
      select: { type: true },
    });
    if (!configured.length) return fallback;
    return configured.map((item) => item.type).filter((type) => type !== 'unemployment' && (type !== 'bac' || isFirstYear));
  }

  private async student(authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    if (user.role !== UserRole.ETUDIANT) throw new UnauthorizedException('Accès réservé aux étudiants.');
    return user;
  }

  private async fields(body: ApplicationBody, user: { id: string; email: string }, existing: { establishment: string; quitusId: string | null } | null, requireQuitus = false) {
    const establishment = this.string(body.establishment, 'L’établissement');
    const level = this.string(body.level, 'Le niveau');
    const program = this.string(body.program, 'Le parcours');
    // Un établissement qui a configuré son curriculum voit niveau et parcours contrôlés.
    const hasCurriculum = (await this.prisma.establishmentCurriculumOption.count({ where: { establishment } })) > 0;
    if (hasCurriculum) {
      const options = await this.prisma.establishmentCurriculumOption.findMany({
        where: { establishment, active: true, name: { in: [level, program] } },
      });
      const levelValid = options.some((option) => option.type === CurriculumOptionType.NIVEAU && option.name === level);
      const programValid = options.some((option) => option.type === CurriculumOptionType.PARCOURS && option.name === program);
      if (!levelValid || !programValid) throw new BadRequestException('Le niveau ou le parcours sélectionné n’est plus actif dans cet établissement.');
    }
    const quitusCode = typeof body.quitusCode === 'string' && body.quitusCode.trim() ? body.quitusCode.trim().toUpperCase() : undefined;
    if (requireQuitus && !quitusCode) throw new BadRequestException('Un quitus valide est obligatoire pour soumettre le dossier.');

    // Sans code envoyé, le quitus déjà rattaché est conservé tant que l'établissement ne change pas.
    let quitusId: string | null = existing && existing.establishment === establishment ? existing.quitusId : null;
    if (quitusCode) quitusId = await this.quitusService.assertUsable(user, quitusCode, establishment, existing?.quitusId);
    return { establishment, level, program, quitusId };
  }

  private string(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value.trim();
  }
}
