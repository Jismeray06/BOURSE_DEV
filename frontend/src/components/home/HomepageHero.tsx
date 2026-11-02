'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { SiteSettings } from './siteSettings';
import { assetUrl } from './siteSettings';
import { Eye, FileText } from 'lucide-react';
import { EditPencil, HomeText, useHomeEdit } from './HomepageEditor';
import { useLanguage } from './language';
import { translateSetting } from './translate';

// La partie « bourse nationale » du titre est mise en valeur sur sa propre ligne ; un titre sans cette expression reste uniforme.
function HighlightedTitle({ title }: { title: string }) {
  const match = /(bourse nationale|national scholarship|bours nasionaly),?/i.exec(title);
  if (!match) return <>{title}</>;
  return (
    <>
      {title.slice(0, match.index).trimEnd()}
      <span className="block">{match[0]}</span>
      {title.slice(match.index + match[0].length).trimStart()}
    </>
  );
}

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
          <div key={url} className="absolute inset-0 transition-opacity duration-1000 ease-in-out" style={{ opacity: index === safeIndex ? 1 : 0 }}>
            {/* Fond flou : comble les côtés quand la photo n'a pas le même format que l'écran. */}
            <div className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl" style={{ backgroundImage: `url(${url})` }} />
            {/* Sur grand écran, la photo est affichée en entier (sans zoom ni recadrage) ; sur téléphone, elle remplit le bandeau. */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:bg-contain" style={{ backgroundImage: `url(${url})` }} />
          </div>
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

/**
 * Contenu textuel du hero (titre, sous-titre et deux boutons d'action).
 * `tone` indique le fond sur lequel il est posé : « light » (fond blanc du mode clair) ou « dark » (fond bleu nuit, photos, dégradé).
 */
export function HeroContent({
  settings,
  primary,
  secondary,
  tone = 'dark',
}: {
  settings: SiteSettings;
  primary: { label: ReactNode; onClick: () => void; editable?: boolean };
  secondary?: { label: ReactNode; onClick: () => void };
  tone?: 'light' | 'dark';
}) {
  const { editMode, editHero } = useHomeEdit();
  const language = useLanguage();
  const shown = (value: string) => (editMode ? value : translateSetting(value, language));
  const light = tone === 'light';
  return (
    <div className="mx-auto max-w-3xl space-y-6 text-center">
      <h1 className={`font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl ${light ? 'text-[#0b2c55]' : 'text-white'}`}>
        <HighlightedTitle title={shown(settings.heroTitle)} />
        <EditPencil label="Modifier le titre" onClick={() => editHero('heroTitle')} className="ml-2" />
      </h1>

      <p className={`mx-auto max-w-xl text-base leading-relaxed sm:text-lg ${light ? 'text-slate-800' : 'text-slate-100'}`}>
        {shown(settings.heroSubtitle)}
        <EditPencil label="Modifier le sous-titre" onClick={() => editHero('heroSubtitle')} className="ml-2" />
      </p>

      <p className={`mx-auto max-w-xl text-sm sm:text-base ${light ? 'text-slate-500' : 'text-slate-200/90'}`}><HomeText contentKey="hero.lead" /></p>

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {/* En mode personnalisation, le crayon reste sur la même ligne que le bouton (y compris sur téléphone). */}
        <div className={editMode && primary.editable ? 'flex items-center justify-center gap-2' : 'contents'}>
          <button
            type="button"
            onClick={primary.onClick}
            className={`flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 ${light ? 'shadow-[0_8px_24px_rgba(37,99,235,0.35)]' : 'shadow-[0_0_28px_rgba(37,99,235,0.55)]'} ${editMode && primary.editable ? 'flex-1 sm:flex-none' : ''}`}
          >
            <FileText className="h-4 w-4" aria-hidden />
            <span>{primary.label}</span>
          </button>
          {primary.editable && <EditPencil label="Modifier le texte du bouton" onClick={() => editHero('ctaSecondaryLabel')} />}
        </div>
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-3.5 text-sm font-semibold transition ${light ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50' : 'border-white/50 text-white hover:bg-white/10'}`}
          >
            <Eye className="h-4 w-4" aria-hidden />
            <span>{secondary.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}
