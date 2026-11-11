import { normalizeSearch } from './normalize.js';
import { wordVariants, safeAliasPrefix } from './lam-aliases.js';
import { TopK } from './search-top-k.js';
import { findOriginalMatches } from './search-text.js';
import { compactNormalized, mightJoin, normalizedTokens, scoreSequence, type Relevance, type SequencePart } from './search-relevance.js';

export type SearchLanguage = 'ar' | 'fa';
export type SearchSection = 'toc' | 'text';

/** A single source TOC title or a single Arabic/Persian row field. */
export interface SearchRecord {
  key: string;
  section: SearchSection;
  item: string | null;
  row?: string;
  language: SearchLanguage | 'toc';
  text: string;
  normalized: string;
  featured: boolean;
  order: number;
  /** The immediately following source row in this same item/language, if it has text. */
  next?: string;
  tocPath?: string;
  context?: string;
}

export interface SearchIndex {
  version: 4;
  normalization: 'nfkd-search-v2';
  records: SearchRecord[];
  shards: string[];
}
export interface SearchShard { version: 4; records: SearchRecord[] }

export interface SearchContinuation {
  row: string;
  text: string;
  /** Query terms actually found in this unchanged source row. */
  matchedWords: string[];
}
export interface SearchHit {
  record: SearchRecord;
  /** Distinct normalized query words found in the anchor record itself. */
  matchedWords: string[];
  /** Direct normalized matches in the anchor record, versus joined/spaced fallback. */
  directMatches: number;
  relevance: Relevance;
  /** Neighboring rows used by the best local sequence; the anchor remains record.row. */
  continuation?: SearchContinuation[];
}

export interface SearchSnapshot {
  id: number;
  complete: boolean;
  /** One combined, relevance-ranked page; totals remain available by kind. */
  results: SearchHit[];
  resultsTotal: number;
  /** Kept for diagnostics and clients that need each category independently. */
  toc: SearchHit[];
  text: SearchHit[];
  tocTotal: number;
  textTotal: number;
}

export interface SearchRequest {
  id: number;
  query: string;
  languages: SearchLanguage[];
  item?: string;
  tocLimit: number;
  textLimit: number;
  resultLimit?: number;
}

const CHECKED = 1, POSSIBLE = 2, DIRECT = 4, SPACED = 8;

/** Counts are diagnostics, not elapsed-time guarantees. */
export interface WordWork {
  visited: number;
  examined: number;
  reused: number;
  prefixRejected: number;
}
interface WordScan {
  word: string;
  cursor: number; // global source-record cursor
  itemCursors: Map<string, number>;
  flags: Uint8Array; // checked, conservative compact-prefix candidate, direct/spaced
  /** Lazily built bitset of conservative candidates, including unconfirmed joins. */
  possible?: Uint32Array;
  parent?: WordScan;
  matches: number[]; // kept in global source-record order across scopes
  spacedMatches: Set<number>;
  used: number;
  work: WordWork;
}
interface ScoredRecord {
  relevance: Relevance;
  parts: SearchRecord[];
  /** Distinct terms in the scored continuation, cached for this query sequence. */
  continuationWords?: string[];
}
interface ScoreState { scores: Map<number, ScoredRecord>; waiting: Map<string, Set<number>> }
interface ActiveSearch extends ScoreState {
  request: SearchRequest;
  words: string[];
  sequence: string[];
  rankingPending: boolean;
}

/** Unique terms implement OR search; repetitions do not inflate hit counts. */
export function searchWords(query: string): string[] {
  return [...new Set(normalizeSearch(query).split(' ').filter(Boolean))];
}

function matchKind(record: SearchRecord, word: string): 'direct' | 'spaced' | undefined {
  const variants = wordVariants(word);
  if (variants.some(variant => record.normalized.includes(variant))) return 'direct';
  // These are only rejection filters: the original-text matcher still checks
  // horizontal gaps, word boundaries, and partial-final-word safeguards.
  for (const variant of variants) if (variant.length >= 3 && compactNormalized(record).includes(variant) &&
      mightJoin(normalizedTokens(record), variant) && findOriginalMatches(record.text, [variant], 1).length) return 'spaced';
  return undefined;
}

