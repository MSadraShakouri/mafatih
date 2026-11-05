import { IncrementalSearch, type SearchIndex, type SearchRequest, type SearchShard } from '../src/search.js';
import type { SearchWorkerRequest, SearchWorkerResponse } from './search-protocol.js';

// A dedicated worker keeps index loading, folding, sorting and scanning off the
// UI thread. It owns one engine across global and current-item search panels.
const worker = globalThis as unknown as {
  postMessage(message: SearchWorkerResponse): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<SearchWorkerRequest>) => void): void;
};

let engine: IncrementalSearch | undefined;
let active: SearchRequest | undefined;
let started = false;
let failed = false;
let scheduled = false;

function sendSnapshot(): void {
  if (!engine || !active || failed) return;
  worker.postMessage({ type: 'snapshot', snapshot: engine.advance(600) });
}

function schedule(): void {
  if (!engine || !active || scheduled || failed) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    if (!engine || !active || failed) return;
    sendSnapshot();
    if (engine.hasUnscannedRecords()) schedule();
  }, 0);
}

async function json<T>(url: URL): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Search data could not be loaded (${response.status}).`);
  return await response.json() as T;
}

async function load(indexUrl: string): Promise<void> {
  try {
    const indexAddress = new URL(indexUrl);
    const index = await json<SearchIndex>(indexAddress);
    if (index.version !== 3 || index.normalization !== 'nfkd-search-v2' ||
        !Array.isArray(index.records) || !Array.isArray(index.shards)) {
      throw new Error('Unsupported search index.');
    }
    if (index.shards.some(path => !/^search\/\d{3,}\.json$/.test(path))) {
      throw new Error('Invalid search shard path.');
    }
    engine = new IncrementalSearch(index.records, 32, index.shards.length > 0);
    if (active) {
      worker.postMessage({ type: 'snapshot', snapshot: engine.begin(active) });
      schedule();
    }

    // Three concurrent fetches keep loading quick without firing hundreds of
    // item requests. TOC and featured rows were deliberately staged first.
    let next = 0;
    async function loadShards(): Promise<void> {
      while (next < index.shards.length) {
        const shardPath = index.shards[next++]!;
        const shard = await json<SearchShard>(new URL(shardPath, indexAddress));
        if (shard.version !== 3 || !Array.isArray(shard.records)) throw new Error('Invalid search shard.');
        engine!.appendRecords(shard.records);
        schedule();
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, index.shards.length) }, () => loadShards()));
    engine.finishLoading();
    // Completion must be reported even if all loaded records were already scanned.
    schedule();
  } catch (error: unknown) {
    failed = true;
    if (active) worker.postMessage({ type: 'error', id: active.id, message: String(error) });
  }
}

worker.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'init') {
    if (!started) { started = true; void load(message.indexUrl); }
  } else if (message.type === 'cancel') {
    active = undefined; // Keep the partial/complete word cache for later.
  } else {
    active = message.request;
    if (failed) {
      worker.postMessage({ type: 'error', id: active.id, message: 'Search index failed to load.' });
    } else if (engine) {
      worker.postMessage({ type: 'snapshot', snapshot: engine.begin(active) });
      schedule();
    }
  }
});
