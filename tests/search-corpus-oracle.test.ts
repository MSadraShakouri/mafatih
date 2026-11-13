import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCorpus, text } from '../src/corpus.js';
import { normalizeSearch } from '../src/normalize.js';
import { approvedLamPairs, wordVariants } from '../src/lam-aliases.js';
import { IncrementalSearch, searchWords, type SearchLanguage, type SearchRecord, type SearchRequest } from '../src/search.js';
import { findOriginalMatches } from '../src/search-text.js';
import type { NavNode } from '../src/schema.js';
import { protectedLamPairs } from './fixtures/search-protected-lam.js';

/** An independent, deliberately simple test oracle built from original text. */
interface ReferenceText { simple: string; groups: string[][]; preserved: string; preservedGroups: string[][] }
function referenceText(input: string): ReferenceText {
  const digits = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩';
  const equivalents: Record<string, string> = {
    ك: 'ک', ک: 'ک', ي: 'ی', ى: 'ی', ی: 'ی',
    ٱ: 'ا', أ: 'ا', إ: 'ا', آ: 'ا', ؤ: 'و', ئ: 'ی',
  };
  let folded = '';
  for (const raw of input.normalize('NFKD').toLocaleLowerCase('en-US')) {
    if (/[\p{M}\u0640\u200c\u200d]/u.test(raw)) continue;
    const digit = digits.indexOf(raw);
    const char = digit >= 0 ? String(digit % 10) : (equivalents[raw] ?? raw);
    if (/[\p{L}\p{N}]/u.test(char)) {
      folded += char;
    } else if (/^[\p{Zs}\t]$/u.test(char)) {
      if (folded && !/[ |]$/.test(folded)) folded += ' ';
    } else {
      // Punctuation and line breaks are hard boundaries, even next to spaces.
      folded = folded.replace(/ $/, '');
      if (folded && !folded.endsWith('|')) folded += '|';
    }
  }
  folded = folded.replace(/[ |]+$/, '');
  const tokenize = (value: string) => value.split('|').map(group => group.split(' ').filter(Boolean)).filter(group => group.length > 0);
  const legacy = folded.replace(/ة/g, 'ه');
  return { simple: legacy.replace(/[ |]+/g, ' ').trim(), groups: tokenize(legacy),
    preserved: folded.replace(/[ |]+/g, ' ').trim(), preservedGroups: tokenize(folded) };
}

/** Concatenate whole source-word starts and, optionally, a prefix of the last. */
function referenceMatch(value: ReferenceText, queryWord: string): 'direct' | 'spaced' | undefined {
  const useTa = /[تة]/u.test(queryWord);
  const source = useTa ? value.preserved : value.simple;
  const groups = useTa ? value.preservedGroups : value.groups;
  // Intentionally character-by-character, independent of the production
  // regex/prefilters: ت and ه each match ة, while ة matches all three.
  const accepts = (query: string, prefix: string): boolean => {
    if (prefix.length > query.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      const q = query[i], s = prefix[i];
      if (q !== s && !(s === 'ة' && (q === 'ت' || q === 'ه')) &&
          !(q === 'ة' && (s === 'ت' || s === 'ه'))) return false;
    }
    return true;
  };
  if (!useTa && source.includes(queryWord)) return 'direct';
  if (useTa) for (let i = 0; i + queryWord.length <= source.length; i++) {
    if (accepts(queryWord, source.slice(i, i + queryWord.length))) return 'direct';
  }
  if (Array.from(queryWord).length < 3) return undefined;
  for (const group of groups) for (let first = 0; first < group.length - 1; first += 1) {
    let prefix = group[first]!;
    if (!accepts(queryWord, prefix)) continue;
    for (let last = first + 1; last < group.length; last += 1) {
      const next = group[last]!;
      const remainder = queryWord.slice(prefix.length);
      if (Array.from(remainder).length < 2 || Array.from(next).length < 2) break;
      if (next.length >= remainder.length && accepts(remainder, next.slice(0, remainder.length))) {
        const minPartial = group[first] === 'یا' || group[first] === 'و' ? 2 : 3;
        if (next.length === remainder.length || Array.from(remainder).length >= minPartial) return 'spaced';
        break;
      }
      if (!accepts(remainder, next)) break;
      prefix += next;
    }
  }
  return undefined;
}

