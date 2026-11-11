import { isItemId } from './data.js';
import type { PreferenceStorage } from './reader-preferences.js';

/** Personal bookmarks identify a readable item, not a precise position. */
export const BOOKMARKS_KEY = 'mafatih.bookmarks.v1';

export interface BookmarkStore {
  items(): string[];
  has(id: string): boolean;
  /** Returns the resulting saved state. */
  toggle(id: string): boolean;
  /** Whether the most recent change was successfully written to storage. */
  lastWritePersistent(): boolean;
}

export function createBookmarkStore(storage?: PreferenceStorage): BookmarkStore {
  let ids: string[] = [], lastWritePersistent = false;
  try {
    const raw = storage?.getItem(BOOKMARKS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      ids = [...new Set(parsed.filter((id: unknown): id is string => typeof id === 'string' && isItemId(id)))];
    }
  } catch { /* Missing, denied or malformed storage: start in memory. */ }
  return {
    items: () => [...ids],
    has: id => ids.includes(id),
    toggle: id => {
      if (!isItemId(id)) throw new Error('Invalid item ID');
      const index = ids.indexOf(id);
      if (index >= 0) ids.splice(index, 1); else ids.push(id);
      lastWritePersistent = false;
      try {
        if (storage) { storage.setItem(BOOKMARKS_KEY, JSON.stringify(ids)); lastWritePersistent = true; }
      } catch { /* Continue in memory and report the failed write to the UI. */ }
      return index < 0;
    },
    lastWritePersistent: () => lastWritePersistent,
  };
}
