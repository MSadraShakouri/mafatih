import { normalizeSearch, normalizeSearchPreservingTa } from './normalize.js';
import { findWithTa } from './search-ta.js';

/** Original UTF-16 bounds; DOM Range uses UTF-16, while saved anchors use code points. */
export interface TextRange { start: number; end: number }
export interface WordMatch extends TextRange { word: string }
interface MappedText { value: string; offsets: TextRange[] }

// Offset mapping repeatedly encounters the same characters. Cache bounded
// per-character decomposition, lowercase length and search classification;
// never cache source texts or matches. Whole-string lowercasing below still
// handles contextual forms exactly as before.
const decompositions = new Map<string, string>();
const lowercaseLengths = new Map<string, number>();
const searchCharacters = new Map<string, string>();
const MAX_CHARACTERS = 1024;
function decomposition(character: string): string {
  const cached = decompositions.get(character);
  if (cached !== undefined) return cached;
  const value = character.normalize('NFKD');
  if (decompositions.size < MAX_CHARACTERS) decompositions.set(character, value);
  return value;
}
function lowercaseLength(character: string): number {
  const cached = lowercaseLengths.get(character);
  if (cached !== undefined) return cached;
  const length = character.toLocaleLowerCase('en-US').length;
  if (lowercaseLengths.size < MAX_CHARACTERS) lowercaseLengths.set(character, length);
  return length;
}

function searchCharacter(character: string, preserveTaMarbuta: boolean): string {
  if (character === 'ة') return preserveTaMarbuta ? 'ة' : 'ه';
  const cached = searchCharacters.get(character);
  if (cached !== undefined) return cached;
  let value: string;
  if (/[\p{M}\u0640\u200c\u200d]/u.test(character)) value = '';
  else if (/[كک]/u.test(character)) value = 'ک';
  else if (/[يىی]/u.test(character)) value = 'ی';
  else if (/[ٱأإآ]/u.test(character)) value = 'ا';
  else if (character === 'ؤ') value = 'و';
  else if (character === 'ئ') value = 'ی';
  else {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    const digit = Math.max(persianDigits.indexOf(character), arabicDigits.indexOf(character));
    value = digit >= 0 ? String(digit) : /[\p{L}\p{N}]/u.test(character) ? character : ' ';
  }
  if (searchCharacters.size < MAX_CHARACTERS) searchCharacters.set(character, value);
  return value;
}

/**
 * Fold for matching without changing display text, recording the original
 * UTF-16 span behind each folded UTF-16 code unit. Letters produced by a
 * compatibility ligature can therefore point back to the same source glyph.
 */
export function foldWithOffsets(input: string, preserveTaMarbuta = false): MappedText | undefined {
  let decomposed = '', value = '';
  let offsets: TextRange[] = [];
  let originalOffset = 0;
  const append = (character: string, bounds: TextRange): void => {
    const folded = searchCharacter(character, preserveTaMarbuta);
    if (!folded || (folded === ' ' && (!value || value.endsWith(' ')))) return;
    value += folded;
    for (let i = 0; i < folded.length; i += 1) offsets.push(bounds);
  };
  // Most Arabic/Persian source has no case changes. Speculatively build its
  // final map directly, avoiding a temporary offset entry for every mark.
  for (const character of input) {
    const bounds = { start: originalOffset, end: originalOffset + character.length };
    const part = decomposition(character);
    decomposed += part;
    for (const letter of part) append(letter, bounds);
    originalOffset += character.length;
  }
  // Whole-string lowercasing preserves contextual forms (e.g. Greek sigma).
  // If it changes anything, rebuild the mapping for expansions and contexts.
  const lower = decomposed.toLocaleLowerCase('en-US');
  if (lower !== decomposed) {
    const decomposedOffsets: TextRange[] = [];
    originalOffset = 0;
    for (const character of input) {
      const bounds = { start: originalOffset, end: originalOffset + character.length };
      const part = decomposition(character);
      for (let i = 0; i < part.length; i += 1) decomposedOffsets.push(bounds);
      originalOffset += character.length;
    }
    const lowerOffsets: TextRange[] = [];
    let decomposedOffset = 0;
    for (const character of decomposed) {
      const bounds = decomposedOffsets[decomposedOffset]!;
      const length = lowercaseLength(character);
      for (let i = 0; i < length; i += 1) lowerOffsets.push(bounds);
      decomposedOffset += character.length;
    }
    if (lower.length !== lowerOffsets.length) return undefined;
    value = ''; offsets = [];
    let lowerOffset = 0;
    for (const character of lower) {
      append(character, lowerOffsets[lowerOffset]!);
      lowerOffset += character.length;
    }
  }
  if (value.endsWith(' ')) { value = value.slice(0, -1); offsets.pop(); }
  // If an unusual normalization sequence cannot be mapped exactly, do not
  // invent a highlight or position. Search itself still uses the real fold.
  const expected = preserveTaMarbuta ? normalizeSearchPreservingTa(input) : normalizeSearch(input);
  return value === expected ? { value, offsets } : undefined;
}

interface CompactText { value: string; foldedOffsets: number[] }

function compact(mapped: MappedText): CompactText {
  let value = '';
  const foldedOffsets: number[] = [];
  for (let i = 0; i < mapped.value.length; i += 1) {
    if (mapped.value[i] !== ' ') {
      value += mapped.value[i];
      foldedOffsets.push(i);
    }
  }
  return { value, foldedOffsets };
}

