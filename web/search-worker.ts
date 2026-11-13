import { IncrementalSearch, type SearchIndex, type SearchRequest, type SearchShard, type SearchSnapshot } from '../src/search.js';
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
let firstBatchSize = 450;
let lastSnapshotAt = 0;
let sentHits = false;

// A posted message yields to the worker's event loop without the browser's
// increasing nested-timer delay. Incoming edits and cancellations can still be
// handled between bounded batches. Older engines retain the timer fallback.
let batchYield: MessageChannel | undefined;
try { if (typeof MessageChannel !== 'undefined') batchYield = new MessageChannel(); } catch { /* use timers */ }
if (batchYield) batchYield.port1.onmessage = runScheduled;

function currentEngine(): IncrementalSearch | undefined {
  return active?.item ? itemEngines.get(active.item) : globalEngine;
}
function publish(snapshot: SearchSnapshot, force = false): void {
  const engine = currentEngine();
  if (!engine || !active) return;
  const hasHits = (active.item ? snapshot.text.length : snapshot.results.length) > 0;
  const now = performance.now();
  // Fast message-channel batches can otherwise flood the UI with dozens of
  // serialized pages before the next keystroke. Always show the first current
  // hit and final answer; also publish when the available shards are drained,
  // so a slow network never hides progress while waiting for the next shard.
  if (force || snapshot.complete || (hasHits && !sentHits) || !engine.hasUnscannedRecords() || now - lastSnapshotAt >= 16) {
    worker.postMessage({ type: 'snapshot', snapshot });
    lastSnapshotAt = now;
    if (hasHits) sentHits = true;
  }
}
function sendSnapshot(): void {
  const engine = currentEngine();
  if (!engine || !active) return;
  // Cold multiword readers use the ordinary smaller batch until the first
  // hits are visible, then the larger reader batch avoids extra page merges.
  publish(engine.advance(sentHits ? batchSize : firstBatchSize));
}
function runScheduled(): void {
  scheduled = false;
  if (!active || !currentEngine()) return;
  sendSnapshot();
  if (currentEngine()?.hasUnscannedRecords()) schedule();
}
function schedule(force = false): void {
  const engine = currentEngine();
  if (!engine || !active || scheduled || (!force && !engine.hasUnscannedRecords())) return;
  scheduled = true;
  if (batchYield) batchYield.port2.postMessage(0); else setTimeout(runScheduled, 0);
}
function beginActive(): void {
  if (!active) return;
  const error = active.item ? itemFailures.get(active.item) : globalFailure;
  if (error) { worker.postMessage({ type: 'error', id: active.id, message: error }); return; }
  const engine = currentEngine();
  if (!engine) return;
  lastSnapshotAt = 0; sentHits = false;
  publish(engine.begin(active), true);
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
    // A reader is restricted to its already-loaded item. After its first hits,
    // the same bounded batch used for single terms avoids an extra page merge;
    // full-library multiword scans and cold first-hit batches stay at 450.
    firstBatchSize = searchBatchSize(active.query);
    batchSize = active.item ? 600 : firstBatchSize;
    beginActive();
  }
});
