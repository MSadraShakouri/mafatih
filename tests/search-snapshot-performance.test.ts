import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch, normalizeSearchPreservingTa, normalizeSearchQuery } from '../src/normalize.js';
import { IncrementalSearch, type SearchRecord, type SearchRequest, type SearchSnapshot } from '../src/search.js';
import { normalizedTokens } from '../src/search-relevance.js';

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

test('short one-term ranking matches the general repeated-term path, including partial and scoped pages', () => {
  const values = ['ت', 'ه', 'ة', 'بت', 'به', 'بة', 'تت', 'ته', 'تة', 'اب', '𐐀ة'];
  const records: SearchRecord[] = Array.from({ length: 1200 }, (_, index) => {
    const text = values[(index * 7 + Math.floor(index / 11)) % values.length]!;
    const toc = index % 13 === 0;
    return { key: `short-${index}`, section: toc ? 'toc' : 'text', item: `item-${index % 5}`,
      ...(toc ? {} : { row: `row-${index}` }), language: toc ? 'toc' : index % 2 ? 'ar' : 'fa',
      text, normalized: normalizeSearch(text), featured: index % 9 === 0, order: Math.floor(index / 4) };
  });
  const simplify = (snapshot: SearchSnapshot) => ({ ...snapshot,
    results: snapshot.results.map(hit => ({ key: hit.record.key, matchedWords: hit.matchedWords, directMatches: hit.directMatches, relevance: hit.relevance })),
    toc: snapshot.toc.map(hit => hit.record.key), text: snapshot.text.map(hit => hit.record.key) });
  for (const query of ['ت', 'ه', 'ة', 'تة', 'اب', '𐐀ة']) for (const item of [undefined, 'item-1']) {
    const request: SearchRequest = { id: 1, query, ...(item ? { item } : {}), languages: ['ar', 'fa'],
      resultLimit: 21, tocLimit: 7, textLimit: 17 };
    const fast = new IncrementalSearch(records), general = new IncrementalSearch(records);
    let a = fast.begin(request), b = general.begin({ ...request, query: `${query} ${query}` });
    for (let i = 0; i < 5; i++) {
      assert.deepEqual(simplify(a), simplify(b), `partial ${query}/${item ?? 'all'}/${i}`);
      a = fast.advance(37); b = general.advance(37);
    }
    while (!a.complete) a = fast.advance(300);
    while (!b.complete) b = general.advance(300);
    assert.deepEqual(simplify(a), simplify(b), `complete ${query}/${item ?? 'all'}`);
  }
});

test('single-term ranking preserves the general path for direct, joined and aliased matches', () => {
  // Every source field contains at most one occurrence of each query, so
  // repeating the query exercises the general scorer without changing score.
  const values = ['الله', 'بسم الله', 'رحمة', 'برحمة', 'رحمت', 'رحمه',
    'صلاة الله', 'بصلاتالله', 'صلاتالله', 'اللّيلَة', 'اللیت', 'نور'];
  const records: SearchRecord[] = Array.from({ length: 1200 }, (_, index) => {
    const text = values[(index * 7 + Math.floor(index / 11)) % values.length]!;
    const toc = index % 13 === 0;
    return { key: `long-parity-${index}`, section: toc ? 'toc' : 'text', item: `item-${index % 5}`,
      ...(toc ? {} : { row: `r${index}` }), language: toc ? 'toc' : index % 2 ? 'ar' : 'fa',
      text, normalized: normalizeSearch(text), featured: index % 9 === 0, order: Math.floor(index / 4) };
  });
  const simplify = (snapshot: SearchSnapshot) => ({ ...snapshot,
    results: snapshot.results.map(hit => ({ key: hit.record.key, matchedWords: hit.matchedWords, directMatches: hit.directMatches, relevance: hit.relevance })),
    toc: snapshot.toc.map(hit => hit.record.key), text: snapshot.text.map(hit => hit.record.key) });
  for (const query of ['الله', 'رحمت', 'رحمه', 'رحمة', 'صلاتالله', 'اللیلة']) for (const item of [undefined, 'item-1']) {
    const request: SearchRequest = { id: 1, query, ...(item ? { item } : {}), languages: ['ar', 'fa'],
      resultLimit: 21, tocLimit: 7, textLimit: 17 };
    const single = new IncrementalSearch(records), general = new IncrementalSearch(records);
    let a = single.begin(request), b = general.begin({ ...request, query: `${query} ${query}` });
    for (let i = 0; i < 5; i++) {
      assert.deepEqual(simplify(a), simplify(b), `partial ${query}/${item ?? 'all'}/${i}`);
      a = single.advance(37); b = general.advance(37);
    }
    while (!a.complete) a = single.advance(300);
    while (!b.complete) b = general.advance(300);
    assert.deepEqual(simplify(a), simplify(b), `complete ${query}/${item ?? 'all'}`);
  }
});