function corpusRecords(): SearchRecord[] {
  const corpus = loadCorpus();
  const featured = new Set(corpus.nav.featured);
  const records: SearchRecord[] = [];
  let tocOrder = 0;
  function visit(nodes: NavNode[], path: number[] = []): void {
    nodes.forEach((node, index) => {
      const location = [...path, index];
      const value = text(corpus, node.title);
      if (value) records.push({ key: `toc:${location.join('.')}`, section: 'toc', item: node.item, language: 'toc',
        text: value, normalized: normalizeSearch(value), featured: Boolean(node.item && featured.has(node.item)), order: tocOrder++ });
      visit(node.children, location);
    });
  }
  visit(corpus.nav.toc);
  let textOrder = 0;
  for (const itemId of corpus.nav.default_order) {
    const item = corpus.items.get(itemId)!;
    for (const row of item.rows) {
      if (row.kind === 'audio-reciter') continue;
      for (const language of ['ar', 'fa'] as const) {
        const value = text(corpus, row[language]);
        if (!value) continue;
        records.push({ key: `row:${itemId}:${row.id}:${language}`, section: 'text', item: itemId, row: row.id,
          language, text: value, normalized: normalizeSearch(value), featured: featured.has(itemId), order: textOrder++ });
      }
    }
  }
  return records;
}

interface Case { query: string; languages?: SearchLanguage[]; item?: string }
interface Expected { key: string; words: string[]; direct: number; featured: boolean; language: SearchRecord['language']; order: number }
function runCases(records: SearchRecord[], cases: Case[]): void {
  const referenceByText = new Map<string, ReferenceText>();
  for (const record of records) {
    let ref = referenceByText.get(record.text);
    if (!ref) { ref = referenceText(record.text); referenceByText.set(record.text, ref); }
    assert.equal(record.normalized, ref.simple, `independent folding: ${record.key}`);
  }
  const engine = new IncrementalSearch(records);
  for (const [id, example] of cases.entries()) {
    const languages = example.languages ?? ['ar', 'fa'];
    const referenceWords = [...new Set(referenceText(example.query).preserved.split(' ').filter(Boolean))];
    assert.deepEqual(searchWords(example.query), referenceWords, `query tokens: ${example.query}`);
    const expected: Record<'toc' | 'text', Expected[]> = { toc: [], text: [] };
    for (const record of records) {
      if (example.item && record.item !== example.item) continue;
      if (record.section === 'text' && !languages.includes(record.language as SearchLanguage)) continue;
      const value = referenceByText.get(record.text)!;
      const matches = referenceWords.map(word => {
        const kinds = wordVariants(word).map(variant => referenceMatch(value, variant));
        return { word, kind: kinds.includes('direct') ? 'direct' : kinds.includes('spaced') ? 'spaced' : undefined };
      }).filter(match => match.kind);
      if (matches.length) expected[record.section].push({ key: record.key, words: matches.map(match => match.word),
        direct: matches.filter(match => match.kind === 'direct').length, featured: record.featured, language: record.language, order: record.order });
    }
    const request: SearchRequest = { id, query: example.query, languages, ...(example.item ? { item: example.item } : {}),
      tocLimit: records.length, textLimit: records.length, resultLimit: records.length };
    let result = engine.begin(request);
    while (!result.complete) result = engine.advance(Math.max(1, records.length));
    assert.equal(result.id, id);
    for (const section of ['toc', 'text'] as const) {
      const actual = result[section];
      const expectedByKey = new Map(expected[section].map(hit => [hit.key, hit]));
      assert.equal(section === 'toc' ? result.tocTotal : result.textTotal, expected[section].length,
        `${example.query}: ${section} total`);
      assert.equal(actual.length, expected[section].length, `${example.query}: ${section} length`);
      assert.equal(new Set(actual.map(hit => hit.record.key)).size, actual.length, `${example.query}: duplicate ${section} hit`);
      for (let i = 0; i < actual.length; i += 1) {
        const got = actual[i]!;
        const want = expectedByKey.get(got.record.key);
        assert.ok(want, `${example.query}: unexpected ${section} hit ${got.record.key}`);
        assert.deepEqual(got.matchedWords, want.words, `${example.query}: ${want.key} matched terms`);
        assert.equal(got.directMatches, want.direct, `${example.query}: ${want.key} direct terms`);
        assert.ok(got.relevance.score > 0, `${example.query}: matched hit ${want.key} has no relevance score`);
        // Every sampled anchor term still maps to unchanged original text.
        if (i < 10) for (const word of got.matchedWords) {
          const spans = findOriginalMatches(got.record.text, [...wordVariants(word)]);
          assert.ok(spans.length, `${example.query}: missing highlight in ${want.key} for ${word}`);
          assert.ok(spans.every(span => span.start >= 0 && span.end <= got.record.text.length && span.start < span.end));
        }
      }
      assert.deepEqual(result.results.filter(hit => hit.record.section === section).map(hit => hit.record.key),
        actual.map(hit => hit.record.key), `${example.query}: unified order for ${section}`);
    }
    // Recompute the public comparator independently. Scoring itself is also
    // checked against an exhaustive alignment oracle in search-relevance-oracle.
    const ranked = [...result.results].sort((a, b) => {
      const coverage = (hit: typeof a) => Math.max(hit.matchedWords.length, Math.min(referenceWords.length, hit.relevance.matchedSequenceWords));
      const displayedCount = (hit: typeof a) => new Set([
        ...hit.matchedWords, ...(hit.continuation ?? []).flatMap(part => part.matchedWords),
      ]).size;
      return displayedCount(b) - displayedCount(a) || Number(b.record.featured) - Number(a.record.featured) ||
        b.relevance.score - a.relevance.score || b.relevance.matchedSequenceWords - a.relevance.matchedSequenceWords ||
        b.relevance.exactSequenceWords - a.relevance.exactSequenceWords || coverage(b) - coverage(a) ||
        Number(b.record.section === 'toc') - Number(a.record.section === 'toc') ||
        Number(b.record.language === 'ar') - Number(a.record.language === 'ar') ||
        b.directMatches - a.directMatches || a.record.order - b.record.order;
    });
    assert.deepEqual(result.results.map(hit => hit.record.key), ranked.map(hit => hit.record.key), `${example.query}: combined ranking`);
  }
}

