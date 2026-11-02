'use client';

import { useCallback, useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PROFILE_EVENT = 'profile-changed';

export type Profile = { fullName: string; email: string; avatarUrl: string | null };

// Prévient les composants affichés (en-tête, page « Mon compte ») que le profil a changé.
export const notifyProfileChanged = () => window.dispatchEvent(new Event(PROFILE_EVENT));

export const avatarSrc = (url: string | null | undefined) => (url ? `${apiUrl}${url}` : null);

// Profil de l'utilisateur connecté (nom, e-mail, photo), rechargé quand il est modifié.
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(() => {
    void fetch(`${apiUrl}/account/me`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` } })
      .then((response) => (response.ok ? (response.json() as Promise<Partial<Profile>>) : null))
      .then((data) => { if (data) setProfile({ fullName: String(data.fullName ?? ''), email: String(data.email ?? ''), avatarUrl: data.avatarUrl ?? null }); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(PROFILE_EVENT, load);
    return () => window.removeEventListener(PROFILE_EVENT, load);
  }, [load]);

  return profile;
}
