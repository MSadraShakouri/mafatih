import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { buildData } from '../scripts/build-data.js';

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');

test('reader-only data matches the full search builder byte for byte', () => {
  const full = new Map<string, string>();
  const reader = new Map<string, string>();
  const warnings: string[] = [];
  buildData({ quiet: true, write: (name, value) => full.set(name, value) });
  buildData({ includeSearch: false, quiet: true, onWarning: warning => warnings.push(warning), write: (name, value) => reader.set(name, value) });
  assert.ok(warnings.some(warning => warning.includes('does NOT verify')));
  assert.ok(full.has('search-index.json'));
  assert.ok([...full.keys()].some(name => name.startsWith('search/')));
  const runtimeNames = [...full.keys()].filter(name => name !== 'search-index.json' && !name.startsWith('search/')).sort();
  assert.deepEqual([...reader.keys()].sort(), runtimeNames);
  for (const name of runtimeNames) assert.equal(digest(reader.get(name)!), digest(full.get(name)!), name);
  assert.ok(reader.has('english/dua-kumayl.json'));
  assert.ok(reader.has('items/dua-kumayl.json'));
});

test('Vite dev serves only resolved data and invalidates it after source changes', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-vite-data-'));
  const root = path.join(temp, 'data');
  fs.cpSync('data', root, { recursive: true });
  const previousRoot = process.env.MAFATIH_DATA_ROOT;
  process.env.MAFATIH_DATA_ROOT = root;
  let server: Awaited<ReturnType<typeof createServer>> | undefined;
  t.after(async () => {
    await server?.close();
    if (previousRoot === undefined) delete process.env.MAFATIH_DATA_ROOT;
    else process.env.MAFATIH_DATA_ROOT = previousRoot;
    fs.rmSync(temp, { recursive: true, force: true });
  });
  server = await createServer({
    configFile: path.resolve('vite.config.ts'),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/`;
  const catalog = async (): Promise<{ featured: string[] }> => {
    const response = await fetch(`${base}data/catalog.json`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    return await response.json() as { featured: string[] };
  };
  const before = await catalog();
  assert.ok(before.featured.length > 1);
  assert.equal((await fetch(`${base}data/english/dua-kumayl.json`)).status, 200);
  assert.equal((await fetch(`${base}data/search-index.json`)).status, 404);
  assert.equal((await fetch(`${base}data/navigation.json`)).status, 404);
  assert.equal((await fetch(`${base}data/catalog.json`, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(`${base}data/catalog.json`, { method: 'POST' })).status, 405);

  // Modify only the temporary copy. Emit a watcher event deterministically;
  // production Vite wires the same listener to file changes under the root.
  const navFile = path.join(root, 'navigation.json');
  const nav = JSON.parse(fs.readFileSync(navFile, 'utf8')) as { featured: string[] };
  nav.featured.reverse();
  fs.writeFileSync(navFile, JSON.stringify(nav));
  server.watcher.emit('change', navFile);
  assert.deepEqual((await catalog()).featured, [...before.featured].reverse());
});
