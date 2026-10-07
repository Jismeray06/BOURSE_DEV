'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { GraduationCap, Menu, X } from 'lucide-react';
import { HomeThemeToggle } from '../HomeThemeToggle';
import { assetUrl, type SiteSettings } from '../siteSettings';
import { LOGIN_PATH, NAV_LINKS, REGISTER_PATH, useDashboardPath } from './useHomeSession';

type Props = {
  settings: SiteSettings;
  darkMode: boolean;
  onToggleTheme: () => void;
  // Sur la page de connexion : bascule le formulaire sur place au lieu de recharger la page.
  onSelectAuth?: (mode: 'login' | 'register') => void;
};

export function HomeNavbar({ settings, darkMode, onToggleTheme, onSelectAuth }: Props) {
  const [open, setOpen] = useState(false);
  const dashboardPath = useDashboardPath();
  const logoUrl = assetUrl(settings.logoUrl);
  const close = () => setOpen(false);
  const selectAuth = (event: MouseEvent<HTMLAnchorElement>, mode: 'login' | 'register') => {
    close();
    if (!onSelectAuth) return;
    event.preventDefault();
    onSelectAuth(mode);
    window.history.replaceState(null, '', mode === 'register' ? REGISTER_PATH : LOGIN_PATH);
  };

  const linkClass = 'rounded-md px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white';
  const ghostButton = 'inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800';
  const solidButton = 'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110';

  const actions = dashboardPath ? (
    <Link href={dashboardPath} onClick={close} className={solidButton} style={{ backgroundColor: settings.primaryColor }}>Mon espace</Link>
  ) : (
    <>
      <Link href={LOGIN_PATH} onClick={(event) => selectAuth(event, 'login')} className={ghostButton}>Se connecter</Link>
      <Link href={REGISTER_PATH} onClick={(event) => selectAuth(event, 'register')} className={solidButton} style={{ backgroundColor: settings.primaryColor }}>Faire une demande</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/#accueil" className="flex min-w-0 items-center gap-3" aria-label="Université de Mahajanga — accueil">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
          ) : (
            <span className="shrink-0 rounded-xl p-2.5 ring-1 ring-amber-400/40" style={{ backgroundColor: settings.primaryColor }}>
              <GraduationCap className="h-5 w-5" style={{ color: settings.secondaryColor }} />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              Université de Mahajanga
            </span>
            <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Demande de bourse nationale
            </span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={linkClass}>{link.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">{actions}</div>
          <HomeThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-slate-200 bg-white px-5 pb-5 pt-3 dark:border-slate-800 dark:bg-slate-950 xl:hidden">
          <nav aria-label="Navigation mobile" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={close} className={`${linkClass} py-3`}>{link.label}</a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 sm:hidden [&>a]:py-3">{actions}</div>
        </div>
      )}
    </header>
  );
}
