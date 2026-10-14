import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';
import { CurriculumCycle, CurriculumOptionType, DocumentRequirementContext, EnrollmentQuality, Gender, Prisma, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { PrismaService } from './prisma.service.js';
import { QuitusService } from './quitus.service.js';
import { DocumentService } from './document.service.js';
import { candidatureRequirementScope, documentTypeSlug } from './document-type.js';

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
type InterfaceSettingsBody = { settings?: unknown };

@Controller()
export class EstablishmentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService, private readonly quitusService: QuitusService, private readonly documentService: DocumentService) {}

  @Get('establishments/:name/curriculum')
  async publicCurriculum(@Param('name') name: string) { return this.curriculum(true, name); }

  @Get('establishment/isstm/curriculum')
  async managerCurriculum(@Headers('authorization') authorization?: string) {
    return this.curriculum(false, await this.managerEstablishment(authorization));
  }

  @Post('establishment/isstm/curriculum')
  async addCurriculumOption(@Body() body: CurriculumBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.adminEstablishment(authorization);
    const type = this.curriculumType(body.type);
    const name = this.required(body.name, 'Le libellé');
    const cycle = this.curriculumCycle(body.cycle);
    return this.prisma.establishmentCurriculumOption.create({ data: { establishment, type, name, cycle } });
  }

  @Patch('establishment/isstm/curriculum/:id')
  async updateCurriculumOption(@Param('id') id: string, @Body() body: CurriculumBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.adminEstablishment(authorization);
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
    const establishment = await this.adminEstablishment(authorization);
    const result = await this.prisma.establishmentCurriculumOption.deleteMany({ where: { id, establishment } });
    if (!result.count) throw new BadRequestException('Option introuvable.');
    return { deleted: true };
  }

  @Get('establishments/:name/document-requirements')
  async publicDocumentRequirements(@Param('name') name: string) {
    return this.prisma.documentRequirement.findMany({
      where: { establishment: await candidatureRequirementScope(this.prisma, name), context: DocumentRequirementContext.CANDIDATURE, active: true },
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
    const establishment = await this.adminEstablishment(authorization);
    const cycle = this.curriculumCycle(body.cycle);
    const context = this.documentContext(body.context);
    const label = this.required(body.label, 'Le libellé');
    const type = documentTypeSlug(body.type, label);
    return this.prisma.documentRequirement.create({ data: { establishment, context, cycle, type, label } });
  }

  @Patch('establishment/isstm/document-requirements/:id')
  async updateDocumentRequirement(@Param('id') id: string, @Body() body: DocumentRequirementBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.adminEstablishment(authorization);
    const existing = await this.prisma.documentRequirement.findFirst({ where: { id, establishment, context: DocumentRequirementContext.INSCRIPTION } });
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
    const establishment = await this.adminEstablishment(authorization);
    const result = await this.prisma.documentRequirement.deleteMany({ where: { id, establishment, context: DocumentRequirementContext.INSCRIPTION } });
    if (!result.count) throw new BadRequestException('Pièce introuvable.');
    return { deleted: true };
  }

  @Get('establishment/isstm/students')
  async students(@Headers('authorization') authorization?: string, @Query('search') search = '', @Query('gender') gender?: string, @Query('level') level?: string) {
    const establishment = await this.managerEstablishment(authorization);
    return this.prisma.enrolledStudent.findMany({
      where: { establishment, deletedAt: null, ...(gender ? { gender: gender as never } : {}), ...(level ? { level } : {}), ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { registrationNumber: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}) },
      include: { quitus: true }, orderBy: { registrationNumber: 'asc' },
    });
  }

  // Corbeille : étudiants supprimés de l'établissement, du plus récent au plus ancien.
  @Get('establishment/isstm/students/trash')
  async trashedStudents(@Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    return this.prisma.enrolledStudent.findMany({ where: { establishment, deletedAt: { not: null } }, include: { quitus: true }, orderBy: { deletedAt: 'desc' } });
  }

  @Patch('establishment/isstm/students/:id')
  async updateStudent(@Param('id') id: string, @Body() body: CreateStudentBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const current = await this.activeStudent(id, establishment);
    const registrationForm = body.registrationForm === undefined ? current.registrationForm : body.registrationForm === 'MASTER' ? 'MASTER' : 'LICENCE';
    const level = body.level === undefined ? current.level : this.required(body.level, 'Le niveau');
    const program = body.program === undefined ? current.program : this.required(body.program, 'Le parcours');
    if (level !== current.level || program !== current.program || registrationForm !== current.registrationForm) {
      await this.assertCurriculum(establishment, level, program, registrationForm === 'MASTER' ? CurriculumCycle.MASTER : CurriculumCycle.LICENCE);
    }
    const email = body.email === undefined ? undefined : this.required(body.email, "L’adresse e-mail").toLowerCase();
    if (email && email !== current.email) {
      if (await this.prisma.enrolledStudent.findUnique({ where: { email } })) throw new BadRequestException('Un étudiant utilise déjà cette adresse e-mail.');
    }
    if (body.gender !== undefined && (typeof body.gender !== 'string' || !Object.values(Gender).includes(body.gender as Gender))) throw new BadRequestException('Le genre est invalide.');
    const text = (value: unknown) => (value === undefined ? {} : { value: this.optional(value) });
    const optionalFields = ['birthDatePlace', 'cin', 'nationality', 'address'] as const;
    const data: Prisma.EnrolledStudentUpdateInput = {
      level, program, registrationForm,
      ...(body.fullName !== undefined ? { fullName: this.required(body.fullName, 'Le nom complet') } : {}),
      ...(email ? { email } : {}),
      ...(body.phone !== undefined ? { phone: this.required(body.phone, 'Le téléphone') } : {}),
      ...(body.gender !== undefined ? { gender: body.gender as Gender } : {}),
      ...(body.quality !== undefined ? { quality: this.optionalQuality(body.quality) } : {}),
      ...Object.fromEntries(optionalFields.filter((field) => body[field] !== undefined).map((field) => [field, text(body[field]).value])),
    };
    try {
      return await this.prisma.enrolledStudent.update({ where: { id: current.id }, data, include: { quitus: true } });
    } catch (error: unknown) {
      if (this.isUniqueError(error)) throw new BadRequestException('Un étudiant utilise déjà cette adresse e-mail.');
      throw error;
    }
  }

  // Suppression douce : l'étudiant va à la corbeille et peut être restauré.
  @Delete('establishment/isstm/students/:id')
  async deleteStudent(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const current = await this.activeStudent(id, establishment);
    await this.prisma.enrolledStudent.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  // Suppression définitive, possible uniquement depuis la corbeille : fiche, pièces jointes et quitus sont effacés.
  @Delete('establishment/isstm/students/:id/permanent')
  async purgeStudent(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const current = await this.prisma.enrolledStudent.findFirst({ where: { id, establishment, deletedAt: { not: null } }, include: { documents: { select: { storageName: true } }, quitus: { include: { application: { select: { id: true } } } } } });
    if (!current) throw new BadRequestException('Seuls les étudiants de la corbeille peuvent être supprimés définitivement.');
    // Un quitus déjà utilisé par un dossier en ligne est conservé : il sert de preuve à ce dossier.
    const removableQuitus = current.quitus && !current.quitus.application ? current.quitus : null;
    await this.prisma.$transaction([
      ...(removableQuitus ? [this.prisma.quitus.delete({ where: { id: removableQuitus.id } })] : []),
      this.prisma.enrolledStudent.delete({ where: { id: current.id } }),
    ]);
    await this.documentService.removeFiles(current.documents.map((document) => document.storageName));
    return { purged: true };
  }

  @Post('establishment/isstm/students/:id/restore')
  async restoreStudent(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const current = await this.prisma.enrolledStudent.findFirst({ where: { id, establishment, deletedAt: { not: null } } });
    if (!current) throw new BadRequestException('Cet étudiant n’est pas dans la corbeille.');
    await this.prisma.enrolledStudent.update({ where: { id: current.id }, data: { deletedAt: null } });
    return { restored: true };
  }

  // Statistiques de l'établissement : réservées au responsable (le secrétaire n'a pas de tableau de bord).
  @Get('establishment/isstm/dashboard')
  async dashboard(@Headers('authorization') authorization?: string) {
    const establishment = await this.adminEstablishment(authorization);
    const [students, active, byLevel, byGender, byForm, quitusIssued, withoutQuitus, secretaries, activeSecretaries, applications, recent] = await Promise.all([
      this.prisma.enrolledStudent.count({ where: { establishment, deletedAt: null } }),
      this.prisma.enrolledStudent.count({ where: { establishment, deletedAt: null, active: true } }),
      this.prisma.enrolledStudent.groupBy({ by: ['level'], where: { establishment, deletedAt: null }, _count: { _all: true }, orderBy: { level: 'asc' } }),
      this.prisma.enrolledStudent.groupBy({ by: ['gender'], where: { establishment, deletedAt: null }, _count: { _all: true } }),
      this.prisma.enrolledStudent.groupBy({ by: ['registrationForm'], where: { establishment, deletedAt: null }, _count: { _all: true } }),
      this.prisma.quitus.count({ where: { establishment, enrollment: { is: { deletedAt: null } } } }),
      this.prisma.enrolledStudent.count({ where: { establishment, deletedAt: null, active: true, quitus: { is: null } } }),
      this.prisma.user.count({ where: { role: UserRole.SECRETAIRE, establishment, deletedAt: null } }),
      this.prisma.user.count({ where: { role: UserRole.SECRETAIRE, establishment, deletedAt: null, active: true } }),
      this.prisma.enrollmentApplication.groupBy({ by: ['status'], where: { establishment }, _count: { _all: true } }),
      this.prisma.enrolledStudent.findMany({ where: { establishment, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, registrationNumber: true, fullName: true, level: true, program: true, createdAt: true } }),
    ]);
    return {
      students: { total: students, active, inactive: students - active },
      byLevel: byLevel.map((row) => ({ level: row.level, count: row._count._all })),
      byGender: Object.fromEntries(byGender.map((row) => [row.gender, row._count._all])),
      byForm: Object.fromEntries(byForm.map((row) => [row.registrationForm, row._count._all])),
      quitus: { issued: quitusIssued, missing: withoutQuitus },
      secretaries: { total: secretaries, active: activeSecretaries },
      applications: Object.fromEntries(applications.map((row) => [row.status, row._count._all])),
      recentStudents: recent,
    };
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
        where: { id: body.existingStudentId.trim(), establishment, deletedAt: null },
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
    if (existing) throw new BadRequestException(existing.deletedAt ? 'Un étudiant supprimé utilise cette adresse e-mail : restaurez-le depuis la corbeille.' : 'Un étudiant utilise déjà cette adresse e-mail.');

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

  // Réglages d'apparence définis par l'administrateur de l'établissement ; le secrétaire les applique en lecture seule.
  @Get('establishment/isstm/interface-settings')
  async getInterfaceSettings(@Headers('authorization') authorization?: string) {
    const establishment = await this.managerEstablishment(authorization);
    const settings = await this.prisma.establishmentSettings.findUnique({ where: { establishment } });
    return { settings: settings?.interfaceSettings ?? null };
  }

  @Put('establishment/isstm/interface-settings')
  async updateInterfaceSettings(@Body() body: InterfaceSettingsBody, @Headers('authorization') authorization?: string) {
    const establishment = await this.adminEstablishment(authorization);
    const value = body.settings;
    if (typeof value !== 'object' || value === null || Array.isArray(value) || JSON.stringify(value).length > 5000) {
      throw new BadRequestException('Réglages d’interface invalides.');
    }
    await this.prisma.establishmentSettings.upsert({
      where: { establishment },
      update: { interfaceSettings: value as Prisma.InputJsonObject },
      create: { establishment, interfaceSettings: value as Prisma.InputJsonObject },
    });
    return { settings: value };
  }

  @Post('establishment/isstm/quitus/generate')
  async generate(@Body() body: GenerateBody, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentAdmin(authorization);
    const establishment = this.establishmentOf(manager.establishment);
    const ids = Array.isArray(body.studentIds) ? body.studentIds.filter((id): id is string => typeof id === 'string') : undefined;
    if (ids && !ids.length) throw new BadRequestException('Sélectionnez au moins un étudiant.');
    const students = await this.prisma.enrolledStudent.findMany({ where: { establishment, active: true, deletedAt: null, ...(ids ? { id: { in: ids } } : {}) }, include: { quitus: true } });
    const missing = students.filter((student) => !student.quitus);
    await this.prisma.$transaction(missing.map((student) => this.prisma.quitus.create({ data: { code: this.code(), studentName: student.fullName, studentEmail: student.email, establishment, issuedById: manager.id, enrollmentId: student.id } })));
    return { created: missing.length, alreadyGenerated: students.length - missing.length };
  }

  // Étape 1 : vérifie que le quitus est celui du demandeur (ou envoie un code à l'e-mail de la fiche).
  @Post('quitus/verify')
  async verify(@Body() body: VerifyQuitusBody, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    if (typeof body.code !== 'string' || !body.code.trim() || typeof body.establishment !== 'string') throw new BadRequestException('Quitus ou établissement invalide.');
    return this.quitusService.start(user, body.code, body.establishment.trim());
  }

  // Étape 2 : valide le code à 6 chiffres reçu par e-mail.
  @Post('quitus/confirm')
  async confirmQuitus(@Body() body: VerifyQuitusBody & { otp?: unknown }, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    if (typeof body.code !== 'string' || !body.code.trim() || typeof body.establishment !== 'string') throw new BadRequestException('Quitus ou établissement invalide.');
    if (typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp.trim())) throw new BadRequestException('Le code de vérification comporte 6 chiffres.');
    return this.quitusService.confirm(user, body.code, body.establishment.trim(), body.otp);
  }

  private code() {
    // 12 caractères tirés d'un alphabet de 32 signes sans ambiguïté (ni 0/O ni 1/I) : 60 bits d'aléa cryptographique,
    // assez court pour être recopié, et la vérification par code e-mail empêche de deviner un quitus.
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    return `QT-${Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('')}`;
  }

  private registrationNumber(establishment: string) {
    const prefix = establishment.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase() || 'ETAB';
    return `${prefix}-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async curriculum(activeOnly: boolean, establishment: string) {
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
  // Les pièces du dépôt de dossier étudiant (CANDIDATURE) sont gérées par la scolarité centrale, pas par l'établissement.
  private documentContext(value: unknown) {
    if (value === undefined || value === DocumentRequirementContext.INSCRIPTION) return DocumentRequirementContext.INSCRIPTION;
    if (value === DocumentRequirementContext.CANDIDATURE) throw new BadRequestException('Les pièces du dépôt de dossier étudiant sont gérées par la scolarité centrale.');
    throw new BadRequestException('Le contexte doit être INSCRIPTION.');
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
  private async adminEstablishment(authorization?: string) {
    const admin = await this.authService.requireEstablishmentAdmin(authorization);
    return this.establishmentOf(admin.establishment);
  }
  private async managerEstablishment(authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    return this.establishmentOf(manager.establishment);
  }
  private establishmentOf(establishment: string | null) {
    if (!establishment?.trim()) throw new BadRequestException('Aucun établissement n’est associé à ce compte.');
    return establishment.trim();
  }
  private async activeStudent(id: string, establishment: string) {
    const student = await this.prisma.enrolledStudent.findFirst({ where: { id, establishment, deletedAt: null } });
    if (!student) throw new BadRequestException('Étudiant introuvable dans cet établissement.');
    return student;
  }
  private async secretaryInEstablishment(id: string, establishment: string) {
    const secretary = await this.prisma.user.findFirst({ where: { id, role: UserRole.SECRETAIRE, establishment }, select: { id: true } });
    if (!secretary) throw new BadRequestException('Compte secrétaire introuvable.');
  }
  private isUniqueError(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
}
