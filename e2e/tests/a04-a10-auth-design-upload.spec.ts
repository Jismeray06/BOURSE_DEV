import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API, FRONT, bearer, login, newApi } from './helpers';

// A04:2021 – Conception non sécurisée
test.describe('A04 – conception', () => {
  test('limitation de débit sur la connexion (échecs répétés → 429)', async () => {
    const api = await newApi();
    const email = `brute-${Date.now()}@example.com`;
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) statuses.push((await api.post(`${API}/auth/login`, { data: { email, password: `mauvais-${i}` } })).status());
    expect(statuses, `statuts : ${statuses.join(',')}`).toContain(429);
  });

  test('limitation de débit sur le renvoi d\'e-mail de vérification', async () => {
    const api = await newApi();
    const statuses: number[] = [];
    for (let i = 0; i < 15; i++) statuses.push((await api.post(`${API}/auth/resend-verification-email`, { data: { email: 'aina.rabearisoa@isstm.mg' } })).status());
    expect.soft(statuses, `Aucune limite (statuts : ${[...new Set(statuses)].join(',')}) – risque de spam d'e-mails`).toContain(429);
  });

  test('limitation de débit sur la vérification de quitus', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const statuses: number[] = [];
    for (let i = 0; i < 35; i++) statuses.push((await api.post(`${API}/quitus/verify`, { headers: bearer(token), data: { code: `ZZ-${i}`, establishment: 'ISSTM' } })).status());
    expect(statuses, `statuts : ${statuses.join(",")}`).toContain(429);
  });
});

// A07:2021 – Identification et authentification
test.describe('A07 – authentification', () => {
  test('message identique pour e-mail inconnu et mot de passe erroné (énumération)', async () => {
    const api = await newApi();
    const a = await api.post(`${API}/auth/login`, { data: { email: 'inconnu@example.com', password: 'Whatever-2026!' } });
    const b = await api.post(`${API}/auth/login`, { data: { email: 'manager.test@example.com', password: 'Whatever-2026!' } });
    expect((await a.json()).message).toBe((await b.json()).message);
  });

  test('inscription : mots de passe faibles refusés', async () => {
    const api = await newApi();
    const accepted: string[] = [];
    for (const pw of ['12345678', 'password', 'aaaaaaaa', 'azertyui']) {
      const r = await api.post(`${API}/auth/register`, { data: { email: `weak-${Date.now()}-${pw}@example.com`, fullName: 'Test', password: pw } });
      if (r.status() < 300) accepted.push(pw);
    }
    expect.soft(accepted, `mots de passe courants acceptés : ${accepted.join(', ')}`).toEqual([]);
  });

  test('inscription avec e-mail existant : pas de fuite d\'existence', async () => {
    const api = await newApi();
    const r = await api.post(`${API}/auth/register`, { data: { email: 'manager.test@example.com', fullName: 'Doublon', password: 'Password-2026!' } });
    const text = await r.text();
    expect.soft(text, 'le message révèle que l\'e-mail existe (énumération de comptes)').not.toMatch(/déjà|existe|utilisé/i);
  });

  test('jeton : modification du rôle ou de la signature rejetée', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const [payload, sig] = token.split('.');
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const forged = Buffer.from(JSON.stringify({ ...body, role: 'ADMIN' })).toString('base64url');
    for (const t of [`${forged}.${sig}`, `${payload}.${sig.slice(0, -2)}xx`, `${forged}.`, `${forged}.${createHmac('sha256', 'devine').update(forged).digest('base64url')}`,
      `${Buffer.from(JSON.stringify({ ...body, role: 'ADMIN', exp: 9999999999 })).toString('base64url')}.${createHmac('sha256', 'development-only-secret-change-before-production').update(forged).digest('base64url')}`]) {
      const r = await api.get(`${API}/admin/staff-accounts`, { headers: bearer(t) });
      expect([401, 403]).toContain(r.status());
    }
  });

  test('jeton expiré rejeté', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const [payload, sig] = token.split('.');
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const old = Buffer.from(JSON.stringify({ ...body, exp: 1 })).toString('base64url');
    const r = await api.get(`${API}/account/me`, { headers: bearer(`${old}.${sig}`) });
    expect(r.status()).toBe(401);
  });

  test('le jeton n\'est pas stocké dans localStorage ni dans un cookie lisible', async ({ page }) => {
    await page.goto(`${FRONT}/login`);
    await page.getByPlaceholder('Adresse e-mail').fill('aina.rabearisoa@isstm.mg');
    await page.getByPlaceholder('Mot de passe').first().fill('StudentTest-2026!');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/student**', { timeout: 15_000 });
    const local = await page.evaluate(() => JSON.stringify(localStorage));
    expect(local).not.toMatch(/auth_token|accessToken/);
    const session = await page.evaluate(() => Object.keys(sessionStorage));
    test.info().annotations.push({ type: 'constat', description: `Jeton dans sessionStorage (lisible par tout script) : ${session.includes('auth_token')}` });
    await page.context().clearCookies();
  });

  test('déconnexion : le jeton reste-t-il valide côté serveur ? (information S-02)', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const r = await api.get(`${API}/account/me`, { headers: bearer(token) });
    test.info().annotations.push({ type: 'constat', description: 'Pas de route de déconnexion/révocation : un jeton volé reste valide jusqu\'à expiration.' });
    expect(r.status()).toBe(200);
  });
});

