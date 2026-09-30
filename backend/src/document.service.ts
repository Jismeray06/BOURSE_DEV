import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from './prisma.service.js';

const maximumDocumentSize = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);

@Injectable()
export class DocumentService {
  private readonly directory = join(process.cwd(), 'uploads', 'documents');

  constructor(private readonly prisma: PrismaService) {}

  async save(applicationId: string, type: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    this.validate(type, file);
    await mkdir(this.directory, { recursive: true });
    const storageName = `${randomUUID()}${this.extension(file.mimetype)}`;
    await writeFile(join(this.directory, storageName), file.buffer, { flag: 'wx' });
    const existing = await this.prisma.applicationDocument.findUnique({ where: { applicationId_type: { applicationId, type } } });
    if (existing) await unlink(join(this.directory, existing.storageName)).catch(() => undefined);
    return this.prisma.applicationDocument.upsert({
      where: { applicationId_type: { applicationId, type } },
      update: { originalName: file.originalname, storageName, mimeType: file.mimetype, size: file.size },
      create: { applicationId, type, originalName: file.originalname, storageName, mimeType: file.mimetype, size: file.size },
      select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true },
    });
  }

  list(applicationId: string) {
    return this.prisma.applicationDocument.findMany({ where: { applicationId }, select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true }, orderBy: { type: 'asc' } });
  }

  async file(id: string) {
    const document = await this.prisma.applicationDocument.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Pièce introuvable.');
    return { document, buffer: await readFile(join(this.directory, document.storageName)) };
  }

  async saveForStudent(enrolledStudentId: string, type: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    this.validate(type, file);
    await mkdir(this.directory, { recursive: true });
    const storageName = `${randomUUID()}${this.extension(file.mimetype)}`;
    await writeFile(join(this.directory, storageName), file.buffer, { flag: 'wx' });
    const existing = await this.prisma.enrolledStudentDocument.findUnique({ where: { enrolledStudentId_type: { enrolledStudentId, type } } });
    if (existing) await unlink(join(this.directory, existing.storageName)).catch(() => undefined);
    return this.prisma.enrolledStudentDocument.upsert({
      where: { enrolledStudentId_type: { enrolledStudentId, type } },
      update: { originalName: file.originalname, storageName, mimeType: file.mimetype, size: file.size },
      create: { enrolledStudentId, type, originalName: file.originalname, storageName, mimeType: file.mimetype, size: file.size },
      select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true },
    });
  }

  listForStudent(enrolledStudentId: string) {
    return this.prisma.enrolledStudentDocument.findMany({ where: { enrolledStudentId }, select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true }, orderBy: { type: 'asc' } });
  }

  async fileForStudent(id: string) {
    const document = await this.prisma.enrolledStudentDocument.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Pièce introuvable.');
    return { document, buffer: await readFile(join(this.directory, document.storageName)) };
  }

  private validate(type: string, file: { originalname: string; mimetype: string; size: number }) {
    if (!type.trim() || !/^[a-z0-9_-]+$/.test(type)) throw new BadRequestException('Type de pièce invalide.');
    if (!allowedMimeTypes.has(file.mimetype)) throw new BadRequestException('Format accepté : PDF, PNG ou JPG.');
    if (file.size > maximumDocumentSize) throw new BadRequestException('La pièce ne doit pas dépasser 10 Mo.');
    if (!file.originalname.trim()) throw new BadRequestException('Nom de fichier invalide.');
  }

  private extension(mimeType: string) {
    return mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
  }
}