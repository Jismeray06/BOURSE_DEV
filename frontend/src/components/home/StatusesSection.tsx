'use client';

import { SectionShell } from './SectionShell';
import { HomeText } from './HomepageEditor';

// Statuts réels du backend (enum RegistrationStatus).
const STATUSES = [
  { code: 'BROUILLON', label: <HomeText contentKey="statuses.1" />, text: <HomeText contentKey="statuses.2" />, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { code: 'SOUMIS', label: <HomeText contentKey="statuses.3" />, text: <HomeText contentKey="statuses.4" />, tone: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  { code: 'EN_REVISION', label: <HomeText contentKey="statuses.5" />, text: <HomeText contentKey="statuses.6" />, tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  { code: 'VALIDE', label: <HomeText contentKey="statuses.7" />, text: <HomeText contentKey="statuses.8" />, tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { code: 'REFUSE', label: <HomeText contentKey="statuses.9" />, text: <HomeText contentKey="statuses.10" />, tone: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300' },
];

export function StatusesSection() {
  return (
    <SectionShell id="statuts" title={<HomeText contentKey="statuses.11" />} description={<HomeText contentKey="statuses.12" />}>
      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATUSES.map((status) => (
          <li key={status.code} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{status.text}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
