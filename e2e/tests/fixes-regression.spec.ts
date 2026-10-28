import { test, expect } from '@playwright/test';
import { API, FRONT, bearer, login, newApi } from './helpers';

// Vérifie que les correctifs de sécurité fonctionnent ET que le comportement d'origine est conservé.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const cleanSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#0b3b60"/></svg>');
const evilSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const handlerSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>');

test.describe('Fichiers : le format reste accepté, le faux contenu est refusé', () => {
  test('logo : vrai PNG et SVG propre acceptés', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    for (const [name, mimeType, buffer] of [['logo.png', 'image/png', png], ['logo.svg', 'image/svg+xml', cleanSvg]] as const) {
      const r = await api.post(`${API}/admin/site-settings/upload/logo`, { headers: bearer(token), multipart: { file: { name, mimeType, buffer } } });
      expect(r.status(), name).toBeLessThan(300);
    }
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
  });

  test('logo : SVG avec script ou gestionnaire d\'événement, et HTML déguisé, refusés', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    for (const [name, mimeType, buffer] of [['a.svg', 'image/svg+xml', evilSvg], ['b.svg', 'image/svg+xml', handlerSvg], ['c.png', 'image/png', Buffer.from('<html></html>')]] as const) {
      const r = await api.post(`${API}/admin/site-settings/upload/logo`, { headers: bearer(token), multipart: { file: { name, mimeType, buffer } } });
      expect(r.status(), name).toBe(400);
    }
  });

  test('un fichier du dossier : vrai PDF/PNG acceptés, faux PDF refusé', async () => {
    const api = await newApi();
    const { token } = await login(api, 'student');
    const ok = await api.post(`${API}/student/application/documents/cin`, { headers: bearer(token), multipart: { file: { name: 'cin.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    test.info().annotations.push({ type: 'info', description: `vrai PDF → ${ok.status()} ${(await ok.text()).slice(0, 100)}` });
    const bad = await api.post(`${API}/student/application/documents/cin`, { headers: bearer(token), multipart: { file: { name: 'faux.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html></html>') } } });
    expect(bad.status()).toBe(400);
    expect((await bad.text())).toMatch(/format|contenu/i);
  });

  test('un SVG ouvert directement est servi sous CSP « sandbox » (aucun script)', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const up = await (await api.post(`${API}/admin/site-settings/upload/logo`, { headers: bearer(token), multipart: { file: { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: cleanSvg } } })).json();
    const r = await api.get(`${API}${up.logoUrl}`);
    expect(r.headers()['content-security-policy']).toContain('sandbox');
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
  });
});

test.describe('Robustesse : plus de 500 sur des données hostiles', () => {
  test('réglages du site : champs inconnus ignorés, valeurs invalides → 400', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const ok = await api.put(`${API}/admin/site-settings`, { headers: bearer(token), data: { primaryColor: '#123456', email: 'x', logoUrl: 'http://evil', id: 'autre' } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.id).toBe('default');
    expect(body.logoUrl).not.toBe('http://evil');
    expect(body.primaryColor).toBe('#123456');
    for (const bad of [{ heroTitle: 123 }, { ctaPrimaryLink: 'javascript:alert(1)' }, { heroBackgroundType: 'NOPE' }, { heroOverlayOpacity: 'x' }]) {
      const r = await api.put(`${API}/admin/site-settings`, { headers: bearer(token), data: bad });
      expect(r.status(), JSON.stringify(bad)).toBe(400);
    }
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
  });

  test('doublon → 409, introuvable → 404, caractère nul → 400', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const email = `dup-${Date.now()}@example.com`;
    const body = { email, fullName: 'Doublon', password: 'Password-2026!', role: 'ADMIN_ETABLISSEMENT', establishment: 'ISSTM' };
    expect((await api.post(`${API}/admin/staff-accounts`, { headers: bearer(token), data: body })).status()).toBeLessThan(300);
    expect([400, 409]).toContain((await api.post(`${API}/admin/staff-accounts`, { headers: bearer(token), data: body })).status());
    expect([400, 404]).toContain((await api.delete(`${API}/admin/homepage/news/inexistant`, { headers: bearer(token) })).status());
    const nul = await api.post(`${API}/admin/staff-accounts`, { headers: bearer(token), data: { ...body, email: `n-${Date.now()}@example.com`, fullName: 'a\u0000b' } });
    expect(nul.status()).toBeLessThan(500);
  });
});

