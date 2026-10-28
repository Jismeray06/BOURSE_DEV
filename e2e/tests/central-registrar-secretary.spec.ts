import { expect, test } from '@playwright/test';
import { API, bearer, login, newApi } from './helpers';

// Secrétaire de la scolarité : créé par le responsable de la scolarité centrale, il traite les dossiers
// mais ne gère ni les comptes ni les pièces demandées aux étudiants.
test.describe('Secrétaires de la scolarité centrale', () => {
  const email = `secretaire-scol-${Date.now()}@example.com`;
  const password = 'Secretaire-2026!';
  let secretaryId = '';

  test('le responsable crée un secrétaire ; doublon et mot de passe courant refusés', async () => {
    const api = await newApi();
    const { token } = await login(api, 'scol');
    const created = await api.post(`${API}/scolarite/secretaries`, { headers: bearer(token), data: { fullName: 'Secrétaire Scolarité Test', email, password } });
    expect([200, 201]).toContain(created.status());
    const body = await created.json();
    expect(body.role).toBe('SECRETAIRE_SCOLARITE');
    secretaryId = body.id;

    const duplicate = await api.post(`${API}/scolarite/secretaries`, { headers: bearer(token), data: { fullName: 'Doublon', email, password } });
    expect(duplicate.status()).toBe(409);

    const weak = await api.post(`${API}/scolarite/secretaries`, { headers: bearer(token), data: { fullName: 'Faible', email: `faible-${Date.now()}@example.com`, password: 'password123' } });
    expect(weak.status()).toBe(400);

    const list = await (await api.get(`${API}/scolarite/secretaries`, { headers: bearer(token) })).text();
    expect(list).toContain(email);
  });

  test('le secrétaire traite les dossiers mais n’accède ni aux comptes ni aux pièces demandées', async () => {
    const api = await newApi();
    const session = await api.post(`${API}/auth/login`, { data: { email, password } });
    expect([200, 201]).toContain(session.status());
    const { accessToken, user } = await session.json();
    expect(user.role).toBe('SECRETAIRE_SCOLARITE');

    expect((await api.get(`${API}/scolarite/applications`, { headers: bearer(accessToken) })).status()).toBe(200);
    expect((await api.get(`${API}/scolarite/secretaries`, { headers: bearer(accessToken) })).status()).toBe(401);
    expect((await api.post(`${API}/scolarite/secretaries`, { headers: bearer(accessToken), data: { fullName: 'X', email: `x-${Date.now()}@example.com`, password: 'Autre-2026!' } })).status()).toBe(401);
    expect((await api.post(`${API}/scolarite/document-requirements`, { headers: bearer(accessToken), data: { establishment: '*', label: 'Pièce test' } })).status()).toBe(401);
    expect((await api.put(`${API}/scolarite/document-requirements-mode`, { headers: bearer(accessToken), data: { uniform: true } })).status()).toBe(401);
  });

  test('un étudiant ou un responsable d’établissement ne gère pas ces comptes', async () => {
    const api = await newApi();
    for (const role of ['student', 'manager'] as const) {
      const { token } = await login(api, role);
      expect((await api.get(`${API}/scolarite/secretaries`, { headers: bearer(token) })).status(), role).toBe(401);
      expect((await api.post(`${API}/scolarite/secretaries`, { headers: bearer(token), data: { fullName: 'X', email: `y-${Date.now()}@example.com`, password: 'Autre-2026!' } })).status(), role).toBe(401);
    }
  });

  test('un secrétaire désactivé ne peut plus se connecter', async () => {
    const api = await newApi();
    const { token } = await login(api, 'scol');
    const off = await api.patch(`${API}/scolarite/secretaries/${secretaryId}/status`, { headers: bearer(token), data: { active: false } });
    expect(off.status()).toBe(200);
    const denied = await api.post(`${API}/auth/login`, { data: { email, password } });
    expect(denied.status()).toBe(401);
  });
});
