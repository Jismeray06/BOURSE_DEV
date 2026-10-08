import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, HeroBackgroundType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from './prisma.service.js';

const settingsId = 'default';
const maximumAssetSize = 5 * 1024 * 1024;
const imageMimeTypes: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
};
const logoMimeTypes: Record<string, string> = { ...imageMimeTypes, 'image/svg+xml': '.svg' };
const assetFields = { logo: 'logoUrl', favicon: 'faviconUrl' } as const;
type AssetKey = keyof typeof assetFields;
const maximumHeroImages = 4;

export type UpdateSiteSettingsDto = {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  heroBackgroundType?: HeroBackgroundType;
  heroOverlayOpacity?: number;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryLink?: string;
};

const hexColor = /^#[0-9a-fA-F]{6}$/;

@Injectable()
export class SiteSettingsService {
  private readonly directory = join(process.cwd(), 'uploads', 'site-settings');

  constructor(private readonly prisma: PrismaService) {}

  /** Inscrit une modification de la page d'accueil dans le journal d'audit. */
  async audit(actor: { id: string; fullName: string }, action: AuditAction, targetName: string, detail?: string, targetId?: string) {
    await this.prisma.auditLogEntry.create({ data: { action, actorId: actor.id, actorName: actor.fullName, targetId: targetId ?? settingsId, targetName, detail } });
  }

  async get() {
    return this.prisma.siteSettings.upsert({
      where: { id: settingsId },
      update: {},
      create: { id: settingsId },
    });
  }

  async update(dto: UpdateSiteSettingsDto) {
    for (const field of ['primaryColor', 'secondaryColor', 'backgroundColor'] as const) {
      const value = dto[field];
      if (value !== undefined && !hexColor.test(value)) throw new BadRequestException('Couleur invalide (format hexadécimal attendu).');
    }
    if (dto.heroOverlayOpacity !== undefined && (dto.heroOverlayOpacity < 0 || dto.heroOverlayOpacity > 100)) {
      throw new BadRequestException('L’opacité doit être comprise entre 0 et 100.');
    }
    await this.get();
    return this.prisma.siteSettings.update({ where: { id: settingsId }, data: dto });
  }

  async uploadAsset(asset: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    if (!this.isAssetKey(asset)) throw new BadRequestException('Type de ressource invalide.');
    const extension = logoMimeTypes[file.mimetype];
    if (!extension) throw new BadRequestException('Format accepté : PNG, JPG ou SVG.');
    if (file.size > maximumAssetSize) throw new BadRequestException('Le fichier ne doit pas dépasser 5 Mo.');

    const storageName = await this.saveFile(file, extension);

    const settings = await this.get();
    const field = assetFields[asset];
    const previousUrl = settings[field];
    if (previousUrl) await unlink(join(this.directory, previousUrl.replace('/uploads/site-settings/', ''))).catch(() => undefined);

    return this.prisma.siteSettings.update({ where: { id: settingsId }, data: { [field]: `/uploads/site-settings/${storageName}` } });
  }

  async addHeroImage(file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const extension = imageMimeTypes[file.mimetype];
    if (!extension) throw new BadRequestException('Format accepté : PNG ou JPG.');
    if (file.size > maximumAssetSize) throw new BadRequestException('Le fichier ne doit pas dépasser 5 Mo.');

    const settings = await this.get();
    if (settings.heroBackgroundImages.length >= maximumHeroImages) throw new BadRequestException(`Maximum ${maximumHeroImages} photos.`);

    const storageName = await this.saveFile(file, extension);
    const heroBackgroundImages = [...settings.heroBackgroundImages, `/uploads/site-settings/${storageName}`];
    return this.prisma.siteSettings.update({ where: { id: settingsId }, data: { heroBackgroundImages } });
  }

  async removeHeroImage(index: number) {
    const settings = await this.get();
    if (!Number.isInteger(index) || index < 0 || index >= settings.heroBackgroundImages.length) throw new BadRequestException('Photo introuvable.');
    const url = settings.heroBackgroundImages[index];
    await unlink(join(this.directory, url.replace('/uploads/site-settings/', ''))).catch(() => undefined);
    const heroBackgroundImages = settings.heroBackgroundImages.filter((_, i) => i !== index);
    return this.prisma.siteSettings.update({ where: { id: settingsId }, data: { heroBackgroundImages } });
  }

  async reset() {
    const settings = await this.get();
    for (const field of Object.values(assetFields)) {
      const url = settings[field];
      if (url) await unlink(join(this.directory, url.replace('/uploads/site-settings/', ''))).catch(() => undefined);
    }
    for (const url of settings.heroBackgroundImages) {
      await unlink(join(this.directory, url.replace('/uploads/site-settings/', ''))).catch(() => undefined);
    }
    await this.prisma.siteSettings.delete({ where: { id: settingsId } }).catch(() => undefined);
    return this.get();
  }

  private async saveFile(file: { buffer: Buffer }, extension: string) {
    await mkdir(this.directory, { recursive: true });
    const storageName = `${randomUUID()}${extension}`;
    await writeFile(join(this.directory, storageName), file.buffer);
    return storageName;
  }

  private isAssetKey(value: string): value is AssetKey {
    return value in assetFields;
  }
}
