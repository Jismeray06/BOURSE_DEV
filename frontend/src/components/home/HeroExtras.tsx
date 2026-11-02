'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CircleHelp, FileText, GraduationCap, Megaphone, Pencil, ShieldCheck, Users } from 'lucide-react';
import { useEstablishments } from '../panels/establishments';
import { HomeText, useHomeEdit } from './HomepageEditor';

// Décor lumineux du hero : halo bleu-vert, points brillants et traits de lumière (purement décoratif).
const GLOW_DOTS = [
  { left: '66%', top: '14%', size: 12 },
  { left: '22%', top: '36%', size: 9 },
  { left: '78%', top: '60%', size: 14 },
  { left: '14%', top: '72%', size: 8 },
  { left: '86%', top: '28%', size: 7 },
  { left: '36%', top: '18%', size: 6 },
];
const GLOW_LINES = [
  { left: '58%', top: '18%', width: 130, rotate: -35 },
  { left: '72%', top: '8%', width: 110, rotate: -35 },
  { left: '30%', top: '78%', width: 120, rotate: -35 },
];

// Teintes sombres (fond bleu nuit) et claires (fond blanc). Sans `forceDark`, le décor suit le thème de la page ;
// avec `forceDark`, il reste sombre même en mode clair (fond de bandeau en photos ou en dégradé).
const GLOW_RADIAL = {
  dark: 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(34,211,238,0.20),transparent_62%)]',
  auto: 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(56,189,248,0.12),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_50%_35%,rgba(34,211,238,0.20),transparent_62%)]',
};
const GLOW_LINE = {
  dark: 'bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent',
  auto: 'bg-gradient-to-r from-transparent via-sky-400/70 to-transparent dark:via-cyan-300/80',
};
const GLOW_DOT = {
  dark: 'bg-cyan-200 shadow-[0_0_14px_5px_rgba(103,232,249,0.55)]',
  auto: 'bg-sky-400 shadow-[0_0_14px_5px_rgba(56,189,248,0.40)] dark:bg-cyan-200 dark:shadow-[0_0_14px_5px_rgba(103,232,249,0.55)]',
};

export function HeroGlow({ forceDark = false }: { forceDark?: boolean }) {
  const tone = forceDark ? 'dark' : 'auto';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`absolute inset-0 ${GLOW_RADIAL[tone]}`} />
      {/* Grands disques pâles sur les bords : uniquement en mode clair. */}
      {!forceDark && (
        <>
          <div className="absolute -left-[28rem] top-[14%] aspect-square h-[72%] rounded-full bg-sky-100/70 dark:hidden" />
          <div className="absolute -right-[30rem] top-[2%] aspect-square h-[78%] rounded-full bg-sky-100/60 dark:hidden" />
        </>
      )}
      {GLOW_LINES.map((line, index) => (
        <span key={index} className={`absolute h-0.5 rounded-full ${GLOW_LINE[tone]}`} style={{ left: line.left, top: line.top, width: line.width, transform: `rotate(${line.rotate}deg)` }} />
      ))}
      {GLOW_DOTS.map((dot, index) => (
        <span key={index} className={`absolute rounded-full ${GLOW_DOT[tone]}`} style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }} />
      ))}
    </div>
  );
}

const INFO_ITEMS = [
  { icon: CalendarDays, key: 'hero.info.1', href: '#accueil' },
  { icon: FileText, key: 'hero.info.2', href: '#faq' },
  { icon: CircleHelp, key: 'hero.info.3', href: '#faq' },
];

// « Informations importantes » : icône de la barre de navigation qui ouvre trois rappels avec lien vers la rubrique concernée.
export function HeroInfoMenu() {
  const [open, setOpen] = useState(false);
  const { editMode } = useHomeEdit();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // En mode personnalisation, le panneau reste ouvert pendant la modification des textes.
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!editMode && !wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, editMode]);

  return (
    <div ref={wrapperRef} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Informations importantes"
        title="Informations importantes"
        className={`relative cursor-pointer rounded-lg border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 dark:border-white/25 dark:text-white dark:hover:bg-white/10 ${open ? 'bg-slate-100 dark:bg-white/10' : ''}`}
      >
        <Megaphone className="h-5 w-5" aria-hidden />
        {editMode && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white" aria-hidden><Pencil className="h-2.5 w-2.5" /></span>}
      </button>
      {open && (
        <aside className="absolute inset-x-5 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl shadow-black/30 sm:inset-x-auto sm:right-0 sm:w-96" aria-label="Informations importantes">
          <h2 className="flex items-center gap-3 px-5 py-4 text-base font-bold text-slate-900">
            <Megaphone className="h-5 w-5 text-blue-600" aria-hidden />
            <HomeText contentKey="hero.info.title" />
          </h2>
          <ul className="border-t border-slate-200 px-5">
            {INFO_ITEMS.map(({ icon: Icon, key, href }) => (
              <li key={key} className="border-b border-slate-200 last:border-b-0">
                <a href={href} onClick={() => { if (!editMode) setOpen(false); }} className="flex items-center gap-4 py-3 transition hover:opacity-80">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-sm font-bold text-slate-900"><HomeText contentKey={`${key}.title`} /></b>
                    <span className="block text-sm text-slate-600"><HomeText contentKey={`${key}.text`} /></span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <a href="#faq" onClick={() => { if (!editMode) setOpen(false); }} className="flex items-center gap-3 bg-blue-50 px-5 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
            <ArrowRight className="h-4 w-4" aria-hidden />
            <HomeText contentKey="hero.info.more" />
          </a>
        </aside>
      )}
    </div>
  );
}

// Bandeau de chiffres en bas du hero ; le nombre d'établissements vient de la liste publique.
export function HeroStats() {
  const { establishments, loaded } = useEstablishments();
  const stats = [
    { icon: Users, value: loaded ? String(establishments.length) : '—', label: <HomeText contentKey="hero.stats.1.label" /> },
    { icon: GraduationCap, value: <HomeText contentKey="hero.stats.2.value" />, label: <HomeText contentKey="hero.stats.2.label" /> },
    { icon: FileText, value: <HomeText contentKey="hero.stats.3.value" />, label: <HomeText contentKey="hero.stats.3.label" /> },
    { icon: ShieldCheck, value: <HomeText contentKey="hero.stats.4.value" />, label: <HomeText contentKey="hero.stats.4.label" /> },
  ];
  return (
    <ul className="grid grid-cols-1 gap-y-5 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-slate-200 dark:border-white/10 dark:bg-[#0b2c55]/80 dark:shadow-none dark:backdrop-blur dark:lg:divide-white/15">
      {stats.map(({ icon: Icon, value, label }, index) => (
        <li key={index} className="flex items-center gap-4 lg:justify-center lg:px-4">
          <Icon className="h-9 w-9 shrink-0 text-blue-600 dark:text-slate-200" aria-hidden />
          <span>
            <b className="block text-lg font-bold leading-tight text-[#0b2c55] dark:text-white">{value}</b>
            <span className="block text-sm text-slate-600 dark:text-slate-300">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
