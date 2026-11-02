'use client';

import { useSyncExternalStore } from 'react';
import { SESSION_EVENT } from '../auth/authSession';
import { dashboardPathForRole } from '../panels/dashboardPath';
import { useHomeEdit } from './HomepageEditor';

// La session peut changer sans rechargement (retrouvée auprès d'un autre onglet, connexion ou déconnexion ailleurs).
const subscribe = (onChange: () => void) => {
  window.addEventListener(SESSION_EVENT, onChange);
  return () => window.removeEventListener(SESSION_EVENT, onChange);
};

// Chemin de l'espace personnel si une session est active dans ce navigateur, sinon null.
export function useDashboardPath(): string | null {
  const { editMode, previewLoggedIn } = useHomeEdit();
  const path = useSyncExternalStore(
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
  // En mode personnalisation, l'administrateur (connecté) voit par défaut la page telle que la voit un visiteur.
  return editMode && !previewLoggedIn ? null : path;
}

export const REGISTER_PATH = '/login?mode=register';
export const LOGIN_PATH = '/login';
export const NAV_LINKS = [
  { href: '/#accueil', contentKey: 'nav.home' },
  { href: '/#etablissements', contentKey: 'nav.establishments' },
  { href: '/#faq', contentKey: 'nav.faq' },
];
