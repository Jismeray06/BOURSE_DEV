'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { bootstrapSession, subscribeToSessionChanges } from './authSession';
import { dashboardPathForRole } from '../panels/dashboardPath';

// Espaces réservés aux utilisateurs connectés.
const PROTECTED = ['/admin', '/etablissement', '/scolarite', '/student'];
const inside = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const isProtected = (path: string) => PROTECTED.some((prefix) => inside(path, prefix));
// Pages qui retrouvent la session du navigateur auprès des autres onglets. La page de connexion et les pages ouvertes depuis un lien
// d'e-mail (vérification, mot de passe) n'en font pas partie : elles doivent rester utilisables par un autre compte.
const adoptsSession = (path: string) => isProtected(path) || path === '/' || inside(path, '/confirm-email-change');

// Garde la session cohérente entre les onglets du navigateur (voir authSession.ts) :
//  - un nouvel onglet sur un espace protégé attend d'avoir retrouvé la session avant de s'afficher (sinon il renverrait à la connexion) ;
//  - une connexion avec un autre compte, ou une déconnexion, dans un autre onglet est appliquée ici sans action de l'utilisateur.
export function AuthSessionSync({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(() => !isProtected(pathname));

  useEffect(() => {
    // Hors espaces protégés, la page est déjà affichée (ready dès le départ) : la récupération se fait en arrière-plan.
    let active = true;
    if (adoptsSession(window.location.pathname)) void bootstrapSession().then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeToSessionChanges((change) => {
    const path = window.location.pathname;
    if (change.kind === 'logout') {
      // Page rechargée en entier : aucune donnée de l'ancien compte ne reste à l'écran.
      if (isProtected(path)) window.location.replace('/login');
      return;
    }
    const target = dashboardPathForRole(change.role);
    if (!target) return;
    if (isProtected(path)) {
      if (inside(path, target)) {
        // Même espace : rechargé seulement si c'est un autre compte (le même compte se reconnecte simplement avec un nouveau jeton).
        if (!change.sameAccount) window.location.reload();
      } else {
        window.location.replace(target);
      }
    } else if (path === '/login') {
      window.location.replace(target);
    }
  }), []);

  return ready ? <>{children}</> : null;
}
