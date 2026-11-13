import { normalizeSearchQuery } from './normalize.js';
import { wordVariants, safeAliasPrefix } from './lam-aliases.js';
import { TopK } from './search-top-k.js';
import { findOriginalMatches } from './search-text.js';
import { compileCompactCandidate, compileTaMatcher, mightContainWithTa, recordContains, recordHasWhole, type TaMatcher } from './search-ta.js';
import { compactNormalized, mightJoin, normalizedTokens, prepareSequence, scoreSequence, scoreVerifiedDirect, type Relevance, type SequencePart } from './search-relevance.js';

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
  variants: readonly { word: string; ta?: TaMatcher; compact?: RegExp }[];
  shortDirect: boolean; // no variant can use a joined-word match
  /** Whole/substring scores for short single-term searches, indexed by source record. */
  shortScores?: Uint8Array;
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
// A verified short direct hit cannot have a joined match or continuation.
// Store only its score; public hits receive independent relevance objects.
function shortDirectScore(record: SearchRecord, scan: WordScan): number {
  for (const variant of scan.variants) {
    if (variant.ta ? variant.ta.whole(record) : recordHasWhole(record, variant.word)) return 6;
  }
  return 3;
}
interface ScoreState { scores: Map<number, ScoredRecord>; waiting: Map<string, Set<number>> }
interface ActiveSearch extends ScoreState {
  request: SearchRequest;
  words: string[];
  sequence: string[];
  scoreParts: ReturnType<typeof prepareSequence>;
  rankingPending: boolean;
}

/** Unique terms implement OR search; repetitions do not inflate hit counts. */
export function searchWords(query: string): string[] {
  return [...new Set(normalizeSearchQuery(query).split(' ').filter(Boolean))];
}

function matchKind(record: SearchRecord, word: string): 'direct' | 'spaced' | undefined {
  const variants = wordVariants(word);
  if (variants.some(variant => recordContains(record, variant))) return 'direct';
  // These are only rejection filters: the original-text matcher still checks
  // horizontal gaps, word boundaries, and partial-final-word safeguards.
  for (const variant of variants) if (variant.length >= 3 && mightContainWithTa(compactNormalized(record), variant) &&
      mightJoin(normalizedTokens(record), variant) && findOriginalMatches(record.text, [variant], 1).length) return 'spaced';
  return undefined;
}

