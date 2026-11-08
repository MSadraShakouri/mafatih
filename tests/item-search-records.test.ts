import assert from 'node:assert/strict';
import test from 'node:test';
import { buildData } from '../scripts/build-data.js';
import { IncrementalSearch, type SearchRequest, type SearchShard } from '../src/search.js';
import type { ReaderItem } from '../web/data.js';
import { itemSearchRecords } from '../web/item-search-records.js';

test('local reader records match every global source field and original adjacency', () => {
  const files = new Map<string, string>();
  buildData({ quiet: true, write: (name, value) => files.set(name, value) });
  const globals = [...files.entries()].filter(([name]) => /^search\/\d+\.json$/.test(name))
    .flatMap(([, value]) => (JSON.parse(value) as SearchShard).records);
  const byKey = new Map(globals.map(record => [record.key, record]));
  let count = 0;
  for (const [name, value] of files) {
    if (!name.startsWith('items/') || !name.endsWith('.json')) continue;
    const item = JSON.parse(value) as ReaderItem;
    const local = itemSearchRecords(item);
    let base: number | undefined;
    for (const record of local) {
      const global = byKey.get(record.key);
      assert.ok(global, record.key);
      base ??= global.order - record.order;
      assert.deepEqual({ ...record, order: global.order }, global, record.key);
      assert.equal(global.order - record.order, base, `source order: ${record.key}`);
      count++;
    }
  }
  assert.equal(count, globals.length);
  assert.ok(count > 20_000);

  // A different in-memory record order must not change per-item ranking,
  // aliases, source matches or continuation excerpts compared with global.
  const globalEngine = new IncrementalSearch(globals);
  const selected = ['dua-kumayl', 'dua-samat', 'namaz-hnvt-myt'];
  const queries = ['الهم', 'شیء قوت', 'بالطف', 'درود'];
  for (const id of selected) {
    const item = JSON.parse(files.get(`items/${id}.json`)!) as ReaderItem;
    const localEngine = new IncrementalSearch(itemSearchRecords(item));
    for (const query of queries) {
      const request: SearchRequest = { id: 1, query, item: id, languages: ['ar', 'fa'], tocLimit: 0, textLimit: 50, resultLimit: 0 };
      const finish = (engine: IncrementalSearch) => {
        let result = engine.begin(request);
        while (!result.complete) result = engine.advance(600);
        return { total: result.textTotal, hits: result.text.map(hit => ({ key: hit.record.key,
          matchedWords: hit.matchedWords, relevance: hit.relevance, continuation: hit.continuation })) };
      };
      assert.deepEqual(finish(localEngine), finish(globalEngine), `${id}: ${query}`);
    }
  }
});
