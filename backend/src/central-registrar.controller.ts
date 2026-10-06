import { BadRequestException, Body, Controller, Get, Headers, Logger, Param, Patch } from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { MailService } from './mail.service.js';
import { PrismaService } from './prisma.service.js';

type DecisionBody = { status?: unknown; note?: unknown };

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
}
