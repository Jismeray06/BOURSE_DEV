import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service.js';
import { SiteSettingsService } from './site-settings.service.js';
import defaults from './homepage-defaults.json' with { type: 'json' };

export type HomepageNews = { id: string; title: string; body: string; publishedAt: string };
export type NewsDto = { title?: unknown; body?: unknown; publishedAt?: unknown };
export type HeroDto = { heroTitle?: unknown; heroSubtitle?: unknown; ctaSecondaryLabel?: unknown };
type Actor = { id: string; fullName: string };

const defaultContent: Record<string, string> = defaults;
const maximumTextLength = 1000;
const maximumKeysPerRequest = 40;
const maximumNews = 50;
// Coordonnées : peuvent être vidées (la ligne ou le bouton correspondant disparaît de la page).
const optionalKeys = /^contact\./;
const heroLimits = {
  heroTitle: { label: 'Titre principal', max: 160 },
  heroSubtitle: { label: 'Sous-titre', max: 500 },
  ctaSecondaryLabel: { label: 'Texte du bouton principal', max: 60 },
} as const;

@Injectable()
export class HomepageService {
  constructor(private readonly prisma: PrismaService, private readonly siteSettings: SiteSettingsService) {}

  /** Textes (valeurs d'origine + modifications) et actualités, tels qu'affichés sur la page publique. */
  async get() {
    const settings = await this.siteSettings.get();
    return { content: { ...defaultContent, ...this.storedContent(settings.homepageContent) }, news: this.sortedNews(settings.homepageNews) };
  }

  async updateContent(actor: Actor, body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Données invalides.');
    const entries = Object.entries(body as Record<string, unknown>);
    if (!entries.length) throw new BadRequestException('Aucune modification reçue.');
    if (entries.length > maximumKeysPerRequest) throw new BadRequestException('Trop de modifications en une seule fois.');

    const settings = await this.siteSettings.get();
    const content = this.storedContent(settings.homepageContent);
    for (const [key, raw] of entries) {
      if (!(key in defaultContent)) throw new BadRequestException(`Élément inconnu : ${key}.`);
      if (raw === null) {
        delete content[key]; // retour au texte d'origine
        continue;
      }
      if (typeof raw !== 'string') throw new BadRequestException('Le texte doit être une chaîne de caractères.');
      const value = raw.trim();
      if (!value && !optionalKeys.test(key)) throw new BadRequestException('Le texte ne peut pas être vide.');
      if (value.length > maximumTextLength) throw new BadRequestException(`Le texte ne doit pas dépasser ${maximumTextLength} caractères.`);
      content[key] = value;
    }
    await this.prisma.siteSettings.update({ where: { id: settings.id }, data: { homepageContent: content } });
    await this.siteSettings.audit(actor, 'HOMEPAGE_CONTENT_UPDATED', this.contentLabel(entries.map(([key]) => key)), entries.map(([key]) => key).join(', '));
    return this.get();
  }

  async updateHero(actor: Actor, dto: HeroDto) {
    const data: Record<string, string> = {};
    const changed: string[] = [];
    for (const field of Object.keys(heroLimits) as (keyof typeof heroLimits)[]) {
      const raw = dto[field];
      if (raw === undefined) continue;
      if (typeof raw !== 'string') throw new BadRequestException('Le texte doit être une chaîne de caractères.');
      const { label, max } = heroLimits[field];
      const value = raw.trim();
      if (!value) throw new BadRequestException(`${label} : le texte ne peut pas être vide.`);
      if (value.length > max) throw new BadRequestException(`${label} : ${max} caractères maximum.`);
      data[field] = value;
      changed.push(label);
    }
    if (!changed.length) throw new BadRequestException('Aucune modification reçue.');
    const settings = await this.siteSettings.get();
    const updated = await this.prisma.siteSettings.update({ where: { id: settings.id }, data });
    await this.siteSettings.audit(actor, 'HOMEPAGE_CONTENT_UPDATED', changed.join(', '), "Section d'accueil");
    return updated;
  }

  async createNews(actor: Actor, dto: NewsDto) {
    const item: HomepageNews = { id: randomUUID(), ...this.validateNews(dto) };
    await this.mutateNews((news) => {
      if (news.length >= maximumNews) throw new BadRequestException(`Maximum ${maximumNews} actualités.`);
      return [...news, item];
    });
    await this.siteSettings.audit(actor, 'HOMEPAGE_NEWS_CREATED', item.title, 'Ajout d’une actualité', item.id);
    return this.get();
  }

  async updateNews(actor: Actor, id: string, dto: NewsDto) {
    const values = this.validateNews(dto);
    await this.mutateNews((news) => {
      if (!news.some((item) => item.id === id)) throw new NotFoundException('Actualité introuvable.');
      return news.map((item) => (item.id === id ? { ...item, ...values } : item));
    });
    await this.siteSettings.audit(actor, 'HOMEPAGE_NEWS_UPDATED', values.title, 'Modification d’une actualité', id);
    return this.get();
  }

  async deleteNews(actor: Actor, id: string) {
    let title = '';
    await this.mutateNews((news) => {
      const found = news.find((item) => item.id === id);
      if (!found) throw new NotFoundException('Actualité introuvable.');
      title = found.title;
      return news.filter((item) => item.id !== id);
    });
    await this.siteSettings.audit(actor, 'HOMEPAGE_NEWS_DELETED', title, 'Suppression d’une actualité', id);
    return this.get();
  }

  private async mutateNews(change: (news: HomepageNews[]) => HomepageNews[]) {
    await this.siteSettings.get();
    await this.prisma.$transaction(async (tx) => {
      const settings = await tx.siteSettings.findUniqueOrThrow({ where: { id: 'default' } });
      await tx.siteSettings.update({ where: { id: 'default' }, data: { homepageNews: change(this.sortedNews(settings.homepageNews)) } });
    });
  }

  private validateNews(dto: NewsDto) {
    const title = typeof dto.title === 'string' ? dto.title.trim() : '';
    const body = typeof dto.body === 'string' ? dto.body.trim() : '';
    if (!title) throw new BadRequestException('Le titre est obligatoire.');
    if (title.length > 150) throw new BadRequestException('Le titre ne doit pas dépasser 150 caractères.');
    if (!body) throw new BadRequestException('Le texte est obligatoire.');
    if (body.length > 2000) throw new BadRequestException('Le texte ne doit pas dépasser 2000 caractères.');
    let publishedAt = new Date().toISOString();
    if (dto.publishedAt !== undefined && dto.publishedAt !== null && dto.publishedAt !== '') {
      const date = typeof dto.publishedAt === 'string' ? new Date(dto.publishedAt) : new Date(Number.NaN);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Date de publication invalide.');
      publishedAt = date.toISOString();
    }
    return { title, body, publishedAt };
  }

  private storedContent(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, text]) => key in defaultContent && typeof text === 'string')) as Record<string, string>;
  }

  private sortedNews(value: unknown): HomepageNews[] {
    if (!Array.isArray(value)) return [];
    return (value as HomepageNews[]).filter((item) => item && typeof item.id === 'string').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  private contentLabel(keys: string[]) {
    const sections = new Set(keys.map((key) => key.split('.')[0]));
    return keys.length === 1 ? `Texte « ${defaultContent[keys[0]]?.slice(0, 60)} »` : `Textes de la page d’accueil (${[...sections].join(', ')})`;
  }
}
