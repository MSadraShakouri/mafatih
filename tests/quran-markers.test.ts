import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus, type Corpus } from '../src/corpus.js';
import { ItemSchema } from '../src/schema.js';
import { textId } from '../src/text-ids.js';
import { normalizeSearch } from '../src/normalize.js';
import { preserveKeyOrder } from '../src/editor.js';
import { normalizeQuranMarkerSpacing, verseMarkerRanges } from '../src/quran-markers.js';
import { validatePunctuationHistory } from '../src/punctuation-history.js';
import { applyQuranMarkerSpacing, planQuranMarkerSpacing } from '../src/punctuation-migration.js';

function fixture(): Corpus {
  const c = loadCorpus(); c.texts = new Map(); c.textShards = new Map();
  const add = (value: string) => { const id = textId(value); c.texts.set(id, value); c.textShards.set(id, id.slice(1, 3)); return id; };
  const ar = add('بِسْمِ﴿1﴾ و ﴿٣﴾ و «﴿نص قرآني﴾»');
  const title = add('عنوان');
  c.items = new Map([['sample', ItemSchema.parse({
    legacy_id: null, title: { ar: null, fa: title, en: null }, category: 'dua', tags: [], legacy_alignment: null,
    rows: [{ id: 'r1', ar, fa: ar }, { id: 'r2', ar, fa: null }],
  })]]);
  c.alignments = new Map(); c.claims = { c000000000000000000000000: ar };
  c.editorial = { evidence: {}, metadata_corrections: [] };
  return c;
}
function snapshot(c: Corpus): unknown {
  return structuredClone({ items: [...c.items], editorial: c.editorial, texts: [...c.texts], alignments: [...c.alignments], claims: c.claims });
}

test('pool serialization retains existing entry order without rewriting values', () => {
  const old = { z: 'last sorted', a: 'first sorted' }, updated = { a: 'first sorted', b: 'new', z: 'last sorted' };
  assert.deepEqual(Object.keys(preserveKeyOrder(old, updated) as object), ['z', 'a', 'b']);
});

test('numeric marker spacing is narrowly scoped and does not touch quotation brackets or whitespace', () => {
  assert.equal(normalizeQuranMarkerSpacing('﴿1﴾ ب﴿٢﴾ ج ﴿۳﴾ ﴿نص﴾'), '﴿1﴾ ب ﴿٢﴾ ج ﴿۳﴾ ﴿نص﴾');
  assert.equal(normalizeQuranMarkerSpacing('ب\n﴿1﴾'), 'ب\n﴿1﴾');
  assert.equal(normalizeQuranMarkerSpacing('ب\u00a0﴿1﴾'), 'ب\u00a0﴿1﴾');
  const raw = 'بِسْمِ﴿1﴾ و ﴿٣﴾ و «﴿نص قرآني﴾»', result = normalizeQuranMarkerSpacing(raw);
  assert.equal(normalizeSearch(raw), normalizeSearch(result));
  assert.deepEqual(verseMarkerRanges(raw).map(span => raw.slice(span.start, span.end)), ['﴿1﴾', '﴿٣﴾']);
});

test('planning and applying keeps stable occurrences, exact originals, claims and reversible history', () => {
  const c = fixture(), before = snapshot(c), plan = planQuranMarkerSpacing(c);
  assert.equal(plan.length, 2); assert.deepEqual(snapshot(c), before, 'planning must not write');
  assert.ok(plan.every(edit => edit.location.kind === 'item-row' && edit.location.language === 'ar'));
  const original = plan[0]!.previous;
  const result = applyQuranMarkerSpacing(c, plan, '2026-11-01');
  assert.deepEqual([...result.files].sort(), ['editorial-history.json', 'items/sample.json']);
  assert.equal(c.texts.get(original), 'بِسْمِ﴿1﴾ و ﴿٣﴾ و «﴿نص قرآني﴾»');
  assert.equal(c.claims.c000000000000000000000000, original);
  assert.equal(c.items.get('sample')!.rows[0]!.fa, original, 'a shared Persian occurrence is not changed');
  assert.equal(c.items.get('sample')!.rows[0]!.ar, c.items.get('sample')!.rows[1]!.ar);
  assert.deepEqual(c.items.get('sample')!.rows.map(row => row.id), ['r1', 'r2']);
  assert.equal(c.editorial.punctuation_normalizations?.[0]?.rule, 'quran-verse-marker-spacing-v1');
  assert.deepEqual(c.editorial.punctuation_normalizations?.[0]?.changes, plan);
  assert.deepEqual(validatePunctuationHistory(c), []);
  assert.deepEqual(planQuranMarkerSpacing(c), []);
});

test('reviewed rows or affected alignments, stale plans, duplicates, collisions and bad scope fail before writes', () => {
  for (const defect of ['review', 'alignment', 'stale', 'duplicate', 'collision', 'scope', 'date', 'wrong-replacement'] as const) {
    const c = fixture(); let plan = planQuranMarkerSpacing(c);
    if (defect === 'review') c.items.get('sample')!.review = { text: { reviewer: 'human', date: '2026-11-01' } };
    if (defect === 'alignment') c.alignments.set('sample', { item: 'sample', groups: [{ id: 'g1',
      review: { reviewer: 'human', date: '2026-11-01' }, method: 'manual', evidence: {},
      ar: [{ row: 'r1', start: 0, end: 1, sha256: '0'.repeat(64) }], fa: [], en: [],
    }] });
    if (defect === 'stale') c.items.get('sample')!.rows[0]!.ar = null;
    if (defect === 'duplicate') plan = [...plan, plan[0]!];
    if (defect === 'collision') c.texts.set(plan[0]!.replacement, 'not the same string');
    if (defect === 'scope') plan = [{ ...plan[0]!, location: { kind: 'item-row', item: 'sample', row: 'r1', language: 'fa' } }];
    if (defect === 'wrong-replacement') plan = [{ ...plan[0]!, replacement: plan[0]!.previous }];
    const before = snapshot(c);
    assert.throws(() => applyQuranMarkerSpacing(c, plan, defect === 'date' ? '2026-02-30' : '2026-11-01'), defect);
    assert.deepEqual(snapshot(c), before, `${defect} must not mutate the corpus`);
  }
});

