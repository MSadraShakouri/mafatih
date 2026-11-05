import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCorpus, text } from '../src/corpus.js';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, searchWords, type SearchRecord, type SearchRequest } from '../src/search.js';
import { codePointToUtf16Offset, findOriginalMatches, foldWithOffsets, utf16ToCodePointOffset, wholeWordRanges } from '../src/search-text.js';

function record(key: string, value: string, options: Partial<SearchRecord> = {}): SearchRecord {
  return { key, section: 'text', item: key, row: 'r1', language: 'fa', text: value,
    normalized: normalizeSearch(value), featured: false, order: 0, ...options };
}
function request(query: string, extra: Partial<SearchRequest> = {}): SearchRequest {
  return { id: 1, query, languages: ['ar', 'fa'], tocLimit: 100, textLimit: 100, ...extra };
}
function finish(engine: IncrementalSearch, value: SearchRequest) {
  let snapshot = engine.begin(value);
  while (!snapshot.complete) snapshot = engine.advance(2);
  return snapshot;
}

test('OR/substring matches are per record; sections, match counts and stars rank independently', () => {
  const records = [
    record('toc', 'alpha', { section: 'toc', language: 'toc', item: 'x', order: 0 }),
    record('one-star', 'alpha', { featured: true, order: 1 }),
    record('two', 'alphabet beta', { order: 2 }),
    record('two-star', 'alpha beta', { featured: true, order: 3 }),
    record('other', 'beta', { order: 4 }),
  ];
  const result = finish(new IncrementalSearch(records), request('alpha beta alpha'));
  assert.deepEqual(searchWords('alpha beta alpha'), ['alpha', 'beta']);
  assert.deepEqual(result.toc.map(x => x.record.key), ['toc']);
  assert.deepEqual(result.text.map(x => x.record.key), ['two-star', 'two', 'one-star', 'other']);
  assert.deepEqual(result.text.map(x => x.matchedWords.length), [2, 2, 1, 1]);
  const onlyBest = finish(new IncrementalSearch(records), request('alpha beta', { textLimit: 1 }));
  assert.equal(onlyBest.text[0]?.record.key, 'two-star');
  assert.equal(onlyBest.textTotal, 4); // the limit is applied after ranking
});

test('Arabic is a tie-breaker after matched-word count and the featured star', () => {
  const records = [
    record('persian-star-two', 'alpha beta', { featured: true, language: 'fa', order: 0 }),
    record('arabic-star-one', 'alpha', { featured: true, language: 'ar', order: 1 }),
    record('arabic-unstarred-two', 'alpha beta', { language: 'ar', order: 2 }),
    record('arabic-star-two', 'alpha beta', { featured: true, language: 'ar', order: 3 }),
  ];
  const result = finish(new IncrementalSearch(records), request('alpha beta'));
  assert.deepEqual(result.text.map(hit => hit.record.key),
    ['arabic-star-two', 'persian-star-two', 'arabic-unstarred-two', 'arabic-star-one']);
  // Language comes before direct-versus-spaced when count and star are tied.
  const joined = [record('persian-direct', 'اهلبیت', { language: 'fa', order: 0 }),
    record('arabic-spaced', 'اهل بیت', { language: 'ar', order: 1 })];
  assert.deepEqual(finish(new IncrementalSearch(joined), request('اهلبیت')).text.map(hit => hit.record.key),
    ['arabic-spaced', 'persian-direct']);
});

test('unfinished and completed word work survives query, item, and language changes', () => {
  const records = [record('a', 'کتاب', { item: 'i1', language: 'fa' }),
    record('b', 'كتاب', { item: 'i1', language: 'ar' }),
    record('c', 'کتاب دیگر', { item: 'i2', language: 'fa' }),
    record('d', 'چیز دیگر', { item: 'i2', language: 'fa' })];
  const engine = new IncrementalSearch(records);
  engine.begin(request('کتاب', { id: 1, languages: ['fa'] }));
  const partial = engine.advance(2);
  assert.equal(partial.complete, false);
  assert.deepEqual(engine.progress('کتاب'), { cursor: 2, complete: false });
  const changed = engine.begin(request('کتاب دیگر', { id: 2, languages: ['ar'], item: 'i1' }));
  assert.equal(changed.id, 2);
  assert.deepEqual(changed.text.map(x => x.record.key), ['b']);
  assert.deepEqual(engine.progress('کتاب'), { cursor: 2, complete: false });
  engine.advance(2);
  assert.deepEqual(engine.progress('کتاب'), { cursor: 4, complete: true });
  const reused = engine.begin(request('کتاب', { id: 3, languages: ['fa'], item: 'i2' }));
  assert.equal(reused.complete, true);
  assert.deepEqual(reused.text.map(x => x.record.key), ['c']);
  assert.deepEqual(engine.progress('کتاب'), { cursor: 4, complete: true });
});

