import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CurriculumCycle, CurriculumOptionType, DocumentRequirementContext, EnrollmentQuality, Gender, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';

type VerifyQuitusBody = { code?: unknown; establishment?: unknown };
type DocumentRequirementBody = { cycle?: unknown; type?: unknown; label?: unknown; active?: unknown; context?: unknown };
type GenerateBody = { studentIds?: unknown };
type CreateStudentBody = {
  existingStudentId?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  gender?: unknown;
  registrationForm?: unknown;
  level?: unknown;
  program?: unknown;
  birthDatePlace?: unknown;
  cin?: unknown;
  nationality?: unknown;
  address?: unknown;
  previousEstablishment?: unknown;
  bacYear?: unknown;
  bacSeries?: unknown;
  bacCenter?: unknown;
  previousUniversityRegistration?: unknown;
  fatherName?: unknown;
  motherName?: unknown;
  parentsPhone?: unknown;
  parentsCity?: unknown;
  respondentName?: unknown;
  respondentPhone?: unknown;
  respondentAddress?: unknown;
  maritalStatus?: unknown;
  licenceYear?: unknown;
  mention?: unknown;
  previousLevel?: unknown;
  previousProgram?: unknown;
  quality?: unknown;
};
type CurriculumBody = { type?: unknown; name?: unknown; active?: unknown; cycle?: unknown };
type SecretaryBody = { fullName?: unknown; email?: unknown; password?: unknown };
type SecretaryUpdateBody = { fullName?: unknown; password?: unknown };
type SettingsBody = { mention?: unknown };
const ISSTM = 'ISSTM';