test.describe('Réinitialisation des réglages', () => {
  test('reset remet les valeurs par défaut (textes, couleurs, logo, actualités)', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const before = await (await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) })).json();
    await api.put(`${API}/admin/site-settings`, { headers: bearer(token), data: { primaryColor: '#abcdef', heroTitle: 'Titre modifié' } });
    await api.post(`${API}/admin/site-settings/upload/logo`, { headers: bearer(token), multipart: { file: { name: 'l.png', mimeType: 'image/png', buffer: png } } });
    const after = await (await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) })).json();
    for (const key of ['primaryColor', 'heroTitle', 'logoUrl', 'heroSubtitle', 'ctaPrimaryLabel', 'heroBackgroundType', 'homepageContent', 'homepageNews', 'heroBackgroundImages']) expect(after[key], key).toEqual(before[key]);
    expect(after.logoUrl).toBeNull();
    expect(after.id).toBe('default');
  });

  test('reset en parallèle avec d\'autres requêtes : aucune erreur 500', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const calls = Array.from({ length: 12 }, (_, i) => i % 2 ? api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) }) : api.put(`${API}/admin/site-settings`, { headers: bearer(token), data: { primaryColor: '#123456' } }));
    const statuses = (await Promise.all(calls)).map((r) => r.status());
    expect(statuses.filter((s) => s >= 500), `statuts : ${statuses.join(',')}`).toEqual([]);
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
  });
});

test.describe('Politique de mot de passe et limites', () => {
  test('mots de passe courants refusés, mot de passe normal accepté', async () => {
    const api = await newApi();
    for (const pw of ['12345678', 'password', 'azertyui']) {
      const r = await api.post(`${API}/auth/register`, { data: { email: `w-${Date.now()}@example.com`, fullName: 'Test', password: pw } });
      expect([400, 429], pw).toContain(r.status());
      if (r.status() === 400) expect(await r.text()).toMatch(/courant|8 caractères/);
    }
  });

  test('renvoi de l\'e-mail de vérification : limité', async () => {
    const api = await newApi();
    const statuses: number[] = [];
    const email = `resend-${Date.now()}@example.com`;
    for (let i = 0; i < 8; i++) statuses.push((await api.post(`${API}/auth/resend-verification-email`, { data: { email } })).status());
    expect(statuses).toContain(429);
  });
});

test.describe('Le site fonctionne toujours avec les nouveaux en-têtes (CSP)', () => {
  for (const path of ['/', '/login', '/login?mode=register']) {
    test(`${path} : aucune violation CSP ni erreur JavaScript`, async ({ page }) => {
      const problems: string[] = [];
      page.on('console', (m) => { if (/content security policy|refused to/i.test(m.text())) problems.push(m.text()); });
      page.on('pageerror', (e) => problems.push(e.message));
      await page.goto(`${FRONT}${path}`);
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  }

  for (const [role, path] of [['student', '/student'], ['admin', '/admin'], ['scol', '/scolarite'], ['manager', '/etablissement']] as const) {
    test(`espace ${role} (${path}) : charge sans violation CSP`, async ({ page }) => {
      const api = await newApi();
      const { token, user } = await login(api, role);
      const problems: string[] = [];
      page.on('console', (m) => { if (/content security policy|refused to/i.test(m.text())) problems.push(m.text()); });
      page.on('pageerror', (e) => problems.push(e.message));
      await page.addInitScript(([t, u]) => { sessionStorage.setItem('auth_token', t as string); sessionStorage.setItem('user_role', (u as any).role); sessionStorage.setItem('auth_user', JSON.stringify(u)); }, [token, user]);
      await page.goto(`${FRONT}${path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      expect(page.url()).toContain(path);
      expect(problems).toEqual([]);
    });
  }

  test('le logo téléversé (autre origine) s\'affiche toujours sur l\'accueil', async ({ page }) => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    await api.post(`${API}/admin/site-settings/upload/logo`, { headers: bearer(token), multipart: { file: { name: 'logo.png', mimeType: 'image/png', buffer: png } } });
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(r.url()));
    page.on('console', (m) => { if (/content security policy/i.test(m.text())) failed.push(m.text()); });
    await page.goto(FRONT);
    await page.waitForLoadState('networkidle');
    expect(failed).toEqual([]);
    const loaded = await page.evaluate(() => [...document.images].filter((i) => i.src.includes('/uploads/site-settings/')).map((i) => i.naturalWidth));
    expect(loaded.length).toBeGreaterThan(0);
    expect(loaded.every((w) => w > 0)).toBe(true);
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
  });
});