/** A conservative compact-prefix candidate can be useful to a later, longer word. */
function probe(record: SearchRecord, word: string): number {
  const variants = wordVariants(word);
  if (variants.some(variant => record.normalized.includes(variant))) return CHECKED | POSSIBLE | DIRECT;
  let possible = false, spaced = false;
  for (const variant of variants) {
    // Removing spaces cannot create a new single-code-point occurrence.
    if (variant.length === 1 || (variant.length === 2 && variant.codePointAt(0)! > 0xffff) ||
        !compactNormalized(record).includes(variant)) continue;
    possible = true;
    if (variant.length >= 3 && mightJoin(normalizedTokens(record), variant) &&
        findOriginalMatches(record.text, [variant], 1).length > 0) spaced = true;
  }
  return CHECKED | (possible ? POSSIBLE : 0) | (spaced ? SPACED : 0);
}

/** Item-first and global scans can discover matches out of global record order. */
function insertOrdered(values: number[], value: number): void {
  if (!values.length || values[values.length - 1]! < value) { values.push(value); return; }
  let left = 0, right = values.length;
  while (left < right) {
    const middle = (left + right) >>> 1;
    if (values[middle]! < value) left = middle + 1; else right = middle;
  }
  if (values[left] !== value) values.splice(left, 0, value);
}

/** Build an index only when another word can actually reuse this prefix. */
function candidateBits(scan: WordScan): Uint32Array {
  if (!scan.possible) {
    const bits = new Uint32Array(Math.ceil(scan.flags.length / 32));
    for (let index = 0; index < scan.flags.length; index += 1) {
      if (scan.flags[index]! & POSSIBLE) bits[index >>> 5]! |= 1 << (index & 31);
    }
    scan.possible = bits;
  }
  return scan.possible;
}

/** A scan may keep growing after another word starts using its prefix. */
function recordCandidate(scan: WordScan, index: number): void {
  if (!scan.possible) return;
  const word = index >>> 5;
  if (word >= scan.possible.length) {
    const bits = new Uint32Array(Math.ceil(scan.flags.length / 32)); bits.set(scan.possible); scan.possible = bits;
  }
  scan.possible[word]! |= 1 << (index & 31);
}

/** Find the next set bit within the parent's known global scan prefix. */
function nextCandidate(bits: Uint32Array, start: number, end: number): number {
  let word = start >>> 5;
  const limit = Math.min(bits.length, Math.ceil(end / 32));
  if (word >= limit) return end;
  let mask = bits[word]! & (0xffffffff << (start & 31));
  while (true) {
    if (mask) return Math.min(end, word * 32 + 31 - Math.clz32(mask & -mask));
    if (++word >= limit) return end;
    mask = bits[word]!;
  }
}

/** A valid one-term lower bound while the stronger sequence score is pending. */
function provisionalScore(record: SearchRecord, words: string[]): ScoredRecord {
  let score = 0;
  for (const word of words) {
    const text = record.normalized; const variants = wordVariants(word);
    if (variants.some(variant => text === variant || text.startsWith(`${variant} `) || text.endsWith(` ${variant}`) || text.includes(` ${variant} `))) {
      score = 6; break;
    }
    score = Math.max(score, variants.some(variant => text.includes(variant)) ? 3 : 4); // the cache already verified a spaced match
  }
  return { relevance: { score, matchedSequenceWords: score ? 1 : 0, exactSequenceWords: score === 6 ? 1 : 0 }, parts: [record] };
}

/** Incremental per-word OR scans and cached local relevance are shared by global/item search. */
export class IncrementalSearch {
  private readonly cache = new Map<string, WordScan>();
  private readonly records: SearchRecord[] = [];
  private readonly indices = new Map<string, number>();
  private readonly itemIndices = new Map<string, number[]>();
  private readonly scoreCache = new Map<string, ScoreState>();
  private active: ActiveSearch | undefined;
  private clock = 0;
  private loading: boolean;

  constructor(records: SearchRecord[], private readonly maxCachedWords = 32, moreRecordsComing = false) {
    this.loading = moreRecordsComing;
    this.appendRecords(records);
  }

  /** Append shards without discarding any checked words, scope cursors or relevance work. */
  appendRecords(records: SearchRecord[]): void {
    for (const record of records) {
      const index = this.records.length;
      this.indices.set(record.key, index);
      this.records.push(record);
      if (record.item) {
        const item = this.itemIndices.get(record.item) ?? [];
        item.push(index); this.itemIndices.set(record.item, item);
      }
    }
    for (const record of records) for (const state of this.scoreCache.values()) {
      const waiting = state.waiting.get(record.key);
      if (!waiting) continue;
      for (const index of waiting) state.scores.delete(index);
      if (state.scores === this.active?.scores) this.active.rankingPending = true;
      state.waiting.delete(record.key);
    }
  }
  finishLoading(): void { this.loading = false; }

