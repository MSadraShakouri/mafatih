import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { IncrementalSearch } from '../src/search.js';
import { parityCases, parityRecords } from './fixtures/search-parity-fixture.js';

// Complete result/order/score/continuation digests recorded from the previous
// relevance patch tree 86fb51a before the optimizations. The independent OR
// corpus oracle and exhaustive scorer oracle also exercise these semantics.
test('optimized incremental results agree with the pre-optimization baseline across editing and scopes', () => {
  const expected = JSON.parse(readFileSync(new URL('./fixtures/search-relevance-before.json', import.meta.url), 'utf8')) as
    { records: number; hashes: string[] };
  const records = parityRecords();
  assert.equal(records.length, expected.records);
  const engine = new IncrementalSearch(records);
  for (const [id, example] of parityCases.entries()) {
    let result = engine.begin({ id, query: example.query, languages: example.languages ?? ['ar', 'fa'],
      ...(example.item ? { item: example.item } : {}), resultLimit: records.length,
      tocLimit: records.length, textLimit: records.length });
    let steps = 0;
    while (!result.complete && steps++ < 10000) result = engine.advance(37);
    assert.ok(result.complete, example.query);
    const data = { resultsTotal: result.resultsTotal, tocTotal: result.tocTotal, textTotal: result.textTotal,
      results: result.results.map(hit => ({ key: hit.record.key, words: hit.matchedWords, direct: hit.directMatches,
        relevance: hit.relevance, continuation: hit.continuation?.map(part => ({ row: part.row, text: part.text, words: part.matchedWords })) })) };
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    assert.equal(hash, expected.hashes[id], `${id}: ${example.query} / ${example.item ?? 'global'}`);
  }
});
