import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCorpus, text } from '../src/corpus.js';
import { normalizeSearch } from '../src/normalize.js';
import { IncrementalSearch, type SearchRecord, type SearchRequest } from '../src/search.js';
import type { NavNode } from '../src/schema.js';

// Build directly from canonical rows, independent of the generated index.
const corpus = loadCorpus();
const featured = new Set(corpus.nav.featured);
const records: SearchRecord[] = [];
function toc(nodes: NavNode[], path: number[] = []): void {
  nodes.forEach((node, index) => {
    const location = [...path, index]; const value = text(corpus, node.title);
    if (value) records.push({ key: `toc:${location.join('.')}`, section: 'toc', item: node.item, language: 'toc',
      text: value, normalized: normalizeSearch(value), featured: Boolean(node.item && featured.has(node.item)), order: records.length });
    toc(node.children, location);
  });
}
toc(corpus.nav.toc);
let order = 0;
for (const id of corpus.nav.default_order) {
  const item = corpus.items.get(id)!;
  for (let i = 0; i < item.rows.length; i += 1) {
    const row = item.rows[i]!;
    if (row.kind === 'audio-reciter') continue;
    for (const language of ['ar', 'fa'] as const) {
      const value = text(corpus, row[language]); if (!value) continue;
      const adjacent = item.rows[i + 1];
      const nextText = adjacent && adjacent.kind !== 'audio-reciter' ? text(corpus, adjacent[language]) : '';
      const next = adjacent && normalizeSearch(nextText) ? `row:${id}:${adjacent.id}:${language}` : undefined;
      records.push({ key: `row:${id}:${row.id}:${language}`, section: 'text', item: id, row: row.id,
        language, text: value, normalized: normalizeSearch(value), featured: featured.has(id), order: order++, ...(next ? { next } : {}) });
    }
  }
}
const engine = new IncrementalSearch(records);
function run(query: string, extra: Partial<SearchRequest> = {}) {
  let result = engine.begin({ id: 1, query, languages: ['ar', 'fa'], tocLimit: 50, textLimit: 50,
    resultLimit: records.length, ...extra });
  while (!result.complete) result = engine.advance(records.length);
  return result;
}
const position = (hits: ReturnType<typeof run>['results'], key: string) => hits.findIndex(hit => hit.record.key === key);

test('unaccented یا رب ranks an actual adjacent phrase above accidental fragments and TOC partials', () => {
  const result = run('یا رب');
  assert.equal(result.results[0]?.record.key, 'row:dua-kumayl:r00098:ar');
  assert.ok(position(result.results, 'row:dua-kumayl:r00098:ar') < position(result.results, 'row:sura-yasin:r00051:ar'));
  assert.ok(result.results.some(hit => hit.record.key === 'row:sura-yasin:r00051:ar')); // OR/substrings remain available
});

test('الهی عظم البلا finds its existing long version before a weaker title', () => {
  const result = run('الهی عظم البلا');
  assert.equal(result.results[0]?.record.key, 'row:dua-frj-zman-ajl:r00003:ar');
  const starredTitle = result.results.findIndex(hit => hit.record.section === 'toc' && hit.record.item === 'dua-azm-al-bala');
  assert.ok(starredTitle > 0);
});

test('the starred variant is recognized across three real source rows and keeps its anchor and source text', () => {
  const result = run('الهی عظم البلا و برح الخفا و انکشف الغطا');
  assert.equal(result.results[0]?.record.key, 'row:dua-frj-zman-ajl:r00003:ar');
  const split = result.results[1]!;
  assert.equal(split.record.key, 'row:dua-azm-al-bala:r00002:ar');
  assert.deepEqual(split.continuation?.map(part => part.row), ['r00003', 'r00004']);
  assert.ok(split.continuation?.[0]?.matchedWords.includes('برح'));
  assert.ok(split.continuation?.[1]?.matchedWords.includes('انکشف'));
  const original = corpus.items.get('dua-azm-al-bala')!;
  assert.equal(split.record.text, text(corpus, original.rows.find(row => row.id === 'r00002')!.ar));
  assert.equal(split.continuation?.[0]?.text, text(corpus, original.rows.find(row => row.id === 'r00003')!.ar));
  assert.equal(split.continuation?.[1]?.text, text(corpus, original.rows.find(row => row.id === 'r00004')!.ar));
});

