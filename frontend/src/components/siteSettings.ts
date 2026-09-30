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
  heroBackgroundType: 'IMAGE',
  heroBackgroundImages: [],
  heroOverlayOpacity: 60,
  heroTitle: 'Votre inscription universitaire, simple et accessible.',
  heroSubtitle: "Déposez votre dossier d'inscription en ligne en quelques étapes. Sélectionnez votre établissement, validez votre quitus et suivez l'avancement de votre dossier.",
  ctaPrimaryLabel: 'Se connecter',
  ctaPrimaryLink: '/login',
  ctaSecondaryLabel: 'Commencer mon inscription',
  ctaSecondaryLink: '/login',
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const response = await fetch(`${apiUrl}/site-settings`);
  if (!response.ok) return defaultSiteSettings;
  return response.json() as Promise<SiteSettings>;
}

export function assetUrl(path: string | null): string | null {
  return path ? `${apiUrl}${path}` : null;
}
