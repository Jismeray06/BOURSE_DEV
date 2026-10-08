'use client';

import { ChevronRight, ClipboardList, Eye, FileUp, ReceiptText, UserPlus } from 'lucide-react';
import { HomeText } from './HomepageEditor';
import { SectionShell } from './SectionShell';
import type { SiteSettings } from '../siteSettings';

const STEPS = [
  { icon: UserPlus, short: <HomeText contentKey="steps.1" />, title: <HomeText contentKey="steps.2" />, text: <HomeText contentKey="steps.3" /> },
  { icon: ClipboardList, short: <HomeText contentKey="steps.4" />, title: <HomeText contentKey="steps.5" />, text: <HomeText contentKey="steps.6" /> },
  { icon: ReceiptText, short: <HomeText contentKey="steps.7" />, title: <HomeText contentKey="steps.8" />, text: <HomeText contentKey="steps.9" /> },
  { icon: FileUp, short: <HomeText contentKey="steps.10" />, title: <HomeText contentKey="steps.11" />, text: <HomeText contentKey="steps.12" /> },
  { icon: Eye, short: <HomeText contentKey="steps.13" />, title: <HomeText contentKey="steps.14" />, text: <HomeText contentKey="steps.15" /> },
];

export function StepsSection({ settings }: { settings: SiteSettings }) {
  return (
    <SectionShell id="etapes" title={<HomeText contentKey="steps.16" />} description={<HomeText contentKey="steps.17" />}>
      {/* Schéma synthétique : Compte → Parcours → Quitus → Justificatifs → Suivi */}
      <ol aria-label="Résumé des étapes" className="mx-auto mb-10 hidden max-w-4xl items-center justify-between lg:flex">
        {STEPS.map((step, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="rounded-full px-4 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: settings.primaryColor }}>{step.short}</span>
            {index < STEPS.length - 1 && <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />}
          </li>
        ))}
      </ol>
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <li key={index} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: settings.primaryColor }}>
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"><HomeText contentKey="steps.18" />{' '}{index + 1}</span>
            </div>
            <h3 className="mt-3 font-[family-name:var(--font-heading)] text-base font-semibold text-slate-900 dark:text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.text}</p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
