import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch, normalizeSearchPreservingTa, normalizeSearchQuery } from '../src/normalize.js';
import { approvedLamPairs, wordVariants } from '../src/lam-aliases.js';
import { scoreSequence } from '../src/search-relevance.js';
import { compileCompactCandidate, findWithTa, sourceWithTa } from '../src/search-ta.js';
import { IncrementalSearch, type SearchRecord, type SearchRequest } from '../src/search.js';
import { findOriginalWordMatches } from '../src/search-text.js';
import { originalMatches } from '../web/search-common.js';

function row(key: string, text: string, extra: Partial<SearchRecord> = {}): SearchRecord {
  return { key, section: 'text', item: 'item', row: key, language: 'ar', text,
    normalized: normalizeSearch(text), featured: false, order: 0, ...extra };
}
function finish(engine: IncrementalSearch, query: string, extra: Partial<SearchRequest> = {}) {
  let result = engine.begin({ id: 1, query, languages: ['ar', 'fa'], tocLimit: 200, textLimit: 200, resultLimit: 200, ...extra });
  for (let i = 0; !result.complete && i < 1000; i++) result = engine.advance(5);
  assert.ok(result.complete, query);
  return result;
}
const keys = (result: ReturnType<typeof finish>) => result.results.map(hit => hit.record.key).sort();

test('typed ت and ه each find ة, while typed ة finds all three without equating ت and ه', () => {
  const engine = new IncrementalSearch([row('marbuta', 'رَحْمَةٌ'), row('heh', 'رَحْمَه'), row('teh', 'رَحْمَت')]);
  assert.deepEqual(keys(finish(engine, 'رحمت')), ['marbuta', 'teh']);
  assert.deepEqual(keys(finish(engine, 'رحمه')), ['heh', 'marbuta']);
  assert.deepEqual(keys(finish(engine, 'رحمة')), ['heh', 'marbuta', 'teh']);
  assert.deepEqual(keys(finish(engine, 'ت')), ['marbuta', 'teh']);
  assert.deepEqual(keys(finish(engine, 'ه')), ['heh', 'marbuta']);
  assert.deepEqual(keys(finish(engine, 'ة')), ['heh', 'marbuta', 'teh']);
  const all = finish(engine, 'رحمت رحمه رحمة').results.find(hit => hit.record.key === 'marbuta')!;
  assert.deepEqual(all.matchedWords, ['رحمت', 'رحمه', 'رحمة'], 'the three typed forms are distinct logical terms');
  assert.equal(all.directMatches, 3);
});

test('each ambiguous position is checked independently, without turning ت and ه into equivalents', () => {
  const engine = new IncrementalSearch(['تت', 'تة', 'ةت', 'ةة', 'ته', 'هت', 'هه'].map(value => row(value, value)));
  assert.deepEqual(keys(finish(engine, 'تت')), ['تت', 'تة', 'ةت', 'ةة'].sort());
  assert.deepEqual(keys(finish(engine, 'ته')), ['ته', 'تة', 'ةة'].sort());
  assert.deepEqual(keys(finish(engine, 'هت')), ['هت', 'ةت', 'ةة'].sort());
  assert.deepEqual(keys(finish(engine, 'هه')), ['هه', 'ةة'].sort());
  assert.deepEqual(keys(finish(engine, 'تة')), ['تت', 'تة', 'ته', 'ةت', 'ةة'].sort());
  assert.deepEqual(keys(finish(engine, 'هة')), ['هت', 'هه', 'ةت', 'ةة'].sort());
  assert.deepEqual(keys(finish(engine, 'ةة')), ['تت', 'تة', 'ةت', 'ةة', 'ته', 'هت', 'هه'].sort());
  const longQuery = 'ت'.repeat(80), longSource = 'ة'.repeat(80);
  assert.deepEqual(keys(finish(new IncrementalSearch([row('long', longSource)]), longQuery)), ['long']);
});

test('joined/spaced matching, punctuation safeguards and lam alternatives compose with ت to ة', () => {
  const rows = [row('join', 'صَلَاةُ اللّٰهِ'), row('heh', 'صلاه الله'), row('punctuation', 'صلاة، الله'),
    row('lam', 'اللذاة'), row('lam-direct', 'الذات'), row('protected', 'الله')];
  const engine = new IncrementalSearch(rows);
  const joined = finish(engine, 'صلاتالله');
  assert.deepEqual(keys(joined), ['join']);
  assert.equal(joined.results[0]!.directMatches, 0);
  assert.equal(joined.results[0]!.relevance.score, 4);
  assert.deepEqual(keys(finish(engine, 'الذات')), ['lam', 'lam-direct']);
  assert.ok(!keys(finish(engine, 'اله')).includes('protected'));
});

