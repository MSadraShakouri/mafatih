import type { TextRange } from '../src/search-text.js';

/**
 * Highlight only the matched original substring, never its whole word. Keep a
 * matched base letter with its combining marks so Arabic diacritics remain
 * attached, and merge overlaps so multiple query terms cannot duplicate text.
 */
export function matchedSubstringRanges(text: string, matches: readonly TextRange[]): TextRange[] {
  const merged: TextRange[] = [];
  for (const match of [...matches].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const start = match.start;
    let end = match.end;
    while (end < text.length) {
      const next = String.fromCodePoint(text.codePointAt(end)!);
      if (!/\p{M}/u.test(next)) break;
      end += next.length;
    }
    const last = merged.at(-1);
    if (last && start <= last.end) last.end = Math.max(last.end, end);
    else merged.push({ start, end });
  }
  return merged;
}
