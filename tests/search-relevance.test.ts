import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, type SearchRecord, type SearchRequest } from '../src/search.js';

function record(key: string, value: string, options: Partial<SearchRecord> = {}): SearchRecord {
  return { key, section: 'text', item: key, row: key, language: 'ar', text: value,
    normalized: normalizeSearch(value), featured: false, order: 0, ...options };
}
function run(records: SearchRecord[], query: string, extra: Partial<SearchRequest> = {}) {
  const engine = new IncrementalSearch(records);
  let result = engine.begin({ id: 1, query, languages: ['ar', 'fa'], tocLimit: 100, textLimit: 100, resultLimit: 100, ...extra });
  while (!result.complete) result = engine.advance(1000);
  return result;
}
const keys = (result: ReturnType<typeof run>) => result.results.map(hit => hit.record.key);

test('normalized complete words beat substrings, regardless of source order or a star', () => {
  const result = run([
    record('substring', 'اللهم', { featured: true, order: 0 }),
    record('whole', 'اللّٰه', { order: 1 }),
  ], 'الله');
  assert.deepEqual(keys(result), ['whole', 'substring']);
  assert.deepEqual(result.results.map(hit => hit.matchedWords), [['الله'], ['الله']]);
});

test('a full phrase and nearby split sequence outrank far-scattered and reversed matches', () => {
  const result = run([
    record('far', 'alpha one two three four five six gamma', { featured: true, order: 0 }),
    record('reverse', 'gamma beta alpha', { featured: true, order: 1 }),
    record('split', 'alpha typo gamma', { order: 2 }),
    record('pair', 'alpha beta', { order: 3 }),
    record('near', 'alpha beta extra gamma', { order: 4 }),
    record('full', 'alpha beta gamma', { order: 5 }),
  ], 'alpha beta gamma');
  const rank = (key: string) => keys(result).indexOf(key);
  assert.ok(rank('full') < rank('near'));
  assert.ok(rank('near') < rank('pair'));
  assert.ok(rank('pair') < rank('split'));
  assert.ok(rank('split') < rank('far'));
  assert.ok(rank('split') < rank('reverse'));
  assert.deepEqual(result.results.find(h => h.record.key === 'split')!.matchedWords, ['alpha', 'gamma']);
});

test('a mistyped middle query word still gives a localized ordered pair a boost', () => {
  const result = run([
    record('scattered', 'alpha one two three four five gamma', { featured: true }),
    record('near', 'alpha actual gamma'),
    record('exact-pair', 'alpha gamma'),
  ], 'alpha typo gamma');
  assert.ok(keys(result).indexOf('exact-pair') < keys(result).indexOf('near'));
  assert.ok(keys(result).indexOf('near') < keys(result).indexOf('scattered'));
  assert.equal(run([record('x', 'alpha')], 'alfa').results.length, 0); // not edit-distance spelling correction
});

test('partial endings can participate in an ordered phrase and repeated words are not invented', () => {
  const result = run([
    record('unrelated', 'الهی چیزهای دیگر و مطلبی عظم و چیزهای بسیار دیگر البلاء', { featured: true }),
    record('phrase', 'إِلٰهِي عَظُمَ الْبَلَاءُ وَ بَرِحَ الْخَفَاءُ'),
  ], 'الهی عظم البلا و برح الخفا');
  assert.equal(keys(result)[0], 'phrase');
  const repeats = run([record('once', 'الله'), record('twice', 'الله الله')], 'الله الله');
  assert.deepEqual(keys(repeats), ['twice', 'once']);
  assert.deepEqual(repeats.results[0]!.matchedWords, ['الله']); // OR term dedup still holds
});

test('a joined query word can participate in a phrase with a spaced source', () => {
  const result = run([
    record('separate', 'یا چیز دیگر اهل‌بیت', { featured: true }),
    record('joined', 'یا اهل بیتش'),
  ], 'یا اهلبیت');
  assert.equal(keys(result)[0], 'joined');
  assert.deepEqual(result.results[0]!.matchedWords, ['یا', 'اهلبیت']);
});

