import { defineConfig } from 'vite';
import { runtimeData } from './scripts/vite-data.js';

// A relative base lets the same web build run at /mafatih/ on Pages and at
// the root of Capacitor's local Android origin. Data URLs use the same base.
export default defineConfig({
  base: './',
  // Only the resolved runtime data is exposed; search and private artifacts
  // are not part of the currently disabled search UI.
  publicDir: false,
  plugins: [runtimeData()],
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
});
