import assert from 'node:assert/strict';
import test from 'node:test';
import { IncrementalSearch, type SearchRecord, type SearchRequest, type SearchSnapshot } from '../src/search.js';
import { normalizeSearch } from '../src/normalize.js';
import { findOriginalWordMatches, type TextRange } from '../src/search-text.js';
import { expandedWords, safeAliasPrefix, wordVariants } from '../src/lam-aliases.js';
import { matchedSubstringRanges } from '../web/highlight-substring.js';
import { approvedLamPairs as pairs } from '../src/lam-aliases.js';
import { createSearchSession } from '../web/search-common.js';
import { protectedLamPairs as protectedB } from './fixtures/search-protected-lam.js';

let id = 0;
type Engine = Pick<IncrementalSearch, 'begin' | 'advance'>;
function run(engine: Engine, query: string, opts: { item?: string; languages?: ('ar'|'fa')[]; limit?: number } = {}): SearchSnapshot {
  const limit = opts.limit ?? 100000;
  const request: SearchRequest = { id: ++id, query, languages: opts.languages ?? ['ar','fa'],
    tocLimit: limit, textLimit: limit, resultLimit: limit, ...(opts.item ? { item: opts.item } : {}) };
  let result = engine.begin(request), turns = 0;
  while (!result.complete && turns++ < 2000) result = engine.advance(5000);
  assert.ok(result.complete, `search completed: ${query}`);
  return result;
}
const keys = (s: SearchSnapshot) => new Set(s.results.map(h => h.record.key));
const equalKeys = (a: Set<string>, b: Set<string>, message: string) => {
  const onlyA = [...a].filter(x => !b.has(x)), onlyB = [...b].filter(x => !a.has(x));
  assert.deepEqual([onlyA,onlyB], [[],[]], `${message}; only actual ${onlyA.slice(0,5)}; only expected ${onlyB.slice(0,5)}`);
};
function record(key: string, text: string, item = 'A', language: 'ar'|'fa'|'toc' = 'ar', next?: string): SearchRecord {
  return { key, section: language === 'toc' ? 'toc':'text', item, ...(language === 'toc' ? {} : {row:key}),
    language, text, normalized:normalizeSearch(text), featured:false, order:0, ...(next ? {next} : {}) };
}

