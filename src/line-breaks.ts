import { z } from 'zod';
import { text, type Corpus } from './corpus.js';
import { TextId, type NavNode } from './schema.js';
import { textId } from './text-ids.js';

export const BreakKind = z.enum(['LF', 'CRLF', 'CR', 'NEL', 'LS', 'PS', 'VT', 'FF']);
const exceptionFields = {
  // Stable item/row IDs and a text ID distinguish two uses of shared text.
  location: z.string().regex(/^[a-z0-9.-]+(?:\/[a-z0-9._-]+)+$/),
  text: TextId,
  // Zero-based Unicode code-point offset, not a UTF-16 or UTF-8 offset.
  offset: z.number().int().nonnegative(),
  break: BreakKind,
  reason: z.string().trim().min(12),
};
const reviewDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'review date must be a real calendar date');
export const LineBreakException = z.discriminatedUnion('status', [
  z.object({ ...exceptionFields, status: z.literal('pending') }).strict(),
  // A future human can explicitly review a retained break; the present
  // AI-assisted pass never sets this status. Evidence is descriptive, not a
  // claim that code can verify transcription or publishing rights.
  z.object({ ...exceptionFields, status: z.literal('reviewed'), review: z.object({
    reviewer: z.string().trim().min(1), date: reviewDate, evidence: z.string().trim().min(12),
  }).strict() }).strict(),
]);
export const LineBreakExceptionFile = z.object({
  version: z.literal(1),
  description: z.string().min(1),
  exceptions: z.array(LineBreakException),
}).strict();
export type BreakKind = z.infer<typeof BreakKind>;
export type Exception = z.infer<typeof LineBreakException>;
export type Occurrence = Pick<Exception, 'location' | 'text' | 'offset' | 'break'>;

/** Scan physical line/paragraph separators, including CRLF as one break. */
export function breakPositions(value: string): Array<{offset:number; break:BreakKind}> {
  const points = Array.from(value);
  const kinds: Record<string, BreakKind> = {
    '\n': 'LF', '\r': 'CR', '\u0085': 'NEL', '\u2028': 'LS', '\u2029': 'PS', '\v': 'VT', '\f': 'FF',
  };
  const positions: Array<{offset:number; break:BreakKind}> = [];
  for (let offset = 0; offset < points.length; offset += 1) {
    const char = points[offset]!;
    if (char === '\r' && points[offset + 1] === '\n') {
      positions.push({ offset, break: 'CRLF' });
      offset += 1;
    } else if (kinds[char]) {
      positions.push({ offset, break: kinds[char]! });
    }
  }
  return positions;
}

/**
 * Referenced content, not every historical pooled value: item titles, tags and
 * row fields; English display/source metadata and paragraphs; navigation;
 * source display values; and preserved source claims. Audio-reciter rows are
 * included even though the app excludes them. An old value retained solely in
 * editorial history should not be mistaken for a new active line break.
 */
export function scanLineBreaks(c: Corpus): Occurrence[] {
  const found: Occurrence[] = [];
  const verified = new Set<string>();
  const scan = (location: string, id: string | null | undefined): void => {
    if (id == null) return;
    const value = text(c, id);
    // A stale exception must not pass if a pooled value was edited in place
    // without updating its content-addressed ID.
    if (!verified.has(id)) {
      if (textId(value) !== id) throw new Error(`Line-break check: text ID does not match content at ${location}: ${id}`);
      verified.add(id);
    }
    for (const position of breakPositions(value)) found.push({ location, text: id, ...position });
  };
  for (const [id, item] of c.items) {
    for (const language of ['ar', 'fa', 'en'] as const) scan(`item/${id}/title/${language}`, item.title[language]);
    item.tags.forEach((tag, index) => scan(`item/${id}/tag/${index}`, tag));
    scan(`item/${id}/legacy-missing-english-title`, item.legacy_missing_english_title);
    for (const row of item.rows) for (const language of ['ar', 'fa'] as const) {
      scan(`item/${id}/row/${row.id}/${language}`, row[language]);
    }
  }
  for (const [id, doc] of c.english) {
    if (doc.display_title) for (const language of ['ar', 'en'] as const) {
      scan(`english/${id}/display-title/${language}`, doc.display_title[language]);
    }
    for (const field of ['title', 'title_ar', 'section', 'chapter'] as const) {
      scan(`english/${id}/source-metadata/${field}`, doc.source_metadata[field]);
    }
    for (const paragraph of doc.paragraphs) scan(`english/${id}/paragraph/${paragraph.id}`, paragraph.text);
  }
  function visit(nodes: NavNode[], parent: number[]): void {
    nodes.forEach((node, index) => {
      const location = [...parent, index];
      scan(`navigation/toc/${location.join('.')}/title`, node.title);
      visit(node.children, location);
    });
  }
  visit(c.nav.toc, []);
  for (const [id, source] of Object.entries(c.sources.sources)) {
    for (const field of ['name', 'author', 'edition', 'attribution', 'notes'] as const) {
      scan(`source/${id}/${field}`, source[field]);
    }
    for (const field of ['name', 'evidence'] as const) scan(`source/${id}/license/${field}`, source.license[field]);
  }
  for (const [id, ref] of Object.entries(c.claims)) scan(`claim/${id}`, ref);
  return found;
}

const coordinate = (value: Occurrence): string => `${value.location}\0${value.offset}`;
export const lineBreakKey = (value: Occurrence): string => `${coordinate(value)}\0${value.text}\0${value.break}`;

/** Missing, moved, edited, duplicated or newly introduced breaks all fail. */
export function compareLineBreaks(actual: Occurrence[], exceptions: Exception[]): {
  unexpected: Occurrence[]; stale: Exception[]; duplicates: Exception[];
} {
  const actualKeys = new Set(actual.map(lineBreakKey));
  const expectedKeys = new Set(exceptions.map(lineBreakKey));
  const coordinates = new Set<string>();
  const duplicates: Exception[] = [];
  for (const entry of exceptions) {
    const key = coordinate(entry);
    if (coordinates.has(key)) duplicates.push(entry);
    else coordinates.add(key);
  }
  return {
    unexpected: actual.filter(value => !expectedKeys.has(lineBreakKey(value))),
    stale: exceptions.filter(value => !actualKeys.has(lineBreakKey(value))),
    duplicates,
  };
}
