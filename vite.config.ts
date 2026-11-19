import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { runtimeData } from './scripts/vite-data.js';
import { RowVersionFindingsSchema } from './src/row-version-safety.js';

// Keep the small identity guard in the hashed app bundle as well as in item
// data. A stale cached item that lacks the mapping cannot bypass the warning.
const findingsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'docs/split-assignments/row-version-findings.json');
const findings = RowVersionFindingsSchema.parse(JSON.parse(fs.readFileSync(findingsPath, 'utf8')) as unknown);
const rowVersionGuards = Object.fromEntries(Object.entries(findings.items).map(([id, group]) => [id, group.rows.map(row => row.id)]));

// A relative base lets the same web build run at /mafatih/ on Pages and at
// the root of Capacitor's local Android origin. Data URLs use the same base.
export default defineConfig({
  base: './',
  // Only resolved runtime content and search assets are exposed; private
  // review artifacts are never copied to the public build.
  publicDir: false,
  define: { __MAFATIH_ROW_VERSION_GUARDS__: JSON.stringify(rowVersionGuards) },
  plugins: [runtimeData()],
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
});
