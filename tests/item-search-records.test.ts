import assert from 'node:assert/strict';
import test from 'node:test';
import { buildData } from '../scripts/build-data.js';
import { IncrementalSearch, type SearchIndex, type SearchRecord, type SearchRequest, type SearchShard } from '../src/search.js';
import type { ReaderItem } from '../web/data.js';
import { itemSearchRecords } from '../web/item-search-records.js';
import { normalizeSearchPreservingTa } from '../src/normalize.js';

test('item preparation normalizes each distinct source string only once', () => {
  const item: ReaderItem = { id: 'fixture', title: { ar: '', fa: '', en: '' }, rows: [
    { id: 'r0', ar: 'كِتاب', fa: 'خانه', searchNext: 'r1' },
    { id: 'r1', ar: 'كِتاب', fa: 'خانه', searchNext: 'r2' },
    { id: 'r2', ar: 'نُور', fa: 'ـ', searchNext: 'audio' },
    { id: 'audio', ar: 'ignored audio', fa: 'ignored audio', kind: 'audio-reciter' },
  ] };
  const inputs = new Set(['كِتاب', 'خانه', 'نُور', 'ـ', 'ignored audio']);
  const calls = new Map<string, number>();
  const original = String.prototype.normalize;
  String.prototype.normalize = function(form?: string): string {
    const value = String(this);
    if (inputs.has(value)) calls.set(value, (calls.get(value) ?? 0) + 1);
    return original.call(value, form);
  };
  let records: ReturnType<typeof itemSearchRecords>;
  try { records = itemSearchRecords(item); } finally { String.prototype.normalize = original; }
  assert.deepEqual([...calls.entries()].sort(), [['خانه', 1], ['كِتاب', 1], ['نُور', 1], ['ـ', 1]].sort());
  assert.equal(records.length, 6);
  assert.equal(records.find(record => record.key === 'row:fixture:r0:ar')?.next, 'row:fixture:r1:ar');
  assert.equal(records.find(record => record.key === 'row:fixture:r1:fa')?.next, undefined, 'a normalized-empty next field cannot continue');
  assert.equal(records.find(record => record.key === 'row:fixture:r2:ar')?.next, undefined, 'audio rows must remain excluded');
});

test('generated search records need no extra ة-position metadata', () => {
  const files = new Map<string, string>();
  buildData({ quiet: true, write: (name, value) => files.set(name, value) });
  const records = [...files.entries()].filter(([name]) => name === 'search-index.json' || /^search\/\d+\.json$/.test(name))
    .flatMap(([, value]) => (JSON.parse(value) as SearchIndex).records);
  assert.ok(records.some(record => record.text.includes('ة')), 'exercise original source ة');
  assert.ok(records.every(record => !('taMarbuta' in record)), 'do not enlarge transferred indexes with per-record ة positions');
});

test('local reader records match every global source field and original adjacency', () => {
  const files = new Map<string, string>();
  buildData({ quiet: true, write: (name, value) => files.set(name, value) });
  const globals = [...files.entries()].filter(([name]) => /^search\/\d+\.json$/.test(name))
    .flatMap(([, value]) => (JSON.parse(value) as SearchShard).records);
  const byKey = new Map(globals.map(record => [record.key, record]));
  const verifyFold = (record: SearchRecord): void => {
    assert.equal(record.normalized, normalizeSearchPreservingTa(record.text).replace(/ة/g, 'ه'), record.key);
  };
  const toc = (JSON.parse(files.get('search-index.json')!) as SearchIndex).records;
  assert.ok(toc.some(record => record.text.includes('ة')));
  for (const record of toc) verifyFold(record);
  // The unchanged index representation must still allow all three spellings
  // to find a real TOC title containing source ة.
  const tocEngine = new IncrementalSearch(toc);
  for (const query of ['الواقعت', 'الواقعه', 'الواقعة']) {
    let result = tocEngine.begin({ id: 1, query, languages: [], tocLimit: 1000, textLimit: 0, resultLimit: 1000 });
    while (!result.complete) result = tocEngine.advance(600);
    assert.ok(result.results.some(hit => hit.record.text === 'سوره الواقعة'), `TOC: ${query}`);
  }
  let count = 0;
  for (const [name, value] of files) {
    if (!name.startsWith('items/') || !name.endsWith('.json')) continue;
    const item = JSON.parse(value) as ReaderItem;
    const local = itemSearchRecords(item);
    let base: number | undefined;
    for (const record of local) {
      const global = byKey.get(record.key);
      assert.ok(global, record.key);
      base ??= global.order - record.order;
      assert.deepEqual({ ...record, order: global.order }, global, record.key);
      verifyFold(global);
      assert.equal(global.order - record.order, base, `source order: ${record.key}`);
      count++;
    }
  }
  assert.equal(count, globals.length);
  assert.ok(count > 20_000);

  // A different in-memory record order must not change per-item ranking,
  // aliases, source matches or continuation excerpts compared with global.
  const globalEngine = new IncrementalSearch(globals);
  const selected = ['dua-kumayl', 'dua-samat', 'namaz-hnvt-myt'];
  const queries = ['الهم', 'شیء قوت', 'بالطف', 'درود', 'رحمت', 'رحمه', 'رحمة', 'برحمةکالتی'];
  for (const id of selected) {
    const item = JSON.parse(files.get(`items/${id}.json`)!) as ReaderItem;
    const localEngine = new IncrementalSearch(itemSearchRecords(item));
    for (const query of queries) {
      const request: SearchRequest = { id: 1, query, item: id, languages: ['ar', 'fa'], tocLimit: 0, textLimit: 50, resultLimit: 0 };
      const finish = (engine: IncrementalSearch) => {
        let result = engine.begin(request);
        while (!result.complete) result = engine.advance(600);
        return { total: result.textTotal, hits: result.text.map(hit => ({ key: hit.record.key,
          matchedWords: hit.matchedWords, relevance: hit.relevance, continuation: hit.continuation })) };
      };
      assert.deepEqual(finish(localEngine), finish(globalEngine), `${id}: ${query}`);
    }
  }
});
