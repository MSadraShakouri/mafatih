import { normalizeSearch } from './normalize.js';
import { findOriginalWordMatches } from './search-text.js';
import type { SearchRecord } from './search.js';

/** Local ordered alignment: complete word 6, joined word 4, substring 3; each internal gap costs 2. */
export interface Relevance {
  score: number;
  matchedSequenceWords: number;
  exactSequenceWords: number;
}
export interface SequencePart { record: SearchRecord; maxTokens?: number }
export interface ScoredSequence { relevance: Relevance; endPart: number }
interface SourceToken { value: string; part: number }
interface SpacedMatch { word: string; start: number; end: number }
interface RowState { score: Int32Array; count: Int32Array; exact: Int32Array; start: Int32Array; end: Int32Array }

const GAP = 2;
const WHOLE = 6;
const JOINED = 4;
const SUBSTRING = 3;
const NO_PATH = -1_000_000;
const tokenCache = new WeakMap<SearchRecord, string[]>();
const compactCache = new WeakMap<SearchRecord, string>();

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

function hasWholeWord(text: string, word: string): boolean {
  return text === word || text.startsWith(`${word} `) || text.endsWith(` ${word}`) || text.includes(` ${word} `);
}

/** A cheap precheck; the shared original-text matcher makes the final decision. */
export function mightJoin(tokens: string[], word: string): boolean {
  if (Array.from(word).length < 3) return false;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    let prefix = tokens[i]!;
    if (prefix.length >= word.length || !word.startsWith(prefix)) continue;
    for (let j = i + 1; j < tokens.length; j += 1) {
      const next = tokens[j]!;
      const remainder = word.slice(prefix.length);
      if (Array.from(remainder).length < 2 || Array.from(next).length < 2) break;
      if (next.startsWith(remainder)) return true;
      if (!remainder.startsWith(next)) break;
      prefix += next;
    }
  }
  return false;
}

/** Only original spans approved by the existing joined/spaced matcher are used. */
function spacedMatches(record: SearchRecord, tokens: string[], words: string[], offset: number): SpacedMatch[] {
  const found: SpacedMatch[] = [];
  if (tokens.length < 2) return found;
  const compact = tokens.join('');
  const candidates = words.filter(word => compact.includes(word) && mightJoin(tokens, word));
  if (!candidates.length) return found;
  // Fold the original text once for all candidate words, not once per word.
  for (const span of findOriginalWordMatches(record.text, candidates, Number.MAX_SAFE_INTEGER)) {
    const fragment = normalizeSearch(record.text.slice(span.start, span.end));
    if (!fragment.includes(' ')) continue; // direct matches are handled separately
    const prefix = normalizeSearch(record.text.slice(0, span.start));
    const first = prefix ? prefix.split(' ').length : 0;
    const last = first + fragment.split(' ').length - 1;
    // Do not accidentally use an occurrence past the bounded continuation window.
    if (first >= 0 && last < tokens.length) found.push({ word: span.word, start: offset + first, end: offset + last });
  }
  return found;
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

/**
 * Best local alignment of query terms to source words. Terms and source words
 * may be skipped inside the span, with a penalty for each. Unlike bag-of-words
 * matching, repetitions occupy distinct query/source positions. An alignment
 * may extend into following parts but must begin in the first part.
 */
export function scoreSequence(parts: SequencePart[], query: string[]): ScoredSequence {
  const empty: ScoredSequence = { relevance: { score: 0, matchedSequenceWords: 0, exactSequenceWords: 0 }, endPart: 0 };
  if (!parts.length || !query.length) return empty;
  const unique = [...new Set(query)];
  // A one-term search never needs neighboring rows or dynamic programming.
  if (query.length === 1) {
    const record = parts[0]!.record; const word = query[0]!;
    let score = 0;
    if (hasWholeWord(record.normalized, word)) score = WHOLE;
    else {
      if (record.normalized.includes(word)) score = SUBSTRING;
      if (Array.from(word).length >= 3) {
        const tokens = normalizedTokens(record);
        if (spacedMatches(record, tokens, [word], 0).length) score = JOINED;
      }
    }
    return { relevance: { score, matchedSequenceWords: score ? 1 : 0, exactSequenceWords: score === WHOLE ? 1 : 0 }, endPart: 0 };
  }

  // Most hits in a broad OR search contain only a common single term. Before
  // building alignment rows, reject impossible terms using compact strings as
  // a *superset*. Full continuation rows can admit extra terms but cannot hide
  // a match in their bounded prefixes. Repeated query positions still count
  // separately, and every actual join remains verified by the original matcher.
  const possible = new Set<string>();
  const possibleByPart: string[][] = [];
  for (const source of parts) {
    const compact = compactNormalized(source.record);
    const present: string[] = [];
    for (const word of unique) if (compact.includes(word)) { present.push(word); possible.add(word); }
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
    tokens.push(...values.map(value => ({ value, part })));
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
    const text = parts[i]!.record.normalized;
    for (const word of possibleByPart[i]!) if (text.includes(word)) present.add(word);
  }
  for (const event of spaced) present.add(event.word);
  const activeQuery = query.map((word, index) => ({ word, index })).filter(entry => present.has(entry.word));
  if (activeQuery.length < 2) {
    let score = 0;
    for (const token of tokens) {
      if (token.part !== 0) break;
      for (const word of unique) if (token.value.includes(word)) score = Math.max(score, token.value === word ? WHOLE : SUBSTRING);
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
      const word = activeQuery[j - 1]!.word;
      if (source.value.includes(word)) {
        const whole = source.value === word;
        const weight = whole ? WHOLE : SUBSTRING;
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
