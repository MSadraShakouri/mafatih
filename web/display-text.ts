import type { TextRange } from '../src/search-text.js';
import { verseMarkerRanges } from '../src/quran-markers.js';
export { verseMarkerRanges } from '../src/quran-markers.js';

export type DisplayLanguage = 'ar' | 'fa' | 'en' | 'ui';
const persian = '۰۱۲۳۴۵۶۷۸۹', arabicIndic = '٠١٢٣٤٥٦٧٨٩';

/** One BMP digit becomes one BMP digit: source UTF-16 and code-point offsets stay valid. */
export function displayDigits(value: string, language: DisplayLanguage): string {
  if (language === 'en' || (language === 'ui' && /[A-Za-z]/u.test(value) && !/[\p{Script=Arabic}]/u.test(value))) return value;
  return value.replace(/[0-9٠-٩]/gu, digit => persian[arabicIndic.includes(digit) ? arabicIndic.indexOf(digit) : Number(digit)]!);
}

/**
 * Append display-only digits, numeric ayah marker spans and search highlights.
 * All boundaries are original UTF-16 offsets; the concatenated text has exactly
 * the source's length and code-point count. No source or search data is changed.
 */
export function appendDisplayText(parent: HTMLElement, text: string, language: DisplayLanguage,
  highlights: readonly TextRange[] = [], start = 0, end = text.length): void {
  const from = Math.max(0, Math.min(text.length, start)), to = Math.max(from, Math.min(text.length, end));
  const ranges = [...highlights].sort((a, b) => a.start - b.start || a.end - b.end);
  function highlighted(target: HTMLElement, left: number, right: number): void {
    let cursor = left;
    for (const range of ranges) {
      const a = Math.max(left, cursor, range.start), b = Math.min(right, range.end);
      if (b <= a) continue;
      if (a > cursor) target.append(document.createTextNode(displayDigits(text.slice(cursor, a), language)));
      const mark = document.createElement('mark'); mark.textContent = displayDigits(text.slice(a, b), language);
      target.append(mark); cursor = b;
    }
    if (cursor < right) target.append(document.createTextNode(displayDigits(text.slice(cursor, right), language)));
  }
  let cursor = from;
  const markers = language === 'ar' ? verseMarkerRanges(text) : [];
  for (const marker of markers) {
    const left = Math.max(from, marker.start), right = Math.min(to, marker.end);
    if (right <= left) continue;
    if (left > cursor) highlighted(parent, cursor, left);
    const span = document.createElement('span'); span.className = 'quran-verse-marker';
    highlighted(span, left, right); parent.append(span); cursor = right;
  }
  if (cursor < to) highlighted(parent, cursor, to);
}

/** Localize a typed search query without moving its selection or interrupting an IME. */
export function localizeSearchInput(input: HTMLInputElement): void {
  const value = displayDigits(input.value, 'ui');
  if (value === input.value) return;
  const start = input.selectionStart, end = input.selectionEnd, direction = input.selectionDirection;
  input.value = value;
  if (start !== null && end !== null) input.setSelectionRange(start, end, direction ?? undefined);
}