test('a typed ة remains bidirectional through approved lam aliases and original highlighting', () => {
  const rows = [row('one-teh', 'اليلت'), row('two-teh', 'اللّيلَت'), row('one-marbuta', 'اليلة'),
    row('two-marbuta', 'اللّيلَة'), row('one-heh', 'اليله'), row('two-heh', 'اللّيلَه')];
  const engine = new IncrementalSearch(rows);
  assert.deepEqual(keys(finish(engine, 'اللیلة')), rows.map(value => value.key).sort());
  assert.deepEqual(keys(finish(engine, 'اللیله')), ['one-heh', 'one-marbuta', 'two-heh', 'two-marbuta']);
  const text = '😀 اللّيلَت اللّيلَه اللّيلَة';
  assert.deepEqual(originalMatches(text, ['اللیلة']).map(hit => text.slice(hit.start, hit.end)), ['اللّيلَت', 'اللّيلَه', 'اللّيلَة']);
  const taAlias = new IncrementalSearch([row('one-t', 'الذات'), row('two-t', 'اللذات'),
    row('one-m', 'الذاة'), row('two-m', 'اللذاة'), row('one-h', 'الذاه'), row('two-h', 'اللذاه')]);
  assert.deepEqual(keys(finish(taAlias, 'الذاة')), ['one-h', 'one-m', 'one-t', 'two-h', 'two-m', 'two-t']);
  assert.deepEqual(keys(finish(taAlias, 'الذات')), ['one-m', 'one-t', 'two-m', 'two-t']);
});

test('a typed ت composes bidirectionally with a lam alias whose folded key has ه', () => {
  const rows = [row('one-teh', 'اليلت'), row('two-teh', 'اللّيلَت'), row('one-marbuta', 'اليلة'),
    row('two-marbuta', 'اللّيلَة'), row('one-heh', 'اليله'), row('two-heh', 'اللّيلَه')];
  const engine = new IncrementalSearch(rows);
  finish(engine, 'اللی'); // a cached prefix must not discard a newly expanded alias
  for (const query of ['اللیلت', 'الیلت']) {
    const result = finish(engine, query);
    assert.deepEqual(keys(result), ['one-marbuta', 'one-teh', 'two-marbuta', 'two-teh']);
    assert.ok(result.results.every(hit => hit.matchedWords.length === 1 && hit.matchedWords[0] === query &&
      hit.directMatches === 1 && hit.relevance.score === 6), query);
  }
  const original = '😀 الِيلَةِ اللّيلَةِ اليله اللّيلَه اليلت اللّيلَت';
  assert.deepEqual(originalMatches(original, ['اللیلت']).map(hit => original.slice(hit.start, hit.end)),
    ['الِيلَةِ', 'اللّيلَةِ', 'اليلت', 'اللّيلَت']);
});

test('a typed ه composes bidirectionally with a lam alias whose key has ت', () => {
  const rows = [row('one-teh', 'الذات'), row('two-teh', 'اللّذات'), row('one-marbuta', 'الذاة'),
    row('two-marbuta', 'اللّذاة'), row('one-heh', 'الذاه'), row('two-heh', 'اللّذاه')];
  const engine = new IncrementalSearch(rows);
  finish(engine, 'الذا'); // a previously cached prefix must remain conservative
  for (const query of ['الذاه', 'اللذاه']) {
    const result = finish(engine, query);
    assert.deepEqual(keys(result), ['one-heh', 'one-marbuta', 'two-heh', 'two-marbuta']);
    assert.ok(result.results.every(hit => hit.matchedWords.length === 1 && hit.matchedWords[0] === query &&
      hit.directMatches === 1 && hit.relevance.score === 6), query);
  }
  const original = '😀 الِذاةِ اللّذاةِ الذاه اللّذاه الذات اللّذات';
  assert.deepEqual(originalMatches(original, ['الذاه']).map(hit => original.slice(hit.start, hit.end)),
    ['الِذاةِ', 'اللّذاةِ', 'الذاه', 'اللّذاه']);
});

