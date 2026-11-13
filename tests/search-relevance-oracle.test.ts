import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareSequence, scoreSequence } from '../src/search-relevance.js';
import { normalizeSearch } from '../src/normalize.js';
import type { SearchRecord } from '../src/search.js';

/** Independent exhaustive oracle over all short ordered alignments, not DP. */
function exhaustive(query: string[], source: string[], anchorLength: number,
  matches: (token: string, word: string) => { found: boolean; whole: boolean } =
    (token, word) => ({ found: token.includes(word), whole: token === word })) {
  let best = { score: 0, count: 0, exact: 0, start: 0, end: 0 };
  function beats(a: typeof best, b: typeof best): boolean {
    return a.score > b.score || (a.score === b.score && a.score > 0 && (a.count > b.count ||
      (a.count === b.count && (a.exact > b.exact || (a.exact === b.exact &&
        (a.end - a.start < b.end - b.start || (a.end - a.start === b.end - b.start && a.start < b.start)))))));
  }
  function visit(qLast: number, sLast: number, state: typeof best): void {
    for (let qi = qLast + 1; qi < query.length; qi += 1) for (let si = sLast + 1; si < source.length; si += 1) {
      const word = query[qi]!, token = source[si]!;
      const { found, whole } = matches(token, word);
      if (!found || (state.count === 0 && si >= anchorLength)) continue;
      const gap = state.count ? qi - qLast - 1 + si - sLast - 1 : 0;
      const next = { score: state.score + (whole ? 6 : 3) - 2 * gap, count: state.count + 1,
        exact: state.exact + Number(whole), start: state.count ? state.start : si, end: si };
      if (next.score <= 0) continue;
      if (beats(next, best)) best = next;
      visit(qi, si, next);
    }
  }
  visit(-1, -1, best);
  return best;
}
function row(key: string, words: string[]): SearchRecord {
  const value = words.join(' ');
  return { key, section: 'text', item: 'test', row: key, language: 'ar', text: value,
    normalized: normalizeSearch(value), featured: false, order: 0 };
}

test('seeded local sequence scores agree with exhaustive ordered alignment across one or two rows', () => {
  let state = 0xf6712a83;
  function random(n: number) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; }
  const queries = ['alpha', 'beta', 'gamma', 'x'];
  const words = ['alpha', 'beta', 'gamma', 'x', 'alphabet', 'betamax', 'other'];
  for (let run = 0; run < 10000; run += 1) {
    const q = Array.from({ length: 1 + random(5) }, () => queries[random(queries.length)]!);
    const source = Array.from({ length: 1 + random(7) }, () => words[random(words.length)]!);
    const split = 1 + random(source.length);
    const parts = [{ record: row('one', source.slice(0, split)) },
      ...(split < source.length ? [{ record: row('two', source.slice(split)) }] : [])];
    const want = exhaustive(q, source, split);
    const got = scoreSequence(parts, q);
    assert.equal(got.relevance.score, want.score, `case ${run}: ${q} vs ${source} at ${split}`);
    assert.equal(got.relevance.matchedSequenceWords, want.count, `case ${run}: sequence count`);
    assert.equal(got.relevance.exactSequenceWords, want.exact, `case ${run}: exact count`);
    assert.equal(got.endPart, want.end >= split ? 1 : 0, `case ${run}: ${q} vs ${source} at ${split}; best=${JSON.stringify(want)}`);
  }
});

test('multiword alignment reuses compiled variants instead of looking them up for every token', () => {
  const parts = [{ record: row('first', ['alpha']) },
    { record: row('second', Array.from({ length: 100 }, (_, index) => index % 2 ? 'alpha' : 'beta')) }];
  const query = ['alpha', 'beta'];
  scoreSequence(parts, query); // populate the bounded variant cache before measuring
  const original = Map.prototype.get; let lookups = 0;
  Map.prototype.get = function(key: unknown) {
    if (key === 'alpha' || key === 'beta') lookups++;
    return original.call(this, key);
  };
  let scored: ReturnType<typeof scoreSequence>;
  try { scored = scoreSequence(parts, query); } finally { Map.prototype.get = original; }
  assert.deepEqual(scored, { relevance: { score: 12, matchedSequenceWords: 2, exactSequenceWords: 2 }, endPart: 1 });
  assert.ok(lookups <= 12, `looked up the same term variants ${lookups} times for 101 source tokens`);
});

test('a prepared sequence retains its terms across caller edits and variant-cache eviction', () => {
  const parts = [{ record: row('anchor', ['یا']) }, { record: row('next', ['رَحْمَة']) }];
  const query = ['یا', 'رحمت'], prepared = prepareSequence(query);
  query[1] = 'نور';
  for (let index = 0; index < 160; index++) scoreSequence([parts[0]!], [`evict${index}`]);
  assert.deepEqual(prepared(parts), scoreSequence(parts, ['یا', 'رحمت']));
  assert.deepEqual(prepared(parts), { relevance: { score: 12, matchedSequenceWords: 2, exactSequenceWords: 2 }, endPart: 1 });
  assert.deepEqual(scoreSequence(parts, query), { relevance: { score: 6, matchedSequenceWords: 1, exactSequenceWords: 1 }, endPart: 0 });
});

