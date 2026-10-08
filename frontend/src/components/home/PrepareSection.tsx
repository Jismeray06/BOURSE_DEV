'use client';

import Link from 'next/link';
import { HomeText } from './HomepageEditor';
import { CheckCircle2 } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { REGISTER_PATH, useDashboardPath } from './useHomeSession';
import type { SiteSettings } from '../siteSettings';

const ITEMS = [
  'prepare.1',
  'prepare.2',
  'prepare.3',
  'prepare.4',
  'prepare.5',
  'prepare.6',
];

export function PrepareSection({ settings }: { settings: SiteSettings }) {
  const dashboardPath = useDashboardPath();
  return (
    <SectionShell
      title={<HomeText contentKey="prepare.7" />}
      description={<HomeText contentKey="prepare.8" />}
      tone="muted"
    >
      <div className="mx-auto max-w-3xl">
        <ul className="grid gap-3 sm:grid-cols-2">
          {ITEMS.map((contentKey, index) => (
            <li key={index} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span><HomeText contentKey={contentKey} /></span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400"><HomeText contentKey="prepare.9" /></p>
        <div className="mt-8 text-center">
          <Link
            href={dashboardPath ?? REGISTER_PATH}
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ backgroundColor: settings.primaryColor }}
          ><HomeText contentKey="prepare.10" /></Link>
        </div>
      </div>
    </SectionShell>
  );
}
