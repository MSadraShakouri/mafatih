import { defineConfig } from 'vite';

// A relative base lets the same web build run at /mafatih/ on Pages and at
// the root of Capacitor's local Android origin. Data URLs use the same base.
export default defineConfig({
  base: './',
  // Only the staged web-data directory is public; never expose other reports
  // or working copies that may also be under generated/.
  publicDir: 'generated/web-public',
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
});
