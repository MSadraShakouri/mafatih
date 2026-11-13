import { normalizeSearchPreservingTa } from './normalize.js';
import type { SearchRecord } from './search.js';

// The existing index folds ة to ه. Confirm ambiguous typed ت against the
// untouched source only when a folded candidate needs it; no extra per-record
// position data needs to be downloaded. The two presentation forms below are
// the compatibility characters whose NFKD decomposition contains ة.
const sourceCache = new WeakMap<SearchRecord, string>();
const tokenCache = new WeakMap<SearchRecord, string[]>();
function hasTaMarbuta(text: string): boolean {
  return text.includes('ة') || text.includes('\ufe93') || text.includes('\ufe94');
}

export function sourceWithTa(record: SearchRecord): string {
  if (!hasTaMarbuta(record.text)) return record.normalized;
  let value = sourceCache.get(record);
  if (value === undefined) {
    value = normalizeSearchPreservingTa(record.text);
    sourceCache.set(record, value);
  }
  return value;
}

/** Tokens paired by position with the ordinary index tokens, or no alternate spelling. */
export function tokensWithTa(record: SearchRecord): string[] | undefined {
  if (!hasTaMarbuta(record.text)) return undefined;
  let tokens = tokenCache.get(record);
  if (!tokens) { tokens = sourceWithTa(record).split(' ').filter(Boolean); tokenCache.set(record, tokens); }
  return tokens;
}

const patterns = new Map<string, { preserved: RegExp; folded: RegExp }>();
const terms = new Map<string, TaMatcher>();
const MAX_PATTERNS = 128;
const escape = (character: string): string => character.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const foldedCharacter = (c: string): string => c === 'ت' || c === 'ة' ? '[ته]' : escape(c);

/**
 * Match the same conservative candidate as removing spaces from the folded
 * index, without allocating a compact copy for every negative record. Only
 * normalized query words belong here; confirmation still checks original text.
 * Cap pattern size and use the compact-string fallback for unusually long input.
 */
export function compileCompactCandidate(word: string): RegExp | undefined {
  const characters = Array.from(word);
  if (characters.length > 300) return undefined;
  return new RegExp(characters.map(foldedCharacter).join(' *'), 'u');
}

function patternsFor(word: string): { preserved: RegExp; folded: RegExp } {
  const cached = patterns.get(word);
  if (cached) return cached;
  const chars = Array.from(word);
  const preserved = chars.map(c => c === 'ت' ? '[تة]' : c === 'ه' ? '[هة]' : c === 'ة' ? '[تهة]' : escape(c)).join('');
  // In the ordinary index both ة and ه are ه. A typed ت may correspond to
  // either index character only as a conservative prefilter.
  const folded = chars.map(foldedCharacter).join('');
  const value = { preserved: new RegExp(preserved, 'gu'), folded: new RegExp(folded, 'gu') };
  if (patterns.size >= MAX_PATTERNS) patterns.delete(patterns.keys().next().value!);
  patterns.set(word, value);
  return value;
}

/** Find a query in the preserved source spelling, returning a UTF-16 position. */
export function findWithTa(source: string, word: string, start = 0): number {
  if (!/[تة]/u.test(word)) return source.indexOf(word, start);
  if (word === 'ت' || word === 'ة') {
    const positions = [source.indexOf('ت', start), source.indexOf('ة', start)];
    if (word === 'ة') positions.push(source.indexOf('ه', start));
    let best = -1;
    for (const position of positions) if (position >= 0 && (best < 0 || position < best)) best = position;
    return best;
  }
  const pattern = patternsFor(word).preserved;
  // A Unicode RegExp rounds a lastIndex inside a surrogate pair back to the
  // pair's beginning. Advancing by one UTF-16 unit after a supplementary
  // match would otherwise rediscover it forever during joined highlighting.
  const current = source.charCodeAt(start), previous = source.charCodeAt(start - 1);
  const from = current >= 0xdc00 && current <= 0xdfff && previous >= 0xd800 && previous <= 0xdbff ? start + 1 : start;
  pattern.lastIndex = from;
  return pattern.exec(source)?.index ?? -1;
}

export interface TaMatcher {
  /** Conservative candidate in the old index; positive candidates need confirmation. */
  possible(source: string): boolean;
  /** Confirmed direct or complete-word match in an original record. */
  contains(record: SearchRecord): boolean;
  whole(record: SearchRecord): boolean;
}

function legacyWhole(text: string, word: string): boolean {
  return text === word || text.startsWith(`${word} `) || text.endsWith(` ${word}`) || text.includes(` ${word} `);
}

