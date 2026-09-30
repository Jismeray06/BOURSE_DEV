import { BadRequestException, Controller, Get, Headers, Param, Post, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnrolledStudent, UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { DocumentService } from './document.service.js';
import { PrismaService } from './prisma.service.js';

type UploadedDocument = { buffer: Buffer; originalname: string; mimetype: string; size: number };

@Controller()
export class DocumentController {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService, private readonly documents: DocumentService) {}

  @Post('student/application/documents/:type')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@Param('type') type: string, @UploadedFile() file: UploadedDocument | undefined, @Headers('authorization') authorization?: string) {
    const student = await this.authService.requireUser(authorization);
    if (student.role !== UserRole.ETUDIANT) throw new BadRequestException('Accès réservé aux étudiants.');
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const application = await this.prisma.enrollmentApplication.findUnique({ where: { userId: student.id }, select: { id: true } });
    if (!application) throw new BadRequestException('Enregistrez d’abord les informations du dossier.');
    return this.documents.save(application.id, type, file);
  }

  @Get('student/application/documents')
  async studentDocuments(@Headers('authorization') authorization?: string) {
    const student = await this.authService.requireUser(authorization);
    if (student.role !== UserRole.ETUDIANT) throw new BadRequestException('Accès réservé aux étudiants.');
    const application = await this.prisma.enrollmentApplication.findUnique({ where: { userId: student.id }, select: { id: true } });
    return application ? this.documents.list(application.id) : [];
  }

  @Get('admin/students/:id/dossier')
  async adminDossier(@Param('id') studentId: string, @Headers('authorization') authorization?: string) {
    await this.authService.requireAdmin(authorization);
    return this.dossierByStudent(studentId);
  }

  @Get('scolarite/applications/:id/dossier')
  async registrarDossier(@Param('id') applicationId: string, @Headers('authorization') authorization?: string) {
    await this.authService.requireCentralRegistrar(authorization);
    return this.dossierByApplication(applicationId);
  }

  @Get('establishment/isstm/students/:id/dossier')
  async establishmentDossier(@Param('id') studentId: string, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    const enrolledStudent = await this.prisma.enrolledStudent.findUnique({ where: { id: studentId }, include: { quitus: { select: { code: true } } } });
    if (!enrolledStudent || enrolledStudent.establishment !== manager.establishment) throw new BadRequestException('Dossier inaccessible pour cet établissement.');
    const linkedUserId = enrolledStudent.userId
      ?? (enrolledStudent.email
        ? (await this.prisma.user.findUnique({ where: { email: enrolledStudent.email }, select: { id: true } }))?.id
        : undefined);
    if (linkedUserId) {
      try {
        return await this.dossierByStudent(linkedUserId);
      } catch {
        // Compte étudiant trouvé mais aucune candidature en ligne déposée : on retombe sur le dossier établissement.
      }
    }
    return {
      student: { fullName: enrolledStudent.fullName, email: enrolledStudent.email, establishment: enrolledStudent.establishment, level: enrolledStudent.level, program: enrolledStudent.program },
      status: enrolledStudent.active ? 'INSCRIT' : 'INACTIF',
      submittedAt: null,
      quitus: enrolledStudent.quitus,
      documents: await this.documents.listForStudent(enrolledStudent.id),
      profile: this.enrolledProfileFields(enrolledStudent),
    };
  }

  @Post('establishment/isstm/students/:id/documents/:type')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadForStudent(@Param('id') studentId: string, @Param('type') type: string, @UploadedFile() file: UploadedDocument | undefined, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const enrolledStudent = await this.prisma.enrolledStudent.findUnique({ where: { id: studentId }, select: { id: true, establishment: true } });
    if (!enrolledStudent || enrolledStudent.establishment !== manager.establishment) throw new BadRequestException('Dossier inaccessible pour cet établissement.');
    return this.documents.saveForStudent(enrolledStudent.id, type, file);
  }

  @Get('establishment/isstm/students/:id/documents')
  async studentDocumentsForEstablishment(@Param('id') studentId: string, @Headers('authorization') authorization?: string) {
    const manager = await this.authService.requireEstablishmentManager(authorization);
    const enrolledStudent = await this.prisma.enrolledStudent.findUnique({ where: { id: studentId }, select: { id: true, establishment: true } });
    if (!enrolledStudent || enrolledStudent.establishment !== manager.establishment) throw new BadRequestException('Dossier inaccessible pour cet établissement.');
    return this.documents.listForStudent(enrolledStudent.id);
  }

  @Get('documents/:id/file')
  async documentFile(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    const document = await this.prisma.applicationDocument.findUnique({ where: { id }, include: { application: { select: { userId: true, establishment: true } } } });
    if (document) {
      if (user.role === UserRole.ETUDIANT && document.application.userId !== user.id) throw new BadRequestException('Pièce inaccessible.');
      if ((user.role === UserRole.ETABLISSEMENT || user.role === UserRole.ADMIN_ETABLISSEMENT || user.role === UserRole.SECRETAIRE) && document.application.establishment !== user.establishment) throw new BadRequestException('Pièce inaccessible pour cet établissement.');
      if (![UserRole.ETUDIANT, UserRole.ADMIN, UserRole.SCOLARITE_CENTRALE, UserRole.ETABLISSEMENT, UserRole.ADMIN_ETABLISSEMENT, UserRole.SECRETAIRE].includes(user.role)) throw new BadRequestException('Accès interdit.');
      const result = await this.documents.file(id);
      return new StreamableFile(result.buffer, { type: result.document.mimeType, disposition: `inline; filename="${result.document.originalName.replace(/["]|[/\\]/g, '_')}"` });
    }
    const studentDocument = await this.prisma.enrolledStudentDocument.findUnique({ where: { id }, include: { enrolledStudent: { select: { establishment: true } } } });
    if (!studentDocument) throw new BadRequestException('Pièce introuvable.');
    if (!([UserRole.ADMIN, UserRole.SCOLARITE_CENTRALE, UserRole.ETABLISSEMENT, UserRole.ADMIN_ETABLISSEMENT, UserRole.SECRETAIRE] as UserRole[]).includes(user.role)) throw new BadRequestException('Accès interdit.');
    if ((user.role === UserRole.ETABLISSEMENT || user.role === UserRole.ADMIN_ETABLISSEMENT || user.role === UserRole.SECRETAIRE) && studentDocument.enrolledStudent.establishment !== user.establishment) throw new BadRequestException('Pièce inaccessible pour cet établissement.');
    const result = await this.documents.fileForStudent(id);
    return new StreamableFile(result.buffer, { type: result.document.mimeType, disposition: `inline; filename="${result.document.originalName.replace(/["]|[/\\]/g, '_')}"` });
  }

  private async dossierByStudent(studentId: string) {
    const application = await this.prisma.enrollmentApplication.findUnique({ where: { userId: studentId }, select: { id: true } });
    if (!application) throw new BadRequestException('Dossier introuvable.');
    return this.dossierByApplication(application.id);
  }

  private async dossierByApplication(applicationId: string) {
    const dossier = await this.prisma.enrollmentApplication.findUnique({ where: { id: applicationId }, include: { user: { select: { id: true, fullName: true, email: true, establishment: true, level: true, program: true } }, quitus: { select: { code: true } } } });
    if (!dossier) throw new BadRequestException('Dossier introuvable.');
    const enrolledStudent = dossier.user.email
      ? await this.prisma.enrolledStudent.findFirst({ where: { email: dossier.user.email, establishment: dossier.establishment } })
      : null;
    return {
      id: dossier.id,
      student: dossier.user,
      establishment: dossier.establishment,
      level: dossier.level,
      program: dossier.program,
      status: dossier.status,
      submittedAt: dossier.submittedAt,
      quitus: dossier.quitus,
      documents: await this.documents.list(dossier.id),
      ...(enrolledStudent ? { profile: this.enrolledProfileFields(enrolledStudent) } : {}),
    };
  }

  private enrolledProfileFields(student: EnrolledStudent) {
    return {
      registrationNumber: student.registrationNumber,
      phone: student.phone,
      gender: student.gender,
      registrationForm: student.registrationForm,
      birthDatePlace: student.birthDatePlace,
      cin: student.cin,
      nationality: student.nationality,
      address: student.address,
      previousEstablishment: student.previousEstablishment,
      bacYear: student.bacYear,
      bacSeries: student.bacSeries,
      bacCenter: student.bacCenter,
      previousUniversityRegistration: student.previousUniversityRegistration,
      fatherName: student.fatherName,
      motherName: student.motherName,
      parentsPhone: student.parentsPhone,
      parentsCity: student.parentsCity,
      respondentName: student.respondentName,
      respondentPhone: student.respondentPhone,
      respondentAddress: student.respondentAddress,
      maritalStatus: student.maritalStatus,
      licenceYear: student.licenceYear,
      mention: student.mention,
      previousLevel: student.previousLevel,
      previousProgram: student.previousProgram,
      quality: student.quality,
    };
  }
}