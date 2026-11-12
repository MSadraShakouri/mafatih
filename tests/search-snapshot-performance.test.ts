import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, type SearchRecord, type SearchRequest } from '../src/search.js';

function source(): SearchRecord[] {
  return Array.from({ length: 1800 }, (_, index): SearchRecord => {
    const toc = index % 23 === 0;
    const value = index % 5 === 0 ? 'ب' : index % 3 === 0 ? 'ا ب' : 'اب';
    return { key: `record-${index}`, section: toc ? 'toc' : 'text', item: `item-${index % 7}`,
      ...(toc ? {} : { row: `row-${index}` }), language: toc ? 'toc' : index % 2 ? 'ar' : 'fa',
      text: value, normalized: normalizeSearch(value), featured: index % 11 === 0, order: index };
  });
}

test('empty intermediate snapshots skip unnecessary ranking setup', () => {
  const records = source();
  const engine = new IncrementalSearch(records);
  const request: SearchRequest = { id: 1, query: 'ناموجود', languages: ['ar', 'fa'], tocLimit: 20, textLimit: 75, resultLimit: 50 };
  engine.begin(request);
  const original = globalThis.Set;
  let created = 0;
  globalThis.Set = new Proxy(original, { construct(target, args, receiver) {
    created += 1;
    return Reflect.construct(target, args, receiver);
  } });
  const snapshots = [];
  try { for (let step = 0; step < 3; step += 1) snapshots.push(engine.advance(100)); }
  finally { globalThis.Set = original; }
  for (const snapshot of snapshots) {
    assert.equal(snapshot.complete, false);
    assert.equal(snapshot.resultsTotal, 0);
    assert.deepEqual(snapshot.results, []);
    assert.deepEqual(snapshot.toc, []);
    assert.deepEqual(snapshot.text, []);
  }
  assert.equal(created, 0, `created ${created} ranking sets for empty snapshots`);
});

test('a completed one-word page does not rebuild a duplicate per-hit merge map', () => {
  const records = source();
  const request: SearchRequest = { id: 1, query: 'ا', languages: ['ar', 'fa'], tocLimit: 20, textLimit: 75, resultLimit: 50 };
  const engine = new IncrementalSearch(records);
  let expected = engine.begin(request);
  while (!expected.complete) expected = engine.advance(75);
  assert.equal(expected.resultsTotal, 1440);
  const original = Map.prototype.set;
  let matchMapWrites = 0;
  Map.prototype.set = function (key: unknown, value: unknown) {
    if (typeof key === 'number' && value && typeof value === 'object' &&
        Array.isArray((value as { words?: unknown }).words) && typeof (value as { direct?: unknown }).direct === 'number') {
      matchMapWrites += 1;
    }
    return original.call(this, key, value);
  };
  let cached;
  try { cached = engine.begin({ ...request, id: 2 }); }
  finally { Map.prototype.set = original; }
  assert.deepEqual({ ...cached, id: 1 }, expected, 'ranking, page, categories and exact totals remain unchanged');
  assert.notStrictEqual(cached.results[0]!.matchedWords, cached.results[1]!.matchedWords,
    'separate hits retain independent matched-word arrays');
  assert.ok(matchMapWrites < 10, `reconstructed ${matchMapWrites} one-term merge-map entries`);
});