test('single-term ranking and limited categories agree with an independent character-by-character oracle', () => {
  const texts = ['ة ه ت', 'رَحْمَة ت', 'بت به', 'تة ةت', '𐐀ة نور', 'بَت بة', 'ه ب', 'تت', 'غير'];
  const records: SearchRecord[] = Array.from({ length: 384 }, (_, index) => {
    const text = texts[(index * 5 + Math.floor(index / 7)) % texts.length]!;
    const toc = index % 17 === 0;
    return { key: `oracle-${index}`, section: toc ? 'toc' : 'text', item: `item-${index % 4}`,
      ...(toc ? {} : { row: `r${index}` }), language: toc ? 'toc' : index % 3 ? 'ar' : 'fa',
      text, normalized: normalizeSearch(text),
      featured: index % 11 === 0, order: Math.floor(index / 3) };
  });
  const matches = (word: string, source: string): boolean => {
    if (word.length !== source.length) return false;
    for (let i = 0; i < word.length; i++) {
      const q = word[i], s = source[i];
      if (q !== s && !(s === 'ة' && (q === 'ت' || q === 'ه')) &&
          !(q === 'ة' && (s === 'ت' || s === 'ه'))) return false;
    }
    return true;
  };
  for (const query of ['ت', 'ه', 'ة', 'تة', 'بت', '𐐀ة', 'رحمت', 'رحمه', 'رحمة', 'نور']) for (const item of [undefined, 'item-1']) {
    const word = normalizeSearchQuery(query);
    const eligible = records.flatMap((record, index) => {
      if (item && record.item !== item) return [];
      if (record.section === 'text' && record.language !== 'ar') return [];
      const text = normalizeSearchPreservingTa(record.text);
      let found = false;
      for (let at = 0; at + word.length <= text.length; at++) if (matches(word, text.slice(at, at + word.length))) { found = true; break; }
      if (!found) return [];
      const whole = text.split(' ').some(token => matches(word, token));
      return [{ record, index, score: whole ? 6 : 3 }];
    }).sort((a, b) => Number(b.record.featured) - Number(a.record.featured) || b.score - a.score ||
      Number(b.record.section === 'toc') - Number(a.record.section === 'toc') ||
      Number(b.record.language === 'ar') - Number(a.record.language === 'ar') || a.record.order - b.record.order || a.index - b.index);
    for (const [resultLimit, tocLimit, textLimit] of [[3, 2, 5], [0, 8, 0], [9, 0, 4], [500, 500, 500]] as const) {
      const request: SearchRequest = { id: 1, query, ...(item ? { item } : {}), languages: ['ar'], resultLimit, tocLimit, textLimit };
      const engine = new IncrementalSearch(records);
      let result = engine.begin(request);
      while (!result.complete) result = engine.advance(53);
      const toc = eligible.filter(hit => hit.record.section === 'toc'), text = eligible.filter(hit => hit.record.section === 'text');
      assert.equal(result.resultsTotal, eligible.length);
      assert.equal(result.tocTotal, toc.length); assert.equal(result.textTotal, text.length);
      assert.deepEqual(result.results.map(hit => [hit.record.key, hit.relevance.score]), eligible.slice(0, resultLimit).map(hit => [hit.record.key, hit.score]));
      assert.deepEqual(result.toc.map(hit => hit.record.key), toc.slice(0, tocLimit).map(hit => hit.record.key));
      assert.deepEqual(result.text.map(hit => hit.record.key), text.slice(0, textLimit).map(hit => hit.record.key));
    }
  }
});

