// The browser consumes resolved runtime data, not Node's corpus loader or
// the canonical text pool. These interfaces cover only fields used so far.
export interface Title {
  fa: string;
  ar: string;
  en: string;
}

export interface CatalogItem {
  id: string;
  title: Title;
  /** Imported category is a provisional navigation aid, not a reviewed claim. */
  category?: string;
  featured: boolean;
}

export interface TocNode {
  title: string;
  item: string | null;
  children: TocNode[];
}

export interface Catalog {
  items: CatalogItem[];
  toc: TocNode[];
  /** Editorial featured order, distinct from personal bookmarks. */
  featured?: string[];
}

export interface ItemRow {
  id: string;
  ar: string;
  fa: string;
  kind?: string;
  /** Next original source row, absent across an excluded audio row. */
  searchNext?: string;
}

export interface ReaderItem {
  id: string;
  title: Title;
  featured?: boolean;
  rows: ItemRow[];
}

// Identifiers use the same character rule as the canonical schema. In
// particular, a hash route cannot turn into a path outside data/items/.
export function isItemId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

export type FetchJson = (url: URL) => Promise<Response>;

export class DataClient {
  private catalogPromise: Promise<Catalog> | undefined;
  private readonly items = new Map<string, Promise<ReaderItem>>();

  constructor(
    private readonly base: URL,
    private readonly request: FetchJson = (url) => fetch(url),
  ) {}

  private async read<T>(relativePath: string): Promise<T> {
    const response = await this.request(new URL(`data/${relativePath}`, this.base));
    if (!response.ok) throw new Error(`Could not load ${relativePath} (${response.status})`);
    return await response.json() as T;
  }

  catalog(): Promise<Catalog> {
    if (!this.catalogPromise) {
      // A failed fetch must be retryable instead of permanently caching a
      // rejected promise (for example, after a temporary network failure).
      this.catalogPromise = this.read<Catalog>('catalog.json').catch((error: unknown) => {
        this.catalogPromise = undefined;
        throw error;
      });
    }
    return this.catalogPromise;
  }

  item(id: string): Promise<ReaderItem> {
    if (!isItemId(id)) return Promise.reject(new Error('Invalid item ID'));
    const cached = this.items.get(id);
    if (cached) { this.items.delete(id); this.items.set(id, cached); return cached; }
    const pending = this.read<ReaderItem>(`items/${id}.json`).catch((error: unknown) => {
      if (this.items.get(id) === pending) this.items.delete(id);
      throw error;
    });
    this.items.set(id, pending);
    // Avoid keeping the whole book in memory while making Back/settings quick.
    while (this.items.size > 8) this.items.delete(this.items.keys().next().value!);
    return pending;
  }
}
