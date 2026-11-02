'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useHomeTheme } from '../theme/HomeThemeToggle';
import { HeroGlow } from '../home/HeroExtras';
import { HomeNavbar } from '../home/HomeNavbar';
import { defaultSiteSettings, fetchSiteSettings, type SiteSettings } from '../home/siteSettings';

type Props = {
  children: ReactNode;
  // Sur la page de connexion : bascule le formulaire sur place au lieu de recharger la page.
  onSelectAuth?: (mode: 'login' | 'register') => void;
};

// Cadre commun des pages d'authentification : barre de navigation de l'accueil, fond (clair ou sombre) et carte centrale.
export function AuthShell({ children, onSelectAuth }: Props) {
  const { darkMode, toggleTheme } = useHomeTheme();
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    fetchSiteSettings().then(setSettings).catch(() => undefined);
  }, []);

  return (
    <div className={`flex min-h-screen w-full flex-col bg-slate-100 dark:bg-slate-950 ${darkMode ? 'home-dark' : ''}`}>
      <HomeNavbar settings={settings} darkMode={darkMode} onToggleTheme={toggleTheme} onSelectAuth={onSelectAuth} />

      {/* Fond plein écran. Mode clair : blanc légèrement bleuté avec décor pâle, comme l'accueil.
          Mode sombre : photo du campus assombrie, halo bleu-vert et points lumineux. */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white via-sky-50/70 to-white px-5 py-10 sm:px-6 dark:bg-[#06233b] dark:bg-none">
        <div className="absolute inset-0 hidden dark:block">
          <Image src="/images/campus-2.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[#06233b]/65" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06233b]/80 via-[#0b4a5e]/35 to-[#06233b]/85" />
        </div>
        <HeroGlow />

        {/* Carte centrale : blanche en mode clair, verre dépoli en mode sombre. */}
        <div className="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl shadow-sky-900/10 sm:p-8 dark:border-white/25 dark:bg-[#0a2a3f]/55 dark:text-white dark:shadow-2xl dark:shadow-black/40 dark:backdrop-blur-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
