import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, type SearchHit, type SearchRecord, type SearchRequest, type SearchSnapshot } from '../src/search.js';

function record(key: string, value: string, options: Partial<SearchRecord> = {}): SearchRecord {
  return { key, section: 'text', item: key, row: key, language: 'ar', text: value,
    normalized: normalizeSearch(value), featured: false, order: 0, ...options };
}
function request(query: string, options: Partial<SearchRequest> = {}): SearchRequest {
  return { id: 1, query, languages: ['ar', 'fa'], resultLimit: 1000, tocLimit: 1000, textLimit: 1000, ...options };
}
function finish(records: SearchRecord[], query: string, options: Partial<SearchRequest> = {}): SearchSnapshot {
  const engine = new IncrementalSearch(records);
  let result = engine.begin(request(query, options));
  while (!result.complete) result = engine.advance(1000);
  return result;
}
const keys = (result: SearchSnapshot) => result.results.map(hit => hit.record.key);
// This independently mirrors the *displayed* UI count, not the sequence length
// or the prior coverage approximation used by the scorer.
function displayedCount(hit: SearchHit): number {
  return new Set([...hit.matchedWords, ...(hit.continuation ?? []).flatMap(part => part.matchedWords)]).size;
}

function assertCountAndStarOrder(hits: SearchHit[]): void {
  for (let i = 1; i < hits.length; i += 1) {
    const a = hits[i - 1]!, b = hits[i]!;
    assert.ok(displayedCount(a) >= displayedCount(b), `${a.record.key} / ${b.record.key}: displayed counts`);
    if (displayedCount(a) === displayedCount(b)) {
      assert.ok(a.record.featured || !b.record.featured, `${a.record.key} / ${b.record.key}: starred tie`);
    }
  }
}

test('starred substring beats an unstarred whole word with equal displayed count, including top-K', () => {
  const records = [
    record('exact', 'اللّٰه', { order: 0 }),
    record('star', 'اللهم', { featured: true, order: 1 }),
  ];
  const full = finish(records, 'الله');
  assert.deepEqual(keys(full), ['star', 'exact']);
  assert.deepEqual(full.results.map(displayedCount), [1, 1]);
  assert.ok(full.results[0]!.relevance.score < full.results[1]!.relevance.score);
  for (const input of [records, [...records].reverse()]) {
    const limited = finish(input, 'الله', { resultLimit: 1, textLimit: 1 });
    assert.deepEqual(keys(limited), ['star']);
    assert.deepEqual(limited.text.map(hit => hit.record.key), ['star']);
    assert.equal(limited.resultsTotal, 2);
    assert.equal(limited.textTotal, 2);
  }
});

test('count, then star, are transitive keys across relevance-score cycles and permutations', () => {
  const twoWords = record('two-words', 'alphabet noise betaish', { order: 2 }); // count 2, score 4
  const star = record('star', 'alphabet', { featured: true, order: 1 }); // count 1, score 3
  const exact = record('exact', 'alpha', { order: 0 }); // count 1, score 6
  const permutations = [
    [twoWords, star, exact], [twoWords, exact, star], [star, twoWords, exact],
    [star, exact, twoWords], [exact, twoWords, star], [exact, star, twoWords],
  ];
  for (const records of permutations) {
    for (const limit of [1, 2, 3, 10]) {
      const result = finish(records, 'alpha beta', { resultLimit: limit, textLimit: limit });
      assert.deepEqual(keys(result), ['two-words', 'star', 'exact'].slice(0, limit));
      assertCountAndStarOrder(result.results);
      assert.equal(result.resultsTotal, 3);
    }
  }
  const all = finish(permutations[0]!, 'alpha beta').results;
  assert.deepEqual(all.map(displayedCount), [2, 1, 1]);
  assert.ok(all[0]!.relevance.score < all[2]!.relevance.score);
});

test('star precedes an exact TOC hit and exactness remains a tie-break within one star status', () => {
  const records = [
    record('toc-exact', 'alpha', { section: 'toc', language: 'toc' }),
    record('star-substring', 'alphabet', { featured: true }),
    record('star-exact', 'alpha', { featured: true }),
    record('ordinary-substring', 'alphabet'),
  ];
  const result = finish(records, 'alpha');
  assert.deepEqual(keys(result), ['star-exact', 'star-substring', 'toc-exact', 'ordinary-substring']);
  assertCountAndStarOrder(result.results);
  assert.deepEqual(result.toc.map(hit => hit.record.key), ['toc-exact']);
});