// A08:2021 – Intégrité des données et du logiciel / téléversements
test.describe('A08 – téléversements de fichiers', () => {
  const html = Buffer.from('<html><script>alert(1)</script></html>');
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>');

  test('avatar : HTML déguisé en PNG refusé', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const r = await api.post(`${API}/account/avatar`, { headers: bearer(token), multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: html } } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('logo du site (admin) : SVG avec script / HTML déguisé refusé', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const results: string[] = [];
    for (const [name, type, buffer] of [['x.png', 'image/png', html], ['x.svg', 'image/svg+xml', svg], ['x.html', 'text/html', html]] as const) {
      const r = await api.post(`${API}/admin/site-settings/upload/logo`, { headers: bearer(token), multipart: { file: { name, mimeType: type, buffer } } });
      if (r.status() < 300) results.push(`${name} (${type}) accepté`);
    }
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
    expect.soft(results, `fichiers non conformes acceptés (S-05) : ${results.join(' ; ')}`).toEqual([]);
  });

  test('pièce de dossier étudiant : exécutable / HTML refusé, PDF contrefait signalé', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const types = await (await api.get(`${API}/student/application/documents`, { headers: bearer(token) })).text();
    const accepted: string[] = [];
    for (const [name, type, buffer] of [['a.exe', 'application/x-msdownload', Buffer.from('MZ')], ['a.html', 'text/html', html], ['faux.pdf', 'application/pdf', html]] as const) {
      const r = await api.post(`${API}/student/application/documents/CIN`, { headers: bearer(token), multipart: { file: { name, mimeType: type, buffer } } });
      if (r.status() < 300) accepted.push(`${name}`);
    }
    expect.soft(accepted, `fichiers acceptés alors que le contenu n'est pas du PDF/image : ${accepted.join(', ')} (S-05) ; liste=${types.slice(0, 60)}`).toEqual([]);
  });

  test('fichier trop volumineux refusé', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const r = await api.post(`${API}/account/avatar`, { headers: bearer(token), multipart: { file: { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024, 1) } } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });
});

// A09:2021 – Journalisation et surveillance
test.describe('A09 – journalisation', () => {
  test('les actions admin sensibles laissent une trace dans le journal d\'audit', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const email = `audit-${Date.now()}@example.com`;
    const created = await api.post(`${API}/admin/staff-accounts`, { headers: bearer(token), data: { email, fullName: 'Audit Test', password: 'Password-2026!', role: 'ADMIN_ETABLISSEMENT', establishment: 'ISSTM' } });
    test.info().annotations.push({ type: 'info', description: `création compte → ${created.status()}` });
    const text = await (await api.get(`${API}/admin/staff-accounts`, { headers: bearer(token) })).text();
    expect(text).toContain(email);
    const audit = await (await api.get(`${API}/admin/audit-log`, { headers: bearer(token) })).text();
    expect(audit, 'la création d\'un compte du personnel doit figurer au journal d\'audit').toContain('STAFF_ACCOUNT_CREATED');
    expect(audit).toContain('Audit Test');
  });
});

// A10:2021 – SSRF
test.describe('A10 – SSRF', () => {
  test('aucun paramètre d\'URL sortante n\'est accepté (redirection OAuth, images)', async ({ request }) => {
    const r = await request.get(`${API}/auth/google?redirect=http://169.254.169.254/&url=http://localhost:5432`, { maxRedirects: 0 });
    const loc = r.headers()['location'] ?? '';
    expect(loc).not.toMatch(/169\.254|localhost:5432/);
  });
});
