import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DataClient } from '../web/data.js';
import { itemHref, parseRoute, settingsHref, topicHref } from '../web/routes.js';
import { stageWebData } from '../scripts/stage-web.js';

test('hash routes are stable and reject paths outside item identifiers', () => {
  assert.deepEqual(parseRoute(''), { kind: 'library' });
  assert.deepEqual(parseRoute('#/'), { kind: 'library' });
  assert.deepEqual(parseRoute('#/contents'), { kind: 'contents' });
  assert.deepEqual(parseRoute(topicHref('dua', '0.4.1.6')), { kind: 'contents', topic: 'dua', sourcePath: '0.4.1.6' });
  assert.deepEqual(parseRoute(settingsHref('dua-kumayl')), { kind: 'settings', id: 'dua-kumayl' });
  assert.deepEqual(parseRoute('#/bookmarks'), { kind: 'bookmarks' });
  assert.deepEqual(parseRoute('#/item/dua-kumayl'), { kind: 'item', id: 'dua-kumayl' });
  assert.equal(itemHref('dua-kumayl'), '#/item/dua-kumayl');
  const anchor = { row: 'r00076', language: 'ar' as const, offset: 12 };
  assert.equal(itemHref('dua-kumayl', anchor), '#/item/dua-kumayl?row=r00076&lang=ar&offset=12');
  assert.deepEqual(parseRoute(itemHref('dua-kumayl', anchor)), { kind: 'item', id: 'dua-kumayl', anchor });
  for (const hash of ['#/item/../secret', '#/item/%2e%2e', '#/item/a/b', '#/other', '#/contents/featured/0', '#/contents/dua/../2', '#/settings/../secret',
    '#/item/dua-kumayl?row=..&lang=ar&offset=0', '#/item/dua-kumayl?row=r1&lang=en&offset=0',
    '#/item/dua-kumayl?row=r1&lang=ar&offset=-1', '#/item/dua-kumayl?row=r1&lang=ar&offset=1&offset=2']) {
    assert.deepEqual(parseRoute(hash), { kind: 'not-found' });
  }
  assert.throws(() => itemHref('../secret'), /Invalid item ID/);
  assert.throws(() => itemHref('dua-kumayl', { ...anchor, offset: -1 }), /Invalid reading anchor/);
});

test('the same client resolves local data at the site root and a Pages subpath', async () => {
  for (const base of ['https://example.test/', 'https://example.test/mafatih/']) {
    const calls: string[] = [];
    const client = new DataClient(new URL(base), async (url) => {
      calls.push(url.href);
      return new Response(JSON.stringify({ items: [], toc: [], id: 'dua-kumayl', title: {}, rows: [] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    });
    await client.catalog();
    await client.catalog(); // reusable promise, not a second request
    await client.item('dua-kumayl');
    await client.item('dua-kumayl'); // recently visited items are cached
    await assert.rejects(client.item('../secret'), /Invalid item ID/);
    assert.deepEqual(calls, [`${base}data/catalog.json`, `${base}data/items/dua-kumayl.json`]);
  }
});

test('a failed catalog load is retried rather than cached forever', async () => {
  let attempts = 0;
  const client = new DataClient(new URL('https://example.test/mafatih/'), async () => {
    attempts += 1;
    return attempts === 1 ? new Response('', { status: 503 }) : new Response('{"items":[],"toc":[]}');
  });
  await assert.rejects(client.catalog(), /503/);
  assert.deepEqual(await client.catalog(), { items: [], toc: [] });
  assert.equal(attempts, 2);
});

test('web staging contains only runtime data and refuses overlapping directories', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mafatih-stage-'));
  try {
    const source = path.join(root, 'web-data');
    const stage = path.join(root, 'web-public');
    mkdirSync(path.join(source, 'items'), { recursive: true });
    writeFileSync(path.join(source, 'manifest.json'), '{}');
    writeFileSync(path.join(source, 'items', 'sample.json'), '{"id":"sample"}');
    mkdirSync(path.join(source, 'search'));
    writeFileSync(path.join(source, 'search', '000.json'), '{"records":[]}');
    writeFileSync(path.join(source, 'search-index.json'), '{"version":4}');
    writeFileSync(path.join(root, 'private-review.txt'), 'not for the web');
    stageWebData(source, stage);
    assert.equal(readFileSync(path.join(stage, 'data', 'items', 'sample.json'), 'utf8'), '{"id":"sample"}');
    assert.equal(readFileSync(path.join(stage, 'data', 'search', '000.json'), 'utf8'), '{"records":[]}');
    assert.equal(readFileSync(path.join(stage, 'data', 'search-index.json'), 'utf8'), '{"version":4}');
    assert.equal(existsSync(path.join(source, 'search', '000.json')), true);
    assert.equal(existsSync(path.join(stage, 'private-review.txt')), false);
    assert.throws(() => stageWebData(source, source), /must not overlap/);
    assert.throws(() => stageWebData(source, path.join(source, 'nested')), /must not overlap/);
    assert.equal(existsSync(path.join(source, 'manifest.json')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