@Controller()
export class EstablishmentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

  @Get('establishments/isstm/curriculum')
  async publicCurriculum() { return this.curriculum(true); }

  @Get('establishment/isstm/curriculum')
  async managerCurriculum(@Headers('authorization') authorization?: string) {
    return this.curriculum(false, await this.managerEstablishment(authorization));
  }

  @Post('establishment/isstm/curriculum')
  async addCurriculumOption(@Body() body: CurriculumBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const type = this.curriculumType(body.type);
    const name = this.required(body.name, 'Le libellé');
    const cycle = this.curriculumCycle(body.cycle);
    return this.prisma.establishmentCurriculumOption.create({ data: { establishment, type, name, cycle } });
  }

  @Patch('establishment/isstm/curriculum/:id')
  async updateCurriculumOption(@Param('id') id: string, @Body() body: CurriculumBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const existing = await this.prisma.establishmentCurriculumOption.findFirst({ where: { id, establishment } });
    if (!existing) throw new BadRequestException('Option introuvable.');
    const data = {
      ...(typeof body.name === 'string' ? { name: this.required(body.name, 'Le libellé') } : {}),
      ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
      ...(body.cycle !== undefined ? { cycle: this.curriculumCycle(body.cycle) } : {}),
    };
    if (!Object.keys(data).length) throw new BadRequestException('Aucune modification fournie.');
    return this.prisma.establishmentCurriculumOption.update({ where: { id }, data });
  }

  @Delete('establishment/isstm/curriculum/:id')
  async removeCurriculumOption(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const result = await this.prisma.establishmentCurriculumOption.deleteMany({ where: { id, establishment } });
    if (!result.count) throw new BadRequestException('Option introuvable.');
    return { deleted: true };
  }

  @Get('establishments/isstm/document-requirements')
  async publicDocumentRequirements() {
    return this.prisma.documentRequirement.findMany({
      where: { establishment: ISSTM, context: DocumentRequirementContext.CANDIDATURE, active: true },
      orderBy: { label: 'asc' },
    });
  }

  @Get('establishment/isstm/document-requirements')
  async documentRequirements(@Query('context') context: string | undefined, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    return this.prisma.documentRequirement.findMany({
      where: { establishment, context: this.documentContext(context) },
      orderBy: [{ cycle: 'asc' }, { label: 'asc' }],
    });
  }

  @Post('establishment/isstm/document-requirements')
  async addDocumentRequirement(@Body() body: DocumentRequirementBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const cycle = this.curriculumCycle(body.cycle);
    const context = this.documentContext(body.context);
    const label = this.required(body.label, 'Le libellé');
    const type = this.documentType(body.type, label);
    return this.prisma.documentRequirement.create({ data: { establishment, context, cycle, type, label } });
  }

  @Patch('establishment/isstm/document-requirements/:id')
  async updateDocumentRequirement(@Param('id') id: string, @Body() body: DocumentRequirementBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const existing = await this.prisma.documentRequirement.findFirst({ where: { id, establishment } });
    if (!existing) throw new BadRequestException('Pièce introuvable.');
    const data = {
      ...(typeof body.label === 'string' ? { label: this.required(body.label, 'Le libellé') } : {}),
      ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
      ...(body.cycle !== undefined ? { cycle: this.curriculumCycle(body.cycle) } : {}),
    };
    if (!Object.keys(data).length) throw new BadRequestException('Aucune modification fournie.');
    return this.prisma.documentRequirement.update({ where: { id }, data });
  }

  @Delete('establishment/isstm/document-requirements/:id')
  async removeDocumentRequirement(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const result = await this.prisma.documentRequirement.deleteMany({ where: { id, establishment } });
    if (!result.count) throw new BadRequestException('Pièce introuvable.');
    return { deleted: true };
  }

  @Get('establishment/isstm/students')
  async students(@Headers('authorization') authorization?: string, @Query('search') search = '', @Query('gender') gender?: string, @Query('level') level?: string) {
    const establishment = await this.managerEstablishment(authorization);
    return this.prisma.enrolledStudent.findMany({
      where: { establishment, ...(gender ? { gender: gender as never } : {}), ...(level ? { level } : {}), ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { registrationNumber: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}) },
      include: { quitus: true }, orderBy: { registrationNumber: 'asc' },
    });
  }

  @Get('establishment/isstm/secretaries')
  async secretaries(@Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    return this.prisma.user.findMany({
      where: { role: UserRole.SECRETAIRE, establishment: this.establishmentOf(manager.establishment) },
      select: { id: true, fullName: true, email: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('establishment/isstm/secretaries')
  async addSecretary(@Body() body: SecretaryBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentAdmin(authorization);
    const fullName = this.required(body.fullName, 'Le nom complet');
    const email = this.required(body.email, "L’adresse e-mail").toLowerCase();
    const password = this.required(body.password, 'Le mot de passe');
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    return this.authService.createStaffAccount(manager, fullName, email, password, UserRole.SECRETAIRE, this.establishmentOf(manager.establishment));
  }

  @Patch('establishment/isstm/secretaries/:id/status')
  async updateSecretaryStatus(@Param('id') id: string, @Body() body: { active?: unknown }, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentAdmin(authorization);
    const establishment = this.establishmentOf(manager.establishment);
    await this.secretaryInEstablishment(id, establishment);
    if (typeof body.active !== 'boolean') throw new BadRequestException('L’état du compte est invalide.');
    return this.prisma.user.update({ where: { id }, data: { active: body.active }, select: { id: true, active: true } });
  }

  @Patch('establishment/isstm/secretaries/:id')
  async updateSecretary(@Param('id') id: string, @Body() body: SecretaryUpdateBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentAdmin(authorization);
    const establishment = this.establishmentOf(manager.establishment);
    await this.secretaryInEstablishment(id, establishment);
    const fullName = body.fullName === undefined ? undefined : this.required(body.fullName, 'Le nom complet');
    const password = body.password === undefined ? undefined : this.required(body.password, 'Le mot de passe');
    if (password !== undefined && password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    if (fullName === undefined && password === undefined) throw new BadRequestException('Aucune modification fournie.');
    return this.authService.updateStaffAccount(id, fullName, password);
  }

  @Post('establishment/isstm/students')
  async addStudent(@Body() body: CreateStudentBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const registrationForm = body.registrationForm === 'MASTER' ? 'MASTER' : 'LICENCE';
    const level = this.required(body.level, 'Le niveau');
    const program = this.required(body.program, 'Le parcours');
    await this.assertCurriculum(establishment, level, program, registrationForm === 'MASTER' ? CurriculumCycle.MASTER : CurriculumCycle.LICENCE);

    if (typeof body.existingStudentId === 'string' && body.existingStudentId.trim()) {
      const existing = await this.prisma.enrolledStudent.findFirst({
        where: { id: body.existingStudentId.trim(), establishment },
      });
      if (!existing) throw new BadRequestException('Le dossier étudiant est introuvable dans cet établissement.');
      const quality = this.optionalQuality(body.quality);
      return this.prisma.enrolledStudent.update({
        where: { id: existing.id },
        data: {
          level, program, registrationForm, active: true,
          ...(quality ? { quality } : {}),
          ...(this.optional(body.phone) ? { phone: this.optional(body.phone)! } : {}),
          ...(body.address !== undefined ? { address: this.optional(body.address) } : {}),
          ...(body.cin !== undefined ? { cin: this.optional(body.cin) } : {}),
          ...(body.nationality !== undefined ? { nationality: this.optional(body.nationality) } : {}),
          ...(body.birthDatePlace !== undefined ? { birthDatePlace: this.optional(body.birthDatePlace) } : {}),
        },
        include: { quitus: true },
      });
    }

    const fullName = this.required(body.fullName, 'Le nom complet');
    const email = this.required(body.email, "L’adresse e-mail").toLowerCase();
    const phone = this.required(body.phone, 'Le téléphone');
    if (typeof body.gender !== 'string' || !Object.values(Gender).includes(body.gender as Gender)) {
      throw new BadRequestException('Le genre est invalide.');
    }
    const existing = await this.prisma.enrolledStudent.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Un étudiant utilise déjà cette adresse e-mail.');

    // Le matricule reste requis par la base, mais il est désormais attribué par le serveur.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.enrolledStudent.create({
          data: {
            registrationNumber: this.registrationNumber(establishment), fullName, email, phone,
            gender: body.gender as Gender, registrationForm, level, program, establishment,
            birthDatePlace: this.optional(body.birthDatePlace), cin: this.optional(body.cin),
            nationality: this.optional(body.nationality), address: this.optional(body.address),
            previousEstablishment: this.optional(body.previousEstablishment), bacYear: this.optional(body.bacYear),
            bacSeries: this.optional(body.bacSeries), bacCenter: this.optional(body.bacCenter),
            previousUniversityRegistration: typeof body.previousUniversityRegistration === 'boolean' ? body.previousUniversityRegistration : null,
            fatherName: this.optional(body.fatherName), motherName: this.optional(body.motherName),
            parentsPhone: this.optional(body.parentsPhone), parentsCity: this.optional(body.parentsCity),
            respondentName: this.optional(body.respondentName), respondentPhone: this.optional(body.respondentPhone),
            respondentAddress: this.optional(body.respondentAddress), maritalStatus: this.optional(body.maritalStatus),
            licenceYear: this.optional(body.licenceYear), mention: this.optional(body.mention),
            previousLevel: this.optional(body.previousLevel), previousProgram: this.optional(body.previousProgram),
            quality: this.optionalQuality(body.quality),
          },
          include: { quitus: true },
        });
      } catch (error: unknown) {
        if (!this.isUniqueError(error) || attempt === 2) throw error;
      }
    }
    throw new BadRequestException("Impossible d'attribuer un matricule à cet étudiant.");
  }

  @Get('establishment/isstm/settings')
  async getSettings(@Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const settings = await this.prisma.establishmentSettings.findUnique({ where: { establishment } });
    return { mention: settings?.mention ?? '' };
  }

  @Patch('establishment/isstm/settings')
  async updateSettings(@Body() body: SettingsBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentAdmin(authorization);
    const establishment = this.establishmentOf(manager.establishment);
    const mention = this.optional(body.mention);
    const settings = await this.prisma.establishmentSettings.upsert({
      where: { establishment },
      update: { mention },
      create: { establishment, mention },
    });
    return { mention: settings.mention ?? '' };
  }

  @Post('establishment/isstm/quitus/generate')
  async generate(@Body() body: GenerateBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    const establishment = this.establishmentOf(manager.establishment);
    const ids = Array.isArray(body.studentIds) ? body.studentIds.filter((id): id is string => typeof id === 'string') : undefined;
    if (ids && !ids.length) throw new BadRequestException('Sélectionnez au moins un étudiant.');
    const students = await this.prisma.enrolledStudent.findMany({ where: { establishment, active: true, ...(ids ? { id: { in: ids } } : {}) }, include: { quitus: true } });
    const missing = students.filter((student) => !student.quitus);
    await this.prisma.$transaction(missing.map((student) => this.prisma.quitus.create({ data: { code: this.code(), studentName: student.fullName, studentEmail: student.email, establishment, issuedById: manager.id, enrollmentId: student.id } })));
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

  private registrationNumber(establishment: string) {
    const prefix = establishment.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase() || 'ETAB';
    return `${prefix}-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async curriculum(activeOnly: boolean, establishment = ISSTM) {
    const options = await this.prisma.establishmentCurriculumOption.findMany({
      where: { establishment, ...(activeOnly ? { active: true } : {}) },
      orderBy: { name: 'asc' },
    });
    return { levels: options.filter((option) => option.type === CurriculumOptionType.NIVEAU), programs: options.filter((option) => option.type === CurriculumOptionType.PARCOURS) };
  }

  private curriculumType(value: unknown) {
    if (value !== CurriculumOptionType.NIVEAU && value !== CurriculumOptionType.PARCOURS) throw new BadRequestException('Le type doit être NIVEAU ou PARCOURS.');
    return value;
  }
  private curriculumCycle(value: unknown) {
    if (value === undefined) return CurriculumCycle.LICENCE;
    if (value !== CurriculumCycle.LICENCE && value !== CurriculumCycle.MASTER) throw new BadRequestException('Le cycle doit être LICENCE ou MASTER.');
    return value;
  }
  private documentContext(value: unknown) {
    if (value === undefined) return DocumentRequirementContext.INSCRIPTION;
    if (value !== DocumentRequirementContext.INSCRIPTION && value !== DocumentRequirementContext.CANDIDATURE) {
      throw new BadRequestException('Le contexte doit être INSCRIPTION ou CANDIDATURE.');
    }
    return value;
  }
  private documentType(value: unknown, label: string) {
    const raw = typeof value === 'string' && value.trim() ? value.trim() : label;
    const slug = raw
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!slug) throw new BadRequestException('Impossible de déterminer une clé pour cette pièce.');
    return slug;
  }
  private optionalQuality(value: unknown): EnrollmentQuality | undefined {
    if (value === undefined) return undefined;
    if (value !== EnrollmentQuality.PASSANT && value !== EnrollmentQuality.REDOUBLANT) throw new BadRequestException('La qualité doit être PASSANT ou REDOUBLANT.');
    return value;
  }

  private async assertCurriculum(establishment: string, level: string, program: string, cycle: CurriculumCycle) {
    const options = await this.prisma.establishmentCurriculumOption.findMany({ where: { establishment, active: true, cycle, name: { in: [level, program] } } });
    if (!options.some((option) => option.type === CurriculumOptionType.NIVEAU && option.name === level) || !options.some((option) => option.type === CurriculumOptionType.PARCOURS && option.name === program)) {
      throw new BadRequestException('Le niveau ou le parcours n’est pas actif dans la configuration de cet établissement pour ce cycle.');
    }
  }

  private required(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} est obligatoire.`);
    return value.trim();
  }
  private optional(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  private async managerEstablishment(authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    return this.establishmentOf(manager.establishment);
  }
  private establishmentOf(establishment: string | null) {
    if (!establishment?.trim()) throw new BadRequestException('Aucun établissement n’est associé à ce compte.');
    return establishment.trim();
  }
  private async secretaryInEstablishment(id: string, establishment: string) {
    const secretary = await this.prisma.user.findFirst({ where: { id, role: UserRole.SECRETAIRE, establishment }, select: { id: true } });
    if (!secretary) throw new BadRequestException('Compte secrétaire introuvable.');
  }
  private isUniqueError(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
}
