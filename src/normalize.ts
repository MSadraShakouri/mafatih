/** Search-only folding. Original text is never changed. */
function foldSearch(input: string, preserveTaMarbuta: boolean): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let folded = input.normalize('NFKD').toLocaleLowerCase('en-US')
    // Join controls are part of a written word, not OR-query separators.
    .replace(/[\p{M}\u0640\u200c\u200d]/gu, '')
    .replace(/[كک]/g, 'ک').replace(/[يىی]/g, 'ی')
    .replace(/[ٱأإآ]/g, 'ا');
  if (!preserveTaMarbuta) folded = folded.replace(/ة/g, 'ه');
  return folded.replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ی')
    .replace(/[۰-۹٠-٩]/g, d => String(Math.max(persianDigits.indexOf(d), arabicDigits.indexOf(d))))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ').trim();
}

/** The existing index representation, including the original ة→ه fold. */
export function normalizeSearch(input: string): string { return foldSearch(input, false); }

/** Preserve typed ة: unlike ه, it also matches an ordinary source ت. */
export function normalizeSearchQuery(input: string): string { return foldSearch(input, true); }

/** Source spelling for confirming typed ت against ة without confusing ordinary ه. */
export function normalizeSearchPreservingTa(input: string): string { return foldSearch(input, true); }
/** Aggressive compaction for offline audits; live search does not use it as a blanket matcher. */
export function compactSearch(s: string): string { return normalizeSearch(s).replace(/\s+/g, ''); }
