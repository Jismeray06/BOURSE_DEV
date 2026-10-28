import { test, expect } from '@playwright/test';
import { API, FRONT, bearer, login, newApi } from './helpers';

// A02:2021 – Défaillances cryptographiques
test.describe('A02 – données sensibles', () => {
  test('aucun hachage de mot de passe ni secret dans les réponses', async () => {
    const api = await newApi();
    const admin = await login(api, 'admin');
    for (const path of ['/account/me', '/admin/staff-accounts', '/admin/students', '/admin/homepage', '/site-settings']) {
      const text = await (await api.get(`${API}${path}`, { headers: bearer(admin.token) })).text();
      expect(text, path).not.toMatch(/passwordHash|"password"|tokenHash|scrypt|secret/i);
    }
  });

  test('la réponse de connexion ne contient pas le hachage', async () => {
    const api = await newApi();
    const r = await api.post(`${API}/auth/login`, { data: { email: 'aina.rabearisoa@isstm.mg', password: 'StudentTest-2026!' } });
    expect([200, 201]).toContain(r.status());
    expect(await r.text()).not.toMatch(/passwordHash|scrypt/i);
  });

  test('le site utilise HTTPS en production : HSTS présent ? (information)', async ({ request }) => {
    const r = await request.get(FRONT);
    test.info().annotations.push({ type: 'info', description: `Strict-Transport-Security: ${r.headers()['strict-transport-security'] ?? 'absent'}` });
  });
});

// A03:2021 – Injection
test.describe('A03 – injection', () => {
  const sqli = ["' OR '1'='1", "admin@x.com'--", "'; DROP TABLE \"User\";--", '" OR ""="'];
  test('injection SQL dans la connexion : jamais 200 ni 500', async () => {
    const api = await newApi();
    for (const payload of sqli) {
      const r = await api.post(`${API}/auth/login`, { data: { email: payload, password: payload } });
      expect([400, 401, 429], `${payload} → ${r.status()}`).toContain(r.status());
    }
  });

  test('injection SQL / NoSQL dans les paramètres de chemin et les corps JSON', async () => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    for (const id of ["1' OR '1'='1", '../../etc/passwd', '%00', '{"$ne":null}']) {
      const r = await api.get(`${API}/admin/students/${encodeURIComponent(id)}/dossier`, { headers: bearer(token) });
      expect(r.status(), `id=${id}`).toBeLessThan(500);
    }
    const r = await api.post(`${API}/auth/login`, { data: { email: { $ne: null }, password: { $ne: null } } });
    expect([400, 401, 429]).toContain(r.status());
  });

  test('traversée de répertoire sur les fichiers statiques et les documents', async ({ request }) => {
    for (const p of ['/uploads/site-settings/../../.env', '/uploads/avatars/..%2f..%2f.env', '/uploads/establishments/%2e%2e/%2e%2e/package.json']) {
      const r = await request.get(`${API}${p}`);
      const body = await r.text();
      expect(body, p).not.toMatch(/DATABASE_URL|AUTH_TOKEN_SECRET|"name": "backend"/);
    }
  });

  test('XSS stocké : un texte d\'accueil contenant du HTML ne s\'exécute pas', async ({ page }) => {
    const api = await newApi();
    const { token } = await login(api, 'admin');
    const current = await (await api.get(`${API}/homepage`)).json();
    const key = Object.keys(current.content ?? current.texts ?? {})[0];
    test.skip(!key, 'structure de /homepage inattendue');
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
    const patch = await api.patch(`${API}/admin/homepage/content`, { headers: bearer(token), data: { values: { [key]: payload }, [key]: payload } });
    test.info().annotations.push({ type: 'info', description: `PATCH content → ${patch.status()}` });
    await page.goto(FRONT);
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    // remise à zéro
    await api.post(`${API}/admin/site-settings/reset`, { headers: bearer(token) });
  });

  test('XSS : le nom d\'inscription est affiché sans exécution', async ({ page }) => {
    const api = await newApi();
    const email = `xss-${Date.now()}@example.com`;
    const r = await api.post(`${API}/auth/register`, { data: { email, fullName: '<img src=x onerror="window.__xss=1">', password: 'Password-2026!' } });
    test.info().annotations.push({ type: 'info', description: `register → ${r.status()} ${(await r.text()).slice(0, 120)}` });
    await page.goto(`${FRONT}/login`);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });
});

// A05:2021 – Mauvaise configuration de sécurité
test.describe('A05 – configuration', () => {
  const expected = ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'referrer-policy'];

  test('en-têtes de sécurité du frontend', async ({ request }) => {
    const h = (await request.get(FRONT)).headers();
    const missing = expected.filter((k) => !h[k] && !(k === 'x-frame-options' && /frame-ancestors/.test(h['content-security-policy'] ?? '')));
    expect.soft(missing, `en-têtes absents : ${missing.join(', ')}`).toEqual([]);
    expect.soft(h['x-powered-by'], 'X-Powered-By divulgue la technologie').toBeUndefined();
  });

  test('en-têtes de sécurité de l\'API', async ({ request }) => {
    const h = (await request.get(`${API}/homepage`)).headers();
    const missing = expected.filter((k) => !h[k]);
    expect.soft(missing, `en-têtes absents : ${missing.join(', ')}`).toEqual([]);
    expect.soft(h['x-powered-by'], 'X-Powered-By (Express) divulgue la technologie').toBeUndefined();
  });

  test('CORS : une origine étrangère n\'est pas autorisée', async ({ request }) => {
    const r = await request.get(`${API}/homepage`, { headers: { Origin: 'https://evil.example' } });
    expect(r.headers()['access-control-allow-origin']).not.toBe('*');
    expect(r.headers()['access-control-allow-origin']).not.toBe('https://evil.example');
    const pre = await request.fetch(`${API}/account/me`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } });
    expect(pre.headers()['access-control-allow-origin']).not.toBe('https://evil.example');
  });

  test('les erreurs ne divulguent pas de trace d\'exécution', async ({ request }) => {
    const bodies = [
      await request.post(`${API}/auth/login`, { data: '{bad json', headers: { 'content-type': 'application/json' } }),
      await request.get(`${API}/route-inexistante`),
      await request.post(`${API}/auth/register`, { data: { email: 1, fullName: [], password: {} } }),
    ];
    for (const r of bodies) {
      const text = await r.text();
      expect(r.status()).toBeLessThan(500);
      expect(text).not.toMatch(/at .*\.(js|ts):\d+|node_modules|prisma|PrismaClient|stack/i);
    }
  });

  test('méthodes HTTP dangereuses (TRACE) refusées', async ({ request }) => {
    const r = await request.fetch(`${API}/homepage`, { method: 'TRACE' }).catch(() => null);
    if (r) expect([404, 405, 501]).toContain(r.status());
  });

  test('corps volumineux : pas de plantage serveur', async ({ request }) => {
    const big = 'a'.repeat(2 * 1024 * 1024);
    const r = await request.post(`${API}/auth/login`, { data: { email: big, password: big } });
    expect([400, 401, 413, 429]).toContain(r.status());
    expect((await request.get(`${API}/homepage`)).status()).toBe(200);
  });
});