/** Only horizontal whitespace may be bridged; punctuation/newlines are boundaries. */
function joinableGap(input: string, mapped: MappedText, space: number): boolean {
  const left = mapped.offsets[space - 1];
  const right = mapped.offsets[space + 1];
  if (!left || !right || left.end > right.start) return false;
  const gap = input.slice(left.end, right.start).replace(/[\p{M}\u0640\u200c\u200d]/gu, '');
  return /^[\p{Zs}\t]+$/u.test(gap);
}

/**
 * Find normalized matches in untouched original text. A joined query may
 * bridge ordinary spaces only from the beginning of the first source word,
 * with no punctuation/newline. Subsequent components need at least two
 * characters; a partial final component needs three, except after the common
 * complete prefixes «یا» and «و», where two are allowed. This preserves
 * «والله» / «و الله» without matching «کمیل» across «یک میل».
 */
export function findOriginalWordMatches(input: string, words: string[], maxPerWord = 100): WordMatch[] {
  if (maxPerWord <= 0) return [];
  const found: WordMatch[] = [];
  const terms = [...new Set(words)].filter(Boolean);
  const preserved = terms.some(word => /[تة]/u.test(word)) ? foldWithOffsets(input, true) : undefined;
  // When both forms are needed, folding ة to ه changes neither UTF-16
  // offsets nor length. Reuse the same source map instead of rebuilding it.
  // If the preserved map is unavailable, still try the old ordinary mapping.
  const ordinary = terms.some(word => !/[تة]/u.test(word))
    ? preserved ? { value: preserved.value.replace(/ة/g, 'ه'), offsets: preserved.offsets } : foldWithOffsets(input)
    : undefined;
  let ordinaryCompact: CompactText | undefined, preservedCompact: CompactText | undefined;
  for (const word of terms) {
    const useTa = /[تة]/u.test(word);
    const mapped = useTa ? preserved : ordinary;
    if (!mapped) continue;
    const find = (value: string, start: number): number => useTa ? findWithTa(value, word, start) : value.indexOf(word, start);
    let count = 0;
    let start = 0;
    // Find direct occurrences even when another spelling is spaced elsewhere.
    while (count < maxPerWord) {
      const index = find(mapped.value, start);
      if (index < 0) break;
      const first = mapped.offsets[index];
      const last = mapped.offsets[index + word.length - 1];
      if (first && last) { found.push({ word, start: first.start, end: last.end }); count += 1; }
      start = index + Math.max(1, word.length);
    }
    if (count >= maxPerWord || Array.from(word).length < 3 || !mapped.value.includes(' ')) continue;
    const compacted = useTa ? (preservedCompact ??= compact(mapped)) : (ordinaryCompact ??= compact(mapped));
    start = 0;
    while (count < maxPerWord) {
      const index = find(compacted.value, start);
      if (index < 0) break;
      start = index + 1;
      const firstIndex = compacted.foldedOffsets[index];
      const lastIndex = compacted.foldedOffsets[index + word.length - 1];
      if (firstIndex === undefined || lastIndex === undefined ||
          (firstIndex > 0 && mapped.value[firstIndex - 1] !== ' ')) continue;
      const fragment = mapped.value.slice(firstIndex, lastIndex + 1);
      const parts = fragment.split(' ');
      if (parts.length < 2 || !parts[0] || parts.slice(1).some(part => Array.from(part).length < 2)) continue;
      const endsInsideWord = lastIndex + 1 < mapped.value.length && mapped.value[lastIndex + 1] !== ' ';
      const finalLength = Array.from(parts.at(-1)!).length;
      const commonPrefix = parts[0] === 'یا' || parts[0] === 'و';
      if (endsInsideWord && finalLength < (commonPrefix ? 2 : 3)) continue;
      let valid = true;
      for (let i = firstIndex; i <= lastIndex; i += 1) {
        if (mapped.value[i] === ' ' && !joinableGap(input, mapped, i)) { valid = false; break; }
      }
      if (!valid) continue;
      const first = mapped.offsets[firstIndex];
      const last = mapped.offsets[lastIndex];
      if (first && last) { found.push({ word, start: first.start, end: last.end }); count += 1; }
    }
  }
  return found.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** All source spans, without the associated term labels. */
export function findOriginalMatches(input: string, words: string[], maxPerWord = 100): TextRange[] {
  return findOriginalWordMatches(input, words, maxPerWord).map(({ start, end }) => ({ start, end }));
}

function isWordCharacter(character: string): boolean {
  return /[\p{L}\p{M}\p{N}\u200c\u200d\u0640]/u.test(character);
}

/** Mark complete source words so highlighting does not split Arabic joins or marks. */
export function wholeWordRanges(input: string, ranges: TextRange[]): TextRange[] {
  const result: TextRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)) {
    let start = range.start;
    let end = range.end;
    while (start > 0) {
      const last = input.charCodeAt(start - 1);
      const before = start > 1 ? input.charCodeAt(start - 2) : 0;
      const width = last >= 0xdc00 && last <= 0xdfff && before >= 0xd800 && before <= 0xdbff ? 2 : 1;
      const previous = input.slice(start - width, start);
      if (!isWordCharacter(previous)) break;
      start -= width;
    }
    while (end < input.length) {
      const next = String.fromCodePoint(input.codePointAt(end)!);
      if (!isWordCharacter(next)) break;
      end += next.length;
    }
    const last = result.at(-1);
    if (last && start <= last.end) last.end = Math.max(last.end, end);
    else result.push({ start, end });
  }
  return result;
}

export function utf16ToCodePointOffset(input: string, offset: number): number {
  return Array.from(input.slice(0, Math.max(0, Math.min(offset, input.length)))).length;
}

export function codePointToUtf16Offset(input: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) return 0;
  return Array.from(input).slice(0, offset).join('').length;
}