test('TOC and text compete on relevance; TOC wins a truly comparable tie', () => {
  const result = run([
    record('weak-toc', 'alpha', { section: 'toc', language: 'toc', featured: true }),
    record('text-full', 'alpha beta gamma'),
    record('toc-full', 'alpha beta gamma', { section: 'toc', language: 'toc' }),
    record('weak-text', 'beta'),
  ], 'alpha beta gamma');
  assert.ok(keys(result).indexOf('text-full') < keys(result).indexOf('weak-toc'));
  assert.ok(keys(result).indexOf('toc-full') < keys(result).indexOf('text-full'));
  assert.equal(result.tocTotal, 2);
  assert.equal(result.textTotal, 2);
  assert.deepEqual(keys(run(result.results.map(h => h.record), 'alpha beta gamma', { resultLimit: 1 })), ['toc-full']);
});

test('a phrase may cross neighboring rows in the same item/language, anchored to its first row', () => {
  const records = [
    record('r1', 'اللهم عظم البلاء', { item: 'prayer', row: 'r1', next: 'r2', featured: true }),
    record('r2', 'و برح الخفاء', { item: 'prayer', row: 'r2' }),
    record('other', 'عظم البلاء و برح الخفاء', { item: 'other', row: 'r1' }),
  ];
  const result = run(records, 'عظم البلاء و برح الخفاء');
  assert.deepEqual(keys(result).slice(0, 2), ['r1', 'other']);
  const first = result.results[0]!;
  assert.deepEqual(first.matchedWords, ['عظم', 'البلاء']); // still the anchor row's terms
  assert.deepEqual(first.continuation?.map(part => part.row), ['r2']);
  assert.deepEqual(first.continuation?.[0]?.matchedWords, ['و', 'برح', 'الخفاء']);
  assert.equal(first.relevance.score, result.results[1]!.relevance.score);
});

test('cross-row matching respects item/language boundaries, missing links and avoids word fragments across rows', () => {
  const cases = [
    [record('a', 'alpha', { item: 'one', row: 'a', next: 'b' }), record('b', 'beta', { item: 'two', row: 'b' })],
    [record('a', 'alpha', { item: 'one', row: 'a', next: 'b' }), record('b', 'beta', { item: 'one', row: 'b', language: 'fa' })],
    [record('a', 'alpha', { item: 'one', row: 'a' }), record('b', 'beta', { item: 'one', row: 'b' })],
  ];
  for (const records of cases) {
    const result = run(records, 'alpha beta');
    assert.ok(result.results.every(hit => !hit.continuation));
    assert.ok(result.results.every(hit => hit.relevance.matchedSequenceWords === 1));
  }
  assert.equal(run([
    record('a', 'اهل', { item: 'one', row: 'a', next: 'b' }),
    record('b', 'بیت', { item: 'one', row: 'b' }),
  ], 'اهلبیت').results.length, 0);
});

test('a previously scored row is updated when its next shard arrives without discarding cached scans', () => {
  const a = record('a', 'alpha', { item: 'one', row: 'a', next: 'b' });
  const b = record('b', 'beta', { item: 'one', row: 'b' });
  const engine = new IncrementalSearch([a], 32, true);
  const request: SearchRequest = { id: 1, query: 'alpha beta', languages: ['ar'], tocLimit: 10, textLimit: 10, resultLimit: 10 };
  engine.begin(request);
  let first = engine.advance(10);
  assert.equal(first.results[0]!.relevance.matchedSequenceWords, 1);
  assert.equal(first.results[0]!.continuation, undefined);
  assert.deepEqual(engine.progress('alpha'), { cursor: 1, complete: true });
  engine.appendRecords([b]);
  let next = engine.advance(10);
  assert.equal(next.results[0]!.record.key, 'a');
  assert.equal(next.results[0]!.relevance.matchedSequenceWords, 2);
  assert.deepEqual(next.results[0]!.continuation?.map(part => part.row), ['b']);
  engine.finishLoading();
  next = engine.advance(10);
  assert.equal(next.complete, true);
  assert.deepEqual(engine.progress('alpha'), { cursor: 2, complete: true });
});

test('joined/spaced equivalent can improve one-word relevance even when a direct substring also exists', () => {
  const result = run([
    record('substring-only', 'اهلبیتش', { featured: true }),
    record('both', 'اهلبیتش و اهل بیت'),
    record('whole', 'اهل‌بیت'),
  ], 'اهلبیت');
  assert.deepEqual(keys(result), ['whole', 'both', 'substring-only']);
});

