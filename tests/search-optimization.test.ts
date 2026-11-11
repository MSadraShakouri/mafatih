import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, type SearchRecord, type SearchRequest, type SearchSnapshot } from '../src/search.js';

function record(key: string, value: string, options: Partial<SearchRecord> = {}): SearchRecord {
  return { key, section: 'text', item: key, row: key, language: 'fa', text: value,
    normalized: normalizeSearch(value), featured: false, order: Number(key.replace(/\D/g, '')) || 0, ...options };
}
function request(query: string, options: Partial<SearchRequest> = {}): SearchRequest {
  return { id: 1, query, languages: ['ar', 'fa'], tocLimit: 10000, textLimit: 10000, resultLimit: 10000, ...options };
}
function finish(engine: IncrementalSearch, query: string, options: Partial<SearchRequest> = {}): SearchSnapshot {
  let result = engine.begin(request(query, options));
  let steps = 0;
  while (!result.complete && steps++ < 10000) result = engine.advance(37);
  assert.ok(result.complete, `${query} did not complete`);
  return result;
}

test('extending a word checks a safe prefix superset, including previously unconfirmed spaced joins', () => {
  const records = [record('r0', 'اهل بیتش'), record('r1', 'اهلبیت'),
    ...Array.from({ length: 400 }, (_, n) => record(`r${n + 2}`, 'اهلبا یت'))];
  const engine = new IncrementalSearch(records);
  assert.deepEqual(finish(engine, 'اهلبی').results.map(hit => hit.record.key), ['r1']);
  const next = finish(engine, 'اهلبیت');
  assert.deepEqual(new Set(next.results.map(hit => hit.record.key)), new Set(['r0', 'r1']));
  const work = engine.wordWork('اهلبیت')!;
  assert.ok(work.prefixRejected >= 400, JSON.stringify(work));
  assert.ok(work.examined <= 2, JSON.stringify(work));
});

test('a completed selective prefix skips known negatives without losing a possible spaced match', () => {
  const records = [record('r0', 'اهل بیتش'), record('r1', 'اهلبیت'),
    ...Array.from({ length: 5000 }, (_, n) => record(`r${n + 2}`, 'متن دیگری'))];
  const engine = new IncrementalSearch(records);
  assert.deepEqual(finish(engine, 'اهلبی').results.map(hit => hit.record.key), ['r1']);
  let result = engine.begin(request('اهلبیت')), batches = 0;
  while (!result.complete && batches++ < 500) result = engine.advance(25);
  assert.ok(result.complete);
  assert.deepEqual(new Set(result.results.map(hit => hit.record.key)), new Set(['r0', 'r1']));
  const work = engine.wordWork('اهلبیت')!;
  assert.ok(work.prefixRejected >= 5000, JSON.stringify(work));
  assert.ok(work.visited <= 4, `already-rejected records must not be individually revisited: ${JSON.stringify(work)}`);
  assert.ok(batches <= 2, `a selective completed prefix should not require ${batches} worker batches`);
});

test('sparse prefix candidates survive bit boundaries and chained extensions', () => {
  const positions = [0, 30, 31, 32, 33, 62, 63, 64, 127, 511, 1023];
  const records = Array.from({ length: 1100 }, (_, n) => record(`r${n}`,
    positions.includes(n) ? 'اهلبیتش' : 'متن دیگر', { item: n % 2 ? 'odd' : 'even' }));
  const engine = new IncrementalSearch(records);
  finish(engine, 'اهلبی');
  const longer = finish(engine, 'اهلبیت');
  const expected = positions.map(n => `r${n}`).sort();
  assert.deepEqual(longer.results.map(hit => hit.record.key).sort(), expected);
  assert.ok(engine.wordWork('اهلبیت')!.visited <= positions.length);
  // The intermediate scan has implicit negative gaps, yet it is itself a
  // safe prefix for both a scoped and a global grandchild search.
  const local = finish(engine, 'اهلبیتش', { item: 'odd' });
  assert.deepEqual(local.results.map(hit => hit.record.key).sort(), positions.filter(n => n % 2).map(n => `r${n}`).sort());
  const global = finish(engine, 'اهلبیتش');
  assert.deepEqual(global.results.map(hit => hit.record.key).sort(), expected);
});

