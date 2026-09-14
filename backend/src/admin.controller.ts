import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
} from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type StatusBody = { status?: unknown };

@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get('students')
  async students(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.prisma.user.findMany({
      where: { role: 'ETUDIANT' },
      select: {
        id: true,
        fullName: true,
        email: true,
        registrationStatus: true,
        establishment: true,
        level: true,
        program: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('students/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: StatusBody,
    @Headers('authorization') authorization?: string,
  ) {
    await this.authService.requireAdmin(authorization);
    if (typeof body.status !== 'string' || !Object.values(RegistrationStatus).includes(body.status as RegistrationStatus)) {
      throw new BadRequestException('Statut d’inscription invalide.');
    }

    const status = body.status as RegistrationStatus;
    const [student] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { registrationStatus: status },
        select: { id: true, registrationStatus: true },
      }),
      this.prisma.enrollmentApplication.updateMany({
        where: { userId: id },
        data: { status },
      }),
    ]);
    return student;
  }
}
