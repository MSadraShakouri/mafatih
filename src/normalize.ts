/** Search-only folding. Original text is never changed. Same function at build and query time. */
export function normalizeSearch(input: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return input.normalize('NFKD').toLocaleLowerCase('en-US')
    // Join controls are part of a written word, not OR-query separators.
    .replace(/[\p{M}\u0640\u200c\u200d]/gu, '')
    .replace(/[كک]/g, 'ک').replace(/[يىی]/g, 'ی')
    .replace(/[ٱأإآ]/g, 'ا').replace(/ة/g, 'ه')
    .replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ی')
    .replace(/[۰-۹٠-٩]/g, d => String(Math.max(persianDigits.indexOf(d), arabicDigits.indexOf(d))))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ').trim();
}
/** Aggressive compaction for offline audits; live search does not use it as a blanket matcher. */
export function compactSearch(s: string): string { return normalizeSearch(s).replace(/\s+/g, ''); }
