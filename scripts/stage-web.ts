import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Vite's public directory contains only the generated runtime data, never
// generated audits, edit working copies, SQLite databases, or review files.
export function stageWebData(sourcePath: string, stagePath: string): void {
  const source = path.resolve(sourcePath);
  const stage = path.resolve(stagePath);
  const inside = (a: string, b: string): boolean => a === b || a.startsWith(b + path.sep);
  if (inside(source, stage) || inside(stage, source)) {
    throw new Error('Source and staging directories must not overlap.');
  }
  if (!existsSync(path.join(source, 'manifest.json'))) {
    throw new Error('Missing generated/web-data/manifest.json; run npm run build:data first.');
  }
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  cpSync(source, path.join(stage, 'data'), { recursive: true });
  console.log(`Staged runtime data in ${stage}/data`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  stageWebData('generated/web-data', 'generated/web-public');
}
