'use client';

import { useSyncExternalStore } from 'react';
import { dashboardPathForRole } from '../dashboardPath';

const subscribe = () => () => undefined;

// Chemin de l'espace personnel si une session est active dans ce navigateur, sinon null.
export function useDashboardPath(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem('auth_token') ? dashboardPathForRole(sessionStorage.getItem('user_role')) : null;
      } catch {
        return null;
      }
    },
    () => null,
  );
}

export const REGISTER_PATH = '/login?mode=register';
export const LOGIN_PATH = '/login';
export const NAV_LINKS = [
  { href: '/#accueil', label: 'Accueil' },
  { href: '/#bourse', label: 'La bourse' },
  { href: '/#etapes', label: 'Comment ça marche ?' },
  { href: '/#etablissements', label: 'Établissements' },
  { href: '/#faq', label: 'FAQ' },
];