  private scopeSize(item?: string): number {
    return item ? (this.itemIndices.get(item)?.length ?? 0) : this.records.length;
  }
  private scopeCursor(scan: WordScan, item?: string): number {
    return item ? (scan.itemCursors.get(item) ?? 0) : scan.cursor;
  }
  private setScopeCursor(scan: WordScan, item: string | undefined, cursor: number): void {
    if (item) scan.itemCursors.set(item, cursor); else scan.cursor = cursor;
  }
  /** True while either a word scan in the active scope or relevance work remains. */
  hasUnscannedRecords(): boolean {
    if (!this.active) return false;
    const item = this.active.request.item;
    return this.active.rankingPending || this.active.words.some(word =>
      this.scopeCursor(this.cache.get(word)!, item) < this.scopeSize(item));
  }

  begin(request: SearchRequest): SearchSnapshot {
    const sequence = normalizeSearch(request.query).split(' ').filter(Boolean);
    const words = [...new Set(sequence)];
    const scoreKey = JSON.stringify(sequence);
    let scoreState = this.scoreCache.get(scoreKey);
    if (!scoreState) scoreState = { scores: new Map(), waiting: new Map() };
    this.scoreCache.delete(scoreKey); this.scoreCache.set(scoreKey, scoreState);
    this.active = { request, words, sequence, ...scoreState, rankingPending: false };
    this.trimScoreCache(scoreState);
    for (const word of words) {
      let scan = this.cache.get(word);
      if (!scan) {
        // A checked prefix carries a conservative compact candidate flag, not
        // merely its confirmed hits. Unknown parent records remain searchable.
        let parent: WordScan | undefined;
        for (const prior of this.cache.values()) {
          if (word.startsWith(prior.word) && word !== prior.word && safeAliasPrefix(prior.word, word) && (!parent || prior.word.length > parent.word.length)) parent = prior;
        }
        scan = { word, cursor: 0, itemCursors: new Map(), flags: new Uint8Array(), parent,
          matches: [], spacedMatches: new Set(), used: 0,
          work: { visited: 0, examined: 0, reused: 0, prefixRejected: 0 } };
        this.cache.set(word, scan);
      }
      scan.used = ++this.clock;
      // A completed global scan already covers every currently loaded item row.
      if (request.item && scan.cursor === this.records.length) scan.itemCursors.set(request.item, this.scopeSize(request.item));
    }
    this.trimCache(new Set(words));
    // Cached hits can number in the tens of thousands. Return a provisional
    // page rather than blocking a new query while ranking them all.
    return this.snapshot(120);
  }

  advance(batchSize = 500): SearchSnapshot {
    if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error('Invalid search batch size');
    if (!this.active) throw new Error('Start a search first');
    const item = this.active.request.item;
    const scoped = item ? (this.itemIndices.get(item) ?? []) : undefined;
    const size = this.scopeSize(item);
    for (const word of this.active.words) {
      const scan = this.cache.get(word)!;
      let cursor = this.scopeCursor(scan, item), examined = 0, visited = 0;
      const parent = scan.parent;
      const candidates = parent && !scoped && cursor < parent.cursor ? candidateBits(parent) : undefined;
      // Candidate probes and individual checks remain bounded. For the known
      // global prefix, jump gaps in a *conservative* candidate bitset;
      // unknown/new records still take the ordinary path.
      while (cursor < size && examined < batchSize && visited < batchSize * 2) {
        if (parent && candidates && cursor < parent.cursor) {
          const next = nextCandidate(candidates, cursor, Math.min(size, parent.cursor));
          if (next > cursor) { scan.work.prefixRejected += next - cursor; cursor = next; }
          if (cursor === size) break;
        }
        const index = scoped ? scoped[cursor]! : cursor;
        cursor += 1; visited += 1; scan.work.visited += 1;
        if (index >= scan.flags.length) {
          let capacity = Math.max(32, scan.flags.length);
          while (capacity <= index) capacity *= 2;
          const flags = new Uint8Array(capacity); flags.set(scan.flags); scan.flags = flags;
        }
        if (scan.flags[index]! & CHECKED) { scan.work.reused += 1; continue; }
        const previous = parent?.flags[index] ?? 0;
        // Gaps skipped by the parent have no individual flag, but its global
        // cursor proves they were rejected. This also protects item-first scans.
        if (parent && ((previous & CHECKED) || index < parent.cursor) && !(previous & POSSIBLE)) {
          scan.flags[index] = CHECKED; scan.work.prefixRejected += 1; continue;
        }
        const flags = probe(this.records[index]!, word);
        scan.flags[index] = flags; scan.work.examined += 1; examined += 1;
        if (scan.possible && (flags & POSSIBLE)) recordCandidate(scan, index);
        if (flags & (DIRECT | SPACED)) {
          insertOrdered(scan.matches, index);
          if (flags & SPACED) scan.spacedMatches.add(index);
        }
      }
      this.setScopeCursor(scan, item, cursor);
    }
    return this.snapshot(batchSize);
  }

