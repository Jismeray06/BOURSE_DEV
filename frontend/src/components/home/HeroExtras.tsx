'use client';

import { ArrowRight, CalendarDays, CircleHelp, FileText, GraduationCap, Megaphone, ShieldCheck, Users } from 'lucide-react';
import { useEstablishments } from '../establishments';
import { HomeText } from './HomepageEditor';

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

// Carte « Informations importantes » : trois rappels avec lien vers la rubrique concernée.
export function HeroInfoCard() {
  return (
    <aside className="w-full overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl shadow-black/30" aria-label="Informations importantes">
      <h2 className="flex items-center gap-3 px-6 py-5 text-lg font-bold text-slate-900">
        <Megaphone className="h-6 w-6 text-blue-600" aria-hidden />
        <HomeText contentKey="hero.info.title" />
      </h2>
      <ul className="border-t border-slate-200 px-6">
        {INFO_ITEMS.map(({ icon: Icon, key, href }) => (
          <li key={key} className="border-b border-slate-200 last:border-b-0">
            <a href={href} className="flex items-center gap-4 py-4 transition hover:opacity-80">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <b className="block text-sm font-bold text-slate-900"><HomeText contentKey={`${key}.title`} /></b>
                <span className="block text-sm text-slate-600"><HomeText contentKey={`${key}.text`} /></span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a href="#actualites" className="flex items-center gap-3 bg-blue-50 px-6 py-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
        <ArrowRight className="h-4 w-4" aria-hidden />
        <HomeText contentKey="hero.info.more" />
      </a>
    </aside>
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
