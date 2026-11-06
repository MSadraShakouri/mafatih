import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { textId } from '../src/text-ids.js';

function makeData(reviewed = false): { root: string; previous: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-punctuation-'));
  for (const dir of ['texts', 'items', 'english', 'alignments']) fs.mkdirSync(path.join(root, dir));
  const write = (file: string, value: unknown) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
  const values = ['عنوان : نمونه', 'می‌روم , سپس', 'A sentence .'];
  const ids = values.map(textId);
  const byShard = new Map<string, Record<string, string>>();
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i]!; const shard = id.slice(1, 3); const entries = byShard.get(shard) ?? {};
    entries[id] = values[i]!; byShard.set(shard, entries);
  }
  for (const [shard, entries] of byShard) write(`texts/${shard}.json`, entries);
  write('corpus.json', loadCorpus().meta);
  write('claims.json', {}); write('sources.json', { sources: {} });
  write('relations.json', { english_links: [] });
  write('editorial-history.json', { evidence: {}, metadata_corrections: [] });
  write('navigation.json', { default_order: ['sample'], featured: [], toc: [{ title: ids[0], source_level: 1, source_page: null, item: 'sample', children: [], source_page_end: null }] });
  write('items/sample.json', { legacy_id: null, title: { fa: ids[0], ar: null, en: null }, category: 'dua', tags: [], legacy_alignment: null,
    ...(reviewed ? { review: { text: { reviewer: 'human', date: '2026-11-01' } } } : {}), rows: [{ id: 'r1', fa: ids[1], ar: null }] });
  write('english/sample-en.json', { source_metadata: { title: null, title_ar: null, section: null, chapter: null,
    translator_claim: null, origin_claim: null, method_claim: null, note_claim: null }, coverage: 'unknown', paragraphs: [{ id: 'p1', text: ids[2] }] });
  return { root, previous: ids[1]! };
}
function run(root: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/normalize-punctuation.ts', ...args], {
    cwd: process.cwd(), env: { ...process.env, MAFATIH_DATA_ROOT: root }, encoding: 'utf8',
  });
}
function files(root: string): Record<string, string> {
  const output: Record<string, string> = {};
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file); else output[path.relative(root, file)] = fs.readFileSync(file, 'utf8');
    }
  }
  walk(root); return output;
}

test('CLI is dry-run by default and applies reversible punctuation corrections only on request', () => {
  const { root, previous } = makeData();
  try {
    const before = files(root);
    const preview = run(root);
    assert.equal(preview.status, 0, preview.stderr);
    assert.deepEqual(files(root), before);
    assert.notEqual(run(root, '--check').status, 0);
    const applied = run(root, '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    const c = loadCorpus(root);
    assert.deepEqual(validateCorpus(c).errors, []);
    assert.equal(text(c, c.items.get('sample')!.rows[0]!.fa), 'می‌روم, سپس');
    assert.equal(c.texts.get(previous), 'می‌روم , سپس');
    assert.equal(c.editorial.punctuation_normalizations?.length, 1);
    const itemJson = fs.readFileSync(path.join(root, 'items/sample.json'), 'utf8');
    const navJson = fs.readFileSync(path.join(root, 'navigation.json'), 'utf8');
    assert.match(itemJson, /"id": "r1",\n\s+"fa": "[^"]+",\n\s+"ar": null/);
    assert.match(navJson, /"children": \[\],\n\s+"source_page_end": null/);
    assert.equal(run(root, '--check').status, 0);
    const after = files(root);
    assert.equal(run(root, '--apply').status, 0);
    assert.deepEqual(files(root), after, 'a second apply must not add history or rewrite files');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('CLI refuses a reviewed affected occurrence without writing any files', () => {
  const { root } = makeData(true);
  try {
    const before = files(root); const result = run(root, '--apply');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /review/i);
    assert.deepEqual(files(root), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