test('all approved aliases, protections, cache, continuations and shards', () => {
assert.equal(pairs.length, 58);
assert.deepEqual(wordVariants('اله'), ['اله']);
assert.deepEqual(wordVariants('الله'), ['الله']);
assert.deepEqual(wordVariants('باللیل'), ['باللیل','بالیل']);
assert.deepEqual(wordVariants('الهای'), ['الهای','اللهای'], 'the explicitly approved Allah-containing list-A pair is included');

for (const {one,two} of protectedB) {
  assert.deepEqual(wordVariants(one),[one],`protected-B ${one} remains unexpanded`);
  assert.deepEqual(wordVariants(two),[two],`protected-B ${two} remains unexpanded`);
}
assert.equal(safeAliasPrefix('اله','الهم'), false, 'a cached اله prefix cannot reject اللهم');
assert.equal(safeAliasPrefix('ال','الهم'), true);
assert.equal(safeAliasPrefix('بالی','بالیل'), false, 'cached single-lam B prefix cannot reject a new two-lam alternative');

const forms: SearchRecord[] = [];
for (const [i, { one, two }] of pairs.entries()) {
  assert.equal(normalizeSearch(one),one); assert.equal(normalizeSearch(two),two);
  forms.push(record(`one:${i}`,one),record(`two:${i}`,two));
}
const engine = new IncrementalSearch(forms, 256);
for (const [i, {one, two}] of pairs.entries()) {
  for (const query of [one,two]) {
    const result = run(engine,query);
    assert.ok(keys(result).has(`one:${i}`), `${query} finds one-lam ${one}`);
    assert.ok(keys(result).has(`two:${i}`), `${query} finds two-lam ${two}`);
    assert.equal(result.results.length, keys(result).size, `${query}: deduplication`);
    for (const hit of result.results) {
      assert.deepEqual(hit.matchedWords,[query],`${query} is one logical term even if both variants match`);
      assert.equal(hit.directMatches,1,`${query} counts once`);
    }
  }
}

// Prefix rejection must never conceal an alternative that appeared only as
// the word was completed, even after global and in-item scans were cached.
const fixtures = [
  record('allah','الله'), record('ilah','اله'),
  record('short','الهم صل'), record('long','اللهم صل'),
  record('both','الهم واللهم صل'), record('separated','ال لهم صل'),
  record('punctuation','ال،لهم صل'), record('b-one','بالیل'), record('b-two','باللیل'),
  record('b-phrase','بِاللَّيْلِ صَلِّ'), record('p-one','باله'), record('p-two','بالله'),
  record('other','اللهم صل','B','fa'), record('second','صل','C','ar'),
  record('first','اللهم','C','ar','second'), record('title','اللهم','B','toc'),
];
const cacheEngine = new IncrementalSearch(fixtures);
run(cacheEngine,'ال'); run(cacheEngine,'اله');
let hit = run(cacheEngine,'الهم');
assert.ok(keys(hit).has('long')); assert.ok(keys(hit).has('separated'));
assert.ok(!keys(hit).has('punctuation'),'punctuation cannot be bridged');
assert.equal(hit.results.find(x=>x.record.key==='both')?.matchedWords.length,1);
const protection = run(cacheEngine,'اله');
assert.ok(keys(protection).has('ilah')); assert.ok(!keys(protection).has('allah'));
assert.ok(!keys(run(cacheEngine,'الله')).has('ilah'));
run(cacheEngine,'بالی');
assert.ok(keys(run(cacheEngine,'بالیل')).has('b-one'));
assert.ok(keys(run(cacheEngine,'بالیل')).has('b-two'),'new B alternative is not lost to the cached prefix');
assert.ok(keys(run(cacheEngine,'باللیل')).has('b-two'));
assert.ok(keys(run(cacheEngine,'باللیل')).has('b-one'),'short B pair works both ways');
assert.ok(!keys(run(cacheEngine,'باله')).has('p-two'),'protected B short form must not acquire Allah');
assert.ok(!keys(run(cacheEngine,'بالله')).has('p-one'),'protected B long form must not acquire ilah');
assert.ok(keys(run(cacheEngine,'الیل')).has('b-two'),'approved A can still match a root within a longer word');
const bSequence = run(cacheEngine,'بالیل صل').results.find(item => item.record.key==='b-phrase');
assert.ok(bSequence); assert.deepEqual(bSequence.matchedWords,['بالیل','صل']);
assert.equal(bSequence.relevance.matchedSequenceWords,2); assert.equal(bSequence.relevance.score,12);
let seq = run(cacheEngine,'الهم صل');
for (const key of ['short','long','both','separated']) {
  const item = seq.results.find(x=>x.record.key===key);
  assert.ok(item, `multiword finds ${key}`);
  assert.deepEqual(item.matchedWords,['الهم','صل']);
  assert.equal(item.relevance.matchedSequenceWords,2,`${key}: the alias is not a third term`);
}
assert.equal(seq.results.find(x=>x.record.key==='long')?.relevance.score,12);
assert.equal(seq.results.find(x=>x.record.key==='separated')?.relevance.score,10,'joined alternate + whole word');
seq = run(cacheEngine,'الهم صل',{item:'C'});
const continuation = seq.results.find(x=>x.record.key==='first');
assert.ok(continuation?.continuation?.some(x=>x.row==='second' && x.matchedWords.includes('صل')),'continuation survives alias');
assert.equal(continuation?.relevance.matchedSequenceWords,2);
const filtered = run(cacheEngine,'الهم',{item:'B',languages:['ar']});
assert.ok(keys(filtered).has('title'),'TOC is independent of text-language filters');
assert.ok(!keys(filtered).has('other'),'language filter excludes Persian text');
assert.ok([...keys(filtered)].every(key=>['title'].includes(key)),'item filter works');
const paged = run(cacheEngine,'الهم',{limit:2});
assert.equal(paged.results.length,2); assert.ok(paged.resultsTotal>2);
assert.equal(keys(paged).size,2);

const original = 'قبل اَللّٰهُمَّ صَلِّ بعد';
const spans = findOriginalWordMatches(original,expandedWords(['الهم']));
assert.equal(spans.length,1);
assert.equal(normalizeSearch(original.slice(spans[0]!.start,spans[0]!.end)),'اللهم');
const marks = matchedSubstringRanges(original,spans);
assert.equal(normalizeSearch(original.slice(marks[0]!.start,marks[0]!.end)),'اللهم');
assert.ok(original.slice(marks[0]!.start,marks[0]!.end).endsWith('َّ'),'original ending marks stay attached');

// Appending a shard after an item-first alias scan must preserve flags yet
// include newly appended records. Search remains incomplete while loading.
const loading = new IncrementalSearch([record('existing','اللهم','S')],32,true);
let loadingHit = loading.begin({id:++id,query:'الهم',languages:['ar'],item:'S',tocLimit:100,textLimit:100,resultLimit:100});
while (loading.hasUnscannedRecords()) loadingHit = loading.advance(100);
assert.ok(keys(loadingHit).has('existing')); assert.equal(loadingHit.complete,false);
loading.appendRecords([record('appended','الهم','S'),record('appended-other','اللهم','T')]);
loading.finishLoading();
while (!loadingHit.complete) loadingHit=loading.advance(100);
assert.ok(keys(loadingHit).has('appended'));
assert.ok(keys(run(loading,'الهم')).has('appended-other'));
console.log('PASS synthetic: all 58 A + short B pairs, both directions; scopes/filters/paging, sequence/continuations, original spans, cache and shard append.');


});

