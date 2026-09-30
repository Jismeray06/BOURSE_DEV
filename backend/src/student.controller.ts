import { BadRequestException, Body, Controller, Get, Headers, Post, Put, UnauthorizedException } from '@nestjs/common';
import { CurriculumOptionType, DocumentRequirementContext, RegistrationStatus, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { DocumentService } from './document.service.js';
import { PrismaService } from './prisma.service.js';

type ApplicationBody = {
  establishment?: unknown;
  level?: unknown;
  program?: unknown;
  quitusCode?: unknown;
};

@Controller('student')
export class StudentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService, private readonly documents: DocumentService) {}

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
    const fields = await this.fields(body);
    const existing = await this.prisma.enrollmentApplication.findUnique({ where: { userId: user.id } });
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
    const fields = await this.fields(body, true);
    const existing = await this.prisma.enrollmentApplication.findUnique({ where: { userId: user.id } });
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
    ]);
    return application;
  }

  private async requiredCandidatureDocumentTypes(establishment: string, isFirstYear: boolean) {
    const fallback = ['cin', 'quitus', 'residence', ...(isFirstYear ? ['bac'] : [])];
    if (establishment !== 'ISSTM') return fallback;
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

  private async fields(body: ApplicationBody, requireQuitus = false) {
    const establishment = this.string(body.establishment, 'L’établissement');
    const level = this.string(body.level, 'Le niveau');
    const program = this.string(body.program, 'Le parcours');
    if (establishment === 'ISSTM') {
      const options = await this.prisma.establishmentCurriculumOption.findMany({
        where: { establishment, active: true, name: { in: [level, program] } },
      });
      const levelValid = options.some((option) => option.type === CurriculumOptionType.NIVEAU && option.name === level);
      const programValid = options.some((option) => option.type === CurriculumOptionType.PARCOURS && option.name === program);
      if (!levelValid || !programValid) throw new BadRequestException('Le niveau ou le parcours sélectionné n’est plus actif à l’ISSTM.');
    }
    const quitusCode = typeof body.quitusCode === 'string' && body.quitusCode.trim() ? body.quitusCode.trim().toUpperCase() : undefined;
    if (requireQuitus && !quitusCode) throw new BadRequestException('Un quitus valide est obligatoire pour soumettre le dossier.');

    let quitusId: string | null = null;
    if (quitusCode) {
      const quitus = await this.prisma.quitus.findUnique({ where: { code: quitusCode } });
      if (!quitus || quitus.establishment !== establishment) {
        throw new BadRequestException('Le quitus ne correspond pas à l’établissement sélectionné.');
      }
      quitusId = quitus.id;
    }
    return { establishment, level, program, quitusId };
  }

  private string(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value.trim();
  }
}