test('a prefix index stays correct as the parent advances and more shards arrive', () => {
  const make = (n: number) => record(`r${n}`, n % 33 === 0 ? 'alphabet' : n % 5 ? 'alpha' : 'other',
    { item: n % 2 ? 'odd' : 'even' });
  const records = Array.from({ length: 260 }, (_, n) => make(n));
  const engine = new IncrementalSearch(records.slice(0, 100), 32, true);
  engine.begin(request('alpha')); engine.advance(5);
  // Both terms remain active; the parent's candidate bitset must grow while
  // the child is using it, even after it crosses allocation boundaries.
  engine.begin(request('alpha alphabet'));
  for (let i = 0; i < 12; i += 1) engine.advance(3);
  engine.appendRecords(records.slice(100)); engine.finishLoading();
  const actual = finish(engine, 'alphabet');
  const fresh = finish(new IncrementalSearch(records), 'alphabet');
  assert.deepEqual(actual.results.map(hit => hit.record.key), fresh.results.map(hit => hit.record.key));
  assert.equal(actual.resultsTotal, fresh.resultsTotal);
});

test('an unfinished prefix and newly arriving shards do not hide longer joined matches', () => {
  const engine = new IncrementalSearch([record('r0', 'اهلبا یت'), record('r1', 'اهل بیتش')], 32, true);
  engine.begin(request('اهلبی'));
  engine.advance(1); // Earlier prefix work is deliberately incomplete.
  let result = engine.begin(request('اهلبیت', { id: 2 }));
  result = engine.advance(1);
  engine.appendRecords([record('r2', 'اهل بیتش'), record('r3', 'اهلبیت')]);
  engine.finishLoading();
  while (!result.complete) result = engine.advance(1);
  assert.deepEqual(new Set(result.results.map(hit => hit.record.key)), new Set(['r1', 'r2', 'r3']));
});

test('a new OR term does not rescan the completed old term', () => {
  const records = [record('r0', 'الهی'), record('r1', 'عظم'), record('r2', 'الهی عظم'),
    ...Array.from({ length: 200 }, (_, n) => record(`r${n + 3}`, 'چیز دیگر'))];
  const engine = new IncrementalSearch(records);
  const first = finish(engine, 'الهی');
  const before = engine.wordWork('الهی')!;
  const second = finish(engine, 'الهی عظم');
  const after = engine.wordWork('الهی')!;
  assert.deepEqual(first.results.map(hit => hit.record.key).sort(), ['r0', 'r2']);
  assert.deepEqual(second.results.map(hit => hit.record.key).sort(), ['r0', 'r1', 'r2']);
  assert.equal(after.examined, before.examined);
  assert.equal(after.visited, before.visited);
});

test('an item search scans that item only and reuses checked records when broadening globally', () => {
  const records = [record('r0', 'alpha', { item: 'target' }), record('r1', 'alpha beta', { item: 'target' }),
    record('r2', 'no match', { item: 'target' }),
    ...Array.from({ length: 500 }, (_, n) => record(`r${n + 3}`, n % 2 ? 'alpha' : 'elsewhere', { item: 'other' }))];
  const engine = new IncrementalSearch(records);
  const local = finish(engine, 'alpha', { item: 'target' });
  assert.deepEqual(local.results.map(hit => hit.record.key).sort(), ['r0', 'r1']);
  assert.deepEqual(engine.progress('alpha', 'target'), { cursor: 3, complete: true });
  const before = engine.wordWork('alpha')!;
  assert.equal(before.visited, 3);
  const global = finish(engine, 'alpha');
  assert.equal(global.resultsTotal, 252);
  const after = engine.wordWork('alpha')!;
  assert.ok(after.reused >= 3);
  assert.ok(after.examined <= records.length);
  assert.deepEqual(engine.progress('alpha'), { cursor: records.length, complete: true });
});

test('cached relevance for an inactive query is invalidated when its adjacent row arrives', () => {
  const a = record('r0', 'alpha', { item: 'same', row: 'a', next: 'r1' });
  const b = record('r1', 'beta', { item: 'same', row: 'b' });
  const engine = new IncrementalSearch([a], 32, true);
  engine.begin(request('alpha beta'));
  let first = engine.advance(10);
  assert.equal(first.results[0]!.relevance.matchedSequenceWords, 1);
  engine.begin(request('gamma', { id: 2 }));
  engine.advance(10);
  engine.appendRecords([b]);
  engine.finishLoading();
  first = finish(engine, 'alpha beta', { id: 3 });
  const hit = first.results.find(value => value.record.key === 'r0')!;
  assert.equal(hit.relevance.matchedSequenceWords, 2);
  assert.deepEqual(hit.continuation?.map(part => part.row), ['b']);
});

test('a word scan continues into a new shard and finds joined and substring matches', () => {
  const engine = new IncrementalSearch([record('r0', 'اول')], 32, true);
  engine.begin(request('اهلبیت'));
  engine.advance(10);
  engine.appendRecords([record('r1', 'اهل بیتش'), record('r2', 'اهلبیتش'), record('r3', 'چیز نامربوط')]);
  engine.finishLoading();
  let result = engine.advance(10);
  while (!result.complete) result = engine.advance(10);
  assert.deepEqual(new Set(result.results.map(hit => hit.record.key)), new Set(['r1', 'r2']));
});

