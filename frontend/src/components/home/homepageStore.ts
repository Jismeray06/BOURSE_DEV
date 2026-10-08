'use client';

import { useSyncExternalStore } from 'react';
import defaults from './homepage-defaults.json';

// Contenu personnalisable de la page d'accueil (textes + actualités), partagé par toutes les pages publiques
// qui affichent la barre de navigation ou le pied de page. Les textes d'origine (homepage-defaults.json) servent
// de valeur de repli : la page reste complète si l'API est indisponible.
export type HomeNews = { id: string; title: string; body: string; publishedAt: string };
type HomepageState = { content: Record<string, string>; news: HomeNews[] };
type HomepagePayload = { content?: Record<string, string>; news?: HomeNews[] };

export const defaultContent: Record<string, string> = defaults;
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const CACHE_KEY = 'home_content_cache';
let state: HomepageState = { content: defaultContent, news: [] };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const getState = () => state;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function setHomepageContent(payload: HomepagePayload) {
  state = { content: { ...defaultContent, ...payload.content }, news: payload.news ?? state.news };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ content: payload.content ?? {}, news: state.news })); } catch { /* stockage indisponible */ }
  listeners.forEach((listener) => listener());
}

// Charge le contenu une seule fois par visite. Le dernier contenu connu est réaffiché immédiatement
// (évite de voir brièvement les textes d'origine avant ceux modifiés par l'administrateur).
export function ensureHomepageLoaded() {
  if (loading) return;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as HomepagePayload;
      state = { content: { ...defaultContent, ...parsed.content }, news: parsed.news ?? [] };
      listeners.forEach((listener) => listener());
    }
  } catch { /* cache absent ou illisible */ }
  loading = fetch(`${apiUrl}/homepage`)
    .then((response) => (response.ok ? (response.json() as Promise<HomepagePayload>) : null))
    .then((payload) => { if (payload) setHomepageContent(payload); })
    .catch(() => undefined);
}

export function useHomepageContent() {
  return useSyncExternalStore(subscribe, getState, getState);
}
