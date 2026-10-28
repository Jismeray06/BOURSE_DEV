import { defineConfig } from '@playwright/test';

// Tests de sécurité (OWASP Top 10 – 2021) à lancer contre une instance de TEST
// (base de données jetable), jamais contre des données réelles.
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  workers: 1,
  globalSetup: './global-setup.ts',
  reporter: [['list'], ['json', { outputFile: 'results.json' }], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.FRONT_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
