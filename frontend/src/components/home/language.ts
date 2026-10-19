'use client';

import { useSyncExternalStore } from 'react';

// Langue de la page d'accueil (français par défaut), mémorisée dans le navigateur.
export type Language = 'fr' | 'en' | 'mg';

export const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'mg', label: 'Malagasy', short: 'MG' },
];

const STORAGE_KEY = 'home_language';
const isLanguage = (value: string | null): value is Language => LANGUAGES.some((language) => language.code === value);

let current: Language = 'fr';
let loaded = false;
const listeners = new Set<() => void>();

const notify = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

// Lit la langue mémorisée une seule fois, après l'affichage initial (évite un écart avec le rendu serveur).
export function ensureLanguageLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved) && saved !== current) {
      current = saved;
      notify();
    }
  } catch { /* stockage indisponible */ }
}

export function setLanguage(language: Language) {
  current = language;
  loaded = true;
  try { localStorage.setItem(STORAGE_KEY, language); } catch { /* stockage indisponible */ }
  notify();
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, () => current, () => 'fr');
}
