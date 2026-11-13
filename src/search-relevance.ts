import { normalizeSearch } from './normalize.js';
import { wordVariants } from './lam-aliases.js';
import { findOriginalWordMatches } from './search-text.js';
import { compileTaMatcher, findWithTa, tokensWithTa, type TaMatcher } from './search-ta.js';
import type { SearchRecord } from './search.js';

/** Local ordered alignment: complete word 6, joined word 4, substring 3; each internal gap costs 2. */
export interface Relevance {
  score: number;
  matchedSequenceWords: number;
  exactSequenceWords: number;
}
export interface SequencePart { record: SearchRecord; maxTokens?: number }
export interface ScoredSequence { relevance: Relevance; endPart: number }
interface SourceToken { value: string; index: number; part: number }
interface SpacedMatch { word: string; start: number; end: number }
interface RowState { score: Int32Array; count: Int32Array; exact: Int32Array; start: Int32Array; end: Int32Array }

const GAP = 2;
const WHOLE = 6;
const JOINED = 4;
const SUBSTRING = 3;
const NO_PATH = -1_000_000;
const tokenCache = new WeakMap<SearchRecord, string[]>();
const compactCache = new WeakMap<SearchRecord, string>();
interface ScoringVariant { word: string; ta?: TaMatcher; needsSource: boolean }
interface ScoringWord { word: string; variants: readonly ScoringVariant[] }
interface ScoringPlan { unique: ScoringWord[]; positions: (ScoringWord & { index: number })[] }
const variantsCache = new Map<string, readonly ScoringVariant[]>();

/** Compile character rules once per term, not once per token or scored row. */
function scoringVariants(word: string): readonly ScoringVariant[] {
  const cached = variantsCache.get(word);
  if (cached) return cached;
  const variants = wordVariants(word).map(value => {
    const needsSource = value.includes('ت');
    return { word: value, needsSource, ...(needsSource || value.includes('ة') ? { ta: compileTaMatcher(value) } : {}) };
  });
  if (variantsCache.size >= 128) variantsCache.delete(variantsCache.keys().next().value!);
  variantsCache.set(word, variants);
  return variants;
}
function possibleVariant(source: string, variant: ScoringVariant): boolean {
  return variant.ta ? variant.ta.possible(source) : source.includes(variant.word);
}
function containsVariant(record: SearchRecord, variant: ScoringVariant): boolean {
  return variant.ta ? variant.ta.contains(record) : record.normalized.includes(variant.word);
}
function wholeVariant(record: SearchRecord, variant: ScoringVariant): boolean {
  if (variant.ta) return variant.ta.whole(record);
  const text = record.normalized, word = variant.word;
  return text === word || text.startsWith(`${word} `) || text.endsWith(` ${word}`) || text.includes(` ${word} `);
}

/** Compact search text is a conservative prefilter, never the final matcher. */
export function compactNormalized(record: SearchRecord): string {
  let compact = compactCache.get(record);
  if (compact === undefined) { compact = record.normalized.replace(/ /g, ''); compactCache.set(record, compact); }
  return compact;
}

/** Search-only tokens are shared by matching and relevance; source text is untouched. */
export function normalizedTokens(record: SearchRecord): string[] {
  let tokens = tokenCache.get(record);
  if (!tokens) { tokens = record.normalized.split(' ').filter(Boolean); tokenCache.set(record, tokens); }
  return tokens;
}

/** Could the folded source prefix match the query? ت→ه is only a loose filter. */
function possiblePrefix(query: string, sourcePrefix: string, hasTa: boolean): boolean {
  if (!hasTa) return query.startsWith(sourcePrefix);
  if (sourcePrefix.length > query.length) return false;
  for (let i = 0; i < sourcePrefix.length; i += 1) {
    const q = query[i], s = sourcePrefix[i];
    if (q !== s && !((q === 'ت' || q === 'ة') && s === 'ه') && !(q === 'ة' && s === 'ت')) return false;
  }
  return true;
}

/** A cheap precheck; the shared original-text matcher makes the final decision. */
export function mightJoin(tokens: string[], word: string): boolean {
  if (Array.from(word).length < 3) return false;
  const hasTa = word.includes('ت') || word.includes('ة');
  for (let i = 0; i < tokens.length - 1; i += 1) {
    let prefix = tokens[i]!;
    if (prefix.length >= word.length || !possiblePrefix(word, prefix, hasTa)) continue;
    for (let j = i + 1; j < tokens.length; j += 1) {
      const next = tokens[j]!;
      const remainder = word.slice(prefix.length);
      if (Array.from(remainder).length < 2 || Array.from(next).length < 2) break;
      if (next.length >= remainder.length && possiblePrefix(remainder, next.slice(0, remainder.length), hasTa)) return true;
      if (!possiblePrefix(remainder, next, hasTa)) break;
      prefix += next;
    }
  }
  return false;
}

