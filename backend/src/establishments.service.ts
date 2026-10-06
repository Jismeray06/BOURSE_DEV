import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from './prisma.service.js';

const maximumLogoSize = 5 * 1024 * 1024;
const logoMimeTypes: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const logoPrefix = '/uploads/establishments/';
const STAFF_ROLES = [UserRole.ETABLISSEMENT, UserRole.ADMIN_ETABLISSEMENT, UserRole.SECRETAIRE];

type Logo = { buffer: Buffer; originalname: string; mimetype: string; size: number };

@Injectable()
export class EstablishmentsService {
  private readonly directory = join(process.cwd(), 'uploads', 'establishments');

  constructor(private readonly prisma: PrismaService) {}

  // Liste publique : ce que voit l'étudiant (établissements actifs uniquement).
  listPublic() {
    return this.prisma.establishment.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, logoUrl: true },
    });
  }

  // Liste de gestion (administrateur) avec les effectifs rattachés à chaque établissement.
  async listForAdmin() {
    const [establishments, students, applications, staff] = await Promise.all([
      this.prisma.establishment.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
      this.prisma.user.groupBy({ by: ['establishment'], where: { role: UserRole.ETUDIANT, deletedAt: null, establishment: { not: null } }, _count: { _all: true } }),
      this.prisma.enrollmentApplication.groupBy({ by: ['establishment'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['establishment'], where: { role: { in: STAFF_ROLES }, deletedAt: null, establishment: { not: null } }, _count: { _all: true } }),
    ]);
    const count = (rows: { establishment: string | null; _count: { _all: number } }[], name: string) => rows.find((row) => row.establishment === name)?._count._all ?? 0;
    return establishments.map((item) => ({
      ...item,
      studentCount: count(students, item.name),
      applicationCount: count(applications, item.name),
      staffCount: count(staff, item.name),
    }));
  }

  async create(rawName: unknown) {
    const name = this.cleanName(rawName);
    await this.assertNameFree(name);
    const last = await this.prisma.establishment.aggregate({ _max: { position: true } });
    return this.prisma.establishment.create({ data: { name, position: (last._max.position ?? 0) + 1 } });
  }

  // Retrouve l'établissement d'un compte du personnel ; le crée s'il n'était saisi qu'en texte libre.
  async ensure(name: string) {
    const existing = await this.prisma.establishment.findUnique({ where: { name } });
    if (existing) return existing;
    const last = await this.prisma.establishment.aggregate({ _max: { position: true } });
    return this.prisma.establishment.create({ data: { name, position: (last._max.position ?? 0) + 1 } });
  }

  async update(id: string, body: { name?: unknown; active?: unknown }) {
    const current = await this.find(id);
    if (body.active !== undefined && typeof body.active !== 'boolean') throw new BadRequestException('L’état est invalide.');
    if (body.name === undefined && body.active === undefined) throw new BadRequestException('Aucune modification fournie.');
    const name = body.name === undefined ? current.name : this.cleanName(body.name);
    if (name !== current.name) return this.rename(current, name, body.active as boolean | undefined);
    return this.prisma.establishment.update({ where: { id }, data: { ...(body.active === undefined ? {} : { active: body.active }) } });
  }

  // Le nom est la valeur stockée dans toutes les tables : on les met à jour ensemble.
  private async rename(current: { id: string; name: string }, name: string, active?: boolean) {
    await this.assertNameFree(name, current.id);
    const from = current.name;
    const [updated] = await this.prisma.$transaction([
      this.prisma.establishment.update({ where: { id: current.id }, data: { name, ...(active === undefined ? {} : { active }) } }),
      this.prisma.user.updateMany({ where: { establishment: from }, data: { establishment: name } }),
      this.prisma.enrollmentApplication.updateMany({ where: { establishment: from }, data: { establishment: name } }),
      this.prisma.quitus.updateMany({ where: { establishment: from }, data: { establishment: name } }),
      this.prisma.enrolledStudent.updateMany({ where: { establishment: from }, data: { establishment: name } }),
      this.prisma.establishmentCurriculumOption.updateMany({ where: { establishment: from }, data: { establishment: name } }),
      this.prisma.documentRequirement.updateMany({ where: { establishment: from }, data: { establishment: name } }),
      this.prisma.establishmentSettings.updateMany({ where: { establishment: from }, data: { establishment: name } }),
    ]);
    return updated;
  }

  async setLogo(id: string, file: Logo | undefined) {
    const current = await this.find(id);
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const extension = logoMimeTypes[file.mimetype];
    if (!extension) throw new BadRequestException('Format accepté : PNG, JPG ou WebP.');
    if (file.size > maximumLogoSize) throw new BadRequestException('Le logo ne doit pas dépasser 5 Mo.');
    await mkdir(this.directory, { recursive: true });
    const storageName = `${randomUUID()}${extension}`;
    await writeFile(join(this.directory, storageName), file.buffer, { flag: 'wx' });
    const updated = await this.prisma.establishment.update({ where: { id }, data: { logoUrl: `${logoPrefix}${storageName}` } });
    await this.deleteLogoFile(current.logoUrl);
    return updated;
  }

  async removeLogo(id: string) {
    const current = await this.find(id);
    const updated = await this.prisma.establishment.update({ where: { id }, data: { logoUrl: null } });
    await this.deleteLogoFile(current.logoUrl);
    return updated;
  }

  // Suppression refusée si des données sont rattachées : il faut alors le désactiver.
  async remove(id: string) {
    const current = await this.find(id);
    const where = { establishment: current.name };
    const references = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.enrollmentApplication.count({ where }),
      this.prisma.quitus.count({ where }),
      this.prisma.enrolledStudent.count({ where }),
    ]);
    if (references.some((total) => total > 0)) {
      throw new ConflictException('Des comptes, étudiants ou dossiers sont rattachés à cet établissement : désactivez-le plutôt que de le supprimer.');
    }
    await this.prisma.$transaction([
      this.prisma.establishmentCurriculumOption.deleteMany({ where }),
      this.prisma.documentRequirement.deleteMany({ where }),
      this.prisma.establishmentSettings.deleteMany({ where }),
      this.prisma.establishment.delete({ where: { id } }),
    ]);
    await this.deleteLogoFile(current.logoUrl);
    return { deleted: true };
  }

  private async find(id: string) {
    const establishment = await this.prisma.establishment.findUnique({ where: { id } });
    if (!establishment) throw new NotFoundException('Établissement introuvable.');
    return establishment;
  }

  private cleanName(value: unknown) {
    const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 60) throw new BadRequestException('Le nom de l’établissement doit contenir entre 2 et 60 caractères.');
    return name;
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const taken = await this.prisma.establishment.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (taken) throw new ConflictException('Un établissement porte déjà ce nom.');
  }

  private async deleteLogoFile(url: string | null) {
    if (!url?.startsWith(logoPrefix)) return;
    await unlink(join(this.directory, url.slice(logoPrefix.length))).catch(() => undefined);
  }
}
