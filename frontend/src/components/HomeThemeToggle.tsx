'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

// Thème clair/sombre des pages publiques (accueil, connexion), mémorisé dans le navigateur.
const THEME_EVENT = 'home-theme-change';

const subscribeTheme = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

const readDarkMode = () => {
  try {
    const saved = localStorage.getItem('home_theme');
    if (saved) return saved === 'dark';
  } catch { /* stockage indisponible */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export function useHomeTheme() {
  const darkMode = useSyncExternalStore(subscribeTheme, readDarkMode, () => false);
  const toggleTheme = () => {
    try { localStorage.setItem('home_theme', darkMode ? 'light' : 'dark'); } catch { /* stockage indisponible */ }
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return { darkMode, toggleTheme };
}

export function HomeThemeToggle({ darkMode, onToggle, className = '' }: { darkMode: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={darkMode ? 'Mode clair' : 'Mode sombre'}
      className={`p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer ${className}`}
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
