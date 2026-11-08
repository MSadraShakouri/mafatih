import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import type { SearchSnapshot } from '../src/search.js';
import { SearchClient } from '../web/search-client.js';

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly sent: Array<{ type: string; request?: { id: number; query: string } }> = [];
  private readonly listeners = new Map<string, Array<(event: { data: unknown }) => void>>();
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(message: { type: string; request?: { id: number; query: string } }): void { this.sent.push(message); }
  addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
    const listeners = this.listeners.get(type) ?? []; listeners.push(listener); this.listeners.set(type, listeners);
  }
  emit(type: string, data: unknown): void { for (const listener of this.listeners.get(type) ?? []) listener({ data }); }
  terminate(): void { this.terminated = true; }
}
function install(t: import('node:test').TestContext): void {
  FakeWorker.instances = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value: FakeWorker });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'Worker', original); else Reflect.deleteProperty(globalThis, 'Worker'); });
}
function snapshot(id: number): SearchSnapshot {
  return { id, complete: true, results: [], resultsTotal: 0, toc: [], text: [], tocTotal: 0, textTotal: 0 };
}
const request = (query: string) => ({ query, languages: ['ar' as const, 'fa' as const], tocLimit: 0, textLimit: 0, resultLimit: 30 });

test('rapid inputs coalesce to the latest query and stale worker snapshots are ignored', async t => {
  install(t);
  const client = new SearchClient(new URL('https://example.test/'));
  const received: number[] = [];
  for (const query of ['ا', 'ال', 'اله']) client.search(request(query), value => received.push(value.id), () => assert.fail('unexpected error'));
  const worker = FakeWorker.instances[0]!;
  assert.deepEqual(worker.sent.map(message => message.type), ['init']);
  await delay(80);
  assert.deepEqual(worker.sent.map(message => message.type), ['init', 'search']);
  assert.equal(worker.sent[1]!.request?.query, 'اله');
  worker.emit('message', { type: 'snapshot', snapshot: snapshot(1) });
  worker.emit('message', { type: 'snapshot', snapshot: snapshot(3) });
  assert.deepEqual(received, [3]);
  client.cancel();
});

test('cancel before the coalesced send prevents a delayed search from restarting', async t => {
  install(t);
  const client = new SearchClient(new URL('https://example.test/'));
  client.search(request('الله'), () => assert.fail('unexpected result'), () => assert.fail('unexpected error'));
  const worker = FakeWorker.instances[0]!;
  client.cancel();
  await delay(80);
  assert.deepEqual(worker.sent.map(message => message.type), ['init', 'cancel']);
});

test('worker failure clears a pending query and a later retry starts a fresh worker', async t => {
  install(t);
  const client = new SearchClient(new URL('https://example.test/'));
  let errors = 0;
  client.search(request('الله'), () => assert.fail('unexpected result'), () => { errors += 1; });
  const first = FakeWorker.instances[0]!;
  first.emit('error', {});
  await delay(80);
  assert.equal(errors, 1);
  assert.equal(first.terminated, true);
  assert.deepEqual(first.sent.map(message => message.type), ['init']);
  client.search(request('الله'), () => {}, () => assert.fail('retry error'));
  await delay(80);
  const second = FakeWorker.instances[1]!;
  assert.deepEqual(second.sent.map(message => message.type), ['init', 'search']);
  client.cancel();
});

test('worker batches are smaller for multiple sequence positions, including repeated terms', async () => {
  const { searchBatchSize } = await import('../web/search-protocol.js');
  assert.equal(searchBatchSize('اهل‌بیت'), 600);
  assert.equal(searchBatchSize('اهل بیت'), 450);
  assert.equal(searchBatchSize('الله الله'), 450);
  assert.equal(searchBatchSize('   '), 450);
});

test('reader preparation starts only the item engine, not the full library index', async t => {
  install(t);
  const client = new SearchClient(new URL('https://example.test/'));
  const item = { id: 'dua-kumayl', title: { ar: '', fa: '', en: '' }, rows: [{ id: 'r1', ar: 'يا رب', fa: '' }] };
  client.prepareItem(item);
  const worker = FakeWorker.instances[0]!;
  assert.deepEqual(worker.sent.map(message => message.type), ['prepare-item']);
  client.search({ ...request('رب'), item: item.id }, () => {}, () => assert.fail('unexpected error'));
  await delay(80);
  assert.deepEqual(worker.sent.map(message => message.type), ['prepare-item', 'search']);
  client.prepareGlobal(); client.prepareGlobal();
  assert.deepEqual(worker.sent.map(message => message.type), ['prepare-item', 'search', 'init']);
  client.cancel();
});

test('a failed reader worker is rebuilt with the same prepared item on retry', async t => {
  install(t);
  const client = new SearchClient(new URL('https://example.test/'));
  const item = { id: 'dua-kumayl', title: { ar: '', fa: '', en: '' }, rows: [] };
  client.prepareItem(item);
  let failures = 0;
  client.search({ ...request('رب'), item: item.id }, () => {}, () => { failures++; });
  FakeWorker.instances[0]!.emit('error', {});
  assert.equal(failures, 1);
  client.search({ ...request('رب'), item: item.id }, () => {}, () => assert.fail('unexpected retry error'));
  await delay(80);
  assert.deepEqual(FakeWorker.instances[1]!.sent.map(message => message.type), ['prepare-item', 'search']);
  client.cancel();
});
