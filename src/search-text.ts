import { normalizeSearch } from './normalize.js';

/** Original UTF-16 bounds; DOM Range uses UTF-16, while saved anchors use code points. */
export interface TextRange { start: number; end: number }
export interface WordMatch extends TextRange { word: string }
interface MappedText { value: string; offsets: TextRange[] }

function searchCharacter(character: string): string {
  if (/[\p{M}\u0640\u200c\u200d]/u.test(character)) return '';
  if (/[كک]/u.test(character)) return 'ک';
  if (/[يىی]/u.test(character)) return 'ی';
  if (/[ٱأإآ]/u.test(character)) return 'ا';
  if (character === 'ة') return 'ه';
  if (character === 'ؤ') return 'و';
  if (character === 'ئ') return 'ی';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const digit = Math.max(persianDigits.indexOf(character), arabicDigits.indexOf(character));
  if (digit >= 0) return String(digit);
  return /[\p{L}\p{N}]/u.test(character) ? character : ' ';
}

/**
 * Fold for matching without changing display text, recording the original
 * UTF-16 span behind each folded UTF-16 code unit. Letters produced by a
 * compatibility ligature can therefore point back to the same source glyph.
 */
export function foldWithOffsets(input: string): MappedText | undefined {
  let decomposed = '';
  const decomposedOffsets: TextRange[] = [];
  let originalOffset = 0;
  for (const character of input) {
    const bounds = { start: originalOffset, end: originalOffset + character.length };
    const part = character.normalize('NFKD');
    decomposed += part;
    for (let i = 0; i < part.length; i += 1) decomposedOffsets.push(bounds);
    originalOffset += character.length;
  }
  // Lowercase the complete string so contextual forms (e.g. Greek sigma)
  // agree with normalizeSearch. Map any expansions to the original glyph.
  const lower = decomposed.toLocaleLowerCase('en-US');
  const lowerOffsets: TextRange[] = [];
  let decomposedOffset = 0;
  for (const character of decomposed) {
    const bounds = decomposedOffsets[decomposedOffset]!;
    const length = character.toLocaleLowerCase('en-US').length;
    for (let i = 0; i < length; i += 1) lowerOffsets.push(bounds);
    decomposedOffset += character.length;
  }
  if (lower.length !== lowerOffsets.length) return undefined;

  let value = '';
  const offsets: TextRange[] = [];
  let lowerOffset = 0;
  for (const character of lower) {
    const bounds = lowerOffsets[lowerOffset]!;
    const folded = searchCharacter(character);
    lowerOffset += character.length;
    if (!folded) continue;
    if (folded === ' ' && (!value || value.endsWith(' '))) continue;
    value += folded;
    for (let i = 0; i < folded.length; i += 1) offsets.push(bounds);
  }
  if (value.endsWith(' ')) { value = value.slice(0, -1); offsets.pop(); }
  // If an unusual normalization sequence cannot be mapped exactly, do not
  // invent a highlight or position. Search itself still uses the real fold.
  return value === normalizeSearch(input) ? { value, offsets } : undefined;
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
  const mapped = foldWithOffsets(input);
  if (!mapped || maxPerWord <= 0) return [];
  const found: WordMatch[] = [];
  let compacted: CompactText | undefined;
  for (const word of new Set(words)) {
    if (!word) continue;
    let count = 0;
    let start = 0;
    // Find direct occurrences even when another spelling is spaced elsewhere.
    while (count < maxPerWord) {
      const index = mapped.value.indexOf(word, start);
      if (index < 0) break;
      const first = mapped.offsets[index];
      const last = mapped.offsets[index + word.length - 1];
      if (first && last) { found.push({ word, start: first.start, end: last.end }); count += 1; }
      start = index + Math.max(1, word.length);
    }
    if (count >= maxPerWord || Array.from(word).length < 3 || !mapped.value.includes(' ')) continue;
    compacted ??= compact(mapped);
    start = 0;
    while (count < maxPerWord) {
      const index = compacted.value.indexOf(word, start);
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
