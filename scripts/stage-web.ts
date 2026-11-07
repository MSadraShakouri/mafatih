import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional standalone staging helper. The Vite app now resolves runtime
// data directly and does not consume this directory.
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
  // Search remains in source and build:data, but is deliberately not wired
  // into this reader/menu release. Avoid staging unused generated shards;
  // restoring the search UI must also include them in the Vite runtime output.
  rmSync(path.join(stage, 'data', 'search-index.json'), { force: true });
  rmSync(path.join(stage, 'data', 'search'), { recursive: true, force: true });
  console.log(`Staged reader/menu runtime data in ${stage}/data (search deferred)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  stageWebData('generated/web-data', 'generated/web-public');
}
