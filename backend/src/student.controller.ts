import { BadRequestException, Body, Controller, Get, Headers, Post, Put, UnauthorizedException } from '@nestjs/common';
import { RegistrationStatus, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type ApplicationBody = {
  establishment?: unknown;
  level?: unknown;
  program?: unknown;
  quitusCode?: unknown;
};

@Controller('student')
export class StudentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

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

  private async student(authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    if (user.role !== UserRole.ETUDIANT) throw new UnauthorizedException('Accès réservé aux étudiants.');
    return user;
  }

  private async fields(body: ApplicationBody, requireQuitus = false) {
    const establishment = this.string(body.establishment, 'L’établissement');
    const level = this.string(body.level, 'Le niveau');
    const program = this.string(body.program, 'Le parcours');
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