test('incremental ranking produces the same final results as an all-at-once run', async () => {
  const { IncrementalSearch } = await import('../src/search.js');
  let state = 0x8e12fa39;
  function random(n: number) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; }
  const words = ['alpha', 'beta', 'gamma', 'x', 'alphabet', 'betamax', 'other'];
  const records: SearchRecord[] = [];
  for (let item = 0; item < 220; item += 1) for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
    const value = Array.from({ length: 1 + random(7) }, () => words[random(words.length)]!).join(' ');
    const key = `${item}-${rowIndex}`;
    records.push({ key, section: 'text', item: `i${item}`, row: key, language: 'ar', text: value,
      normalized: normalizeSearch(value), featured: item % 3 === 0, order: records.length,
      ...(rowIndex === 0 ? { next: `${item}-1` } : {}) });
  }
  for (const query of ['alpha beta', 'beta alpha', 'alpha typo gamma', 'x x beta', 'gamma beta alpha', 'alpha']) {
    const request = { id: 1, query, languages: ['ar' as const], tocLimit: 0, textLimit: 0, resultLimit: records.length };
    function run(batch: number) {
      const engine = new IncrementalSearch(records);
      let snapshot = engine.begin(request), iterations = 0;
      while (!snapshot.complete && iterations++ < 2000) snapshot = engine.advance(batch);
      assert.ok(snapshot.complete, `${query}: did not complete`);
      return snapshot.results.map(hit => ({ key: hit.record.key, words: hit.matchedWords, relevance: hit.relevance,
        next: hit.continuation?.map(part => ({ row: part.row, words: part.matchedWords })) }));
    }
    assert.deepEqual(run(11), run(records.length), query);
  }
});

test('single-possible-term shortcut preserves joined scoring and never collapses repeated terms', () => {
  const joined = row('one', ['اهل', 'بیتش']);
  const single = scoreSequence([{ record: joined }], ['غلط', 'اهلبیت', 'ناموجود']);
  assert.deepEqual(single.relevance, { score: 4, matchedSequenceWords: 1, exactSequenceWords: 0 });
  const twice = row('two', ['اهل', 'بیتش', 'اهل', 'بیتش']);
  const repeated = scoreSequence([{ record: twice }], ['اهلبیت', 'اهلبیت']);
  assert.deepEqual(repeated.relevance, { score: 8, matchedSequenceWords: 2, exactSequenceWords: 0 });
  const cross = scoreSequence([{ record: row('a', ['alpha']) }, { record: row('b', ['beta']) }], ['alpha', 'typo', 'beta']);
  assert.deepEqual(cross.relevance, { score: 10, matchedSequenceWords: 2, exactSequenceWords: 2 });
  assert.equal(cross.endPart, 1);
});

test('multiple joined terms in one source keep their positions, order and repeated occurrences', () => {
  const both = row('one', ['یا', 'اهل', 'بیتش', 'و', 'می', 'روم']);
  const result = scoreSequence([{ record: both }], ['یا', 'اهلبیت', 'و', 'میروم']);
  assert.deepEqual(result.relevance, { score: 20, matchedSequenceWords: 4, exactSequenceWords: 2 });
  const reversed = scoreSequence([{ record: both }], ['میروم', 'اهلبیت']);
  assert.equal(reversed.relevance.matchedSequenceWords, 1);
  const second = row('two', ['و', 'می', 'روم']);
  const split = scoreSequence([{ record: row('first', ['یا', 'اهل', 'بیتش']) }, { record: second }],
    ['یا', 'اهلبیت', 'و', 'میروم']);
  assert.equal(split.relevance.score, 20);
  assert.equal(split.endPart, 1);
});

test('directional ت/ه/ة sequence scores agree with an independent exhaustive oracle', () => {
  let state = 0xb73e0021;
  function random(n: number) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; }
  const queries = ['رحمت', 'رحمه', 'رحمة', 'عقوبت', 'عقوبه', 'عقوبة', 'تت', 'ته', 'هت', 'تة', 'ةت', 'ةة', 'یا', 'رب'];
  const values = ['رحمة', 'رحمه', 'رحمت', 'عقوبة', 'عقوبه', 'عقوبت', 'تت', 'تة', 'ةت', 'ةة', 'ته', 'هت', 'هه', 'یا', 'رب', 'غير'];
  const independent = (token: string, word: string) => {
    let found = false;
    for (let start = 0; start + word.length <= token.length; start++) {
      let same = true;
      for (let i = 0; i < word.length; i++) {
        const q = word[i], s = token[start + i];
        if (q !== s && !(s === 'ة' && (q === 'ت' || q === 'ه')) &&
            !(q === 'ة' && (s === 'ت' || s === 'ه'))) { same = false; break; }
      }
      if (same) { found = true; break; }
    }
    return { found, whole: found && token.length === word.length };
  };
  for (let run = 0; run < 3000; run++) {
    const q = Array.from({ length: 1 + random(5) }, () => queries[random(queries.length)]!);
    const source = Array.from({ length: 1 + random(7) }, () => values[random(values.length)]!);
    const split = 1 + random(source.length);
    const parts = [{ record: row('one', source.slice(0, split)) },
      ...(split < source.length ? [{ record: row('two', source.slice(split)) }] : [])];
    const want = exhaustive(q, source, split, independent), got = scoreSequence(parts, q);
    assert.equal(got.relevance.score, want.score, `score ${run}: ${q} vs ${source} at ${split}`);
    assert.equal(got.relevance.matchedSequenceWords, want.count, `count ${run}: ${q} vs ${source}`);
    assert.equal(got.relevance.exactSequenceWords, want.exact, `exact ${run}: ${q} vs ${source}`);
    assert.equal(got.endPart, want.end >= split ? 1 : 0, `end ${run}: ${q} vs ${source}`);
  }
});