/** A conservative compact-prefix candidate can be useful to a later, longer word. */
function probe(record: SearchRecord, variants: WordScan['variants']): number {
  let possible = false, spaced = false;
  for (const { word, ta, compact } of variants) {
    // Removing spaces cannot create a new single-code-point occurrence.
    if (word.length === 1 || (word.length === 2 && word.codePointAt(0)! > 0xffff)) {
      if (ta ? ta.contains(record) : record.normalized.includes(word)) return CHECKED | POSSIBLE | DIRECT;
      continue;
    }
    // Optional spaces recognize the same conservative compact substring
    // without making a compact copy of every source record. Exceptionally
    // long queries use the existing compact-string fallback instead.
    const candidate = compact ? compact.test(record.normalized) :
      ta ? ta.possible(compactNormalized(record)) : compactNormalized(record).includes(word);
    if (!candidate) continue;
    possible = true;
    if (ta ? ta.contains(record) : record.normalized.includes(word)) return CHECKED | POSSIBLE | DIRECT;
    if (word.length >= 3 && mightJoin(normalizedTokens(record), word) &&
        findOriginalMatches(record.text, [word], 1).length > 0) spaced = true;
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
    const variants = wordVariants(word);
    if (variants.some(variant => recordHasWhole(record, variant))) { score = 6; break; }
    score = Math.max(score, variants.some(variant => recordContains(record, variant)) ? 3 : 4); // the cache already verified a spaced match
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
    const sequence = normalizeSearchQuery(request.query).split(' ').filter(Boolean);
    const words = [...new Set(sequence)];
    const scoreKey = JSON.stringify(sequence);
    let scoreState = this.scoreCache.get(scoreKey);
    if (!scoreState) scoreState = { scores: new Map(), waiting: new Map() };
    this.scoreCache.delete(scoreKey); this.scoreCache.set(scoreKey, scoreState);
    this.active = { request, words, sequence, scoreParts: prepareSequence(sequence), ...scoreState, rankingPending: false };
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
        const variants = wordVariants(word).map(variant => ({ word: variant, compact: compileCompactCandidate(variant),
          ...(/[تة]/u.test(variant) ? { ta: compileTaMatcher(variant) } : {}) }));
        scan = { word, variants, shortDirect: variants.every(variant => Array.from(variant.word).length < 3),
          cursor: 0, itemCursors: new Map(), flags: new Uint8Array(), parent,
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
        const flags = probe(this.records[index]!, scan.variants);
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

  /** Checked negative word flags are proof that those terms cannot score here. */
  private otherWordsAbsent(index: number, words: string[], except: string): boolean {
    for (const word of words) {
      if (word === except) continue;
      const flags = this.cache.get(word)!.flags[index] ?? 0;
      if (!(flags & CHECKED) || (flags & (DIRECT | SPACED))) return false;
    }
    return true;
  }

  private score(index: number, active: ActiveSearch, matchedWords?: readonly string[]): ScoredRecord {
    const existing = active.scores.get(index);
    if (existing) return existing;
    const anchor = this.records[index]!;
    if (active.sequence.length === 1) {
      const word = active.sequence[0]!, scan = this.cache.get(word);
      // A one-term direct hit cannot need a continuation. Reuse the verified
      // match while still checking for a stronger whole-word or joined hit.
      if (scan && (scan.flags[index]! & DIRECT)) {
        const value = { relevance: scoreVerifiedDirect(anchor, word), parts: [anchor] };
        active.scores.set(index, value);
        return value;
      }
    }
    const parts: SequencePart[] = [{ record: anchor }];
    const onlyWord = matchedWords?.length === 1 ? matchedWords[0] : undefined;
    // A single occurrence of one query term cannot form a longer sequence if
    // every other term is already known absent throughout the lookahead.
    // Unknown flags and repeated positions conservatively use the full scorer.
    let isolated = Boolean(onlyWord && active.sequence.indexOf(onlyWord) === active.sequence.lastIndexOf(onlyWord) &&
      this.otherWordsAbsent(index, active.words, onlyWord));
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
        if (isolated && onlyWord && !this.otherWordsAbsent(nextIndex, active.words, onlyWord)) isolated = false;
        budget -= maxTokens; visited.add(next.key); last = next;
        if (maxTokens < length) break;
      }
    }
    if (isolated && onlyWord) {
      const scan = this.cache.get(onlyWord)!;
      const direct = Boolean(scan.flags[index]! & DIRECT);
      let relevance: Relevance;
      if (direct && scan.shortDirect) {
        const score = scan.shortScores?.[index] || shortDirectScore(anchor, scan);
        relevance = { score, matchedSequenceWords: 1, exactSequenceWords: Number(score === 6) };
      } else relevance = direct ? scoreVerifiedDirect(anchor, onlyWord) : scoreSequence([{ record: anchor }], [onlyWord]).relevance;
      const value = { relevance, parts: [anchor] };
      active.scores.set(index, value);
      return value;
    }
    const scored = active.scoreParts(parts);
    const value = { relevance: scored.relevance, parts: parts.slice(0, scored.endPart + 1).map(part => part.record) };
    active.scores.set(index, value);
    return value;
  }

  /** Rank a one-term search without allocating a candidate per hit. */
  private snapshotSingle(scan: WordScan, scoreBudget: number): SearchSnapshot {
    const active = this.active!, { request } = active;
    const languages = new Set(request.languages);
    const scores = new Uint8Array(this.records.length);
    let shortScores = scan.shortScores;
    if (scan.shortDirect && (!shortScores || shortScores.length < this.records.length)) {
      const grown = new Uint8Array(this.records.length);
      if (shortScores) grown.set(shortScores);
      scan.shortScores = shortScores = grown;
    }
    // For one term, count, coverage and sequence length are identical for
    // every hit. Score determines exactness; directness still breaks ties.
    const compare = (a: number, b: number): number => {
      const left = this.records[a]!, right = this.records[b]!;
      return Number(right.featured) - Number(left.featured) || scores[b]! - scores[a]! ||
        Number(right.section === 'toc') - Number(left.section === 'toc') ||
        Number(right.language === 'ar') - Number(left.language === 'ar') ||
        Number(Boolean(scan.flags[b]! & DIRECT)) - Number(Boolean(scan.flags[a]! & DIRECT)) ||
        left.order - right.order || a - b;
    };
    const limit = request.resultLimit ?? request.tocLimit + request.textLimit;
    const best = new TopK<number>(limit, scan.matches.length, compare);
    const bestToc = new TopK<number>(request.tocLimit, scan.matches.length, compare);
    const bestText = new TopK<number>(request.textLimit, scan.matches.length, compare);
    const effective = (value: number): number => Number.isNaN(value) ? 0 : Math.max(0, Math.floor(value));
    const resultLimit = effective(limit), tocLimit = effective(request.tocLimit), textLimit = effective(request.textLimit);
    let resultsTotal = 0, tocTotal = 0, textTotal = 0, rankingPending = false;
    let featured = 0, featuredToc = 0, featuredText = 0;
    for (const index of scan.matches) {
      const record = this.records[index]!;
      if (request.item && record.item !== request.item) continue;
      if (record.section === 'text' && !languages.has(record.language as SearchLanguage)) continue;
      resultsTotal += 1;
      if (record.section === 'toc') tocTotal += 1; else textTotal += 1;
      if (record.featured) {
        featured += 1;
        if (record.section === 'toc') featuredToc += 1; else featuredText += 1;
      } else if (featured >= resultLimit &&
          (record.section === 'toc' ? featuredToc >= tocLimit : featuredText >= textLimit)) {
        // Equal term count means every starred hit outranks this one. Once
        // each requested list is already full of starred hits, this record
        // cannot enter the page; retain its total without scoring it. A later
        // larger limit or different scope can score it on demand.
        continue;
      }
      if (shortScores) {
        let score = shortScores[index]!;
        if (!score) {
          score = shortDirectScore(record, scan);
          if (scoreBudget > 0) { shortScores[index] = score; scoreBudget -= 1; }
          else rankingPending = true;
        }
        scores[index] = score;
      } else {
        let scored = active.scores.get(index);
        if (!scored && scoreBudget > 0) { scored = this.score(index, active); scoreBudget -= 1; }
        if (!scored) { rankingPending = true; scored = provisionalScore(record, [scan.word]); }
        scores[index] = scored.relevance.score;
      }
      best.add(index);
      if (record.section === 'toc') bestToc.add(index); else bestText.add(index);
    }
    const materialized = new Map<number, SearchHit>();
    const materialize = (index: number): SearchHit => {
      const existing = materialized.get(index);
      if (existing) return existing;
      const score = scores[index]!;
      const hit: SearchHit = { record: this.records[index]!, matchedWords: [scan.word],
        directMatches: Number(Boolean(scan.flags[index]! & DIRECT)),
        relevance: { score, matchedSequenceWords: 1, exactSequenceWords: Number(score === 6) } };
      materialized.set(index, hit);
      return hit;
    };
    active.rankingPending = rankingPending;
    this.trimScoreCache(active);
    return { id: request.id,
      complete: !this.loading && !rankingPending && this.scopeCursor(scan, request.item) === this.scopeSize(request.item),
      results: best.sorted().map(materialize), resultsTotal,
      toc: bestToc.sorted().map(materialize), text: bestText.sorted().map(materialize), tocTotal, textTotal };
  }

  private snapshot(scoreBudget: number): SearchSnapshot {
    if (!this.active) throw new Error('Start a search first');
    const active = this.active;
    const { request, words } = active;
    // With no discovered hits in any scope there is nothing to merge or rank.
    // Keep loading/cursor and cache bookkeeping identical to an ordinary page.
    if (words.every(word => this.cache.get(word)!.matches.length === 0)) {
      active.rankingPending = false;
      this.trimScoreCache(active);
      return {
        id: request.id,
        complete: words.length === 0 || (!this.loading && words.every(word =>
          this.scopeCursor(this.cache.get(word)!, request.item) === this.scopeSize(request.item))),
        results: [], resultsTotal: 0, toc: [], text: [], tocTotal: 0, textTotal: 0,
      };
    }
    // A single logical word already has a unique, source-ordered match list.
    // Only multi-word OR searches need a map to merge terms by record.
    const single = words.length === 1 ? this.cache.get(words[0]!) : undefined;
    if (single && active.sequence.length === 1) return this.snapshotSingle(single, scoreBudget);
    const languages = new Set(request.languages);
    const matched = single ? undefined : new Map<number, { words: string[]; direct: number }>();
    if (matched) for (const word of words) {
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
    // Keep ranking candidates lightweight; public hit objects are needed only
    // for the selected page, not for every matching corpus record.
    type Candidate = { record: SearchRecord; matchedWords: string[]; directMatches: number; relevance: Relevance;
      parts: SearchRecord[]; matchedWordCount: number; coverage: number; ordinal: number };
    // Ranking uses the distinct count displayed by the UI, including words in
    // the materialized continuation. Count, then star, are unconditional keys:
    // a conditional star override of score order would create comparator cycles.
    // The final ordinal preserves stable source/term order when every public
    // comparator field ties, including item-first scans discovered earlier.
    const compare = (a: Candidate, b: Candidate): number =>
      b.matchedWordCount - a.matchedWordCount ||
      Number(b.record.featured) - Number(a.record.featured) ||
      b.relevance.score - a.relevance.score ||
      b.relevance.matchedSequenceWords - a.relevance.matchedSequenceWords ||
      b.relevance.exactSequenceWords - a.relevance.exactSequenceWords ||
      b.coverage - a.coverage ||
      Number(b.record.section === 'toc') - Number(a.record.section === 'toc') ||
      Number(b.record.language === 'ar') - Number(a.record.language === 'ar') ||
      b.directMatches - a.directMatches ||
      a.record.order - b.record.order || a.ordinal - b.ordinal;
    const resultLimit = request.resultLimit ?? request.tocLimit + request.textLimit;
    // For one word, the unfiltered list is a safe upper bound for TopK even
    // when the current language or item scope excludes some records.
    const maxPossible = single ? single.matches.length : matched!.size;
    const best = new TopK<Candidate>(resultLimit, maxPossible, compare);
    const bestToc = new TopK<Candidate>(request.tocLimit, maxPossible, compare);
    const bestText = new TopK<Candidate>(request.textLimit, maxPossible, compare);
    let resultsTotal = 0, tocTotal = 0, textTotal = 0, rankingPending = false, ordinal = 0;
    const consider = (index: number, matchedWords: string[], directMatches: number): void => {
      const record = this.records[index]!;
      resultsTotal += 1;
      let scored = active.scores.get(index);
      if (!scored && scoreBudget > 0) { scored = this.score(index, active, matchedWords); scoreBudget -= 1; }
      if (!scored) { rankingPending = true; scored = provisionalScore(record, matchedWords); }
      const coverage = Math.max(matchedWords.length, Math.min(words.length, scored.relevance.matchedSequenceWords));
      // Only scored continuations can contribute additional UI terms. Cache
      // their distinct terms per scored query; materialize row excerpts only for
      // the selected top results, as before. Newly loaded adjacent rows already
      // invalidate their anchor's cached score and thus this cached union.
      if (scored.parts.length > 1 && !scored.continuationWords) {
        const continuation = scored.parts.slice(1);
        scored.continuationWords = words.filter(word => continuation.some(part => Boolean(matchKind(part, word))));
      }
      let matchedWordCount = matchedWords.length;
      if (scored.continuationWords) {
        for (const word of scored.continuationWords) if (!matchedWords.includes(word)) matchedWordCount += 1;
      }
      const candidate: Candidate = { record, matchedWords, directMatches, relevance: scored.relevance,
        parts: scored.parts, matchedWordCount, coverage, ordinal: ordinal++ };
      best.add(candidate);
      if (record.section === 'toc') { tocTotal += 1; bestToc.add(candidate); }
      else { textTotal += 1; bestText.add(candidate); }
    };
    if (single) for (const index of single.matches) {
      const record = this.records[index]!;
      if (request.item && record.item !== request.item) continue;
      if (record.section === 'text' && !languages.has(record.language as SearchLanguage)) continue;
      consider(index, words, Number(!single.spacedMatches.has(index)));
    } else for (const [index, info] of matched!) consider(index, info.words, info.direct);
    const candidates = best.sorted(), toc = bestToc.sorted(), text = bestText.sorted();
    const materialized = new Map<Candidate, SearchHit>();
    const materialize = (candidate: Candidate): SearchHit => {
      const cached = materialized.get(candidate);
      if (cached) return cached;
      // The temporary one-word array and short scores can be shared while
      // ranking, but each public hit retains independent mutable values.
      const hit: SearchHit = { record: candidate.record,
        matchedWords: single ? [...candidate.matchedWords] : candidate.matchedWords,
        directMatches: candidate.directMatches,
        relevance: single?.shortDirect && active.sequence.length === 1 ? { ...candidate.relevance } : candidate.relevance };
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
      resultsTotal,
      toc: toc.map(materialize),
      text: text.map(materialize),
      tocTotal, textTotal,
    };
  }
}
