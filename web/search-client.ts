import type { SearchRequest, SearchSnapshot } from '../src/search.js';
import type { SearchWorkerRequest, SearchWorkerResponse } from './search-protocol.js';

type Query = Omit<SearchRequest, 'id'>;

/** One lazily-created worker is reused by the library and every reader page. */
export class SearchClient {
  private worker: Worker | undefined;
  private nextId = 0;
  private activeId = 0;
  private onResult: ((snapshot: SearchSnapshot) => void) | undefined;
  private onError: (() => void) | undefined;

  constructor(private readonly base: URL) {}

  search(query: Query, onResult: (snapshot: SearchSnapshot) => void, onError: () => void): void {
    this.activeId = ++this.nextId;
    this.onResult = onResult;
    this.onError = onError;
    try {
      const worker = this.getWorker();
      worker.postMessage({ type: 'search', request: { ...query, id: this.activeId } } satisfies SearchWorkerRequest);
    } catch {
      this.fail();
    }
  }

  cancel(): void {
    this.activeId = ++this.nextId;
    this.onResult = undefined;
    this.onError = undefined;
    this.worker?.postMessage({ type: 'cancel' } satisfies SearchWorkerRequest);
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
    worker.postMessage({ type: 'init', indexUrl: new URL('data/search-index.json', this.base).href } satisfies SearchWorkerRequest);
    return worker;
  }

  private fail(): void {
    const onError = this.onError;
    this.activeId = ++this.nextId;
    this.onResult = undefined;
    this.onError = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    onError?.();
  }
}
