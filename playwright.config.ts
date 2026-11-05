import { defineConfig, devices } from '@playwright/test';

// Exercise the same production build at both a root origin (as in Capacitor)
// and a GitHub Pages-style subdirectory. No server-side rewrite is used.
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  workers: process.env.CI ? 2 : 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], headless: true },
  projects: [
    { name: 'root', use: { baseURL: 'http://127.0.0.1:4173/' } },
    { name: 'pages', use: { baseURL: 'http://127.0.0.1:4174/mafatih/' } },
  ],
  webServer: [
    {
      command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npx vite preview --host 127.0.0.1 --port 4174 --strictPort --base /mafatih/',
      url: 'http://127.0.0.1:4174/mafatih/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
