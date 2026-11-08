import { IncrementalSearch, type SearchIndex, type SearchRequest, type SearchShard } from '../src/search.js';
import { itemSearchRecords } from './item-search-records.js';
import { searchBatchSize, type SearchWorkerRequest, type SearchWorkerResponse } from './search-protocol.js';

// One dedicated worker keeps data preparation, normalization, scanning and
// sorting off the UI thread. Reader searches use only the item already loaded;
// they do not wait for the full-library index and its 27+ shards.
const worker = globalThis as unknown as {
  postMessage(message: SearchWorkerResponse): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<SearchWorkerRequest>) => void): void;
};

let globalEngine: IncrementalSearch | undefined;
const itemEngines = new Map<string, IncrementalSearch>();
const itemFailures = new Map<string, string>();
let active: SearchRequest | undefined;
let started = false;
let globalFailure: string | undefined;
let scheduled = false;
let batchSize = 450;

function currentEngine(): IncrementalSearch | undefined {
  return active?.item ? itemEngines.get(active.item) : globalEngine;
}
function sendSnapshot(): void {
  const engine = currentEngine();
  if (!engine || !active) return;
  worker.postMessage({ type: 'snapshot', snapshot: engine.advance(batchSize) });
}
function schedule(force = false): void {
  const engine = currentEngine();
  if (!engine || !active || scheduled || (!force && !engine.hasUnscannedRecords())) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    if (!active || !currentEngine()) return;
    sendSnapshot();
    if (currentEngine()?.hasUnscannedRecords()) schedule();
  }, 0);
}
function beginActive(): void {
  if (!active) return;
  const error = active.item ? itemFailures.get(active.item) : globalFailure;
  if (error) { worker.postMessage({ type: 'error', id: active.id, message: error }); return; }
  const engine = currentEngine();
  if (!engine) return;
  worker.postMessage({ type: 'snapshot', snapshot: engine.begin(active) });
  schedule();
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
    if (index.version !== 4 || index.normalization !== 'nfkd-search-v2' ||
        !Array.isArray(index.records) || !Array.isArray(index.shards)) {
      throw new Error('Unsupported search index.');
    }
    if (index.shards.some(path => !/^search\/\d{3,}\.json$/.test(path))) {
      throw new Error('Invalid search shard path.');
    }
    const engine = new IncrementalSearch(index.records, 32, index.shards.length > 0);
    globalEngine = engine;
    if (active && !active.item) beginActive();

    // Bounded concurrency warms the global cache without tying up the UI.
    let next = 0;
    async function loadShards(): Promise<void> {
      while (next < index.shards.length) {
        const shardPath = index.shards[next++]!;
        const shard = await json<SearchShard>(new URL(shardPath, indexAddress));
        if (shard.version !== 4 || !Array.isArray(shard.records)) throw new Error('Invalid search shard.');
        engine.appendRecords(shard.records);
        if (active && !active.item) schedule();
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, index.shards.length) }, () => loadShards()));
    engine.finishLoading();
    if (active && !active.item) schedule(true);
  } catch (error: unknown) {
    globalFailure = String(error);
    if (active && !active.item) worker.postMessage({ type: 'error', id: active.id, message: globalFailure });
  }
}

worker.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'init') {
    if (!started) { started = true; void load(message.indexUrl); }
  } else if (message.type === 'prepare-item') {
    const { item } = message;
    if (!itemEngines.has(item.id)) {
      try {
        itemEngines.set(item.id, new IncrementalSearch(itemSearchRecords(item), 16));
        itemFailures.delete(item.id);
        // Bound memory while keeping the last two readers convenient to revisit.
        while (itemEngines.size > 2) itemEngines.delete(itemEngines.keys().next().value!);
      } catch (error: unknown) { itemFailures.set(item.id, String(error)); }
    }
    if (active?.item === item.id) beginActive();
  } else if (message.type === 'cancel') {
    active = undefined; // Keep warm engines for later.
  } else {
    active = message.request;
    batchSize = searchBatchSize(active.query);
    beginActive();
  }
});
