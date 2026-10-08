'use client';

import { ChevronDown } from 'lucide-react';
import { HomeText, useContactInfo } from './HomepageEditor';
import { SectionShell } from './SectionShell';

const FAQ = [
  { q: <HomeText contentKey="faq.1" />, a: <HomeText contentKey="faq.2" /> },
  { q: <HomeText contentKey="faq.3" />, a: <HomeText contentKey="faq.4" /> },
  { q: <HomeText contentKey="faq.5" />, a: <HomeText contentKey="faq.6" /> },
  { q: <HomeText contentKey="faq.7" />, a: <HomeText contentKey="faq.8" /> },
  { q: <HomeText contentKey="faq.9" />, a: <HomeText contentKey="faq.10" /> },
  { q: <HomeText contentKey="faq.11" />, a: <HomeText contentKey="faq.12" /> },
  { q: <HomeText contentKey="faq.13" />, a: <HomeText contentKey="faq.14" /> },
  { q: <HomeText contentKey="faq.15" />, a: <HomeText contentKey="faq.16" /> },
  { q: <HomeText contentKey="faq.17" />, a: <HomeText contentKey="faq.18" /> },
];

export function FaqSection() {
  const { email } = useContactInfo().scolarite;
  return (
    <SectionShell id="faq" title={<HomeText contentKey="faq.19" />} description={<HomeText contentKey="faq.20" />}>
      <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {FAQ.map((item, index) => (
          <details key={index} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
          </details>
        ))}
      </div>
      {email && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400"><HomeText contentKey="faq.21" />{' '}<a className="underline" href={`mailto:${email}`}>{email}</a>
        </p>
      )}
    </SectionShell>
  );
}
