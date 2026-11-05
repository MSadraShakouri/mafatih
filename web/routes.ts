import { isItemId } from './data.js';
import type { SearchLanguage } from '../src/search.js';

export interface ReadingAnchor {
  row: string;
  language: SearchLanguage;
  /** Unicode code-point offset in the original row field, not UTF-16. */
  offset: number;
}

export type Route =
  | { kind: 'library' }
  | { kind: 'item'; id: string; anchor?: ReadingAnchor }
  | { kind: 'not-found' };

// Hash routes need no server-side rewrite, including on GitHub Pages and in
// the Android WebView. Anchors name actual occurrences, not inferred alignment.
export function parseRoute(hash: string): Route {
  if (hash === '' || hash === '#' || hash === '#/') return { kind: 'library' };
  const match = /^#\/item\/([a-z0-9][a-z0-9-]*)(?:\?([^#]+))?$/.exec(hash);
  if (!match?.[1] || !isItemId(match[1])) return { kind: 'not-found' };
  const id = match[1];
  if (!match[2]) return { kind: 'item', id };
  const params = new URLSearchParams(match[2]);
  const keys = [...params.keys()];
  const row = params.get('row');
  const language = params.get('lang');
  const offsetText = params.get('offset');
  if (keys.length !== 3 || new Set(keys).size !== 3 ||
      !row || !isItemId(row) || (language !== 'ar' && language !== 'fa') ||
      !offsetText || !/^(?:0|[1-9][0-9]*)$/.test(offsetText)) return { kind: 'not-found' };
  const offset = Number(offsetText);
  if (!Number.isSafeInteger(offset)) return { kind: 'not-found' };
  return { kind: 'item', id, anchor: { row, language, offset } };
}

export function itemHref(id: string, anchor?: ReadingAnchor): string {
  if (!isItemId(id)) throw new Error('Invalid item ID');
  if (!anchor) return `#/item/${id}`;
  if (!isItemId(anchor.row) || (anchor.language !== 'ar' && anchor.language !== 'fa') ||
      !Number.isSafeInteger(anchor.offset) || anchor.offset < 0) throw new Error('Invalid reading anchor');
  const params = new URLSearchParams({ row: anchor.row, lang: anchor.language, offset: String(anchor.offset) });
  return `#/item/${id}?${params.toString()}`;
}