test('a misspelled middle query word preserves a nearby split-sequence boost', () => {
  const result = run('الهی اشتباه البلا و برح الخفاء');
  const hit = result.results.find(hit => hit.record.key === 'row:dua-frj-zman-ajl:r00003:ar');
  assert.ok(hit);
  assert.ok(hit.relevance.matchedSequenceWords >= 5);
  assert.ok(!hit.matchedWords.includes('اشتباه'));
  assert.ok(position(result.results, hit.record.key) < 5);
});

test('the same cross-row behavior respects item and language filters', () => {
  const result = run('عظم البلاء و برح الخفاء', { item: 'dua-azm-al-bala', languages: ['ar'] });
  assert.equal(result.results[0]?.record.key, 'row:dua-azm-al-bala:r00002:ar');
  assert.deepEqual(result.results[0]?.continuation?.map(part => part.row), ['r00003']);
  assert.ok(result.results.every(hit => hit.record.item === 'dua-azm-al-bala'));
  assert.ok(result.results.every(hit => hit.record.section === 'toc' || hit.record.language === 'ar'));
});

test('starred scattered TOC titles outrank unstarred exact titles at the same displayed count', () => {
  const result = run('دعای فرج');
  assert.equal(result.results[0]?.record.item, 'dua-faraj');
  assert.equal(result.results[0]?.record.section, 'toc');
  const exactUnstarred = result.results.findIndex(hit => hit.record.section === 'toc' && hit.record.item === 'dua-frj-zman-ajl');
  const scatteredStarred = result.results.findIndex(hit => hit.record.section === 'toc' && hit.record.item === 'dua-esteghase');
  assert.ok(scatteredStarred >= 0 && exactUnstarred > scatteredStarred);
  const starred = result.results[scatteredStarred]!;
  const unstarred = result.results[exactUnstarred]!;
  assert.equal(starred.record.featured, true);
  assert.equal(unstarred.record.featured, false);
  assert.equal(starred.matchedWords.length, unstarred.matchedWords.length);
  assert.ok(starred.relevance.score < unstarred.relevance.score);
});

test('real-corpus displayed counts, continuation words, stars, and bounded lists agree', () => {
  const displayedCount = (hit: ReturnType<typeof run>['results'][number]) => new Set([
    ...hit.matchedWords, ...(hit.continuation ?? []).flatMap(part => part.matchedWords),
  ]).size;
  let sawAddedContinuationTerm = false;
  for (const query of ['عظم البلاء و برح الخفاء', 'الله الله', 'الهی ربی']) {
    const full = run(query, { tocLimit: records.length, textLimit: records.length });
    for (const list of [full.results, full.toc, full.text]) {
      for (const [index, hit] of list.entries()) {
        if (hit.continuation?.length && displayedCount(hit) > hit.matchedWords.length) sawAddedContinuationTerm = true;
        if (!index) continue;
        const previous = list[index - 1]!;
        assert.ok(displayedCount(previous) >= displayedCount(hit), `${query}: ${previous.record.key} / ${hit.record.key}`);
        if (displayedCount(previous) === displayedCount(hit)) {
          assert.ok(previous.record.featured || !hit.record.featured, `${query}: star ordering`);
        }
      }
    }
    const limited = run(query, { resultLimit: 30, tocLimit: 10, textLimit: 10 });
    for (const [section, limit] of [['results', 30], ['toc', 10], ['text', 10]] as const) {
      assert.deepEqual(limited[section].map(hit => hit.record.key), full[section].slice(0, limit).map(hit => hit.record.key));
    }
  }
  assert.equal(sawAddedContinuationTerm, true);
});
