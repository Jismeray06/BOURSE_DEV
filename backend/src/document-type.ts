import { BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Clé technique d'une pièce, déduite de son libellé (ou d'une clé fournie) : « Certificat médical » → « certificat_medical ».
export function documentTypeSlug(value: unknown, label: string) {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : label;
  const slug = raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!slug) throw new BadRequestException('Impossible de déterminer une clé pour cette pièce.');
  return slug;
}

// Clé d'« établissement » réservée à la liste commune de pièces (mode « identique pour tous »).
export const ALL_ESTABLISHMENTS = '*';

// Liste de pièces du dépôt de dossier qui s'applique à un établissement : la sienne, ou la liste commune si la scolarité centrale l'a activée.
export async function candidatureRequirementScope(prisma: PrismaService, establishment: string) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { uniformCandidatureDocuments: true } });
  return settings?.uniformCandidatureDocuments ? ALL_ESTABLISHMENTS : establishment;
}
