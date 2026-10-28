import { test, expect } from '@playwright/test';
import { API, bearer, login, newApi, FRONT } from './helpers';

// A01:2021 – Contrôle d'accès défaillant
const protectedRoutes: [string, string][] = [
  ['GET', '/admin/students'], ['GET', '/admin/staff-accounts'], ['GET', '/admin/establishments'], ['GET', '/admin/homepage'],
  ['GET', '/establishment/isstm/students'], ['GET', '/scolarite/applications'], ['GET', '/scolarite/document-requirements'],
  ['GET', '/student/application'], ['GET', '/student/profile'], ['GET', '/student/application/documents'],
  ['GET', '/account/me'], ['GET', '/notifications'],
];

test.describe('A01 – sans authentification', () => {
  for (const [method, path] of protectedRoutes) {
    test(`${method} ${path} → 401`, async () => {
      const api = await newApi();
      const r = await api.fetch(`${API}${path}`, { method });
      expect(r.status()).toBe(401);
    });
  }

  test('écritures sensibles sans jeton → 401', async () => {
    const api = await newApi();
    for (const [method, path] of [
      ['PUT', '/admin/site-settings'], ['PATCH', '/admin/homepage/content'], ['POST', '/admin/staff-accounts'],
      ['PATCH', '/scolarite/applications/x/decision'], ['POST', '/establishment/isstm/quitus/generate'], ['DELETE', '/admin/staff-accounts/x'],
    ]) {
      const r = await api.fetch(`${API}${path}`, { method, data: {} });
      expect([401, 403], `${method} ${path}`).toContain(r.status());
    }
  });

  test('jeton falsifié ou aléatoire → 401', async () => {
    const api = await newApi();
    for (const token of ['abc', 'a.b.c', 'null', '']) {
      const r = await api.get(`${API}/account/me`, { headers: bearer(token) });
      expect(r.status(), `jeton « ${token} »`).toBe(401);
    }
  });
});

test.describe('A01 – élévation horizontale/verticale de privilèges', () => {
  test('un étudiant ne peut pas appeler les routes admin / établissement / scolarité', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    for (const path of ['/admin/students', '/admin/staff-accounts', '/admin/homepage', '/establishment/isstm/students', '/scolarite/applications', '/scolarite/document-requirements']) {
      const r = await api.get(`${API}${path}`, { headers: bearer(token) });
      expect([401, 403], `étudiant → GET ${path} (reçu ${r.status()})`).toContain(r.status());
    }
  });

  test('un étudiant ne peut pas modifier le site ni créer un compte personnel', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const a = await api.post(`${API}/admin/staff-accounts`, { headers: bearer(token), data: { email: 'x@y.z', fullName: 'x', password: 'Password-2026!', role: 'ADMIN' } });
    expect([401, 403]).toContain(a.status());
    const b = await api.patch(`${API}/admin/homepage/content`, { headers: bearer(token), data: { values: {} } });
    expect([401, 403]).toContain(b.status());
  });

  test('le personnel de scolarité ne peut pas accéder à l\'administration', async () => {
    const api = await newApi();
    const { token } = await login(api, 'scol');
    for (const path of ['/admin/staff-accounts', '/admin/homepage', '/establishment/isstm/students']) {
      const r = await api.get(`${API}${path}`, { headers: bearer(token) });
      expect([401, 403], `scolarité → GET ${path} (reçu ${r.status()})`).toContain(r.status());
    }
  });

  test('un administrateur d\'établissement ne peut pas gérer les comptes du personnel', async () => {
    const api = await newApi();
    const { token } = await login(api, 'manager');
    for (const path of ['/admin/staff-accounts', '/admin/students', '/scolarite/applications']) {
      const r = await api.get(`${API}${path}`, { headers: bearer(token) });
      expect([401, 403], `responsable → GET ${path} (reçu ${r.status()})`).toContain(r.status());
    }
  });

  test('IDOR : un étudiant ne lit pas le fichier ou le dossier d\'un autre', async () => {
    const api = await newApi();
    const admin = await login(api, 'admin');
    const students = await (await api.get(`${API}/admin/students`, { headers: bearer(admin.token) })).json();
    const list = Array.isArray(students) ? students : students.students ?? [];
    expect(list.length).toBeGreaterThan(1);
    const other = list.find((s: any) => s.email !== 'aina.rabearisoa@isstm.mg') ?? list[0];
    const { token } = await login(api, 'student');
    const r = await api.get(`${API}/admin/students/${other.id}/dossier`, { headers: bearer(token) });
    expect([401, 403]).toContain(r.status());
    const f = await api.get(`${API}/documents/00000000-0000-0000-0000-000000000000/file`, { headers: bearer(token) });
    expect([400, 403, 404], `fichier inconnu (reçu ${f.status()})`).toContain(f.status());
  });

  test('mass assignment : l\'étudiant ne peut pas s\'attribuer un statut ou un rôle', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const put = await api.put(`${API}/student/application`, { headers: bearer(token), data: { status: 'VALIDE', role: 'ADMIN', userId: 'x', decision: 'VALIDE' } });
    const me = await (await api.get(`${API}/account/me`, { headers: bearer(token) })).json();
    expect(JSON.stringify(me)).not.toContain('"role":"ADMIN"');
    const app = await (await api.get(`${API}/student/application`, { headers: bearer(token) })).text();
    expect(app).not.toMatch(/"status":"(VALIDE|VALIDEE|ACCEPTE)"/);
    expect(put.status()).toBeLessThan(500);
  });

  test('inscription publique : impossible de choisir son rôle', async () => {
    const api = await newApi();
    const email = `pw-${Date.now()}@example.com`;
    const r = await api.post(`${API}/auth/register`, { data: { email, fullName: 'Pirate', password: 'Password-2026!', role: 'ADMIN' } });
    expect(r.status()).toBeLessThan(500);
    const admin = await login(api, 'admin');
    const accounts = JSON.stringify(await (await api.get(`${API}/admin/staff-accounts`, { headers: bearer(admin.token) })).json());
    expect(accounts).not.toContain(email);
  });
});

test.describe('A01 – interface', () => {
  for (const path of ['/admin', '/etablissement', '/scolarite', '/student']) {
    test(`${path} sans session redirige vers /login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL('**/login**', { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });
  }

  test('un étudiant connecté qui ouvre /admin n\'obtient pas l\'interface admin', async ({ page }) => {
    const api = await newApi();
    const { token, user } = await login(api, 'student');
    await page.addInitScript(([t, u]) => {
      sessionStorage.setItem('auth_token', t as string); sessionStorage.setItem('user_role', (u as any).role); sessionStorage.setItem('auth_user', JSON.stringify(u));
    }, [token, user]);
    await page.goto(`${FRONT}/admin`);
    await page.waitForTimeout(2500);
    const html = await page.content();
    expect(html).not.toMatch(/Comptes du personnel|Journal d.audit/i);
  });

  test('chemins sensibles non exposés par le frontend', async ({ request }) => {
    for (const p of ['/.env', '/.git/config', '/package.json', '/backend/.env', '/uploads/documents/']) {
      const r = await request.get(`${FRONT}${p}`);
      expect([404, 403], `${p} → ${r.status()}`).toContain(r.status());
    }
  });
});
