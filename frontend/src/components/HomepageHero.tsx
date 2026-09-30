'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { SiteSettings } from './siteSettings';
import { assetUrl } from './siteSettings';

/**
 * Fond du hero pour les modes pilotés par les réglages (couleur unie, dégradé, une ou plusieurs images).
 * Ne rend rien quand le type est IMAGE sans aucune image personnalisée : dans ce cas, l'appelant
 * (la vraie page d'accueil) affiche son propre carrousel d'images par défaut à la place.
 * Une seule image personnalisée = fond fixe. Deux à quatre images = diaporama automatique.
 */
export function HeroBackground({ settings }: { settings: SiteSettings }) {
  const overlayOpacity = Math.min(100, Math.max(0, settings.heroOverlayOpacity)) / 100;
  const images = settings.heroBackgroundType === 'IMAGE' ? settings.heroBackgroundImages.map(assetUrl).filter((url): url is string => Boolean(url)) : [];
  const [activeIndex, setActiveIndex] = useState(0);
  // L'index peut être en retard d'un cycle si la liste de photos vient de rétrécir
  // (ex. suppression) ; on le ramène dans les bornes actuelles au lieu de le stocker.
  const safeIndex = images.length ? activeIndex % images.length : 0;

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setActiveIndex((index) => (index + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (settings.heroBackgroundType === 'IMAGE') {
    if (!images.length) return null;
    return (
      <div className="absolute inset-0">
        {images.map((url, index) => (
          <div
            key={url}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
            style={{ backgroundImage: `url(${url})`, opacity: index === safeIndex ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(6, 35, 59, ${overlayOpacity})` }} />
      </div>
    );
  }

  const background =
    settings.heroBackgroundType === 'GRADIENT'
      ? `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`
      : settings.primaryColor;

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background }} />
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(6, 35, 59, ${overlayOpacity})` }} />
    </div>
  );
}

/** Contenu textuel du hero (badge, titre, sous-titre, statistiques, bouton d'action). */
export function HeroContent({ settings, onCtaClick }: { settings: SiteSettings; onCtaClick?: () => void }) {
  return (
    <div className="max-w-2xl space-y-7 text-center lg:text-left">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-medium text-white shadow-sm backdrop-blur">
        <Sparkles className="h-4 w-4" style={{ color: settings.secondaryColor }} />
        <span>Inscriptions académiques ouvertes</span>
      </div>

      <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
        {settings.heroTitle}
      </h1>

      <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg lg:mx-0">
        {settings.heroSubtitle}
      </p>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
        <button
          type="button"
          onClick={onCtaClick}
          className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-[#0b3b60] shadow-sm transition hover:brightness-95"
          style={{ backgroundColor: settings.secondaryColor }}
        >
          <span>{settings.ctaSecondaryLabel}</span>
        </button>
      </div>

      <dl className="flex items-center justify-center gap-8 pt-2 lg:justify-start">
        <div className="text-center lg:text-left">
          <dt className="sr-only">Facultés</dt>
          <dd className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">15+</dd>
          <dd className="mt-0.5 text-xs text-slate-300">Facultés &amp; instituts</dd>
        </div>
        <div className="h-9 w-px bg-white/20" />
        <div className="text-center lg:text-left">
          <dt className="sr-only">Étudiants</dt>
          <dd className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">10 000+</dd>
          <dd className="mt-0.5 text-xs text-slate-300">Étudiants inscrits</dd>
        </div>
        <div className="h-9 w-px bg-white/20" />
        <div className="text-center lg:text-left">
          <dt className="sr-only">Disponibilité</dt>
          <dd className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">100%</dd>
          <dd className="mt-0.5 text-xs text-slate-300">En ligne</dd>
        </div>
      </dl>
    </div>
  );
}
