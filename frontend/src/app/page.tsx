'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ArrowRight,
  Clock,
  BookOpen,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { HomeThemeToggle, useHomeTheme } from '../components/HomeThemeToggle';
import { HeroBackground, HeroContent } from '../components/HomepageHero';
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
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const { darkMode, toggleTheme } = useHomeTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % CAMPUS_IMAGES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchSiteSettings().then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!settings.faviconUrl) return;
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (link) link.href = assetUrl(settings.faviconUrl) ?? link.href;
  }, [settings.faviconUrl]);

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % CAMPUS_IMAGES.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + CAMPUS_IMAGES.length) % CAMPUS_IMAGES.length);
  };

  const goToLogin = (link: string) => {
    if (/^https?:\/\//.test(link)) window.location.assign(link);
    else router.push(link);
  };
  const handleProceedToLogin = () => goToLogin(settings.ctaPrimaryLink);
  const logoUrl = assetUrl(settings.logoUrl);
  const showDefaultCarousel = settings.heroBackgroundType === 'IMAGE' && settings.heroBackgroundImages.length === 0;
  return (
    <div className={`min-h-screen bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative ${darkMode ? 'home-dark' : ''}`}>

      {/* --- NAVBAR --- */}
      <header className="border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-11 w-11 rounded-xl object-contain" />
            ) : (
              <div className="p-2.5 rounded-xl ring-1 ring-amber-400/40" style={{ backgroundColor: settings.primaryColor }}>
                <GraduationCap className="w-6 h-6" style={{ color: settings.secondaryColor }} />
              </div>
            )}
            <div>
              <span className="font-[family-name:var(--font-heading)] font-semibold text-lg tracking-tight text-slate-900 dark:text-white">
                Univ Mahajanga
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                Portail Académique
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HomeThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            <button
              onClick={handleProceedToLogin}
              className="px-5 py-2.5 text-white font-medium text-sm rounded-lg transition flex items-center gap-2 cursor-pointer hover:brightness-110"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <span>{settings.ctaPrimaryLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden bg-[#06233b]">
        {showDefaultCarousel ? (
          <div className="absolute inset-0">
            {CAMPUS_IMAGES.map((item, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={item.url}
                  alt={item.title}
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover"
                />
              </div>
            ))}
            {/* Assombrissement pour la lisibilité du texte */}
            <div className="absolute inset-0 bg-[#06233b]/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06233b]/95 via-[#06233b]/55 to-[#06233b]/25" />
          </div>
        ) : (
          <HeroBackground settings={settings} />
        )}

        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10 w-full py-16 sm:py-20 lg:py-24">
          <HeroContent settings={settings} onCtaClick={() => goToLogin(settings.ctaSecondaryLink)} />
        </div>

        {/* Contrôles du diaporama (uniquement quand le carrousel par défaut est actif) */}
        {showDefaultCarousel && (
          <>
            <button
              onClick={handlePrevImage}
              aria-label="Image précédente"
              className="hidden sm:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 transition border border-white/25 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNextImage}
              aria-label="Image suivante"
              className="hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 transition border border-white/25 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {CAMPUS_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  aria-label={`Aller à l'image ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* --- CARACTÉRISTIQUES --- */}
      <section className="py-14 sm:py-16 bg-white border-y border-slate-200 dark:bg-slate-950 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Une inscription en toute confiance
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
              Trois étapes claires, du choix de la faculté au suivi de votre dossier.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6 rounded-xl space-y-3 hover:border-amber-300 hover:shadow-sm transition">
              <div className="w-11 h-11 rounded-lg bg-[#0b3b60]/5 border border-[#0b3b60]/10 dark:bg-white/5 dark:border-white/10 dark:text-blue-300 flex items-center justify-center text-[#0b3b60]">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-slate-900 dark:text-white">Parcours sur mesure</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Choix fluide parmi les niveaux (L1 à Master) et spécialités adaptées à chaque faculté.
              </p>
            </div>

            <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6 rounded-xl space-y-3 hover:border-amber-300 hover:shadow-sm transition">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 flex items-center justify-center text-emerald-700">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-slate-900 dark:text-white">Vérification de quitus</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Validation rapide de votre reçu de paiement pour attester votre pré-inscription administrative.
              </p>
            </div>

            <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6 rounded-xl space-y-3 hover:border-amber-300 hover:shadow-sm transition">
              <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 flex items-center justify-center text-slate-700">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-slate-900 dark:text-white">Profil étudiant</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Consultez le résumé de votre dossier à tout moment et modifiez vos choix si nécessaire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-200 py-8 bg-[#0b3b60] text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-amber-400" />
          <span className="font-[family-name:var(--font-heading)] text-sm font-semibold text-white">Université de Mahajanga</span>
        </div>
        <p className="text-xs text-slate-300">
          © 2026 — Plateforme Numérique d&apos;Inscription Académique
        </p>
      </footer>

    </div>
  );
}