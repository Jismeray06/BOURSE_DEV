'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CircleHelp, FileText, GraduationCap, Megaphone, Pencil, ShieldCheck, Users } from 'lucide-react';
import { useEstablishments } from '../establishments';
import { HomeText, useHomeEdit } from './HomepageEditor';

// Mot d'ordre manuscrit en haut à droite du hero (masqué sur petit écran).
export function HeroTagline() {
  return (
    <p className="pointer-events-none absolute right-6 top-6 z-10 hidden -rotate-6 text-right font-[family-name:var(--font-script)] text-3xl leading-tight text-white/90 2xl:block 2xl:right-12 2xl:text-4xl">
      <HomeText contentKey="hero.tagline1" />
      <br />
      <HomeText contentKey="hero.tagline2" />
      <span className="mt-1 block h-0.5 w-40 rotate-6 rounded-full bg-white/70" aria-hidden />
    </p>
  );
}

const INFO_ITEMS = [
  { icon: CalendarDays, key: 'hero.info.1', href: '#bourse' },
  { icon: FileText, key: 'hero.info.2', href: '#etapes' },
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
        className={`relative cursor-pointer rounded-lg border border-white/25 p-2.5 text-white transition hover:bg-white/10 ${open ? 'bg-white/10' : ''}`}
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
          <a href="#actualites" onClick={() => { if (!editMode) setOpen(false); }} className="flex items-center gap-3 bg-blue-50 px-5 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
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
    <ul className="grid grid-cols-1 gap-y-5 rounded-2xl border border-white/10 bg-[#0b2c55]/80 px-6 py-5 backdrop-blur sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-white/15">
      {stats.map(({ icon: Icon, value, label }, index) => (
        <li key={index} className="flex items-center gap-4 lg:justify-center lg:px-4">
          <Icon className="h-9 w-9 shrink-0 text-slate-200" aria-hidden />
          <span>
            <b className="block text-lg font-bold leading-tight text-white">{value}</b>
            <span className="block text-sm text-slate-300">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
