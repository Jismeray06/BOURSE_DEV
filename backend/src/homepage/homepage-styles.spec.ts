import { BadRequestException } from '@nestjs/common';
import { HomepageService } from './homepage.service.js';

// Base simulée : seule la colonne homepageStyles nous intéresse ici.
function createService(initial: Record<string, unknown> = {}) {
  const row = { id: 'default', homepageContent: {}, homepageNews: [], homepageStyles: initial };
  const prisma = {
    siteSettings: {
      update: async ({ data }: { data: { homepageStyles: Record<string, unknown> } }) => { row.homepageStyles = data.homepageStyles; return row; },
    },
  };
  const siteSettings = { get: async () => row, audit: async () => undefined };
  const service = new HomepageService(prisma as never, siteSettings as never);
  return { service, row };
}
const admin = { id: 'a1', fullName: 'Admin' };

describe('mise en forme des textes de la page d’accueil', () => {
  it('enregistre une mise en forme valide et la renvoie à la page publique', async () => {
    const { service } = createService();
    const result = await service.updateStyles(admin, { 'hero.lead': { color: '#DC2626', font: 'manuscrit', size: 'grand', bold: true } });
    expect(result.styles['hero.lead']).toEqual({ color: '#dc2626', font: 'manuscrit', size: 'grand', bold: true });
  });

  it('accepte les textes du bandeau (titre, sous-titre, bouton)', async () => {
    const { service } = createService();
    const result = await service.updateStyles(admin, { heroTitle: { italic: true } });
    expect(result.styles.heroTitle).toEqual({ italic: true });
  });

  it('retire la mise en forme avec null ou avec un objet vide', async () => {
    const { service } = createService({ 'hero.lead': { bold: true }, 'hero.badge': { underline: true } });
    const result = await service.updateStyles(admin, { 'hero.lead': null, 'hero.badge': {} });
    expect(result.styles).toEqual({});
  });

  it('refuse une couleur, une police ou une taille hors liste (aucun CSS libre)', async () => {
    const { service } = createService();
    await expect(service.updateStyles(admin, { 'hero.lead': { color: 'red; background:url(x)' } })).rejects.toThrow(BadRequestException);
    await expect(service.updateStyles(admin, { 'hero.lead': { font: 'Comic Sans' } })).rejects.toThrow(BadRequestException);
    await expect(service.updateStyles(admin, { 'hero.lead': { size: '999px' } })).rejects.toThrow(BadRequestException);
  });

  it('refuse une option inconnue et une clé de texte inconnue', async () => {
    const { service } = createService();
    await expect(service.updateStyles(admin, { 'hero.lead': { position: 'fixed' } })).rejects.toThrow(BadRequestException);
    await expect(service.updateStyles(admin, { 'inconnu.cle': { bold: true } })).rejects.toThrow(BadRequestException);
  });

  it('ignore à la lecture une mise en forme illisible stockée en base', async () => {
    const { service } = createService({ 'hero.lead': { color: 'pas-une-couleur' }, 'hero.badge': { bold: true } });
    const result = await service.get();
    expect(result.styles).toEqual({ 'hero.badge': { bold: true } });
  });
});
