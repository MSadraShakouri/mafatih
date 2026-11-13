import type { ReadingAnchor } from './routes.js';

export interface RowSplitRedirect {
  original: { id: string };
  ar: Array<{ row: string; language: 'ar' | 'fa'; start: number; end: number }>;
  fa: Array<{ row: string; language: 'ar' | 'fa'; start: number; end: number }>;
}

/** Follow old row/language/code-point URLs, including a change of language field. */
export function resolveLegacyRowAnchor(rows: readonly RowSplitRedirect[], anchor: ReadingAnchor): ReadingAnchor {
  const redirect = rows.find(entry => entry.original.id === anchor.row);
  const segments = redirect?.[anchor.language];
  if (!segments?.length) return anchor;
  // A boundary belongs to the following piece; the very end belongs to the
  // end of the last piece, matching the previous clamping behavior.
  const segment = segments.find(entry => anchor.offset < entry.end) ?? segments[segments.length - 1]!;
  return { row: segment.row, language: segment.language,
    offset: Math.max(0, Math.min(anchor.offset, segment.end) - segment.start) };
}
