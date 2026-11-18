import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, HeroBackgroundType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assertFileMatchesType } from '../documents/file-signature.js';
import { PrismaService } from '../common/prisma.service.js';

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
// Seuls ces champs sont modifiables ici : logo, images et contenus passent par leurs propres routes.
const editableTextFields = ['heroTitle', 'heroSubtitle', 'ctaPrimaryLabel', 'ctaPrimaryLink', 'ctaSecondaryLabel', 'ctaSecondaryLink'] as const;
const maximumTextLength = 500;
const safeLink = /^(\/(?!\/)|https?:\/\/)\S*$/;

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
    const data: UpdateSiteSettingsDto = {};
    for (const field of ['primaryColor', 'secondaryColor', 'backgroundColor'] as const) if (dto[field] !== undefined) data[field] = dto[field];
    for (const field of editableTextFields) {
      const value = dto[field];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > maximumTextLength) throw new BadRequestException(`Texte invalide : ${field}.`);
      if (field.endsWith('Link') && !safeLink.test(value)) throw new BadRequestException('Lien invalide : utilisez un chemin (/login) ou une adresse http(s).');
      data[field] = value;
    }
    if (dto.heroOverlayOpacity !== undefined) {
      if (!Number.isInteger(dto.heroOverlayOpacity)) throw new BadRequestException('L’opacité doit être un nombre entier.');
      data.heroOverlayOpacity = dto.heroOverlayOpacity;
    }
    if (dto.heroBackgroundType !== undefined) {
      if (!Object.values(HeroBackgroundType).includes(dto.heroBackgroundType)) throw new BadRequestException('Type de fond invalide.');
      data.heroBackgroundType = dto.heroBackgroundType;
    }
    await this.get();
    return this.prisma.siteSettings.update({ where: { id: settingsId }, data });
  }

  async uploadAsset(asset: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    if (!this.isAssetKey(asset)) throw new BadRequestException('Type de ressource invalide.');
    const extension = logoMimeTypes[file.mimetype];
    if (!extension) throw new BadRequestException('Format accepté : PNG, JPG ou SVG.');
    if (file.size > maximumAssetSize) throw new BadRequestException('Le fichier ne doit pas dépasser 5 Mo.');
    assertFileMatchesType(file);

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
    assertFileMatchesType(file);

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
    // Une seule instruction : chaque colonne reprend sa valeur par défaut sans que la ligne disparaisse (une requête simultanée ne tombe plus sur « introuvable »).
    await this.prisma.$executeRaw`UPDATE "SiteSettings" SET "primaryColor" = DEFAULT, "secondaryColor" = DEFAULT, "backgroundColor" = DEFAULT, "logoUrl" = DEFAULT, "faviconUrl" = DEFAULT, "heroBackgroundType" = DEFAULT, "heroBackgroundImages" = DEFAULT, "heroOverlayOpacity" = DEFAULT, "heroTitle" = DEFAULT, "heroSubtitle" = DEFAULT, "ctaPrimaryLabel" = DEFAULT, "ctaPrimaryLink" = DEFAULT, "ctaSecondaryLabel" = DEFAULT, "ctaSecondaryLink" = DEFAULT, "homepageContent" = DEFAULT, "homepageNews" = DEFAULT, "homepageStyles" = DEFAULT, "uniformCandidatureDocuments" = DEFAULT, "updatedAt" = NOW() WHERE "id" = ${settingsId}`;
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
