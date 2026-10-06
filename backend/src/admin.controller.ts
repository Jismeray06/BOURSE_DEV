import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RegistrationStatus, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type StatusBody = { status?: unknown };
const STATUS_LABELS: Record<RegistrationStatus, string> = { BROUILLON: 'Brouillon', SOUMIS: 'Soumis', EN_REVISION: 'En révision', VALIDE: 'Validé', REFUSE: 'Refusé' };
type CreateStaffBody = { fullName?: unknown; email?: unknown; password?: unknown; role?: unknown; establishment?: unknown };
type AccountStatusBody = { active?: unknown };
type ResetPasswordBody = { password?: unknown };
type UpdateNameBody = { fullName?: unknown };

@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get('users')
  async allUsers(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        registrationStatus: true,
        establishment: true,
        level: true,
        program: true,
        active: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Statistiques du tableau de bord (comptes, dossiers de bourse, établissements, dernières actions).
  @Get('dashboard')
  async dashboard(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    const staffRoles = [UserRole.ETABLISSEMENT, UserRole.ADMIN_ETABLISSEMENT, UserRole.SECRETAIRE, UserRole.SCOLARITE_CENTRALE];
    const [students, unverifiedStudents, applications, byEstablishment, staff, inactiveStaff, trashed, pending, audit] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.ETUDIANT, deletedAt: null } }),
      this.prisma.user.count({ where: { role: UserRole.ETUDIANT, deletedAt: null, emailVerified: false } }),
      this.prisma.enrollmentApplication.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['establishment'], where: { role: UserRole.ETUDIANT, deletedAt: null, establishment: { not: null } }, _count: { _all: true }, orderBy: { establishment: 'asc' } }),
      this.prisma.user.groupBy({ by: ['role'], where: { role: { in: staffRoles }, deletedAt: null }, _count: { _all: true } }),
      this.prisma.user.count({ where: { role: { in: staffRoles }, deletedAt: null, active: false } }),
      this.prisma.user.count({ where: { deletedAt: { not: null } } }),
      this.prisma.enrollmentApplication.findMany({
        where: { status: { in: [RegistrationStatus.SOUMIS, RegistrationStatus.EN_REVISION] } },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: { id: true, establishment: true, level: true, program: true, status: true, submittedAt: true, user: { select: { fullName: true, email: true } } },
      }),
      this.prisma.auditLogEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    return {
      students: { total: students, unverified: unverifiedStudents },
      applications: Object.fromEntries(applications.map((row) => [row.status, row._count._all])),
      byEstablishment: byEstablishment.flatMap((row) => (row.establishment ? [{ establishment: row.establishment, count: row._count._all }] : [])),
      staff: { total: staff.reduce((sum, row) => sum + row._count._all, 0), inactive: inactiveStaff, byRole: Object.fromEntries(staff.map((row) => [row.role, row._count._all])) },
      trashed,
      pending,
      recentActions: audit,
    };
  }

  @Patch('users/:id/status')
  async updateAccountStatus(@Param('id') id: string, @Body() body: AccountStatusBody, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    if (typeof body.active !== 'boolean') throw new BadRequestException('L’état du compte est invalide.');
    return this.authService.setAccountActive(admin, id, body.active);
  }

  @Delete('users/:id')
  async deleteAccount(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.authService.trashAccount(admin, id);
  }

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

  @Get('establishments')
  async establishments(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    const establishments = await this.prisma.user.groupBy({
      by: ['establishment'],
      where: { role: UserRole.ETUDIANT, establishment: { not: null } },
      _count: { _all: true },
      orderBy: { establishment: 'asc' },
    });
    return establishments
      .filter((item): item is typeof item & { establishment: string } => Boolean(item.establishment))
      .map((item) => ({ establishment: item.establishment, studentCount: item._count._all }));
  }

  @Get('establishments/:establishment/students')
  async establishmentStudents(
    @Param('establishment') establishment: string,
    @Query('search') search = '',
    @Query('level') level = '',
    @Query('program') program = '',
    @Headers('authorization') authorization?: string,
  ) {
    await this.authService.requireAdmin(authorization);
    const name = decodeURIComponent(establishment).trim();
    return this.prisma.user.findMany({
      where: {
        role: UserRole.ETUDIANT,
        establishment: name,
        ...(level ? { level } : {}),
        ...(program ? { program } : {}),
        ...(search
          ? { OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
          : {}),
      },
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

  @Get('staff-accounts')
  async staffAccounts(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.ETABLISSEMENT, UserRole.ADMIN_ETABLISSEMENT, UserRole.SECRETAIRE, UserRole.SCOLARITE_CENTRALE] }, deletedAt: null },
      select: { id: true, fullName: true, email: true, role: true, establishment: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('staff-accounts/trash')
  async trashedStaffAccounts(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.authService.listTrashedStaffAccounts();
  }

  @Get('audit-log')
  async auditLog(@Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.authService.listAuditLog();
  }

  @Post('staff-accounts')
  async createStaffAccount(@Body() body: CreateStaffBody, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const fullName = this.requiredText(body.fullName, 'Le nom complet');
    const email = this.requiredText(body.email, "L’adresse e-mail");
    const password = this.requiredText(body.password, 'Le mot de passe');
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    if (body.role !== UserRole.ETABLISSEMENT && body.role !== UserRole.ADMIN_ETABLISSEMENT && body.role !== UserRole.SCOLARITE_CENTRALE) {
      throw new BadRequestException('Le rôle doit être ADMIN_ETABLISSEMENT ou SCOLARITE_CENTRALE.');
    }
    const role = body.role === UserRole.ETABLISSEMENT ? UserRole.ADMIN_ETABLISSEMENT : body.role;
    const establishment = role === UserRole.ADMIN_ETABLISSEMENT ? this.requiredText(body.establishment, 'L’établissement') : undefined;
    if (establishment && !(await this.prisma.establishment.findUnique({ where: { name: establishment }, select: { id: true } }))) {
      throw new BadRequestException('Cet établissement n’existe pas : créez-le d’abord dans l’onglet Établissements.');
    }
    return this.authService.createStaffAccount(admin, fullName, email, password, role, establishment);
  }

  @Patch('staff-accounts/:id/status')
  async updateStaffAccountStatus(@Param('id') id: string, @Body() body: AccountStatusBody, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    if (typeof body.active !== 'boolean') throw new BadRequestException('L’état du compte est invalide.');
    return this.authService.setStaffAccountActive(admin, id, body.active);
  }

  @Patch('staff-accounts/:id/name')
  async updateStaffAccountName(@Param('id') id: string, @Body() body: UpdateNameBody, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    const fullName = this.requiredText(body.fullName, 'Le nom complet');
    return this.authService.updateStaffAccountName(admin, id, fullName);
  }

  @Patch('staff-accounts/:id/password')
  async resetStaffAccountPassword(@Param('id') id: string, @Body() body: ResetPasswordBody, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    if (typeof body.password !== 'string' || body.password.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    }
    return this.authService.resetStaffPassword(admin, id, body.password);
  }

  @Delete('staff-accounts/:id')
  async trashStaffAccount(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.authService.trashStaffAccount(admin, id);
  }

  @Post('staff-accounts/:id/restore')
  async restoreStaffAccount(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.authService.restoreStaffAccount(admin, id);
  }

  @Delete('staff-accounts/:id/permanent')
  async purgeStaffAccount(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const admin = await this.authService.requireAdmin(authorization);
    return this.authService.purgeStaffAccount(admin, id);
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
      this.prisma.notification.create({ data: { userId: id, type: 'APPLICATION_STATUS', title: 'Statut de votre dossier modifié', message: `L'administration a passé votre dossier au statut « ${STATUS_LABELS[status]} ».` } }),
    ]);
    return student;
  }

  private requiredText(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value.trim();
  }
}
