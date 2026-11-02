export type HeroBackgroundType = 'COLOR' | 'GRADIENT' | 'IMAGE';

export type SiteSettings = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  heroBackgroundType: HeroBackgroundType;
  heroBackgroundImages: string[];
  heroOverlayOpacity: number;
  heroTitle: string;
  heroSubtitle: string;
  ctaPrimaryLabel: string;
  ctaPrimaryLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
};

export const defaultSiteSettings: SiteSettings = {
  primaryColor: '#0b3b60',
  secondaryColor: '#fbbf24',
  backgroundColor: '#ffffff',
  logoUrl: null,
  faviconUrl: null,
  heroBackgroundType: 'COLOR',
  heroBackgroundImages: [],
  heroOverlayOpacity: 60,
  heroTitle: 'Votre demande de bourse nationale, simple et 100 % en ligne.',
  heroSubtitle: "Déposez votre dossier, transmettez vos pièces justificatives et suivez son avancement, où que vous soyez.",
  ctaPrimaryLabel: 'Se connecter',
  ctaPrimaryLink: '/login',
  ctaSecondaryLabel: 'Faire une demande de bourse',
  ctaSecondaryLink: '/login',
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const response = await fetch(`${apiUrl}/site-settings`);
  if (!response.ok) return defaultSiteSettings;
  return response.json() as Promise<SiteSettings>;
}

export const DEFAULT_LOGO = '/logo.png';

export function assetUrl(path: string | null): string | null {
  return path ? `${apiUrl}${path}` : null;
}
