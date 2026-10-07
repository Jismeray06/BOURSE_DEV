import type { ReactNode } from 'react';

type Props = { id?: string; title: string; description?: ReactNode; tone?: 'white' | 'muted'; children: ReactNode };

// Gabarit commun des sections : titre centré, description facultative, fond blanc ou grisé.
export function SectionShell({ id, title, description, tone = 'white', children }: Props) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 border-b border-slate-200 py-14 dark:border-slate-800 sm:py-16 ${tone === 'muted' ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-950'}`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{title}</h2>
          {description && <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