test('scattered distinct anchor terms and repeated query terms use the UI count, not sequence length', () => {
  const scattered = finish([
    record('exact', 'alpha beta gamma'),
    record('star', 'alpha one two three four five beta one two three four five gamma', { featured: true }),
  ], 'alpha beta gamma');
  assert.deepEqual(keys(scattered), ['star', 'exact']);
  assert.deepEqual(scattered.results.map(displayedCount), [3, 3]);
  assert.ok(scattered.results[0]!.relevance.matchedSequenceWords < scattered.results[1]!.relevance.matchedSequenceWords);
  assert.ok(scattered.results[0]!.relevance.score < scattered.results[1]!.relevance.score);

  const repeated = finish([
    record('exact-twice', 'alpha alpha'),
    record('star-substring', 'alphabet', { featured: true }),
  ], 'alpha alpha');
  assert.deepEqual(keys(repeated), ['star-substring', 'exact-twice']);
  assert.deepEqual(repeated.results.map(displayedCount), [1, 1]);
  assert.equal(repeated.results[1]!.relevance.matchedSequenceWords, 2);
});

test('continuation terms count once, including joined/spaced matches, before the star tie-break', () => {
  const records = [
    record('star', 'alphabet', { featured: true }),
    record('anchor', 'alpha', { item: 'same', row: 'a', next: 'continuation' }),
    record('continuation', 'اهل بیتش alpha', { item: 'same', row: 'b' }),
  ];
  const result = finish(records, 'alpha اهلبیت');
  const anchor = result.results.find(hit => hit.record.key === 'anchor')!;
  assert.equal(result.results[0]!.record.key, 'anchor');
  assert.deepEqual(anchor.matchedWords, ['alpha']);
  assert.deepEqual(anchor.continuation?.map(part => part.row), ['b']);
  assert.deepEqual(new Set(anchor.continuation?.[0]?.matchedWords), new Set(['alpha', 'اهلبیت']));
  assert.equal(displayedCount(anchor), 2); // alpha on both rows counts once
  assertCountAndStarOrder(result.results);
});

test('a newly loaded continuation invalidates the cached count and can outrank a one-word star', () => {
  const first = [
    record('star', 'alphabet', { featured: true }),
    record('anchor', 'alpha', { item: 'same', row: 'a', next: 'continuation' }),
  ];
  const engine = new IncrementalSearch(first, 32, true);
  engine.begin(request('alpha beta'));
  let result = engine.advance(10);
  assert.deepEqual(keys(result), ['star', 'anchor']);
  assert.equal(displayedCount(result.results[1]!), 1);
  engine.appendRecords([record('continuation', 'beta', { item: 'same', row: 'b' })]);
  engine.finishLoading();
  while (!result.complete) result = engine.advance(10);
  assert.equal(result.results[0]!.record.key, 'anchor');
  assert.equal(displayedCount(result.results[0]!), 2);
  assert.deepEqual(result.results[0]!.continuation?.map(part => part.row), ['b']);
  assertCountAndStarOrder(result.results);
});

test('provisional cached results and final bounded results both prioritize an equal-count star', () => {
  const records = Array.from({ length: 400 }, (_, n) =>
    record(`ordinary-${n}`, 'beta alpha', { order: n }));
  records.push(record('star', 'betamax alphabet', { featured: true, order: records.length }));
  const engine = new IncrementalSearch(records);
  let result = engine.begin(request('alpha beta', { resultLimit: 1, textLimit: 1 }));
  while (!result.complete) result = engine.advance(records.length);
  result = engine.begin(request('beta alpha', { id: 2, resultLimit: 1, textLimit: 1 }));
  assert.equal(result.complete, false); // cached scans, but scores beyond the first 120 remain provisional
  assert.equal(result.results[0]!.record.key, 'star');
  assert.equal(displayedCount(result.results[0]!), 2);
  assert.equal(result.results[0]!.relevance.matchedSequenceWords, 1); // still a provisional score
  while (!result.complete) result = engine.advance(50);
  assert.equal(result.results[0]!.record.key, 'star');
  assert.equal(displayedCount(result.results[0]!), 2);
  assert.equal(result.resultsTotal, records.length);
});
