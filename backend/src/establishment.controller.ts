import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Gender } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type VerifyQuitusBody = { code?: unknown; establishment?: unknown };
type GenerateBody = { studentIds?: unknown };
type CreateStudentBody = {
  registrationNumber?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  gender?: unknown;
  level?: unknown;
  program?: unknown;
};
const ISSTM = 'ISSTM';

@Controller()
export class EstablishmentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

  @Get('establishment/isstm/students')
  async students(@Headers('authorization') authorization?: string, @Query('search') search = '', @Query('gender') gender?: string, @Query('level') level?: string) {
    await this.authService.requireEstablishmentManager(authorization);
    return this.prisma.enrolledStudent.findMany({
      where: { establishment: ISSTM, ...(gender ? { gender: gender as never } : {}), ...(level ? { level } : {}), ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { registrationNumber: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}) },
      include: { quitus: true }, orderBy: { registrationNumber: 'asc' },
    });
  }

  @Post('establishment/isstm/students')
  async addStudent(@Body() body: CreateStudentBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireEstablishmentManager(authorization);
    const registrationNumber = this.required(body.registrationNumber, 'Le matricule').toUpperCase();
    const fullName = this.required(body.fullName, 'Le nom complet');
    const email = this.required(body.email, "L’adresse e-mail").toLowerCase();
    const phone = this.required(body.phone, 'Le téléphone');
    const level = this.required(body.level, 'Le niveau');
    const program = this.required(body.program, 'Le parcours');
    if (typeof body.gender !== 'string' || !Object.values(Gender).includes(body.gender as Gender)) {
      throw new BadRequestException('Le genre est invalide.');
    }
    const existing = await this.prisma.enrolledStudent.findFirst({ where: { OR: [{ registrationNumber }, { email }] } });
    if (existing) throw new BadRequestException('Un étudiant utilise déjà ce matricule ou cette adresse e-mail.');
    return this.prisma.enrolledStudent.create({
      data: { registrationNumber, fullName, email, phone, gender: body.gender as Gender, level, program, establishment: ISSTM },
      include: { quitus: true },
    });
  }

  @Post('establishment/isstm/quitus/generate')
  async generate(@Body() body: GenerateBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    const ids = Array.isArray(body.studentIds) ? body.studentIds.filter((id): id is string => typeof id === 'string') : undefined;
    if (ids && !ids.length) throw new BadRequestException('Sélectionnez au moins un étudiant.');
    const students = await this.prisma.enrolledStudent.findMany({ where: { establishment: ISSTM, active: true, ...(ids ? { id: { in: ids } } : {}) }, include: { quitus: true } });
    const missing = students.filter((student) => !student.quitus);
    await this.prisma.$transaction(missing.map((student) => this.prisma.quitus.create({ data: { code: this.code(), studentName: student.fullName, studentEmail: student.email, establishment: ISSTM, issuedById: manager.id, enrollmentId: student.id } })));
    return { created: missing.length, alreadyGenerated: students.length - missing.length };
  }

  @Post('quitus/verify')
  async verify(@Body() body: VerifyQuitusBody, @Headers('authorization') authorization?: string) {
    await this.authService.requireUser(authorization);
    if (typeof body.code !== 'string' || typeof body.establishment !== 'string') throw new BadRequestException('Quitus ou établissement invalide.');
    const quitus = await this.prisma.quitus.findUnique({
      where: { code: body.code.trim().toUpperCase() },
    });
    if (
      !quitus ||
      quitus.establishment !== body.establishment.trim()
    ) {
      throw new BadRequestException('Ce quitus ne correspond pas à l’établissement sélectionné.');
    }
    return {
      valid: true,
      code: quitus.code,
      studentName: quitus.studentName,
      establishment: quitus.establishment,
    };
  }

  private code() {
    // 160 bits d'aléa cryptographique : un code imprévisible, comparable à un mot de passe.
    return `QT-${randomBytes(20).toString('hex').toUpperCase()}`;
  }

  private required(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value.trim();
  }
}
