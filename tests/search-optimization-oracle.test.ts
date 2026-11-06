import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, type SearchLanguage, type SearchRecord, type SearchRequest, type SearchSnapshot } from '../src/search.js';
import { findOriginalMatches } from '../src/search-text.js';

function simplify(snapshot: SearchSnapshot) {
  return { total: snapshot.resultsTotal, toc: snapshot.tocTotal, text: snapshot.textTotal,
    hits: snapshot.results.map(hit => ({ key: hit.record.key, words: hit.matchedWords, direct: hit.directMatches,
      relevance: hit.relevance, continuation: hit.continuation?.map(part => ({ row: part.row, words: part.matchedWords })) })) };
}

test('prefix caches, item scopes, eviction and out-of-order shards agree with fresh full searches', () => {
  let state = 0x53ad9c07;
  function random(n: number) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; }
  const tokens = ['اهل', 'بیتش', 'اهلبیت', 'یا', 'رب', 'الهی', 'عظم', 'البلاء', 'و', 'اللّٰه', 'alpha', 'beta', 'gamma', 'other'];
  const records: SearchRecord[] = [];
  for (let item = 0; item < 120; item += 1) for (let row = 0; row < 2; row += 1) {
    const key = `${item}:${row}`, language: SearchLanguage = item % 2 ? 'ar' : 'fa';
    const value = Array.from({ length: 1 + random(6) }, () => tokens[random(tokens.length)]!).join(item % 7 ? ' ' : '، ');
    records.push({ key, section: 'text', item: `i${item}`, row: key, language, text: value,
      normalized: normalizeSearch(value), featured: item % 3 === 0, order: item * 2 + row,
      ...(row === 0 ? { next: `${item}:1` } : {}) });
  }
  // A deterministic shuffle makes future adjacent rows arrive in arbitrary shards.
  for (let i = records.length - 1; i > 0; i -= 1) { const j = random(i + 1); [records[i], records[j]] = [records[j]!, records[i]!]; }
  const cases: SearchRequest[] = [
    { id: 1, query: 'اهلبی', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 2, query: 'اهلبیت', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 3, query: 'یا رب', languages: ['ar'], item: 'i33', tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 4, query: 'alpha beta gamma', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 5, query: 'alpha typo gamma', languages: ['fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 6, query: 'الله الله و الهی', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 7, query: 'الهی عظم البلا', languages: ['ar', 'fa'], item: 'i22', tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 8, query: 'یا اهلبیت', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 9, query: 'اهلبی', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
    { id: 10, query: 'اهلبیت', languages: ['ar', 'fa'], tocLimit: 1000, textLimit: 1000, resultLimit: 1000 },
  ];
  const initial = records.slice(0, 20), engine = new IncrementalSearch(initial, 5, true);
  let loaded = initial.length;
  for (let step = 0; step < 25; step += 1) {
    const request = cases[step % cases.length]!;
    engine.begin(request);
    const partial = engine.advance(1 + random(5));
    for (const hit of partial.results) {
      assert.ok(!request.item || hit.record.item === request.item);
      assert.ok(hit.record.section === 'toc' || request.languages.includes(hit.record.language as SearchLanguage));
      for (const word of hit.matchedWords) assert.ok(findOriginalMatches(hit.record.text, [word], 1).length);
    }
    if (loaded < records.length) {
      const end = Math.min(records.length, loaded + 11);
      engine.appendRecords(records.slice(loaded, end)); loaded = end;
    }
  }
  if (loaded < records.length) engine.appendRecords(records.slice(loaded));
  engine.finishLoading();
  for (const request of cases) {
    function finish(current: IncrementalSearch) {
      let result = current.begin(request), iterations = 0;
      while (!result.complete && iterations++ < 10000) result = current.advance(7);
      assert.ok(result.complete, request.query);
      return simplify(result);
    }
    assert.deepEqual(finish(engine), finish(new IncrementalSearch(records, 5)), `${request.query} / ${request.item ?? 'global'}`);
  }
});
