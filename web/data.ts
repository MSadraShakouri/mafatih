import type { RowSplitRedirect } from './row-split-anchor.js';

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
  /** Redirects from retired row/language/code-point URLs to current slices. */
  row_split_redirects?: RowSplitRedirect[];
}

// Identifiers use the same character rule as the canonical schema. In
// particular, a hash route cannot turn into a path outside data/items/.
export function isItemId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

export type FetchJson = (url: URL, init?: RequestInit) => Promise<Response>;

export class DataClient {
  private catalogPromise: Promise<Catalog> | undefined;
  private catalogWarmController: AbortController | undefined;
  private readonly items = new Map<string, Promise<ReaderItem>>();

  constructor(
    private readonly base: URL,
    private readonly request: FetchJson = (url, init) => fetch(url, init),
  ) {}

  private async read<T>(relativePath: string, signal?: AbortSignal): Promise<T> {
    const response = await this.request(new URL(`data/${relativePath}`, this.base), signal ? { signal } : undefined);
    if (!response.ok) throw new Error(`Could not load ${relativePath} (${response.status})`);
    return await response.json() as T;
  }

  private loadCatalog(warm: boolean): Promise<Catalog> {
    if (!this.catalogPromise) {
      const controller = warm ? new AbortController() : undefined;
      this.catalogWarmController = controller;
      const pending = this.read<Catalog>('catalog.json', controller?.signal).then(catalog => {
        if (this.catalogWarmController === controller) this.catalogWarmController = undefined;
        return catalog;
      }).catch((error: unknown) => {
        // A failure or an aborted warm-up must be retryable. Do not erase a
        // newer request started while this cancelled promise was settling.
        if (this.catalogPromise === pending) this.catalogPromise = undefined;
        if (this.catalogWarmController === controller) this.catalogWarmController = undefined;
        throw error;
      });
      this.catalogPromise = pending;
    }
    // A topic or search now needs this request; do not cancel it on leaving
    // the chooser, even if it began as a speculative warm-up.
    if (!warm) this.catalogWarmController = undefined;
    return this.catalogPromise;
  }

  catalog(): Promise<Catalog> { return this.loadCatalog(false); }
  warmCatalog(): Promise<Catalog> { return this.loadCatalog(true); }

  cancelCatalogWarmup(): void {
    const controller = this.catalogWarmController;
    if (controller) {
      this.catalogWarmController = undefined; this.catalogPromise = undefined; controller.abort();
    }
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
