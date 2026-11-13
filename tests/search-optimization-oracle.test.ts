import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch, normalizeSearchQuery } from '../src/normalize.js';
import { IncrementalSearch, type SearchLanguage, type SearchRecord, type SearchRequest, type SearchSnapshot } from '../src/search.js';
import { findOriginalMatches } from '../src/search-text.js';
import { normalizedTokens, scoreSequence, type SequencePart } from '../src/search-relevance.js';

function simplify(snapshot: SearchSnapshot) {
  return { total: snapshot.resultsTotal, toc: snapshot.tocTotal, text: snapshot.textTotal,
    hits: snapshot.results.map(hit => ({ key: hit.record.key, words: hit.matchedWords, direct: hit.directMatches,
      relevance: hit.relevance, continuation: hit.continuation?.map(part => ({ row: part.row, words: part.matchedWords })) })) };
}

test('warmed mixed-term and alias scoring agrees with full continuation scoring', () => {
  let state = 0x592ceacb;
  const random = (n: number): number => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; };
  const values = ['یا', 'رَحْمَة', 'رحمت', 'رحمه', 'الله', 'الذاه', 'اللّذاة', 'اللذات',
    'اليلت', 'اللّيلَة', 'اهل بیت', 'صلاة الله', 'نور', '𐐀ة'];
  const records: SearchRecord[] = [];
  for (let item = 0; item < 42; item++) for (let position = 0; position < 4; position++) {
    const key = `${item}:${position}`;
    const text = item === 0 && position < 2 ? 'یا' : Array.from({ length: 1 + random(3) }, () => values[random(values.length)]!).join(' ');
    records.push({ key, section: 'text', item: `i${item}`, row: key, language: item % 2 ? 'ar' : 'fa',
      text, normalized: normalizeSearch(text), featured: item % 3 === 0, order: records.length,
      ...(position < 3 ? { next: `${item}:${position + 1}` } : {}) });
  }
  const queries = ['یا رحمت الله', 'یا الذاه', 'یا یا', 'رحمت رحمه', 'اهلبیت رحمة',
    'اللیلت یا', 'صلاتالله نور', 'یا ت ة', '𐐀ت الله'];
  const makeRequest = (query: string): SearchRequest => ({ id: 1, query, languages: ['ar', 'fa'],
    resultLimit: records.length, tocLimit: 0, textLimit: records.length });
  const finish = (engine: IncrementalSearch, query: string, batch: number): SearchSnapshot => {
    let snapshot = engine.begin(makeRequest(query)), steps = 0;
    while (!snapshot.complete && steps++ < 10000) snapshot = engine.advance(batch);
    assert.ok(snapshot.complete, query); return snapshot;
  };
  const warm = new IncrementalSearch(records, 64);
  const words = new Set(queries.flatMap(query => normalizeSearchQuery(query).split(' ')));
  for (const word of words) finish(warm, word, records.length);
  const byKey = new Map(records.map(record => [record.key, record]));
  for (const query of queries) {
    const result = finish(warm, query, 17);
    assert.deepEqual(simplify(result), simplify(finish(new IncrementalSearch(records, 64), query, 7)), query);
    const sequence = normalizeSearchQuery(query).split(' ');
    for (const hit of result.results) {
      const anchor = hit.record, parts: SequencePart[] = [{ record: anchor }];
      let remaining = 4 * sequence.length + sequence.reduce((sum, word) => sum + word.length, 0);
      let current = anchor;
      const seen = new Set([anchor.key]);
      while (current.next && remaining > 0 && !seen.has(current.next)) {
        const next = byKey.get(current.next);
        if (!next || next.section !== 'text' || next.item !== anchor.item || next.language !== anchor.language || !next.row) break;
        const length = normalizedTokens(next).length;
        if (!length) break;
        const maxTokens = Math.min(length, remaining);
        parts.push({ record: next, maxTokens });
        remaining -= maxTokens; seen.add(next.key); current = next;
        if (maxTokens < length) break;
      }
      const expected = scoreSequence(parts, sequence);
      assert.deepEqual(hit.relevance, expected.relevance, `${query}: ${anchor.key}`);
      assert.deepEqual((hit.continuation ?? []).map(part => part.row),
        parts.slice(1, expected.endPart + 1).map(part => part.record.row), `${query}: ${anchor.key} continuation`);
    }
  }
  const repeated = finish(warm, 'یا یا', records.length).results.find(hit => hit.record.key === '0:0');
  assert.equal(repeated?.relevance.matchedSequenceWords, 2);
  assert.equal(repeated?.continuation?.[0]?.row, '0:1');
});