/** Compile once per query spelling, rather than per indexed row. */
export function compileTaMatcher(word: string): TaMatcher {
  const cached = terms.get(word);
  if (cached) return cached;
  if (!/[تة]/u.test(word)) throw new Error('A ta matcher requires ت or ة');
  let offset = 0, anchor = '', anchorOffset = 0;
  for (const part of word.split(/[تة]/u)) {
    if (part.length > anchor.length) { anchor = part; anchorOffset = offset; }
    offset += part.length + 1;
  }
  const tehs: number[] = [];
  for (let i = 0; i < word.length; i += 1) if (word[i] === 'ت') tehs.push(i);
  const hasMarbutaQuery = word.includes('ة');
  // A query consisting solely of ت/ة has no literal anchor; fixed-width
  // character classes are linear and avoid exponentially many variants.
  const pattern = anchor ? undefined : patternsFor(word).folded;
  const candidate = (source: string, from = 0): number => {
    if (pattern) { pattern.lastIndex = from; return pattern.exec(source)?.index ?? -1; }
    let at = source.indexOf(anchor, from + anchorOffset);
    while (at >= 0) {
      const start = at - anchorOffset;
      if (start + word.length <= source.length) {
        let matches = true;
        // The longest literal anchor is already known to match; inspect only
        // characters before and after it, including ambiguous positions.
        for (let i = 0; i < anchorOffset && matches; i += 1) {
          const q = word[i], s = source[start + i];
          if (q !== s && !((q === 'ت' || q === 'ة') && s === 'ه') && !(q === 'ة' && s === 'ت')) matches = false;
        }
        for (let i = anchorOffset + anchor.length; i < word.length && matches; i += 1) {
          const q = word[i], s = source[start + i];
          if (q !== s && !((q === 'ت' || q === 'ة') && s === 'ه') && !(q === 'ة' && s === 'ت')) matches = false;
        }
        if (matches) return start;
      }
      at = source.indexOf(anchor, at + 1);
    }
    return -1;
  };
  const validAt = (record: SearchRecord, at: number): boolean => {
    for (const position of tehs) {
      if (record.normalized[at + position] === 'ت') continue;
      if (!hasTaMarbuta(record.text)) return false;
      // Preserve the untouched source lazily; one check covers every typed ت.
      return findWithTa(sourceWithTa(record), word, at) === at;
    }
    return true;
  };
  const value: TaMatcher = {
    possible: source => candidate(source) >= 0,
    contains: record => {
      const source = record.normalized;
      if (word === 'ت') return source.includes('ت') || (source.includes('ه') && hasTaMarbuta(record.text));
      if (word === 'ة') return source.includes('ت') || source.includes('ه');
      let at = candidate(source);
      while (at >= 0) {
        if (validAt(record, at)) return true;
        at = candidate(source, at + 1);
      }
      return false;
    },
    whole: record => {
      const source = record.normalized;
      if (!hasMarbutaQuery && legacyWhole(source, word)) return true;
      if (word === 'ة') return legacyWhole(source, 'ت') || legacyWhole(source, 'ه');
      if (word === 'ت') {
        if (!legacyWhole(source, 'ه') || !hasTaMarbuta(record.text)) return false;
        return Boolean(tokensWithTa(record)?.includes('ة'));
      }
      if (!hasMarbutaQuery && tehs.length === 1 && !legacyWhole(source, word.replace('ت', 'ه'))) return false;
      let at = candidate(source);
      while (at >= 0) {
        if ((at === 0 || source[at - 1] === ' ') &&
            (at + word.length === source.length || source[at + word.length] === ' ') && validAt(record, at)) return true;
        at = candidate(source, at + 1);
      }
      return false;
    },
  };
  if (terms.size >= MAX_PATTERNS) terms.delete(terms.keys().next().value!);
  terms.set(word, value);
  return value;
}

/** A cheap superset over the old folded index. A positive is not proof of a match. */
export function mightContainWithTa(source: string, word: string): boolean {
  return /[تة]/u.test(word) ? compileTaMatcher(word).possible(source) : source.includes(word);
}

/** Direct substring match, preserving the three-way directional behavior. */
export function recordContains(record: SearchRecord, word: string): boolean {
  return /[تة]/u.test(word) ? compileTaMatcher(word).contains(record) : record.normalized.includes(word);
}

export function recordHasWhole(record: SearchRecord, word: string): boolean {
  return /[تة]/u.test(word) ? compileTaMatcher(word).whole(record) : legacyWhole(record.normalized, word);
}
