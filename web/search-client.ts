import type { SearchRequest, SearchSnapshot } from '../src/search.js';
import type { ReaderItem } from './data.js';
import type { SearchWorkerRequest, SearchWorkerResponse } from './search-protocol.js';

type Query = Omit<SearchRequest, 'id'>;

/** One lazily-created worker is reused by the library and every reader page. */
export class SearchClient {
  private worker: Worker | undefined;
  private nextId = 0;
  private activeId = 0;
  private onResult: ((snapshot: SearchSnapshot) => void) | undefined;
  private onError: (() => void) | undefined;
  private pending: Extract<SearchWorkerRequest, { type: 'search' }> | undefined;
  private sendTimer: ReturnType<typeof setTimeout> | undefined;
  private lastQuery = '';
  private lastQueryAt = 0;
  private globalStarted = false;
  private item: ReaderItem | undefined;
  private sentItem = '';

  constructor(private readonly base: URL) {}

  /** Begin loading the library index as soon as the search field is approached. */
  prepareGlobal(): void {
    try { this.startGlobal(this.getWorker()); } catch { this.fail(); }
  }

  /** Normalize only the already-loaded reader item, off the UI thread. */
  prepareItem(item: ReaderItem): void {
    this.item = item;
    try { this.startItem(this.getWorker(), item); } catch { this.fail(); }
  }

  search(query: Query, onResult: (snapshot: SearchSnapshot) => void, onError: () => void): void {
    this.activeId = ++this.nextId;
    this.onResult = onResult;
    this.onError = onError;
    try {
      const worker = this.getWorker();
      if (query.item) {
        if (!this.item || this.item.id !== query.item) throw new Error('Reader search item is not prepared.');
        this.startItem(worker, this.item);
      } else this.startGlobal(worker);
      // Start loading immediately. A fresh query dispatches promptly, while
      // single characters and successive prefix edits retain the longer
      // coalescing window so fast typing does not scan every broad prefix.
      const now = Date.now();
      const editing = this.lastQuery && query.query !== this.lastQuery && now - this.lastQueryAt < 100 &&
        (query.query.startsWith(this.lastQuery) || this.lastQuery.startsWith(query.query));
      const short = Array.from(query.query.trim()).length < 2;
      this.lastQuery = query.query; this.lastQueryAt = now;
      this.pending = { type: 'search', request: { ...query, id: this.activeId } };
      if (this.sendTimer === undefined) this.sendTimer = setTimeout(() => {
        this.sendTimer = undefined;
        const pending = this.pending;
        this.pending = undefined;
        if (!pending || !this.worker) return;
        try { this.worker.postMessage(pending); } catch { this.fail(); }
      }, editing || short ? 30 : 20);
    } catch {
      this.fail();
    }
  }

  cancel(): void {
    this.activeId = ++this.nextId;
    this.onResult = undefined;
    this.onError = undefined;
    if (this.sendTimer !== undefined) clearTimeout(this.sendTimer);
    this.sendTimer = undefined;
    this.pending = undefined;
    this.lastQuery = ''; this.lastQueryAt = 0;
    try { this.worker?.postMessage({ type: 'cancel' } satisfies SearchWorkerRequest); } catch { this.fail(); }
  }

  private startGlobal(worker: Worker): void {
    if (this.globalStarted) return;
    worker.postMessage({ type: 'init', indexUrl: new URL('data/search-index.json', this.base).href } satisfies SearchWorkerRequest);
    this.globalStarted = true;
  }
  private startItem(worker: Worker, item: ReaderItem): void {
    if (this.sentItem === item.id) return;
    worker.postMessage({ type: 'prepare-item', item } satisfies SearchWorkerRequest);
    this.sentItem = item.id;
  }
  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<SearchWorkerResponse>) => {
      if (this.worker !== worker) return;
      const message = event.data;
      if (message.type === 'snapshot' && message.snapshot.id === this.activeId) this.onResult?.(message.snapshot);
      else if (message.type === 'error' && message.id === this.activeId) this.fail();
    });
    worker.addEventListener('error', () => { if (this.worker === worker) this.fail(); });
    this.worker = worker;
    return worker;
  }

  private fail(): void {
    const onError = this.onError;
    this.activeId = ++this.nextId;
    this.onResult = undefined;
    this.onError = undefined;
    if (this.sendTimer !== undefined) clearTimeout(this.sendTimer);
    this.sendTimer = undefined;
    this.pending = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    this.globalStarted = false;
    this.sentItem = '';
    onError?.();
  }
}
