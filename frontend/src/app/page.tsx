'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { useHomeTheme } from '../components/HomeThemeToggle';
import { HeroBackground, HeroContent } from '../components/HomepageHero';
import { HomeEditProvider, HomeText, useHomeEdit } from '../components/home/HomepageEditor';
import { HomeNavbar } from '../components/home/HomeNavbar';
import { HomeSetting } from '../components/home/HomeSetting';
import { HeroStats, HeroTagline } from '../components/home/HeroExtras';
import { BourseSection } from '../components/home/BourseSection';
import { StepsSection } from '../components/home/StepsSection';
import { PrepareSection } from '../components/home/PrepareSection';
import { BenefitsSection } from '../components/home/BenefitsSection';
import { EstablishmentsSection } from '../components/home/EstablishmentsSection';
import { StatusesSection } from '../components/home/StatusesSection';
import { AnnouncementsList } from '../components/home/AnnouncementsList';
import { FaqSection } from '../components/home/FaqSection';
import { HelpSection } from '../components/home/HelpSection';
import { FinalCta } from '../components/home/FinalCta';
import { HomeFooter } from '../components/home/HomeFooter';
import { LOGIN_PATH, useDashboardPath } from '../components/home/useHomeSession';
import { assetUrl, defaultSiteSettings, fetchSiteSettings, type SiteSettings } from '../components/siteSettings';

const CAMPUS_IMAGES = [
  {
    url: "/images/campus-1.jpg",
    title: "Campus Principal",
    subtitle: "Infrastructures modernes & Espaces d'études"
  },
  {
    url: "/images/campus-2.jpg",
    title: "Vie Étudiante & Diplômes",
    subtitle: "Des milliers d'étudiants diplômés chaque année"
  },
  {
    url: "/images/campus-3.jpg",
    title: "Bibliothèques & Laboratoires",
    subtitle: "Équipements de pointe pour la recherche"
  },
  {
    url: "/images/campus-4.jpg",
    title: "Amphithéâtres & Facultés",
    subtitle: "Un cadre idéal pour réussir vos études"
  }
];

export default function HomePage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const { darkMode, toggleTheme } = useHomeTheme();

  useEffect(() => {
    fetchSiteSettings().then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!settings.faviconUrl) return;
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (link) link.href = assetUrl(settings.faviconUrl) ?? link.href;
  }, [settings.faviconUrl]);

  return (
    <div className={`min-h-screen bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200 flex flex-col selection:bg-blue-100 selection:text-blue-900 relative ${darkMode ? 'home-dark' : ''}`}>
      {/* Mode personnalisation (administrateur uniquement, via /?mode=personnalisation) : sans lui, la page est inchangée. */}
      <HomeEditProvider settings={settings} onSettingsChange={setSettings}>
        <HomeBody settings={settings} darkMode={darkMode} onToggleTheme={toggleTheme} />
      </HomeEditProvider>
    </div>
  );
}

function HomeBody({ settings, darkMode, onToggleTheme }: { settings: SiteSettings; darkMode: boolean; onToggleTheme: () => void }) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const dashboardPath = useDashboardPath();
  const { editMode, editCarousel } = useHomeEdit();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % CAMPUS_IMAGES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const goToLogin = (link: string) => {
    if (/^https?:\/\//.test(link)) window.location.assign(link);
    else router.push(link);
  };
  const showDefaultCarousel = settings.heroBackgroundType === 'IMAGE' && settings.heroBackgroundImages.length === 0;
  return (
    <>
      <HomeNavbar settings={settings} darkMode={darkMode} onToggleTheme={onToggleTheme} />

      {/* --- HERO SECTION --- */}
      <section id="accueil" className="relative flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col overflow-hidden bg-[#06233b] lg:min-h-[calc(100svh-5rem)] lg:scroll-mt-20">
        {showDefaultCarousel ? (
          <div className="absolute inset-0">
            {CAMPUS_IMAGES.map((item, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Fond flou : comble les côtés quand la photo n'a pas le même format que l'écran. */}
                <Image src={item.url} alt="" aria-hidden fill sizes="25vw" className="scale-110 object-cover blur-2xl" />
                {/* Sur grand écran, la photo est affichée en entier (sans zoom ni recadrage) ; sur téléphone, elle remplit le bandeau. */}
                <Image
                  src={item.url}
                  alt={item.title}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover object-center lg:object-contain"
                />
              </div>
            ))}
            {/* Assombrissement pour la lisibilité du texte */}
            <div className="absolute inset-0 bg-[#06233b]/55" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06233b]/90 via-[#06233b]/55 to-[#06233b]/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06233b]/80 via-transparent to-transparent" />
          </div>
        ) : (
          <HeroBackground settings={settings} />
        )}

        <HeroTagline />

        <div className="relative z-10 grid w-full flex-1 items-center gap-10 px-5 py-12 sm:px-6 lg:gap-12 lg:px-8 lg:py-16">
          <HeroContent
            settings={settings}
            primary={
              dashboardPath
                ? { label: <HomeText contentKey="navbar.1" />, onClick: () => router.push(dashboardPath) }
                : { label: <HomeSetting value={settings.ctaSecondaryLabel} />, onClick: () => goToLogin(settings.ctaSecondaryLink), editable: true }
            }
            secondary={dashboardPath ? undefined : { label: <HomeText contentKey="hero.trackingLabel" />, onClick: () => router.push(LOGIN_PATH) }}
          />
        </div>

        <div className="relative z-10 w-full px-5 pb-12 sm:px-6 lg:px-8">
          <HeroStats />
        </div>

        {editMode && (
          <button
            type="button"
            onClick={editCarousel}
            className="absolute right-3 top-3 z-30 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/40 bg-slate-900/80 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-blue-600 sm:right-5 sm:top-5"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />Modifier le carrousel
          </button>
        )}

        {/* Contrôles du diaporama (uniquement quand le carrousel par défaut est actif) */}
        {showDefaultCarousel && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {CAMPUS_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  aria-label={`Aller à l'image ${idx + 1}`}
                  className={`h-2 min-h-0! rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <BourseSection settings={settings} />
      <StepsSection settings={settings} />
      <PrepareSection settings={settings} />
      <BenefitsSection />
      <EstablishmentsSection />
      <StatusesSection />
      <AnnouncementsList />
      <FaqSection />
      <HelpSection />
      <FinalCta settings={settings} />
      <HomeFooter settings={settings} />
    </>
  );
}