test('ambiguous lam-key variants agree with an independent enumeration of all approved pairs', () => {
  const queries = new Set<string>(['الت', 'اله', 'الله', 'بالته', 'بعیدة']);
  for (const { one, two } of approvedLamPairs) for (const key of [one, two]) {
    let spellings = [''];
    for (const character of key) {
      const possibilities = character === 'ه' || character === 'ت' ? ['ه', 'ت', 'ة'] : [character];
      spellings = spellings.flatMap(prefix => possibilities.map(next => prefix + next));
    }
    for (const spelling of spellings) queries.add(spelling);
  }
  for (const query of queries) {
    const expected = new Set([query]);
    for (const { one, two } of approvedLamPairs) {
      const index = [...two].findIndex((character, i) => character === 'ل' && two.slice(0, i) + two.slice(i + 1) === one);
      for (const [key, insert] of [[one, true], [two, false]] as const) {
        if (query.length !== key.length) continue;
        const eligible = [...query].every((character, i) => character === key[i] ||
          (character === 'ة' && (key[i] === 'ت' || key[i] === 'ه')) || (character === 'ت' && key[i] === 'ه') ||
          (character === 'ه' && key[i] === 'ت'));
        if (eligible) expected.add(query.slice(0, index) + (insert ? 'ل' : '') + query.slice(index + (insert ? 0 : 1)));
      }
    }
    assert.deepEqual([...wordVariants(query)].sort(), [...expected].sort(), query);
  }
});

test('original UTF-16 matches, diacritics, ligatures and display highlights remain correct', () => {
  const source = '😀 بِالْعُقُوبَةِ ثم بِالْعُقُوبَهِ';
  const word = normalizeSearch('العقوبت');
  const raw = findOriginalWordMatches(source, [word]);
  assert.equal(raw.length, 1);
  assert.equal(source.slice(raw[0]!.start, raw[0]!.end), 'الْعُقُوبَة');
  const ranges = originalMatches(source, [word]);
  assert.equal(ranges.length, 1);
  assert.equal(source.slice(ranges[0]!.start, ranges[0]!.end), 'الْعُقُوبَةِ');
  assert.ok(ranges[0]!.start > 2, 'UTF-16 offset accounts for the leading emoji');
  const presentation = 'ﺓ'; // NFKD compatibility form of ة
  assert.deepEqual(keys(finish(new IncrementalSearch([row('presentation', presentation)]), 'ت')), ['presentation']);
  assert.deepEqual(originalMatches(presentation, ['ت']).map(r => presentation.slice(r.start, r.end)), ['ﺓ']);
});

test('compact prefilter agrees with a character-by-character oracle, including split supplementary text', () => {
  let state = 0x4b30a729;
  const random = (n: number): number => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; };
  const alphabet = ['ا', 'ب', 'ت', 'ه', '𐐨'];
  const oracle = (source: string, word: string): boolean => {
    const compact = source.replace(/ /g, '');
    for (let start = 0; start + word.length <= compact.length; start++) {
      let matches = true;
      for (let i = 0; i < word.length; i++) {
        const q = word[i], s = compact[start + i];
        if (q !== s && !((q === 'ت' || q === 'ة') && s === 'ه') && !(q === 'ة' && s === 'ت')) { matches = false; break; }
      }
      if (matches) return true;
    }
    return false;
  };
  for (let i = 0; i < 10_000; i++) {
    const symbols = Array.from({ length: 1 + random(30) }, () => random(4) === 0 ? ' ' : alphabet[random(alphabet.length)]!);
    const source = symbols.join('');
    let word = Array.from({ length: 1 + random(6) }, () => [...alphabet, 'ة'][random(alphabet.length + 1)]!).join('');
    if (i % 2 === 0) {
      const letters = symbols.filter(symbol => symbol !== ' '), start = random(Math.max(1, letters.length));
      word = letters.slice(start, start + 1 + random(6)).map(c => c === 'ه' && random(2) ? 'ت' : c === 'ت' && random(2) ? 'ة' : c).join('') || 'ب';
    }
    assert.equal(compileCompactCandidate(word)!.test(source), oracle(source, word), `${JSON.stringify(source)} / ${word}`);
  }
  assert.equal(compileCompactCandidate('a.b')!.test('a . b'), true);
  assert.equal(compileCompactCandidate('a.b')!.test('a x b'), false);
  assert.equal(compileCompactCandidate('ت'.repeat(301)), undefined, 'unusually long input takes the compact-string fallback');
});

test('a ta-aware search resumes after, not inside, a supplementary character', () => {
  const source = normalizeSearchPreservingTa('𐐀ةنور');
  const query = normalizeSearchQuery('𐐀تنور');
  assert.equal(findWithTa(source, query, 0), 0);
  assert.equal(findWithTa(source, query, 1), -1, 'a UTF-16 offset inside the previous match must advance');
  const original = '𐐀 ةنور';
  assert.deepEqual(findOriginalWordMatches(original, [query]).map(hit => original.slice(hit.start, hit.end)), [original]);
});

