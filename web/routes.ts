import { isItemId } from './data.js';

export type Route =
  | { kind: 'library' }
  | { kind: 'item'; id: string }
  | { kind: 'not-found' };

// Hash routes need no server-side rewrite, including on GitHub Pages and in
// the Android WebView. They identify items, not inferred text alignments.
export function parseRoute(hash: string): Route {
  if (hash === '' || hash === '#' || hash === '#/') return { kind: 'library' };
  const match = /^#\/item\/([a-z0-9][a-z0-9-]*)$/.exec(hash);
  if (match?.[1] && isItemId(match[1])) return { kind: 'item', id: match[1] };
  return { kind: 'not-found' };
}

export function itemHref(id: string): string {
  if (!isItemId(id)) throw new Error('Invalid item ID');
  return `#/item/${id}`;
}
