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
  heroTitle: 'Votre demande de bourse nationale, désormais en ligne',
  heroSubtitle: "La plateforme numérique de l'Université de Mahajanga vous permet de déposer votre demande de bourse, transmettre les informations et pièces nécessaires et suivre l'évolution de votre dossier en ligne.",
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

export function assetUrl(path: string | null): string | null {
  return path ? `${apiUrl}${path}` : null;
}