test('mixed query forms and supplementary letters retain original spans', () => {
  const mixed = '😀 رَحْمَةٌ اللّٰه رحمت';
  for (const terms of [['الله', 'رحمت'], ['رحمت', 'الله']]) {
    const hits = findOriginalWordMatches(mixed, terms);
    assert.deepEqual(hits.map(hit => mixed.slice(hit.start, hit.end)), ['رَحْمَة', 'اللّٰه', 'رحمت']);
  }
  const source = '😀𐐀ة 𐐀ه 𐐀ت';
  const query = normalizeSearch('𐐀ت');
  assert.deepEqual(findOriginalWordMatches(source, [query]).map(hit => source.slice(hit.start, hit.end)), ['𐐀ة', '𐐀ت']);
  const rows = [row('marbuta', '𐐀ة'), row('heh', '𐐀ه'), row('teh', '𐐀ت'), row('later', '𐐀ه 𐐀ت')];
  assert.deepEqual(keys(finish(new IncrementalSearch(rows), '𐐀ت')), ['later', 'marbuta', 'teh']);
  assert.deepEqual(keys(finish(new IncrementalSearch([row('after', 'ة𐐀'), row('plain', 'ه𐐀')]), 'ت𐐀')), ['after']);
});

test('whole-word and multirow relevance, logical counts and continuations use the same matching rule', () => {
  const a = row('a', 'یا رَحْمَةٌ', { next: 'b' });
  const b = row('b', 'اللّٰه', { order: 1 });
  const snapshot = finish(new IncrementalSearch([a, b]), 'یا رحمت الله');
  const hit = snapshot.results.find(candidate => candidate.record.key === 'a')!;
  assert.deepEqual(hit.matchedWords, ['یا', 'رحمت']);
  assert.equal(hit.directMatches, 2);
  assert.deepEqual(hit.relevance, { score: 18, matchedSequenceWords: 3, exactSequenceWords: 3 });
  assert.deepEqual(hit.continuation?.[0]?.matchedWords, ['الله']);
});

test('multiword relevance does not normalize source ة when no typed ت can occur in a part', () => {
  const original = 'يا الله مَغْفِرَة', record = row('irrelevant-ta', original);
  let sourceReads = 0;
  Object.defineProperty(record, 'text', { get() { sourceReads += 1; return original; } });
  assert.deepEqual(scoreSequence([{ record }], ['یا', 'رحمت', 'الله']).relevance,
    { score: 10, matchedSequenceWords: 2, exactSequenceWords: 2 });
  assert.equal(sourceReads, 0, `read the unrelated original source ${sourceReads} times`);
});

test('multiword relevance defers source ة normalization for unambiguous typed ت tokens', () => {
  const original = 'يا رَحْمَت الله مَغْفِرَة', record = row('literal-teh', original);
  let sourceReads = 0;
  Object.defineProperty(record, 'text', { get() { sourceReads += 1; return original; } });
  assert.deepEqual(scoreSequence([{ record }], ['یا', 'رحمت', 'الله']).relevance,
    { score: 18, matchedSequenceWords: 3, exactSequenceWords: 3 });
  assert.equal(sourceReads, 0, `read the unrelated original source ${sourceReads} times`);
});

test('multiword relevance reuses compiled character rules instead of retesting ordinary terms per token', () => {
  const record = row('ordinary-terms', 'یا نور الله');
  const original = RegExp.prototype.test;
  let ruleChecks = 0;
  RegExp.prototype.test = new Proxy(original, { apply(target, receiver, args) {
    if (receiver instanceof RegExp && receiver.source === '[تة]') ruleChecks += 1;
    return Reflect.apply(target, receiver, args);
  } });
  try {
    for (let i = 0; i < 250; i += 1) {
      assert.deepEqual(scoreSequence([{ record }], ['یا', 'الله']).relevance,
        { score: 10, matchedSequenceWords: 2, exactSequenceWords: 2 });
    }
  } finally { RegExp.prototype.test = original; }
  assert.ok(ruleChecks < 30, `retested the typed-character rule ${ruleChecks} times`);
});

test('short direct hits retain the same complete-word and substring relevance', () => {
  const records = ['ت', 'ه', 'ة', 'بِرَحْمَة', 'بت', 'بة', 'به', 'تت', 'تة', 'ةت', 'هة', '𐐀ة', '𐐀ت']
    .map((value, index) => row(String(index), value));
  const engine = new IncrementalSearch(records);
  for (const query of ['ت', 'ه', 'ة', 'بت', 'بة', 'به', 'تة', 'ةت', 'هة', '𐐀ت', '𐐀ة']) {
    for (const hit of finish(engine, query).results) {
      assert.deepEqual(hit.relevance, scoreSequence([{ record: hit.record }], [normalizeSearchQuery(query)]).relevance,
        `${query}: ${hit.record.text}`);
    }
  }
});