  progress(word: string, item?: string): { cursor: number; complete: boolean } | undefined {
    const scan = this.cache.get(word);
    if (!scan) return undefined;
    const cursor = this.scopeCursor(scan, item);
    return { cursor, complete: cursor === this.scopeSize(item) };
  }

  /** Work counters are provided for repeatable diagnostics. */
  wordWork(word: string): WordWork | undefined {
    const work = this.cache.get(word)?.work;
    return work && { ...work };
  }

  private trimCache(active: Set<string>): void {
    while (this.cache.size > this.maxCachedWords) {
      let oldest: WordScan | undefined;
      for (const scan of this.cache.values()) {
        if (!active.has(scan.word) && (!oldest || scan.used < oldest.used)) oldest = scan;
      }
      if (!oldest) break;
      this.cache.delete(oldest.word);
      // Do not retain an unbounded chain of evicted prefix flags.
      for (const scan of this.cache.values()) if (scan.parent === oldest) scan.parent = undefined;
    }
  }

  private trimScoreCache(active: ScoreState): void {
    let total = 0;
    for (const state of this.scoreCache.values()) total += state.scores.size;
    for (const [key, state] of this.scoreCache) {
      if (this.scoreCache.size <= 3 && total <= 40000) break;
      if (state.scores === active.scores) continue;
      this.scoreCache.delete(key); total -= state.scores.size;
    }
  }

  private score(index: number, active: ActiveSearch): ScoredRecord {
    const existing = active.scores.get(index);
    if (existing) return existing;
    const anchor = this.records[index]!;
    const parts: SequencePart[] = [{ record: anchor }];
    // A positive alignment cannot benefit from arbitrarily many gaps. Bound
    // lookahead while allowing the maximum useful gaps and a joined term.
    let budget = 4 * active.sequence.length + active.sequence.reduce((sum, word) => sum + word.length, 0);
    const visited = new Set([anchor.key]);
    let last = anchor;
    if (active.sequence.length > 1 && anchor.section === 'text' && anchor.item && anchor.row) {
      while (last.next && budget > 0 && !visited.has(last.next)) {
        const nextIndex = this.indices.get(last.next);
        if (nextIndex === undefined) {
          const waiting = active.waiting.get(last.next) ?? new Set<number>();
          waiting.add(index); active.waiting.set(last.next, waiting);
          break;
        }
        const next = this.records[nextIndex]!;
        // Even a malformed/stale index must never combine items or languages.
        if (next.section !== 'text' || next.item !== anchor.item || next.language !== anchor.language || !next.row) break;
        const length = normalizedTokens(next).length;
        if (!length) break;
        const maxTokens = Math.min(length, budget);
        parts.push({ record: next, maxTokens });
        budget -= maxTokens; visited.add(next.key); last = next;
        if (maxTokens < length) break;
      }
    }
    const scored = scoreSequence(parts, active.sequence);
    const value = { relevance: scored.relevance, parts: parts.slice(0, scored.endPart + 1).map(part => part.record) };
    active.scores.set(index, value);
    return value;
  }

