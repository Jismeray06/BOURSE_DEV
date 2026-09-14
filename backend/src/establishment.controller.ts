import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type VerifyQuitusBody = { code?: unknown; establishment?: unknown };
type GenerateBody = { studentIds?: unknown };
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
    const requester = await this.authService.requireUser(authorization);
    if (typeof body.code !== 'string' || typeof body.establishment !== 'string') throw new BadRequestException('Quitus ou établissement invalide.');
    const quitus = await this.prisma.quitus.findUnique({
      where: { code: body.code.trim().toUpperCase() },
      include: { enrollment: true },
    });
    if (
      !quitus ||
      quitus.establishment !== body.establishment.trim() ||
      !quitus.enrollment ||
      !quitus.enrollment.active ||
      quitus.enrollment.email?.toLowerCase() !== requester.email.toLowerCase()
    ) {
      throw new BadRequestException('Ce quitus ne correspond à aucun étudiant actif de l’établissement sélectionné.');
    }
    return {
      valid: true,
      code: quitus.code,
      studentName: quitus.enrollment.fullName,
      registrationNumber: quitus.enrollment.registrationNumber,
      establishment: quitus.establishment,
    };
  }

  private code() { return `ISSTM-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`; }
}
