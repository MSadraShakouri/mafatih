import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, searchWords, type SearchRecord, type SearchRequest } from '../src/search.js';
import { findOriginalMatches, wholeWordRanges } from '../src/search-text.js';

function record(key: string, text: string, order = 0): SearchRecord {
  return { key, section: 'text', item: key, row: 'r1', language: 'fa', text,
    normalized: normalizeSearch(text), featured: false, order };
}
function search(records: SearchRecord[], query: string) {
  const engine = new IncrementalSearch(records);
  const request: SearchRequest = { id: 1, query, languages: ['ar', 'fa'], tocLimit: 100, textLimit: 100 };
  let result = engine.begin(request);
  while (!result.complete) result = engine.advance(5);
  return result.text.map(hit => hit.record.key);
}

test('a half-space or joining control inside a query word does not create OR terms', () => {
  assert.deepEqual(searchWords('اهل\u200cبیت'), ['اهلبیت']);
  assert.deepEqual(searchWords('اهل\u200dبیت'), ['اهلبیت']);
  assert.deepEqual(searchWords('اهل بیت'), ['اهل', 'بیت']);
  assert.deepEqual(searchWords('می\u200cکنم'), ['میکنم']);
  assert.deepEqual(searchWords('می کنم'), ['می', 'کنم']);
  assert.deepEqual(searchWords('اهل،بیت'), ['اهل', 'بیت']);
});

test('equivalent half-space spellings reuse the same completed per-word search', () => {
  const engine = new IncrementalSearch([record('half-space', 'می\u200cکنم')]);
  const make = (query: string): SearchRequest => ({ id: 1, query, languages: ['ar', 'fa'], tocLimit: 10, textLimit: 10 });
  let snapshot = engine.begin(make('می\u200cکنم'));
  while (!snapshot.complete) snapshot = engine.advance(1);
  const progress = engine.progress('میکنم');
  snapshot = engine.begin(make('میکنم دیگر'));
  assert.deepEqual(engine.progress('میکنم'), progress);
  assert.equal(snapshot.text[0]?.record.key, 'half-space');
  assert.deepEqual(snapshot.text[0]?.matchedWords, ['میکنم']);
});

test('short or name queries do not manufacture matches across unrelated word boundaries', () => {
  const records = [
    record('real-kumayl', 'دعای کمیل', 0),
    record('one-mile', 'مسافت یک میل است', 1),
    record('real-ya', 'یا علی', 2),
    record('unrelated-ya', 'دعای آزاد شدن', 3),
    record('real-allah', 'الله', 4),
    record('unrelated-allah', 'قال له', 5),
    record('real-rabbi', 'الهی ربی', 6),
    record('unrelated-rabbi', 'رب یا رب', 7),
    record('real-kalam', 'کلام', 8),
    record('unrelated-kalam', 'کل امر', 9),
    record('real-dorud', 'درود', 10),
    record('unrelated-dorud', 'در وداع', 11),
    record('real-khodaya', 'خدایا', 12),
    record('unrelated-khodaya', 'خدا یاری دهد', 13),
  ];
  assert.deepEqual(search(records, 'کمیل'), ['real-kumayl']);
  assert.deepEqual(search(records, 'یا'), ['real-ya', 'unrelated-rabbi', 'real-khodaya', 'unrelated-khodaya']);
  assert.deepEqual(search(records, 'الله'), ['real-allah']);
  assert.deepEqual(search(records, 'ربی'), ['real-rabbi']);
  assert.deepEqual(search(records, 'کلام'), ['real-kalam']);
  assert.deepEqual(search(records, 'درود'), ['real-dorud']);
  assert.deepEqual(search(records, 'خدایا'), ['real-khodaya']);
});

test('joined words match a half-space and conservative ordinary-space forms, without crossing punctuation or lines', () => {
  const records = [
    record('half-space', 'اهل\u200cبیت', 0),
    record('joiner', 'اهل\u200dبیت', 1),
    record('joined', 'اهلبیت', 2),
    record('ordinary-space', 'اهل بیت', 3),
    record('last-prefix', 'اهل بیتش', 4),
    record('punctuation', 'اهل، بیت', 5),
    record('newline', 'اهل\nبیت', 6),
    record('middle-of-word', 'جاهل بیت', 7),
  ];
  const expected = ['half-space', 'joiner', 'joined', 'ordinary-space', 'last-prefix'];
  assert.deepEqual(search(records, 'اهلبیت'), expected);
  assert.deepEqual(search(records, 'اهل\u200cبیت'), expected);
  // An actual space or comma in the QUERY is deliberately two OR words.
  assert.deepEqual(search(records, 'اهل بیت'), records.map(item => item.key));
  assert.deepEqual(search(records, 'اهل،بیت'), records.map(item => item.key));
});

test('short complete source words and common vocatives can form joined queries', () => {
  const records = [
    record('and-allah', 'وَ اللّٰهِ', 0),
    record('and-rab', 'وَ رَبِّی', 1),
    record('ya-rab', 'يَا رَبِّی', 2),
    record('false-kalam', 'کُلِّ أَمْرٍ', 3),
    record('false-dorud', 'در وداع', 4),
  ];
  assert.deepEqual(search(records, 'والله'), ['and-allah']);
  assert.deepEqual(search(records, 'ورب'), ['and-rab']);
  assert.deepEqual(search(records, 'یارب'), ['ya-rab']);
  assert.deepEqual(search(records, 'کلام'), []);
  assert.deepEqual(search(records, 'درود'), []);
  assert.deepEqual(wholeWordRanges(records[0]!.text, findOriginalMatches(records[0]!.text, ['والله']))
    .map(range => records[0]!.text.slice(range.start, range.end)), ['وَ اللّٰهِ']);
});

test('diacritic-free queries map to real source spans without removing source marks', () => {
  const original = '😀 يَا رَبِّ، كِتَابٌ؛ می\u200cکنم و می کنم';
  const words = ['یا', 'رب', 'کتاب', 'میکنم'];
  const found = wholeWordRanges(original, findOriginalMatches(original, words));
  const extracts = found.map(range => original.slice(range.start, range.end));
  assert.deepEqual(extracts, ['يَا', 'رَبِّ', 'كِتَابٌ', 'می\u200cکنم', 'می کنم']);
  assert.equal(original, '😀 يَا رَبِّ، كِتَابٌ؛ می\u200cکنم و می کنم');
});