const actualExamples: Case[] = [
  { query: 'بسم الله الرحمن الرحیم' }, { query: 'لا اله الا الله' },
  { query: 'الهی ربی' }, { query: 'الهی ربی', item: 'dua-kumayl' },
  { query: 'الهی عظم البلا' }, { query: 'عظم البلاء و برح الخفاء' }, { query: 'یا رب' },
  { query: 'الهی غلط البلا و برح الخفا' },
  { query: 'الهی ربی', item: 'dua-kumayl', languages: ['ar'] },
  { query: 'الله', languages: ['ar'] }, { query: 'الله', languages: ['fa'] },
  { query: 'اللهم صل علی محمد و ال محمد' }, { query: 'یا الله' },
  { query: 'کمیل' }, { query: 'کمی' }, { query: 'میل' }, { query: 'یا' },
  { query: 'اهل\u200cبیت' }, { query: 'اهلبیت' }, { query: 'اهل بیت' },
  { query: 'می\u200cکنم' }, { query: 'میکنم' }, { query: 'می کنم' },
  { query: 'کتاب' }, { query: 'كتاب' }, { query: '۱' }, { query: '1' },
  { query: 'الله الله' }, { query: 'یا،رب' }, { query: 'ا' },
  { query: 'خدایا' }, { query: 'کلام' }, { query: 'درود' }, { query: 'یاعلی' },
  { query: 'والله' }, { query: 'ولله' }, { query: 'یارب' }, { query: 'ورب' },
  { query: 'العقوبت' }, { query: 'العقوبة' }, { query: 'رحمت' }, { query: 'رحمة' }, { query: 'ت', languages: ['ar'] },
  { query: 'ة', languages: ['ar'] }, { query: 'ته' }, { query: 'تة' }, { query: 'صلاتالله' },
  { query: 'برحمةکالتی', item: 'dua-kumayl' }, { query: 'یا رحمت الله', item: 'dua-kumayl' },
  { query: 'الفبایناموجود' }, { query: '' },
];

