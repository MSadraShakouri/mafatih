import fs from 'node:fs';
import path from 'node:path';
import { IncrementalSearch, searchWords, type SearchHit, type SearchIndex, type SearchShard } from '../src/search.js';
import { findOriginalMatches, utf16ToCodePointOffset } from '../src/search-text.js';

// A reproducible, local-only inspection tool. It reads generated data and never
// modifies the source text. Output excerpts remove marks ONLY for readability.
const directory = path.resolve('generated/web-data');
const manifestPath = path.join(directory, 'search-index.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Search data is missing. Run npm run build:data first.');
  process.exit(1);
}
const index = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as SearchIndex;
if (index.version !== 4 || index.normalization !== 'nfkd-search-v2') {
  console.error('Search data is stale or incompatible. Run npm run build:data again.');
  process.exit(1);
}
const records = [...index.records, ...index.shards.flatMap(shard =>
  (JSON.parse(fs.readFileSync(path.join(directory, shard), 'utf8')) as SearchShard).records)];
const engine = new IncrementalSearch(records);
const queries = process.argv.slice(2);
if (!queries.length) queries.push('بسم الله الرحمن الرحیم', 'الهی ربی', 'کمیل', 'اهل‌بیت', 'اهلبیت', 'اهل بیت', 'می‌کنم', 'میکنم', 'می کنم', 'یا');

function example(hit: SearchHit): string {
  const raw = hit.record.text;
  const focus = findOriginalMatches(raw, hit.matchedWords, 1)[0];
  const points = Array.from(raw);
  const offset = focus ? utf16ToCodePointOffset(raw, focus.start) : 0;
  const start = Math.max(0, offset - 35);
  const end = Math.min(points.length, offset + 90);
  const excerpt = `${start ? '…' : ''}${points.slice(start, end).join('')}${end < points.length ? '…' : ''}`
    .normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/gu, ' ');
  const location = hit.record.section === 'toc' ? (hit.record.item ?? `heading:${hit.record.tocPath}`) : `${hit.record.item}/${hit.record.row}`;
  const featured = hit.record.featured ? ' ★' : '';
  const continuation = hit.continuation?.length ? ` → ${hit.continuation.map(part => part.row).join(', ')}` : '';
  const found = [...new Set([...hit.matchedWords, ...(hit.continuation ?? []).flatMap(part => part.matchedWords)])];
  return `  [${hit.record.language}${featured}] ${location}${continuation} | score ${hit.relevance.score} | ${found.join(' + ')} | ${excerpt}`;
}

console.log(`Search probe: ${index.records.length} TOC entries and ${records.length - index.records.length} text fields.`);
console.log('Examples below omit combining marks only in this diagnostic output; source text is unchanged.');
for (const [id, query] of queries.entries()) {
  let result = engine.begin({ id, query, languages: ['ar', 'fa'], tocLimit: records.length, textLimit: records.length, resultLimit: 6 });
  while (!result.complete) result = engine.advance(Math.max(1, records.length));
  const distribution = new Map<number, number>();
  for (const hit of result.text) distribution.set(hit.matchedWords.length, (distribution.get(hit.matchedWords.length) ?? 0) + 1);
  console.log(`\nQuery: ${query}\nTerms: ${JSON.stringify(searchWords(query))}\nTOC: ${result.tocTotal}; text: ${result.textTotal}`);
  console.log(`Text match counts: ${[...distribution].sort((a, b) => a[0] - b[0]).map(([n, count]) => `${n}=${count}`).join(', ') || 'none'}`);
  console.log('Top combined results:');
  for (const hit of result.results) console.log(example(hit));
}
