/** Numeric end-of-ayah markers, not brackets around a Quran quotation. */
export function verseMarkerRanges(text: string): Array<{ start: number; end: number }> {
  return [...text.matchAll(/﴿[0-9٠-٩۰-۹]+﴾/gu)].map(match => ({ start: match.index!, end: match.index! + match[0].length }));
}

/** Add one ordinary space only where a numbered marker touches the preceding character. */
export function normalizeQuranMarkerSpacing(value: string): string {
  return value.replace(/([^\s])(?=﴿[0-9٠-٩۰-۹]+﴾)/gu, '$1 ');
}
