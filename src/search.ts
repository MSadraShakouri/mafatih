import { normalizeSearch } from './normalize.js';
import { findOriginalMatches } from './search-text.js';
import { mightJoin, normalizedTokens, scoreSequence, type Relevance, type SequencePart } from './search-relevance.js';

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

interface WordScan {
  word: string;
  cursor: number;
  matches: number[];
  spacedMatches: Set<number>;
  used: number;
}
interface ScoredRecord { relevance: Relevance; parts: SearchRecord[] }
interface ActiveSearch {
  request: SearchRequest;
  words: string[];
  sequence: string[];
  scores: Map<number, ScoredRecord>;
  waiting: Map<string, Set<number>>;
  rankingPending: boolean;
}

/** Unique terms implement OR search; repetitions do not inflate hit counts. */
export function searchWords(query: string): string[] {
  return [...new Set(normalizeSearch(query).split(' ').filter(Boolean))];
}

const compactCache = new WeakMap<SearchRecord, string>();
function matchKind(record: SearchRecord, word: string): 'direct' | 'spaced' | undefined {
  if (record.normalized.includes(word)) return 'direct';
  if (word.length < 3) return undefined;
  let compact = compactCache.get(record);
  if (compact === undefined) { compact = record.normalized.replace(/ /g, ''); compactCache.set(record, compact); }
  // This is only a rejection filter: the original-text matcher still checks
  // horizontal gaps, word boundaries, and partial-final-word safeguards.
  if (compact.includes(word) && mightJoin(normalizedTokens(record), word) &&
      findOriginalMatches(record.text, [word], 1).length) return 'spaced';
  return undefined;
}

/** A valid one-term lower bound while the stronger sequence score is pending. */
function provisionalScore(record: SearchRecord, words: string[]): ScoredRecord {
  let score = 0;
  for (const word of words) {
    const text = record.normalized;
    if (text === word || text.startsWith(`${word} `) || text.endsWith(` ${word}`) || text.includes(` ${word} `)) {
      score = 6; break;
    }
    score = Math.max(score, text.includes(word) ? 3 : 4); // the cache already verified a spaced match
  }
  return { relevance: { score, matchedSequenceWords: score ? 1 : 0, exactSequenceWords: score === 6 ? 1 : 0 }, parts: [record] };
}

/** Incremental per-word OR scans and cached local relevance are shared by global/item search. */
export class IncrementalSearch {
  private readonly cache = new Map<string, WordScan>();
  private readonly records: SearchRecord[];
  private readonly indices = new Map<string, number>();
  private active: ActiveSearch | undefined;
  private clock = 0;
  private loading: boolean;

  constructor(records: SearchRecord[], private readonly maxCachedWords = 32, moreRecordsComing = false) {
    this.records = [...records];
    this.records.forEach((record, index) => this.indices.set(record.key, index));
    this.loading = moreRecordsComing;
  }

  /** Appending shards keeps scan cursors; only scores waiting for these rows are invalidated. */
  appendRecords(records: SearchRecord[]): void {
    for (const record of records) {
      this.indices.set(record.key, this.records.length);
      this.records.push(record);
    }
    if (this.active) for (const record of records) {
      const waiting = this.active.waiting.get(record.key);
      if (waiting) {
        for (const index of waiting) this.active.scores.delete(index);
        this.active.rankingPending = true;
        this.active.waiting.delete(record.key);
      }
    }
  }
  finishLoading(): void { this.loading = false; }
  /** True while either a word scan or incremental relevance calculation remains. */
  hasUnscannedRecords(): boolean {
    return Boolean(this.active && (this.active.rankingPending ||
      this.active.words.some(word => this.cache.get(word)!.cursor < this.records.length)));
  }

  begin(request: SearchRequest): SearchSnapshot {
    const sequence = normalizeSearch(request.query).split(' ').filter(Boolean);
    const words = [...new Set(sequence)];
    const sameSequence = this.active && this.active.sequence.length === sequence.length &&
      this.active.sequence.every((word, index) => word === sequence[index]);
    this.active = { request, words, sequence,
      scores: sameSequence ? this.active!.scores : new Map(),
      waiting: sameSequence ? this.active!.waiting : new Map(),
      rankingPending: sameSequence ? this.active!.rankingPending : false };
    for (const word of words) {
      let scan = this.cache.get(word);
      if (!scan) {
        scan = { word, cursor: 0, matches: [], spacedMatches: new Set(), used: 0 };
        this.cache.set(word, scan);
      }
      scan.used = ++this.clock;
    }
    this.trimCache(new Set(words));
    // Cached word hits can number in the tens of thousands. Return an early
    // provisional page rather than blocking a new query while ranking them all.
    return this.snapshot(120);
  }