test('an isolated cached score is invalidated when a missing ta/lam continuation arrives', () => {
  const make = (key: string, text: string, next?: string): SearchRecord => ({
    key, section: 'text', item: 'late', row: key, language: 'ar', text, normalized: normalizeSearch(text),
    featured: false, order: key === 'anchor' ? 0 : 1, ...(next ? { next } : {}),
  });
  const anchor = make('anchor', 'یا', 'later');
  const engine = new IncrementalSearch([anchor], 16, true);
  const request = (query: string, id: number): SearchRequest => ({ id, query, item: 'late', languages: ['ar'],
    resultLimit: 10, tocLimit: 0, textLimit: 10 });
  for (const [id, query] of ['یا', 'الذاه'].entries()) {
    engine.begin(request(query, id));
    while (engine.hasUnscannedRecords()) engine.advance(100);
  }
  let result = engine.begin(request('یا الذاه', 3));
  while (engine.hasUnscannedRecords()) result = engine.advance(100);
  assert.equal(result.complete, false);
  assert.equal(result.results.find(hit => hit.record.key === 'anchor')?.relevance.matchedSequenceWords, 1);
  engine.appendRecords([make('later', 'اللّذاة')]); engine.finishLoading();
  while (!result.complete) result = engine.advance(100);
  const hit = result.results.find(value => value.record.key === 'anchor');
  assert.deepEqual(hit?.relevance, { score: 12, matchedSequenceWords: 2, exactSequenceWords: 2 });
  assert.deepEqual(hit?.continuation?.map(part => [part.row, part.matchedWords]), [['later', ['الذاه']]]);
});

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

test('ت/ة alternatives survive query edits, scopes and incremental shard loading', () => {
  const texts = ['رَحْمَةٌ', 'رحمه', 'رحمت', 'صَلَاةُ الله', 'صلاه الله', 'صلات الله', 'تة هت', 'ةة تت'];
  const records: SearchRecord[] = Array.from({ length: 96 }, (_, index) => {
    const value = texts[(index * 7 + Math.floor(index / 8)) % texts.length]!;
    return { key: `ta:${index}`, section: 'text', item: `i${index % 4}`, row: `r${index}`,
      language: index % 2 ? 'ar' : 'fa', text: value, normalized: normalizeSearch(value),
      featured: index % 3 === 0, order: index };
  });
  const queries = ['ت', 'ة', 'ه', 'ته', 'تة', 'تت', 'رح', 'رحم', 'رحمت', 'رحمه', 'رحمة', 'صل', 'صلات', 'صلاتالله', 'صلاتاللة', 'یا رحمت الله'];
  const engine = new IncrementalSearch(records.slice(0, 16), 7, true);
  for (let i = 0; i < queries.length; i++) {
    engine.begin({ id: i, query: queries[i]!, languages: ['ar', 'fa'], tocLimit: 100, textLimit: 100, resultLimit: 100 });
    engine.advance(3);
    if (i % 2 === 0) engine.appendRecords(records.slice(16 + i / 2 * 13, 16 + (i / 2 + 1) * 13));
  }
  // Append any rows not already loaded, without duplicate keys.
  const loaded = new Set(records.slice(0, 16).map(record => record.key));
  for (let i = 0; i < queries.length; i += 2) for (const r of records.slice(16 + i / 2 * 13, 16 + (i / 2 + 1) * 13)) loaded.add(r.key);
  engine.appendRecords(records.filter(record => !loaded.has(record.key))); engine.finishLoading();
  for (const [i, query] of queries.entries()) for (const item of [undefined, 'i1', 'i2']) {
    const request: SearchRequest = { id: i, query, languages: ['ar', 'fa'], tocLimit: 100, textLimit: 100,
      resultLimit: 100, ...(item ? { item } : {}) };
    function finish(current: IncrementalSearch) {
      let result = current.begin(request), n = 0;
      while (!result.complete && n++ < 1000) result = current.advance(7);
      assert.ok(result.complete);
      return simplify(result);
    }
    // Arrival order is not source order here; compare by stable key because the
    // public source-order tiebreak is deliberately affected by shard order.
    const canonical = (snapshot: ReturnType<typeof simplify>) => ({ ...snapshot,
      hits: [...snapshot.hits].sort((a, b) => a.key.localeCompare(b.key)) });
    assert.deepEqual(canonical(finish(engine)), canonical(finish(new IncrementalSearch(records, 7))), `${query}/${item ?? 'global'}`);
  }
});