test('bounded result selection exactly matches a full stable sort for all categories and ties', () => {
  const records = Array.from({ length: 420 }, (_, n) => record(`r${n}`, n % 7 === 0 ? 'alpha beta' : n % 3 === 0 ? 'alphabet' : 'alpha', {
    section: n % 4 === 0 ? 'toc' : 'text', language: n % 4 === 0 ? 'toc' : n % 5 === 0 ? 'ar' : 'fa',
    featured: n % 6 === 0, order: n % 11,
  }));
  const engine = new IncrementalSearch(records);
  const all = finish(engine, 'alpha beta', { resultLimit: records.length, tocLimit: records.length, textLimit: records.length });
  for (const [results, toc, text] of [[0, 0, 0], [1, 1, 1], [17, 9, 13], [100, 2, 180], [500, 500, 500]] as const) {
    const limited = finish(engine, 'alpha beta', { resultLimit: results, tocLimit: toc, textLimit: text });
    assert.deepEqual(limited.results.map(hit => hit.record.key), all.results.slice(0, results).map(hit => hit.record.key));
    assert.deepEqual(limited.toc.map(hit => hit.record.key), all.toc.slice(0, toc).map(hit => hit.record.key));
    assert.deepEqual(limited.text.map(hit => hit.record.key), all.text.slice(0, text).map(hit => hit.record.key));
    assert.equal(limited.resultsTotal, all.resultsTotal);
    assert.equal(limited.tocTotal, all.tocTotal);
    assert.equal(limited.textTotal, all.textTotal);
  }
});

test('bounded selection matches full sorting even while partial scores are arriving', () => {
  const records = Array.from({ length: 180 }, (_, n) => record(`r${n}`, n % 4 ? 'alpha' : 'alpha beta', {
    section: n % 3 ? 'text' : 'toc', language: n % 3 ? 'fa' : 'toc', order: n % 9,
  }));
  const limited = new IncrementalSearch(records), full = new IncrementalSearch(records);
  let a = limited.begin(request('alpha beta', { resultLimit: 7, tocLimit: 4, textLimit: 5 }));
  let b = full.begin(request('alpha beta', { resultLimit: 500, tocLimit: 500, textLimit: 500 }));
  for (let step = 0; step < 500; step += 1) {
    assert.deepEqual(a.results.map(h => h.record.key), b.results.slice(0, 7).map(h => h.record.key));
    assert.deepEqual(a.toc.map(h => h.record.key), b.toc.slice(0, 4).map(h => h.record.key));
    assert.deepEqual(a.text.map(h => h.record.key), b.text.slice(0, 5).map(h => h.record.key));
    assert.equal(a.complete, b.complete);
    if (a.complete) return;
    a = limited.advance(5); b = full.advance(5);
  }
  assert.fail('incremental selection did not complete');
});

test('single supplementary characters preserve exact prefix-candidate behavior', () => {
  const records = [record('r0', '𐐷 نور'), record('r1', '𐐷نور'), record('r2', 'نور')];
  const engine = new IncrementalSearch(records);
  const query = normalizeSearch('𐐷');
  assert.deepEqual(new Set(finish(engine, query).results.map(hit => hit.record.key)), new Set(['r0', 'r1']));
  const longer = normalizeSearch('𐐷نور');
  assert.deepEqual(new Set(finish(engine, longer).results.map(hit => hit.record.key)), new Set(['r0', 'r1']));
});

test('prefix-pruned work yields in bounded batches rather than blocking on every retained candidate', () => {
  // Every record is a conservative prefix candidate, including the last
  // unconfirmed spaced match. Skipping rejected gaps must not remove the
  // per-batch limit on real candidate probes.
  const records = Array.from({ length: 20 }, (_, n) => record(`r${n}`, n === 19 ? 'اهل بیتش' : 'اهلبیت'));
  const engine = new IncrementalSearch(records);
  finish(engine, 'اهلبی');
  engine.begin(request('اهلبیت'));
  const partial = engine.advance(2);
  assert.equal(partial.complete, false);
  assert.ok(engine.progress('اهلبیت')!.cursor <= 4);
  assert.ok(engine.wordWork('اهلبیت')!.examined <= 2);
  assert.equal(engine.hasUnscannedRecords(), true);
  let result = partial;
  while (!result.complete) result = engine.advance(2);
  assert.deepEqual(new Set(result.results.map(hit => hit.record.key)), new Set(records.map(item => item.key)));
});