/** Only original spans approved by the existing joined/spaced matcher are used. */
function spacedMatches(record: SearchRecord, tokens: string[], words: readonly ScoringWord[], offset: number): SpacedMatch[] {
  const found: SpacedMatch[] = [];
  if (tokens.length < 2) return found;
  const compact = tokens.join('');
  // Map each actual source spelling back to the typed query word(s).
  // Alternatives do not become extra logical words in the relevance score.
  const owners = new Map<string, string[]>();
  for (const { word, variants } of words) for (const variant of variants) {
    if (!possibleVariant(compact, variant) || !mightJoin(tokens, variant.word)) continue;
    const list = owners.get(variant.word) ?? [];
    list.push(word); owners.set(variant.word, list);
  }
  if (!owners.size) return found;
  // Fold the original text once for all candidate spellings, not once per word.
  for (const span of findOriginalWordMatches(record.text, [...owners.keys()], Number.MAX_SAFE_INTEGER)) {
    const fragment = normalizeSearch(record.text.slice(span.start, span.end));
    if (!fragment.includes(' ')) continue; // direct matches are handled separately
    const prefix = normalizeSearch(record.text.slice(0, span.start));
    const first = prefix ? prefix.split(' ').length : 0;
    const last = first + fragment.split(' ').length - 1;
    // Do not accidentally use an occurrence past the bounded continuation window.
    if (first >= 0 && last < tokens.length) for (const word of owners.get(span.word) ?? []) {
      found.push({ word, start: offset + first, end: offset + last });
    }
  }
  return found;
}

/** Score one token, consulting original ة only for a genuinely ambiguous candidate. */
function tokenWeight(token: SourceToken, variant: ScoringVariant, parts: SequencePart[]): number {
  const value = token.value, word = variant.word;
  if (value === word) return WHOLE;
  if (value.includes(word)) return SUBSTRING;
  if (!variant.ta || !variant.ta.possible(value)) return 0;
  // Typed ة accepts both folded ه and ت without source reconstruction.
  // Typed ت needs the corresponding preserved token only for a candidate
  // that did not already match literally.
  if (variant.needsSource) {
    const preserved = tokensWithTa(parts[token.part]!.record)?.[token.index];
    if (findWithTa(preserved ?? value, word) < 0) return 0;
  }
  return value.length === word.length ? WHOLE : SUBSTRING;
}

function rowState(width: number): RowState {
  const row = { score: new Int32Array(width), count: new Int32Array(width), exact: new Int32Array(width),
    start: new Int32Array(width), end: new Int32Array(width) };
  clear(row);
  return row;
}
function clear(row: RowState): void {
  row.score.fill(NO_PATH); row.count.fill(0); row.exact.fill(0); row.start.fill(0); row.end.fill(0);
}
function better(score: number, count: number, exact: number, start: number, end: number,
  otherScore: number, otherCount: number, otherExact: number, otherStart: number, otherEnd: number): boolean {
  if (!count) return false;
  if (!otherCount) return true;
  return score > otherScore || (score === otherScore && (
    count > otherCount || (count === otherCount && (
      exact > otherExact || (exact === otherExact && (
        end - start < otherEnd - otherStart || (end - start === otherEnd - otherStart && start < otherStart)
      ))
    ))
  ));
}
/** For equal partial paths, a later start gives any future extension a shorter span. */
function betterPath(score: number, count: number, exact: number, start: number, end: number,
  otherScore: number, otherCount: number, otherExact: number, otherStart: number, otherEnd: number): boolean {
  if (!count) return false;
  if (!otherCount) return true;
  return score > otherScore || (score === otherScore && (count > otherCount || (count === otherCount &&
    (exact > otherExact || (exact === otherExact && (start > otherStart || (start === otherStart && end < otherEnd)))))));
}

function singleTermRelevance(record: SearchRecord, word: string, knownDirect: boolean): Relevance {
  const variants = scoringVariants(word);
  let score = 0;
  if (variants.some(variant => wholeVariant(record, variant))) score = WHOLE;
  else {
    if (knownDirect || variants.some(variant => containsVariant(record, variant))) score = SUBSTRING;
    if (variants.some(variant => Array.from(variant.word).length >= 3)) {
      const tokens = normalizedTokens(record);
      if (spacedMatches(record, tokens, [{ word, variants }], 0).length) score = JOINED;
    }
  }
  return { score, matchedSequenceWords: score ? 1 : 0, exactSequenceWords: score === WHOLE ? 1 : 0 };
}