test('short-term score caching does not allocate a map entry for every ranked hit', () => {
  const records: SearchRecord[] = Array.from({ length: 1000 }, (_, index) => ({
    key: `cached-short-${index}`, section: 'text', item: 'item', row: `r${index}`, language: 'ar',
    text: index % 2 ? 'ة' : 'بت', normalized: normalizeSearch(index % 2 ? 'ة' : 'بت'), featured: true, order: index,
  }));
  const engine = new IncrementalSearch(records), original = Map.prototype.set;
  let scoreWrites = 0;
  Map.prototype.set = function (key: unknown, value: unknown) {
    if (typeof key === 'number' && value && typeof value === 'object' &&
        Array.isArray((value as { parts?: unknown }).parts) && (value as { relevance?: unknown }).relevance) scoreWrites += 1;
    return original.call(this, key, value);
  };
  let result: SearchSnapshot;
  try {
    result = engine.begin({ id: 1, query: 'ة', languages: ['ar'], resultLimit: 10, tocLimit: 0, textLimit: 0 });
    while (!result.complete) result = engine.advance(2000);
  } finally { Map.prototype.set = original; }
  assert.equal(result.resultsTotal, 1000);
  assert.deepEqual(result.results.map(hit => hit.record.key), Array.from({ length: 10 }, (_, index) => `cached-short-${index * 2 + 1}`));
  assert.equal(scoreWrites, 0, `allocated ${scoreWrites} short per-hit score entries`);
});

test('short pages avoid scoring lower-priority hits that cannot enter any requested list', () => {
  const records: SearchRecord[] = Array.from({ length: 1000 }, (_, index) => ({
    key: `priority-${index}`, section: 'text', item: 'item', row: `r${index}`, language: 'ar',
    text: `بت x${index}`, normalized: `بت x${index}`, featured: index < 100, order: index,
  }));
  const engine = new IncrementalSearch(records);
  const original = String.prototype.startsWith;
  let unneededScores = 0;
  String.prototype.startsWith = new Proxy(original, { apply(target, receiver, args) {
    const marker = /^بت x(\d+)$/u.exec(String(receiver));
    if (marker && Number(marker[1]) >= 100) unneededScores += 1;
    return Reflect.apply(target, receiver, args);
  } });
  let result: SearchSnapshot;
  try {
    result = engine.begin({ id: 1, query: 'ة', languages: ['ar'], resultLimit: 10, tocLimit: 0, textLimit: 0 });
    while (!result.complete) result = engine.advance(2000);
  } finally { String.prototype.startsWith = original; }
  assert.equal(result.resultsTotal, 1000);
  assert.equal(result.results.length, 10);
  assert.ok(result.results.every(hit => hit.record.featured));
  assert.equal(unneededScores, 0, `scored ${unneededScores} unstarred hits that cannot enter the page`);
  let more = engine.begin({ id: 2, query: 'ة', languages: ['ar'], resultLimit: 150, tocLimit: 0, textLimit: 0 });
  while (!more.complete) more = engine.advance(2000);
  assert.equal(more.results.length, 150);
  assert.ok(more.results.slice(0, 100).every(hit => hit.record.featured));
  assert.ok(more.results.slice(100).every(hit => !hit.record.featured));
});