  advance(batchSize = 500): SearchSnapshot {
    if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error('Invalid search batch size');
    if (!this.active) throw new Error('Start a search first');
    for (const word of this.active.words) {
      const scan = this.cache.get(word)!;
      const end = Math.min(this.records.length, scan.cursor + batchSize);
      for (; scan.cursor < end; scan.cursor += 1) {
        const kind = matchKind(this.records[scan.cursor]!, word);
        if (kind) {
          scan.matches.push(scan.cursor);
          if (kind === 'spaced') scan.spacedMatches.add(scan.cursor);
        }
      }
    }
    return this.snapshot(batchSize);
  }

  progress(word: string): { cursor: number; complete: boolean } | undefined {
    const scan = this.cache.get(word);
    return scan && { cursor: scan.cursor, complete: scan.cursor === this.records.length };
  }

  private trimCache(active: Set<string>): void {
    while (this.cache.size > this.maxCachedWords) {
      let oldest: WordScan | undefined;
      for (const scan of this.cache.values()) {
        if (!active.has(scan.word) && (!oldest || scan.used < oldest.used)) oldest = scan;
      }
      if (!oldest) break;
      this.cache.delete(oldest.word);
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
    type Candidate = { hit: SearchHit; parts: SearchRecord[]; coverage: number };
    const candidates: Candidate[] = [];
    let tocTotal = 0, textTotal = 0, rankingPending = false;
    for (const [index, info] of matched) {
      const record = this.records[index]!;
      let scored = active.scores.get(index);
      if (!scored && scoreBudget > 0) { scored = this.score(index, active); scoreBudget -= 1; }
      if (!scored) { rankingPending = true; scored = provisionalScore(record, info.words); }
      const coverage = Math.max(info.words.length, Math.min(words.length, scored.relevance.matchedSequenceWords));
      const hit: SearchHit = { record, matchedWords: info.words, directMatches: info.direct, relevance: scored.relevance };
      candidates.push({ hit, parts: scored.parts, coverage });
      if (record.section === 'toc') tocTotal += 1; else textTotal += 1;
    }
    // Relevance competes across both kinds. Type and stars are tie-breakers,
    // not blanket preferences over a clearly more relevant result.
    candidates.sort((a, b) =>
      b.hit.relevance.score - a.hit.relevance.score ||
      b.hit.relevance.matchedSequenceWords - a.hit.relevance.matchedSequenceWords ||
      b.hit.relevance.exactSequenceWords - a.hit.relevance.exactSequenceWords ||
      b.coverage - a.coverage ||
      Number(b.hit.record.section === 'toc') - Number(a.hit.record.section === 'toc') ||
      Number(b.hit.record.featured) - Number(a.hit.record.featured) ||
      Number(b.hit.record.language === 'ar') - Number(a.hit.record.language === 'ar') ||
      b.hit.directMatches - a.hit.directMatches ||
      a.hit.record.order - b.hit.record.order);
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
    const toc = candidates.filter(candidate => candidate.hit.record.section === 'toc');
    const text = candidates.filter(candidate => candidate.hit.record.section === 'text');
    const resultLimit = request.resultLimit ?? request.tocLimit + request.textLimit;
    active.rankingPending = rankingPending;
    return {
      id: request.id,
      complete: words.length === 0 || (!this.loading && !rankingPending && words.every(word => this.cache.get(word)!.cursor === this.records.length)),
      results: candidates.slice(0, Math.max(0, resultLimit)).map(materialize),
      resultsTotal: candidates.length,
      toc: toc.slice(0, Math.max(0, request.tocLimit)).map(materialize),
      text: text.slice(0, Math.max(0, request.textLimit)).map(materialize),
      tocTotal, textTotal,
    };
  }
}