/** Only call after the word scan has verified a direct match in this record. */
export function scoreVerifiedDirect(record: SearchRecord, word: string): Relevance {
  return singleTermRelevance(record, word, true);
}

/**
 * Best local alignment of query terms to source words. Terms and source words
 * may be skipped inside the span, with a penalty for each. Unlike bag-of-words
 * matching, repetitions occupy distinct query/source positions. An alignment
 * may extend into following parts but must begin in the first part.
 */
function makeScoringPlan(query: readonly string[]): ScoringPlan {
  const unique: ScoringWord[] = [...new Set(query)].map(word => ({ word, variants: scoringVariants(word) }));
  const byWord = new Map(unique.map(entry => [entry.word, entry] as const));
  return { unique, positions: query.map((word, index) => ({ ...byWord.get(word)!, index })) };
}

/** Compile one immutable query for all anchors in an incremental search. */
export function prepareSequence(query: readonly string[]): (parts: SequencePart[]) => ScoredSequence {
  const sequence = [...query];
  const plan = sequence.length > 1 ? makeScoringPlan(sequence) : undefined;
  return parts => scorePreparedSequence(parts, sequence, plan);
}

/** Score a standalone query; callers may mutate its array between calls. */
export function scoreSequence(parts: SequencePart[], query: string[]): ScoredSequence {
  return scorePreparedSequence(parts, query);
}

