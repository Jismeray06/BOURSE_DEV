'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { EditPencil, HomeText, useHomeEdit } from './HomepageEditor';
import Link from 'next/link';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { HomeThemeToggle } from '../theme/HomeThemeToggle';
import { assetUrl, DEFAULT_LOGO, type SiteSettings } from './siteSettings';
import { useHomepageContent } from './homepageStore';
import { HeroInfoMenu } from './HeroExtras';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from './language';
import { translateKey, ui } from './translate';
import { LOGIN_PATH, NAV_LINKS, REGISTER_PATH, useDashboardPath } from './useHomeSession';

type Props = {
  settings: SiteSettings;
  darkMode: boolean;
  onToggleTheme: () => void;
  // Sur la page de connexion : bascule le formulaire sur place au lieu de recharger la page.
  onSelectAuth?: (mode: 'login' | 'register') => void;
};

const sectionId = (href: string) => href.replace('/#', '');

// Section de la page actuellement à l'écran (la dernière dont le haut a dépassé la barre de navigation).
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      let current: string | null = null;
      for (const link of NAV_LINKS) {
        const element = document.getElementById(sectionId(link.href));
        if (element && element.getBoundingClientRect().top <= 140) current = sectionId(link.href);
      }
      setActive(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return active;
}

// Recherche rapide : propose les rubriques de la page dont le titre correspond à la saisie.
function QuickSearch({ onNavigate }: { onNavigate: () => void }) {
  const { content } = useHomepageContent();
  const language = useLanguage();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return NAV_LINKS.map((link) => ({ href: link.href, label: translateKey(link.contentKey, content, language) })).filter((item) => item.label.toLowerCase().includes(term));
  }, [content, language, query]);
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl">
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={ui('search.placeholder', language)}
        aria-label={ui('search.label', language)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <ul className="mt-2 max-h-56 overflow-y-auto">
        {results.map((item) => (
          <li key={item.href}>
            <a href={item.href} onClick={onNavigate} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100">{item.label}</a>
          </li>
        ))}
        {!results.length && <li className="px-3 py-2 text-sm text-slate-500">{ui('search.empty', language)}</li>}
      </ul>
    </div>
  );
}

// Menu déroulant regroupant les rubriques : s'ouvre au survol de la souris (ou au clic / clavier).
function NavDropdown({ activeSection, triggerClass }: { activeSection: string | null; triggerClass: string }) {
  const { content } = useHomepageContent();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const show = () => { window.clearTimeout(closeTimer.current); setOpen(true); };
  const hideSoon = () => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(false), 150); };
  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
    >
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)} className={`${triggerClass} inline-flex cursor-pointer items-center gap-1.5`}>
        {ui('menu.label', language)}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-3">
          <ul role="menu" className="w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl">
            {NAV_LINKS.map((link) => (
              <li key={link.href} role="none">
                <a role="menuitem" href={link.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-100 ${activeSection === sectionId(link.href) ? 'text-blue-600' : ''}`}>
                  {translateKey(link.contentKey, content, language)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HomeNavbar({ settings, darkMode, onToggleTheme, onSelectAuth }: Props) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dashboardPath = useDashboardPath();
  const { editLogo } = useHomeEdit();
  const language = useLanguage();
  const activeSection = useActiveSection();
  const logoUrl = assetUrl(settings.logoUrl) ?? DEFAULT_LOGO;
  const close = () => setOpen(false);
  const selectAuth = (event: MouseEvent<HTMLAnchorElement>, mode: 'login' | 'register') => {
    close();
    if (!onSelectAuth) return;
    event.preventDefault();
    onSelectAuth(mode);
    window.history.replaceState(null, '', mode === 'register' ? REGISTER_PATH : LOGIN_PATH);
  };

  const linkClass = (href: string) =>
    `relative whitespace-nowrap px-3 py-2 text-sm font-semibold transition hover:text-blue-700 dark:hover:text-white ${activeSection === sectionId(href) ? 'text-blue-600 after:absolute after:inset-x-3 after:-bottom-[22px] after:h-0.5 after:rounded-full after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-500' : 'text-slate-700 dark:text-slate-100/90'}`;
  const ghostButton = 'inline-flex whitespace-nowrap items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-white/40 dark:bg-transparent dark:text-white dark:hover:bg-white/10';
  const solidButton = 'inline-flex whitespace-nowrap items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500';

  const actions = dashboardPath ? (
    <Link href={dashboardPath} onClick={close} className={solidButton}><HomeText contentKey="navbar.1" /></Link>
  ) : (
    <>
      <Link href={LOGIN_PATH} onClick={(event) => selectAuth(event, 'login')} className={ghostButton}><HomeText contentKey="navbar.2" /></Link>
      <Link href={REGISTER_PATH} onClick={(event) => selectAuth(event, 'register')} className={solidButton}><HomeText contentKey="navbar.3" /></Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-800 backdrop-blur dark:border-white/10 dark:bg-[#071f3d]/95 dark:text-white">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-5 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/#accueil" className="flex min-w-0 items-center gap-3" aria-label="Université de Mahajanga — accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-contain p-1 shadow-md ring-2 ring-slate-200 lg:h-14 lg:w-14 dark:ring-white/20" />
          <span className="min-w-0">
            <span className="block whitespace-nowrap font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-[#0b2c55] sm:text-lg dark:text-white"><HomeText contentKey="navbar.4" /></span>
            <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-slate-600 sm:overflow-visible sm:whitespace-nowrap dark:text-slate-300"><HomeText contentKey="navbar.5" /></span>
          </span>
        </Link>
        <EditPencil label="Modifier le logo" onClick={editLogo} />

        <div className="flex items-center gap-2">
          <nav aria-label="Navigation principale" className="hidden 2xl:block">
            <NavDropdown activeSection={activeSection} triggerClass={linkClass(NAV_LINKS.find((link) => sectionId(link.href) === activeSection)?.href ?? '')} />
          </nav>
          <LanguageSwitcher />
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-expanded={searchOpen}
              aria-label={ui('search.open', language)}
              className="rounded-lg p-2.5 text-slate-700 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            {searchOpen && <QuickSearch onNavigate={() => setSearchOpen(false)} />}
          </div>
          <div className="hidden items-center gap-2 sm:flex">{actions}</div>
          <HeroInfoMenu />
          <HomeThemeToggle darkMode={darkMode} onToggle={onToggleTheme} onDark />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 2xl:hidden dark:border-white/25 dark:text-white dark:hover:bg-white/10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-slate-200 bg-white px-5 pb-5 pt-3 2xl:hidden dark:border-white/10 dark:bg-[#071f3d]">
          <nav aria-label="Navigation mobile" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={close} className={`${linkClass(link.href)} py-3 after:hidden`}><HomeText contentKey={link.contentKey} /></a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 sm:hidden [&>a]:py-3">{actions}</div>
        </div>
      )}
    </header>
  );
}
