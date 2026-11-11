import { normalizeSearch } from '../src/normalize.js';
import type { SearchRecord } from '../src/search.js';
import type { ReaderItem } from './data.js';

/**
 * Build the exact current-item search fields from the reader data already in
 * memory. This runs in the search worker, not on the UI thread. searchNext is
 * generated from original source adjacency, so excluded audio rows never
 * create a false continuation.
 */
export function itemSearchRecords(item: ReaderItem): SearchRecord[] {
  const rows = new Map(item.rows.map(row => [row.id, row]));
  const records: SearchRecord[] = [];
  // The same source field is consulted once as a record and again as the
  // previous row's continuation. Reuse its fold without altering source text.
  const normalized = new Map<string, string>();
  const fold = (text: string): string => {
    let value = normalized.get(text);
    if (value === undefined) { value = normalizeSearch(text); normalized.set(text, value); }
    return value;
  };
  for (const row of item.rows) {
    if (row.kind === 'audio-reciter') continue;
    for (const language of ['ar', 'fa'] as const) {
      const text = row[language];
      if (!text) continue;
      const following = row.searchNext ? rows.get(row.searchNext) : undefined;
      const nextText = following && following.kind !== 'audio-reciter' ? following[language] : '';
      const next = following && nextText && fold(nextText)
        ? `row:${item.id}:${following.id}:${language}` : undefined;
      records.push({ key: `row:${item.id}:${row.id}:${language}`, section: 'text', item: item.id,
        row: row.id, language, text, normalized: fold(text), featured: Boolean(item.featured),
        order: records.length, ...(next ? { next } : {}) });
    }
  }
  return records;
}