function scorePreparedSequence(parts: SequencePart[], query: readonly string[], plan?: ScoringPlan): ScoredSequence {
  const empty: ScoredSequence = { relevance: { score: 0, matchedSequenceWords: 0, exactSequenceWords: 0 }, endPart: 0 };
  if (!parts.length || !query.length) return empty;
  // A one-term search never needs neighboring rows or dynamic programming.
  if (query.length === 1) {
    return { relevance: singleTermRelevance(parts[0]!.record, query[0]!, false), endPart: 0 };
  }
  // Resolve alternatives once per distinct term. Incremental searches share
  // this plan across anchors; standalone callers construct one for this call.
  const prepared = plan ?? makeScoringPlan(query), unique = prepared.unique;

  // Most hits in a broad OR search contain only a common single term. Before
  // building alignment rows, reject impossible terms using compact strings as
  // a *superset*. Full continuation rows can admit extra terms but cannot hide
  // a match in their bounded prefixes. Repeated query positions still count
  // separately, and every actual join remains verified by the original matcher.
  const possible = new Set<string>();
  const possibleByPart: ScoringWord[][] = [];
  for (const source of parts) {
    const compact = compactNormalized(source.record);
    const present: ScoringWord[] = [];
    for (const entry of unique) if (entry.variants.some(variant => possibleVariant(compact, variant))) {
      present.push(entry); possible.add(entry.word);
    }
    possibleByPart.push(present);
  }
  let positions = 0, onlyWord = '';
  for (const word of query) if (possible.has(word)) { positions += 1; onlyWord = word; }
  if (!positions) return empty;
  const first = parts[0]!;
  if (positions === 1 && (first.maxTokens === undefined || first.maxTokens >= normalizedTokens(first.record).length)) {
    return scoreSequence([first], [onlyWord]);
  }

  const tokens: SourceToken[] = [];
  const spaced: SpacedMatch[] = [];
  for (const [part, source] of parts.entries()) {
    const all = normalizedTokens(source.record);
    const values = source.maxTokens === undefined || source.maxTokens >= all.length ? all : all.slice(0, source.maxTokens);
    const offset = tokens.length;
    tokens.push(...values.map((value, index) => ({ value, index, part })));
    spaced.push(...spacedMatches(source.record, values, possibleByPart[part]!, offset));
  }
  if (!tokens.length) return empty;

  const events = new Map<number, SpacedMatch[]>();
  let maxSpan = 1;
  for (const event of spaced) {
    const list = events.get(event.end) ?? [];
    list.push(event); events.set(event.end, list);
    maxSpan = Math.max(maxSpan, event.end - event.start + 1);
  }

  // Skip query columns that cannot match this window. Their original positions
  // are retained so missing terms between real matches still incur gap costs.
  // Looking at a full continuation row can only admit extra columns, never
  // remove a match from its bounded prefix.
  const present = new Set<string>();
  for (let i = 0; i < parts.length; i += 1) {
    const record = parts[i]!.record;
    for (const { word, variants } of possibleByPart[i]!) if (variants.some(variant => containsVariant(record, variant))) present.add(word);
  }
  for (const event of spaced) present.add(event.word);
  const activeQuery = prepared.positions.filter(entry => present.has(entry.word));
  if (activeQuery.length < 2) {
    let score = 0;
    for (const token of tokens) {
      if (token.part !== 0) break;
      for (const { variants } of unique) for (const variant of variants) {
        score = Math.max(score, tokenWeight(token, variant, parts));
      }
    }
    for (const event of spaced) if (tokens[event.start]?.part === 0) score = Math.max(score, JOINED);
    return { relevance: { score, matchedSequenceWords: score ? 1 : 0, exactSequenceWords: score === WHOLE ? 1 : 0 }, endPart: 0 };
  }

  const width = activeQuery.length + 1;
  const ring = Array.from({ length: maxSpan + 1 }, () => rowState(width));
  let bestScore = 0, bestCount = 0, bestExact = 0, bestStart = 0, bestEnd = 0;
  for (let i = 1; i <= tokens.length; i += 1) {
    const current = ring[i % ring.length]!; clear(current);
    const previous = ring[(i - 1) % ring.length]!;
    const source = tokens[i - 1]!;
    const endings = events.get(i - 1);
    for (let j = 1; j <= activeQuery.length; j += 1) {
      const queryGap = j > 1 ? activeQuery[j - 1]!.index - activeQuery[j - 2]!.index - 1 : 0;
      let s = NO_PATH, count = 0, exact = 0, start = 0, end = 0;
      // A path may briefly go below zero while skipping a mistyped term and
      // its source counterpart. Retain it only while one next match could
      // make the score positive; this still rules out long, scattered gaps.
      const up = previous.score[j]! - GAP;
      if (previous.count[j]! && up > -WHOLE) {
        s = up; count = previous.count[j]!; exact = previous.exact[j]!; start = previous.start[j]!; end = previous.end[j]!;
      }
      const left = current.score[j - 1]! - GAP * (queryGap + 1);
      if (left > -WHOLE && betterPath(left, current.count[j - 1]!, current.exact[j - 1]!, current.start[j - 1]!, current.end[j - 1]!, s, count, exact, start, end)) {
        s = left; count = current.count[j - 1]!; exact = current.exact[j - 1]!; start = current.start[j - 1]!; end = current.end[j - 1]!;
      }
      const { word, variants } = activeQuery[j - 1]!;
      let weight = 0;
      for (const variant of variants) {
        weight = Math.max(weight, tokenWeight(source, variant, parts));
        if (weight === WHOLE) break;
      }
      if (weight) {
        const whole = weight === WHOLE;
        const beforeCount = previous.count[j - 1]!;
        const candidate = previous.score[j - 1]! - GAP * queryGap + weight;
        const candidateCount = beforeCount + 1;
        const candidateExact = previous.exact[j - 1]! + Number(whole);
        if (beforeCount && candidate > 0 && betterPath(candidate, candidateCount, candidateExact, previous.start[j - 1]!, i - 1, s, count, exact, start, end)) {
          s = candidate; count = candidateCount; exact = candidateExact; start = previous.start[j - 1]!; end = i - 1;
        }
        if (source.part === 0 && betterPath(weight, 1, Number(whole), i - 1, i - 1, s, count, exact, start, end)) {
          s = weight; count = 1; exact = Number(whole); start = i - 1; end = i - 1;
        }
      }
      if (endings) for (const event of endings) {
        if (event.word !== word) continue;
        const beforeRow = ring[event.start % ring.length]!;
        const beforeCount = beforeRow.count[j - 1]!;
        const candidate = beforeRow.score[j - 1]! - GAP * queryGap + JOINED;
        if (beforeCount && candidate > 0 && betterPath(candidate, beforeCount + 1, beforeRow.exact[j - 1]!, beforeRow.start[j - 1]!, i - 1, s, count, exact, start, end)) {
          s = candidate; count = beforeCount + 1; exact = beforeRow.exact[j - 1]!; start = beforeRow.start[j - 1]!; end = i - 1;
        }
        if (tokens[event.start]!.part === 0 && betterPath(JOINED, 1, 0, event.start, i - 1, s, count, exact, start, end)) {
          s = JOINED; count = 1; exact = 0; start = event.start; end = i - 1;
        }
      }
      current.score[j] = s; current.count[j] = count; current.exact[j] = exact;
      current.start[j] = start; current.end[j] = end;
      if (s > 0 && better(s, count, exact, start, end, bestScore, bestCount, bestExact, bestStart, bestEnd)) {
        bestScore = s; bestCount = count; bestExact = exact; bestStart = start; bestEnd = end;
      }
    }
  }
  return { relevance: { score: bestScore, matchedSequenceWords: bestCount, exactSequenceWords: bestExact },
    endPart: tokens[bestEnd]?.part ?? 0 };
}
