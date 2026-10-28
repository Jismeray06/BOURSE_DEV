import { request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { accounts, API } from './tests/helpers';

// Une seule connexion par rôle pour toute la suite : la connexion est limitée à 30 essais / 15 min / IP.
export default async function globalSetup() {
  const api = await request.newContext();
  const out: Record<string, { token: string; user: unknown }> = {};
  for (const [role, creds] of Object.entries(accounts)) {
    const r = await api.post(`${API}/auth/login`, { data: creds });
    if (![200, 201].includes(r.status())) throw new Error(`Connexion ${role} impossible (${r.status()}) : base de test absente ou limite de débit atteinte.`);
    const body = await r.json();
    out[role] = { token: body.accessToken, user: body.user };
  }
  mkdirSync('.cache', { recursive: true });
  writeFileSync('.cache/sessions.json', JSON.stringify(out));
}