test('history validation refuses fabricated, duplicated or non-Arabic marker corrections', () => {
  const c = fixture(); applyQuranMarkerSpacing(c, planQuranMarkerSpacing(c), '2026-11-01');
  const batch = c.editorial.punctuation_normalizations![0]!;
  const saved = structuredClone(batch.changes[0]!);
  batch.changes.push(structuredClone(saved));
  assert.ok(validatePunctuationHistory(c).some(error => error.includes('duplicate')));
  batch.changes.pop();
  batch.changes[0]!.replacement = saved.previous;
  assert.ok(validatePunctuationHistory(c).some(error => error.includes('invalid')));
  batch.changes[0] = { ...saved, location: { kind: 'item-row', item: 'sample', row: 'r1', language: 'fa' } };
  assert.ok(validatePunctuationHistory(c).some(error => error.includes('invalid')));
});

function dataDirectory(reviewed: boolean): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-quran-marker-'));
  for (const dir of ['texts', 'items', 'english', 'alignments']) fs.mkdirSync(path.join(root, dir));
  const write = (file: string, value: unknown) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
  const values = ['عنوان', 'كلمة﴿1﴾', 'ترجمه'];
  const ids = values.map(textId), shards = new Map<string, Record<string, string>>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!, key = id.slice(1, 3), shard = shards.get(key) ?? {};
    shard[id] = values[i]!; shards.set(key, shard);
  }
  for (const [shard, values] of shards) write(`texts/${shard}.json`, values);
  write('corpus.json', loadCorpus().meta); write('claims.json', {}); write('sources.json', { sources: {} });
  write('relations.json', { english_links: [] }); write('editorial-history.json', { evidence: {}, metadata_corrections: [] });
  write('navigation.json', { default_order: ['sample'], featured: [], toc: [{ title: ids[0], source_level: 1, source_page: null, item: 'sample', children: [] }] });
  write('items/sample.json', { legacy_id: null, title: { fa: ids[0], ar: null, en: null }, category: 'dua', tags: [], legacy_alignment: null,
    ...(reviewed ? { review: { text: { reviewer: 'human', date: '2026-11-01' } } } : {}),
    rows: [{ id: 'r1', ar: ids[1], fa: ids[2] }] });
  return root;
}
function cli(root: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/normalize-quran-markers.ts', ...args],
    { cwd: process.cwd(), env: { ...process.env, MAFATIH_DATA_ROOT: root }, encoding: 'utf8' });
}

test('CLI previews, checks, applies once with pooled history, and refuses reviewed content', () => {
  const root = dataDirectory(false), reviewed = dataDirectory(true);
  try {
    const initial = fs.readFileSync(path.join(root, 'items/sample.json'), 'utf8');
    const dry = cli(root); assert.equal(dry.status, 0, dry.stderr); assert.match(dry.stdout, /sample\/r1\/ar/);
    assert.equal(fs.readFileSync(path.join(root, 'items/sample.json'), 'utf8'), initial);
    assert.equal(cli(root, '--check').status, 1);
    const digest = dry.stdout.match(/Plan SHA-256: ([0-9a-f]{64})/)?.[1]; assert.ok(digest);
    const missing = cli(root, '--apply'); assert.notEqual(missing.status, 0); assert.match(missing.stderr, /expect-plan/);
    const stale = cli(root, '--apply', `--expect-plan=${'0'.repeat(64)}`); assert.notEqual(stale.status, 0); assert.match(stale.stderr, /stale/);
    assert.equal(fs.readFileSync(path.join(root, 'items/sample.json'), 'utf8'), initial);
    const applied = cli(root, '--apply', `--expect-plan=${digest}`, '--date=2026-11-01'); assert.equal(applied.status, 0, applied.stderr);
    const after = loadCorpus(root), batch = after.editorial.punctuation_normalizations![0]!;
    assert.equal(batch.rule, 'quran-verse-marker-spacing-v1'); assert.equal(batch.date, '2026-11-01');
    assert.equal(after.texts.get(batch.changes[0]!.previous), 'كلمة﴿1﴾');
    assert.equal(after.texts.get(batch.changes[0]!.replacement), 'كلمة ﴿1﴾');
    assert.equal(cli(root, '--check').status, 0); assert.equal(cli(root, '--apply').status, 0);
    const reviewedBefore = fs.readFileSync(path.join(reviewed, 'items/sample.json'), 'utf8');
    const reviewedDigest = cli(reviewed).stdout.match(/Plan SHA-256: ([0-9a-f]{64})/)?.[1]; assert.ok(reviewedDigest);
    const denied = cli(reviewed, '--apply', `--expect-plan=${reviewedDigest}`, '--date=2026-11-01'); assert.notEqual(denied.status, 0); assert.match(denied.stderr, /review/i);
    assert.equal(fs.readFileSync(path.join(reviewed, 'items/sample.json'), 'utf8'), reviewedBefore);
  } finally { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(reviewed, { recursive: true, force: true }); }
});
