/**
 * Remove horizontal whitespace immediately before closing/sentence
 * punctuation. Do not rewrite punctuation, letters, marks, join controls,
 * line breaks, opening brackets/quotes, or spaced dashes.
 *
 * Straight quotes and U+2019 may also introduce a quotation or a
 * transliterated name; U+201D is sometimes misused as an opening quote in
 * imported material. Keep ambiguous opening-quote spacing unchanged.
 */
export function normalizePunctuationSpacing(value: string): string {
  const closing = /[\p{Zs}\t]+([\p{Pe}\p{Pf}.,:;!?%،؛؟٪۔٫٬…।॥，。！？：；％'"\u2019])/gu;
  return value.replace(closing, (whole: string, mark: string, offset: number, input: string): string => {
    if (mark === "'" || mark === '"' || mark === '\u2019' || mark === '\u201d') {
      const next = input.slice(offset + whole.length);
      const before = input.slice(0, offset);
      if (/^[\p{L}\p{M}\p{N}]/u.test(next) ||
          (/[:;.,،؛!?؟]$/u.test(before) && /^[\p{Zs}\t]*[\p{L}\p{M}\p{N}]/u.test(next))) return whole;
    }
    return mark;
  });
}