test('diacritic-free real-corpus OR hits match an independent oracle and the unified comparator', () => {
  const records = corpusRecords();
  assert.ok(records.length > 21000);
  runCases(records, actualExamples);
});

test('seeded real-word fragments and changing query scopes remain consistent', () => {
  const all = corpusRecords();
  let state = 0x4791ab3;
  const random = (max: number): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % max; };
  const sample: SearchRecord[] = [];
  const chosen = new Set<number>();
  while (sample.length < 1200) {
    const index = random(all.length);
    if (!chosen.has(index)) { chosen.add(index); sample.push(all[index]!); }
  }
  const cases: Case[] = [];
  for (let i = 0; i < 100; i += 1) {
    const source = sample[random(sample.length)]!;
    const words = referenceText(source.text).simple.split(' ').filter(Boolean);
    const queryWords: string[] = [];
    for (let n = 0; n < 1 + random(3); n += 1) {
      const letters = Array.from(words[random(words.length)] ?? 'الله');
      const start = random(letters.length);
      queryWords.push(letters.slice(start, start + 1 + random(Math.min(6, letters.length - start))).join(''));
    }
    const query = queryWords.join(i % 4 === 0 ? '،' : ' ');
    cases.push({ query, ...(i % 5 === 0 ? { languages: ['ar'] as SearchLanguage[] } : {}),
      ...(i % 7 === 0 && source.item ? { item: source.item } : {}) });
  }
  runCases(sample, cases);
});


// This deliberately independent corpus check is slower than the normal suite.
// It compares both directions of all approved aliases to the union of the two
// unexpanded reference searches, not to the engine's own alias implementation.
test('all approved lam pairs equal the old two-search union across the full corpus',
  { skip: process.env.MAFATIH_FULL_LAM_ORACLE !== '1' }, () => {
  assert.equal(approvedLamPairs.length, 58);
  const records = corpusRecords();
  const refs = records.map(record => referenceText(record.text));
  const engine = new IncrementalSearch(records, 128);
  let id = 0;
  for (const { one, two } of approvedLamPairs) {
    const expected = new Set(records.flatMap((record, i) =>
      referenceMatch(refs[i]!, one) || referenceMatch(refs[i]!, two) ? [record.key] : []));
    for (const query of [one, two]) {
      let snapshot = engine.begin({ id: ++id, query, languages: ['ar', 'fa'],
        tocLimit: 0, textLimit: 0, resultLimit: records.length });
      while (!snapshot.complete) snapshot = engine.advance(5000);
      const actual = new Set(snapshot.results.map(hit => hit.record.key));
      assert.equal(actual.size, snapshot.results.length, `${query}: deduplicated`);
      assert.deepEqual([...actual].filter(key => !expected.has(key)), [], `${query}: extra`);
      assert.deepEqual([...expected].filter(key => !actual.has(key)), [], `${query}: missing`);
      assert.ok(snapshot.results.every(hit => hit.matchedWords.length === 1 && hit.matchedWords[0] === query), `${query}: one logical term`);
    }
  }
  // The explicit Allah-name candidates are not expanded in either direction.
  assert.equal(protectedLamPairs.length, 24);
  for (const query of ['اله', 'الله', ...protectedLamPairs.flatMap(pair => [pair.one, pair.two])]) {
    const expected = new Set(records.flatMap((record, i) => referenceMatch(refs[i]!, query) ? [record.key] : []));
    let snapshot = engine.begin({ id: ++id, query, languages: ['ar','fa'], tocLimit: 0, textLimit: 0, resultLimit: records.length });
    while (!snapshot.complete) snapshot = engine.advance(5000);
    const actual = new Set(snapshot.results.map(hit => hit.record.key));
    assert.deepEqual([...actual].filter(key => !expected.has(key)), [], `${query}: protected extra`);
    assert.deepEqual([...expected].filter(key => !actual.has(key)), [], `${query}: protected missing`);
  }
});