test('new search session is Arabic-only, with Persian available', () => {
  const session = createSearchSession();
  assert.deepEqual([...session.languages], ['ar']);
  session.languages.add('fa'); assert.deepEqual([...session.languages], ['ar','fa']);
  assert.deepEqual([...createSearchSession().languages], ['ar']);
});

test('original-substring highlighting preserves marks, ligatures and offsets', () => {
const ranges = (text: string, words: string[]): TextRange[] =>
  matchedSubstringRanges(text, findOriginalWordMatches(text, words.map(normalizeSearch)));
const marked = (text: string, words: string[]): string[] => ranges(text, words).map(({ start, end }) => text.slice(start, end));

assert.deepEqual(marked('دعای فرج', ['فر']), ['فر'], 'a title highlights only the matched prefix');
assert.deepEqual(marked('خدایا به رحمت تو', ['رح']), ['رح'], 'a Persian substring does not expand to a whole word');
assert.deepEqual(marked('بِرَحْمَتِكَ', ['رح']), ['رَحْ'], 'Arabic marks stay attached to the two matched letters');
assert.deepEqual(marked('بِرَحْمَتِكَ', ['رحمت']), ['رَحْمَتِ'], 'unmatched prefix and suffix stay unmarked');
assert.deepEqual(marked('اَللّٰهُمَّ', ['الله']), ['اَللّٰهُ'], 'the suffix of اللهم is not marked');
assert.deepEqual(marked('دعای کمیل', ['كمي']), ['کمی'], 'Arabic/Persian normalized forms map to original glyphs');
assert.deepEqual(marked('يَا اللّٰهُ', ['یاالله']), ['يَا اللّٰهُ'], 'joined search maps back through original horizontal space');
assert.deepEqual(marked('ﻻ', ['ل']), ['ﻻ'], 'a compatibility ligature remains an indivisible source glyph');
assert.deepEqual(marked('🌙رحمت', ['رح']), ['رح'], 'UTF-16 bounds do not split preceding supplementary characters');
assert.deepEqual(marked('رحمت', ['رح', 'حمت']), ['رحمت'], 'overlapping query matches are united without duplicating characters');
assert.deepEqual(marked('رحمت و فرج', ['رح', 'فر']), ['رح', 'فر'], 'independent non-overlapping words remain separate');
const spans = ranges('رحمت و فرج', ['رح', 'فر']);
assert.ok(spans.every((span, index) => index === 0 || spans[index - 1]!.end < span.start), 'ranges are sorted and disjoint');


});