test('long single-word pages avoid scoring lower-priority direct and joined hits', () => {
  for (const [query, forms] of [
    ['رحمت', ['رحمة', 'برحمت']],
    ['صلاتالله', ['صلاة الله', 'صلاتالله', 'بصلاتالله']],
  ] as const) {
    const records: SearchRecord[] = Array.from({ length: 1000 }, (_, index) => {
      const text = forms[index % forms.length]!;
      return { key: `long-${index}`, section: 'text', item: 'item', row: `r${index}`, language: 'ar',
        text, normalized: normalizeSearch(text), featured: index < 100, order: index };
    });
    const engine = new IncrementalSearch(records), original = Map.prototype.set;
    let unneededScores = 0;
    Map.prototype.set = function (key: unknown, value: unknown) {
      if (typeof key === 'number' && key >= 100 && value && typeof value === 'object' &&
          Array.isArray((value as { parts?: unknown }).parts) && (value as { relevance?: unknown }).relevance) unneededScores += 1;
      return original.call(this, key, value);
    };
    let result: SearchSnapshot;
    try {
      result = engine.begin({ id: 1, query, languages: ['ar'], resultLimit: 10, tocLimit: 0, textLimit: 0 });
      while (!result.complete) result = engine.advance(2000);
    } finally { Map.prototype.set = original; }
    assert.equal(result.resultsTotal, 1000, query);
    assert.equal(result.results.length, 10, query);
    assert.ok(result.results.every(hit => hit.record.featured), query);
    assert.equal(unneededScores, 0, `${query}: scored ${unneededScores} unstarred hits that cannot enter the page`);
    let more = engine.begin({ id: 2, query, languages: ['ar'], resultLimit: 150, tocLimit: 0, textLimit: 0 });
    while (!more.complete) more = engine.advance(2000);
    assert.equal(more.results.length, 150, query);
    assert.ok(more.results.slice(0, 100).every(hit => hit.record.featured), query);
    assert.ok(more.results.slice(100).every(hit => !hit.record.featured), query);
  }
});

test('completed word scans avoid re-reading continuation text when only one term can match', () => {
  let continuationReads = 0;
  const make = (key: string, text: string, next?: string): SearchRecord => {
    const normalized = normalizeSearch(text);
    return { key, section: 'text', item: 'quiet', row: key, language: 'ar', text,
      get normalized() { if (key !== 'anchor') continuationReads += 1; return normalized; },
      featured: false, order: Number(key.slice(-1)) || 0, ...(next ? { next } : {}) };
  };
  const rows = [make('anchor', 'یا', 'quiet1'), make('quiet1', 'آرام', 'quiet2'), make('quiet2', 'دیگر')];
  for (const row of rows) normalizedTokens(row); // isolate relevance, not initial tokenization
  const engine = new IncrementalSearch(rows);
  for (const query of ['یا', 'رحمت', 'الله']) {
    let result = engine.begin({ id: 1, query, item: 'quiet', languages: ['ar'], resultLimit: 20, tocLimit: 0, textLimit: 20 });
    while (!result.complete) result = engine.advance(100);
  }
  continuationReads = 0;
  let result = engine.begin({ id: 2, query: 'یا رحمت الله', item: 'quiet', languages: ['ar'], resultLimit: 20, tocLimit: 0, textLimit: 20 });
  while (!result.complete) result = engine.advance(100);
  assert.equal(result.resultsTotal, 1);
  assert.deepEqual(result.results[0]?.relevance, { score: 6, matchedSequenceWords: 1, exactSequenceWords: 1 });
  assert.equal(result.results[0]?.continuation, undefined);
  assert.equal(continuationReads, 0, `re-read ${continuationReads} already-checked continuation fields`);
});

test('a multiword snapshot prepares its ordered scoring terms once, not once per hit', () => {
  const records: SearchRecord[] = Array.from({ length: 80 }, (_, index) => ({ key: `sequence-${index}`,
    section: 'text', item: 'sequence', row: `r${index}`, language: 'ar', text: 'alpha beta',
    normalized: 'alpha beta', featured: false, order: index }));
  const engine = new IncrementalSearch(records);
  for (const query of ['alpha', 'beta']) {
    let result = engine.begin({ id: 1, query, item: 'sequence', languages: ['ar'], resultLimit: 100, tocLimit: 0, textLimit: 100 });
    while (!result.complete) result = engine.advance(1000);
  }
  const original = Map.prototype.get; let lookups = 0;
  Map.prototype.get = function(key: unknown) {
    if (key === 'alpha' || key === 'beta') lookups++;
    return original.call(this, key);
  };
  let result: SearchSnapshot;
  try {
    result = engine.begin({ id: 2, query: 'alpha beta', item: 'sequence', languages: ['ar'], resultLimit: 100, tocLimit: 0, textLimit: 100 });
    while (!result.complete) result = engine.advance(1000);
  } finally { Map.prototype.get = original; }
  assert.equal(result.resultsTotal, records.length);
  assert.ok(result.results.every(hit => hit.relevance.score === 12 && hit.relevance.matchedSequenceWords === 2));
  assert.ok(lookups <= 30, `looked up scoring terms ${lookups} times for ${records.length} hits`);
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