test('short-result relevance objects stay independent across hits and cached searches', () => {
  const engine = new IncrementalSearch([row('one', 'رَحْمَة'), row('two', 'رَحْمَت'), row('three', 'رَحْمَه')]);
  const first = finish(engine, 'ة');
  assert.ok(first.results.length >= 2);
  assert.notStrictEqual(first.results[0]!.relevance, first.results[1]!.relevance);
  const expected = first.results[1]!.relevance.score;
  first.results[0]!.relevance.score = 999;
  assert.equal(first.results[1]!.relevance.score, expected);
  assert.ok(finish(engine, 'ة').results.every(hit => hit.relevance.score !== 999));
});

test('verified direct hits still receive a stronger joined or whole-word relevance when appropriate', () => {
  const records = ['صلاتالله صَلَاةُ الله', 'بصلاتالله و صَلَاةُ الله', 'رحمت رَحْمَة', 'برحمت و رَحْمَة']
    .map((value, index) => row(String(index), value));
  const engine = new IncrementalSearch(records);
  for (const query of ['صلاتالله', 'صلاةالله', 'رحمت', 'رحمة']) {
    for (const hit of finish(engine, query).results) {
      assert.deepEqual(hit.relevance, scoreSequence([{ record: hit.record }], [normalizeSearchQuery(query)]).relevance,
        `${query}: ${hit.record.text}`);
    }
  }
});

test('single-term numeric ranking retains the directness tie-break after joined relevance', () => {
  const rows = [row('spaced', 'صَلَاةُ الله', { order: 0 }),
    row('direct-and-spaced', 'بصلاتالله صَلَاةُ الله', { order: 1 }),
    row('whole', 'صلاتالله', { order: 2 })];
  const result = finish(new IncrementalSearch(rows), 'صلاتالله');
  assert.deepEqual(result.results.map(hit => [hit.record.key, hit.relevance.score, hit.directMatches]), [
    ['whole', 6, 1], ['direct-and-spaced', 4, 1], ['spaced', 4, 0],
  ]);
});

test('lazy source spelling agrees with preserving normalization and cached searches stay consistent', () => {
  const records = ['😀𐐀ه 𐐀ة 𐐀ت', 'رحمه رَحْمَةٌ رحمت', 'تة هت ةة تت', 'ﺓ ﺔ ت ه', 'صَلَاةُ الله']
    .map((value, index) => row(String(index), value));
  for (const record of records) {
    assert.equal(sourceWithTa(record), normalizeSearchPreservingTa(record.text));
    assert.equal(record.normalized, sourceWithTa(record).replace(/ة/g, 'ه'));
  }
  const cached = new IncrementalSearch(records);
  for (const query of ['ت', 'ه', 'ة', 'ته', 'تة', 'ةت', 'ةة', '𐐀ت', '𐐀ة', 'رحمت', 'رحمه', 'رحمة', 'صلاتالله', 'صلاةالله', 'رحمة الله']) {
    const summarize = (engine: IncrementalSearch) => finish(engine, query).results.map(hit => ({ key: hit.record.key,
      matchedWords: hit.matchedWords, directMatches: hit.directMatches, relevance: hit.relevance }));
    assert.deepEqual(summarize(cached), summarize(new IncrementalSearch(records)), query);
  }
});

test('prefix caches, item scopes and newly arriving shards cannot hide a ة match', () => {
  const records = [row('teh', 'تاج'), row('marbuta', 'ةاج'), row('heh', 'هاج'),
    row('other-item', 'ةاج', { item: 'other' })];
  const engine = new IncrementalSearch(records.slice(0, 2), 32, true);
  engine.begin({ id: 1, query: 'ت', languages: ['ar'], tocLimit: 10, textLimit: 10 });
  engine.advance(10);
  engine.appendRecords(records.slice(2)); engine.finishLoading();
  assert.deepEqual(keys(finish(engine, 'تاج')), ['marbuta', 'other-item', 'teh']);
  assert.deepEqual(keys(finish(engine, 'تاج', { item: 'item' })), ['marbuta', 'teh']);
  assert.deepEqual(keys(finish(engine, 'تاج', { item: 'other' })), ['other-item']);
});
