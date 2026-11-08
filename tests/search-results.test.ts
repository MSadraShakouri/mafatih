import assert from 'node:assert/strict';
import test from 'node:test';
import type { SearchHit } from '../src/search.js';
import { mergeSearchHits, type DisplayHit } from '../web/search-results.js';

const hit = (key: string): SearchHit => ({ record: { key, section: 'text', item: 'one', row: key,
  language: 'ar', text: key, normalized: key, featured: false, order: 0 }, matchedWords: [key], directMatches: 1,
  relevance: { score: 1, matchedSequenceWords: 1, exactSequenceWords: 1 } });
const prior = (...keys: string[]): DisplayHit[] => keys.map(key => ({ hit: hit(key), previous: false, multi: false }));

test('empty partials retain the old page, new hits stream ahead of it and final empty clears it', () => {
  const old = prior('a', 'b');
  assert.deepEqual(mergeSearchHits([], old, false, false, 50).map(x => [x.hit.record.key, x.previous]), [['a', true], ['b', true]]);
  assert.deepEqual(mergeSearchHits([hit('c'), hit('a')], old, false, true, 50).map(x => [x.hit.record.key, x.previous]),
    [['c', false], ['a', false], ['b', true]]);
  assert.deepEqual(mergeSearchHits([], old, true, false, 50), []);
  assert.deepEqual(mergeSearchHits([hit('c')], old, true, false, 50).map(x => [x.hit.record.key, x.previous]), [['c', false]]);
});

test('retention is bounded, and same-query paging does not mislabel current matches', () => {
  const old = prior('a', 'b', 'c');
  assert.deepEqual(mergeSearchHits([], old, false, false, 2).map(x => x.hit.record.key), ['a', 'b']);
  assert.deepEqual(mergeSearchHits([hit('a')], old, false, false, 50, false).map(x => x.previous), [false, false, false]);
});