  private snapshot(scoreBudget: number): SearchSnapshot {
    if (!this.active) throw new Error('Start a search first');
    const active = this.active;
    const { request, words } = active;
    const languages = new Set(request.languages);
    const matched = new Map<number, { words: string[]; direct: number }>();
    for (const word of words) {
      const scan = this.cache.get(word)!;
      for (const index of scan.matches) {
        const record = this.records[index]!;
        if (request.item && record.item !== request.item) continue;
        if (record.section === 'text' && !languages.has(record.language as SearchLanguage)) continue;
        let existing = matched.get(index);
        if (!existing) { existing = { words: [], direct: 0 }; matched.set(index, existing); }
        existing.words.push(word);
        if (!scan.spacedMatches.has(index)) existing.direct += 1;
      }
    }
    type Candidate = { hit: SearchHit; parts: SearchRecord[]; matchedWordCount: number; coverage: number; ordinal: number };
    // Ranking uses the distinct count displayed by the UI, including words in
    // the materialized continuation. Count, then star, are unconditional keys:
    // a conditional star override of score order would create comparator cycles.
    // The final ordinal preserves stable source/term order when every public
    // comparator field ties, including item-first scans discovered earlier.
    const compare = (a: Candidate, b: Candidate): number =>
      b.matchedWordCount - a.matchedWordCount ||
      Number(b.hit.record.featured) - Number(a.hit.record.featured) ||
      b.hit.relevance.score - a.hit.relevance.score ||
      b.hit.relevance.matchedSequenceWords - a.hit.relevance.matchedSequenceWords ||
      b.hit.relevance.exactSequenceWords - a.hit.relevance.exactSequenceWords ||
      b.coverage - a.coverage ||
      Number(b.hit.record.section === 'toc') - Number(a.hit.record.section === 'toc') ||
      Number(b.hit.record.language === 'ar') - Number(a.hit.record.language === 'ar') ||
      b.hit.directMatches - a.hit.directMatches ||
      a.hit.record.order - b.hit.record.order || a.ordinal - b.ordinal;
    const resultLimit = request.resultLimit ?? request.tocLimit + request.textLimit;
    const best = new TopK<Candidate>(resultLimit, matched.size, compare);
    const bestToc = new TopK<Candidate>(request.tocLimit, matched.size, compare);
    const bestText = new TopK<Candidate>(request.textLimit, matched.size, compare);
    let tocTotal = 0, textTotal = 0, rankingPending = false, ordinal = 0;
    for (const [index, info] of matched) {
      const record = this.records[index]!;
      let scored = active.scores.get(index);
      if (!scored && scoreBudget > 0) { scored = this.score(index, active); scoreBudget -= 1; }
      if (!scored) { rankingPending = true; scored = provisionalScore(record, info.words); }
      const coverage = Math.max(info.words.length, Math.min(words.length, scored.relevance.matchedSequenceWords));
      // Only scored continuations can contribute additional UI terms. Cache
      // their distinct terms per scored query; materialize row excerpts only for
      // the selected top results, as before. Newly loaded adjacent rows already
      // invalidate their anchor's cached score and thus this cached union.
      if (scored.parts.length > 1 && !scored.continuationWords) {
        const continuation = scored.parts.slice(1);
        scored.continuationWords = words.filter(word => continuation.some(part => Boolean(matchKind(part, word))));
      }
      let matchedWordCount = info.words.length;
      if (scored.continuationWords) {
        for (const word of scored.continuationWords) if (!info.words.includes(word)) matchedWordCount += 1;
      }
      const hit: SearchHit = { record, matchedWords: info.words, directMatches: info.direct, relevance: scored.relevance };
      const candidate = { hit, parts: scored.parts, matchedWordCount, coverage, ordinal: ordinal++ };
      best.add(candidate);
      if (record.section === 'toc') { tocTotal += 1; bestToc.add(candidate); }
      else { textTotal += 1; bestText.add(candidate); }
    }
    const candidates = best.sorted(), toc = bestToc.sorted(), text = bestText.sorted();
    const materialized = new Map<Candidate, SearchHit>();
    const materialize = (candidate: Candidate): SearchHit => {
      const cached = materialized.get(candidate);
      if (cached) return cached;
      const hit = candidate.hit;
      if (candidate.parts.length > 1) {
        hit.continuation = candidate.parts.slice(1).map(part => ({ row: part.row!, text: part.text,
          matchedWords: words.filter(word => Boolean(matchKind(part, word))) }));
      }
      materialized.set(candidate, hit);
      return hit;
    };
    active.rankingPending = rankingPending;
    this.trimScoreCache(active);
    return {
      id: request.id,
      complete: words.length === 0 || (!this.loading && !rankingPending && words.every(word =>
        this.scopeCursor(this.cache.get(word)!, request.item) === this.scopeSize(request.item))),
      results: candidates.map(materialize),
      resultsTotal: matched.size,
      toc: toc.map(materialize),
      text: text.map(materialize),
      tocTotal, textTotal,
    };
  }
}