test('TOC results arrive before text shards and existing word scans resume when shards append', () => {
  const toc = record('toc', 'alpha', { section: 'toc', language: 'toc', item: 'a' });
  const engine = new IncrementalSearch([toc], 32, true);
  let result = engine.begin(request('alpha'));
  result = engine.advance(10);
  assert.equal(result.complete, false); // more data is still being loaded
  assert.deepEqual(result.toc.map(hit => hit.record.key), ['toc']);
  assert.equal(result.text.length, 0);
  assert.equal(engine.hasUnscannedRecords(), false);
  engine.appendRecords([record('text', 'alpha beta')]);
  assert.equal(engine.hasUnscannedRecords(), true);
  result = engine.advance(10);
  assert.deepEqual(result.text.map(hit => hit.record.key), ['text']);
  assert.equal(result.complete, false);
  engine.finishLoading();
  result = engine.advance(10);
  assert.equal(result.complete, true);
  assert.deepEqual(engine.progress('alpha'), { cursor: 2, complete: true });
});

test('direct matches break only ties left after word count and featured status', () => {
  const records = [
    record('compact', 'می روم', { order: 0 }),
    record('direct', 'میروم', { order: 1 }),
    record('compact-featured', 'می روم', { featured: true, order: 2 }),
  ];
  const result = finish(new IncrementalSearch(records), request('میروم'));
  assert.deepEqual(result.text.map(hit => hit.record.key), ['compact-featured', 'direct', 'compact']);
});

test('one-letter, diacritic, yeh/kaf, digit and joined-form searches work', () => {
  const r = record('x', 'كِتاب می‌روم ۱۲۳');
  const engine = new IncrementalSearch([r]);
  for (const query of ['ت', 'کتاب', 'میروم', '١٢٣']) {
    assert.equal(finish(engine, request(query)).text.length, 1, query);
  }
  assert.equal(finish(engine, request('ناموجود')).text.length, 0);
});

test('matched source spans preserve diacritics, joins, supplementary code points and original text', () => {
  const original = '😀 كِتَابٌ، می‌روم ۱۲۳';
  const mapped = foldWithOffsets(original);
  assert.ok(mapped);
  assert.equal(mapped.value, normalizeSearch(original));
  const ranges = wholeWordRanges(original, findOriginalMatches(original, ['کتاب', 'میروم', '123']));
  assert.deepEqual(ranges.map(r => original.slice(r.start, r.end)), ['كِتَابٌ', 'می‌روم', '۱۲۳']);
  const start = ranges[0]!.start;
  const pointOffset = utf16ToCodePointOffset(original, start);
  assert.equal(pointOffset, 2); // one emoji, then one space
  assert.equal(codePointToUtf16Offset(original, pointOffset), start);
  assert.equal(original, '😀 كِتَابٌ، می‌روم ۱۲۳');
});

test('offset mapping agrees with the search normalizer on actual Arabic/Persian rows', () => {
  const corpus = loadCorpus();
  const seen = new Set<string>();
  for (const [itemId, item] of corpus.items) for (const row of item.rows) {
    for (const id of [row.ar, row.fa]) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const value = text(corpus, id);
      assert.equal(foldWithOffsets(value)?.value, normalizeSearch(value), `${itemId}/${row.id}`);
    }
  }
  assert.ok(seen.size > 5000);
  const visit = (nodes: typeof corpus.nav.toc): void => {
    for (const node of nodes) {
      const value = text(corpus, node.title);
      assert.equal(foldWithOffsets(value)?.value, normalizeSearch(value), `TOC ${node.title}`);
      visit(node.children);
    }
  };
  visit(corpus.nav.toc);
});
