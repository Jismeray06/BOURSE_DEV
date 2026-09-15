import { BadRequestException, Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type DecisionBody = { status?: unknown; note?: unknown };

@Controller('scolarite')
export class CentralRegistrarController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

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
    ]);
    return updated;
  }
}
