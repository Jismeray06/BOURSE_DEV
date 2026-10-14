'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { SiteSettings } from './siteSettings';
import { assetUrl } from './siteSettings';
import { Eye, FileText, GraduationCap } from 'lucide-react';
import { EditPencil, HomeText, useHomeEdit } from './home/HomepageEditor';

// La partie « bourse nationale » du titre est mise en valeur sur sa propre ligne ; un titre sans cette expression reste uniforme.
function HighlightedTitle({ title }: { title: string }) {
  const match = /bourse nationale,?/i.exec(title);
  if (!match) return <>{title}</>;
  return (
    <>
      {title.slice(0, match.index).trimEnd()}
      <span className="block text-blue-300">{match[0]}</span>
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

/** Contenu textuel du hero (titre, sous-titre et deux boutons d'action). */
export function HeroContent({
  settings,
  primary,
  secondary,
}: {
  settings: SiteSettings;
  primary: { label: ReactNode; onClick: () => void; editable?: boolean };
  secondary?: { label: ReactNode; onClick: () => void };
}) {
  const { editMode, editHero } = useHomeEdit();
  return (
    <div className="max-w-2xl space-y-6 text-center lg:text-left">
      <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-blue-900/70 px-4 py-2 text-sm font-semibold text-white">
        <GraduationCap className="h-4 w-4" aria-hidden />
        <HomeText contentKey="hero.badge" />
      </p>

      <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
        <HighlightedTitle title={settings.heroTitle} />
        <EditPencil label="Modifier le titre" onClick={() => editHero('heroTitle')} className="ml-2" />
      </h1>

      <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-100 sm:text-lg lg:mx-0">
        {settings.heroSubtitle}
        <EditPencil label="Modifier le sous-titre" onClick={() => editHero('heroSubtitle')} className="ml-2" />
      </p>

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
        {/* En mode personnalisation, le crayon reste sur la même ligne que le bouton (y compris sur téléphone). */}
        <div className={editMode && primary.editable ? 'flex items-center justify-center gap-2' : 'contents'}>
          <button
            type="button"
            onClick={primary.onClick}
            className={`flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 ${editMode && primary.editable ? 'flex-1 sm:flex-none' : ''}`}
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
            className="flex items-center justify-center gap-2 rounded-lg border border-white/50 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Eye className="h-4 w-4" aria-hidden />
            <span>{secondary.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}