test('a split sequence crosses three rows with an unmatching typo row, even when shards arrive out of order', () => {
  const a = record('a', 'alpha', { item: 'one', row: 'a', next: 'b' });
  const b = record('b', 'actual', { item: 'one', row: 'b', next: 'c' });
  const c = record('c', 'gamma', { item: 'one', row: 'c' });
  const engine = new IncrementalSearch([a], 32, true);
  const request: SearchRequest = { id: 1, query: 'alpha typo gamma', languages: ['ar'], tocLimit: 0, textLimit: 0, resultLimit: 10 };
  engine.begin(request);
  assert.equal(engine.advance(10).results[0]!.relevance.matchedSequenceWords, 1);
  engine.appendRecords([c]); // The missing middle row remains a hard boundary for now.
  let partial = engine.advance(10);
  assert.equal(partial.results.find(hit => hit.record.key === 'a')!.relevance.matchedSequenceWords, 1);
  engine.appendRecords([b]);
  partial = engine.advance(10);
  const hit = partial.results.find(candidate => candidate.record.key === 'a')!;
  assert.equal(hit.relevance.matchedSequenceWords, 2);
  assert.deepEqual(hit.continuation?.map(part => part.row), ['b', 'c']);
  assert.deepEqual(hit.continuation?.map(part => part.matchedWords), [[], ['gamma']]);
  engine.finishLoading();
  assert.equal(engine.advance(10).complete, true);
});

test('a local sequence cannot start in a later row and attach to an unrelated anchor', () => {
  const result = run([
    record('a', 'omega', { item: 'one', row: 'a', next: 'b' }),
    record('b', 'alpha beta', { item: 'one', row: 'b' }),
  ], 'alpha beta omega');
  const anchor = result.results.find(hit => hit.record.key === 'a')!;
  assert.equal(anchor.relevance.matchedSequenceWords, 1);
  assert.equal(anchor.continuation, undefined);
  assert.equal(result.results[0]!.record.key, 'b');
});

test('a spaced occurrence can form the best phrase even when the joined spelling appears elsewhere', () => {
  const result = run([
    record('direct-far', 'اهلبیتش چیزهای دور هستند سپس یا فردی دیگر', { featured: true }),
    record('both-forms', 'اهلبیتش چیزی است سپس یا اهل بیتش'),
  ], 'یا اهلبیت');
  assert.equal(keys(result)[0], 'both-forms');
  assert.ok(result.results[0]!.relevance.matchedSequenceWords >= 2);
});

test('malformed cycles in adjacent-row metadata cannot loop or join across the item', () => {
  const result = run([
    record('a', 'alpha', { item: 'one', row: 'a', next: 'b' }),
    record('b', 'beta', { item: 'one', row: 'b', next: 'a' }),
  ], 'alpha beta alpha');
  const hit = result.results.find(candidate => candidate.record.key === 'a')!;
  assert.deepEqual(hit.continuation?.map(part => part.row), ['b']);
  assert.equal(hit.relevance.matchedSequenceWords, 2);
});

test('reordering already-cached terms emits provisional results before ranking a large result set', () => {
  const records = Array.from({ length: 1800 }, (_, index) =>
    record(`r${index}`, index === 1799 ? 'beta alpha' : 'alpha beta', { order: index }));
  const engine = new IncrementalSearch(records);
  const request = (query: string): SearchRequest => ({ id: 1, query, languages: ['ar'], tocLimit: 0, textLimit: 0, resultLimit: 10 });
  engine.begin(request('alpha beta'));
  let result = engine.advance(records.length);
  while (!result.complete) result = engine.advance(records.length);
  assert.deepEqual(engine.progress('alpha'), { cursor: records.length, complete: true });
  assert.deepEqual(engine.progress('beta'), { cursor: records.length, complete: true });
  result = engine.begin(request('beta alpha'));
  assert.equal(result.complete, false); // ranking, not the already-cached word scans, is still in progress
  assert.ok(result.results.length > 0);
  assert.ok(result.results.every(hit => hit.matchedWords.length > 0));
  assert.equal(engine.hasUnscannedRecords(), true); // includes pending relevance work
  while (!result.complete) result = engine.advance(200);
  assert.equal(result.results[0]!.record.key, 'r1799');
  assert.deepEqual(engine.progress('alpha'), { cursor: records.length, complete: true });
  assert.deepEqual(engine.progress('beta'), { cursor: records.length, complete: true });
});
