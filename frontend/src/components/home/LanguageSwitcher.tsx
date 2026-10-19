'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useHomeEdit } from './HomepageEditor';
import { ensureLanguageLoaded, LANGUAGES, setLanguage, useLanguage } from './language';
import { ui } from './translate';

// Sélecteur de langue de la page d'accueil (français, anglais, malgache), placé à côté de la recherche.
// Masqué en mode personnalisation : l'administrateur modifie toujours les textes en français.
export function LanguageSwitcher() {
  const language = useLanguage();
  const { editMode } = useHomeEdit();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureLanguageLoaded(); }, []);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (editMode) return null;
  const current = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];
  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ui('language.label', language)}
        className="flex items-center gap-1.5 rounded-lg p-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <Globe className="h-5 w-5" aria-hidden />
        <span>{current.short}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={ui('language.label', language)} className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl">
          {LANGUAGES.map((item) => (
            <li key={item.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={item.code === language}
                onClick={() => { setLanguage(item.code); setOpen(false); }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-100"
              >
                <span>{item.label}</span>
                {item.code === language && <Check className="h-4 w-4 text-blue-600" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
