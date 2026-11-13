import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

async function instrumentWorker(page: Page, disableChannel = false, freezeClock = false): Promise<void> {
  // Instrument the production worker without mocking its engine, data, query
  // messages or results. Counting timers avoids a fragile wall-clock bound.
  await page.route(/\/assets\/search-worker-[^/]+\.js$/, async route => {
    const response = await route.fetch();
    const source = await response.text();
    const counters = `
      ${disableChannel ? 'globalThis.MessageChannel = undefined;' : ''}
      ${freezeClock ? "Object.defineProperty(globalThis.performance, 'now', { value: () => 100 });" : ''}
      globalThis.__searchTimerCalls = 0;
      globalThis.__searchPartialSnapshots = 0;
      globalThis.__searchSnapshots = [];
      const __timer = globalThis.setTimeout.bind(globalThis);
      const __post = globalThis.postMessage.bind(globalThis);
      globalThis.setTimeout = (...args) => { globalThis.__searchTimerCalls++; return __timer(...args); };
      globalThis.postMessage = (message, ...args) => {
        if (message?.type === 'snapshot') {
          const snapshot = message.snapshot;
          globalThis.__searchSnapshots.push({ id: snapshot.id, complete: snapshot.complete,
            count: Math.max(snapshot.results.length, snapshot.text.length),
            total: Math.max(snapshot.resultsTotal, snapshot.textTotal) });
          if (!snapshot.complete) globalThis.__searchPartialSnapshots++;
        }
        return __post(message, ...args);
      };\n`;
    await route.fulfill({ response, body: counters + source });
  });
}

test('the real search worker yields between batches without repeatedly scheduling nested timers', async ({ page }) => {
  await instrumentWorker(page);
  const workerPromise = page.waitForEvent('worker');
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('ظظظظ'); // an unrelated full-library scan
  const results = page.locator('.search-results');
  await expect(results).toHaveAttribute('aria-busy', 'true');
  await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const worker = await workerPromise;
  const counts = await worker.evaluate(() => ({
    timers: (globalThis as any).__searchTimerCalls,
    partial: (globalThis as any).__searchPartialSnapshots,
  }));
  expect(counts.partial).toBeGreaterThan(1); // still progressive, not a blocking full scan
  expect(counts.timers).toBeLessThanOrEqual(1);

  // A rapid edit still resolves to the latest query and its correct source.
  await input.fill('ة');
  await input.fill('العقوبت');
  await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.search-result[data-item-id="dua-kumayl"][data-row-id="r00072"]')).toBeVisible();

  const superseded = await page.evaluate(async ({ url, indexUrl }) => new Promise<{
    sent: boolean; oldCompletedFirst: boolean; keys: string[];
  }>((resolve, reject) => {
    const worker = new Worker(url, { type: 'module' });
    const request = (id: number, query: string) => ({ type: 'search', request: {
      id, query, languages: ['ar'], tocLimit: 0, textLimit: 0, resultLimit: 50,
    } });
    let sent = false, newStarted = false, oldCompletedFirst = false;
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('superseded search did not complete')); }, 40_000);
    worker.addEventListener('error', event => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); });
    worker.addEventListener('message', event => {
      if (event.data?.type !== 'snapshot') return;
      const snapshot = event.data.snapshot;
      if (snapshot.id === 1 && snapshot.complete && !newStarted) oldCompletedFirst = true;
      if (snapshot.id === 1 && !snapshot.complete && snapshot.resultsTotal > 0 && !sent) {
        sent = true;
        worker.postMessage(request(2, 'العقوبت'));
      }
      if (snapshot.id === 2) {
        newStarted = true;
        if (snapshot.complete) {
          clearTimeout(timeout); worker.terminate();
          resolve({ sent, oldCompletedFirst, keys: snapshot.results.map((hit: { record: { key: string } }) => hit.record.key) });
        }
      }
    });
    worker.postMessage({ type: 'init', indexUrl });
    worker.postMessage(request(1, 'ة'));
  }), { url: worker.url(), indexUrl: new URL('data/search-index.json', page.url()).href });
  expect(superseded.sent).toBe(true);
  expect(superseded.oldCompletedFirst).toBe(false);
  expect(superseded.keys).toContain('row:dua-kumayl:r00072:ar');
});

test('the worker avoids flooding partial pages but still sends the first hit and completion', async ({ page }) => {
  // A frozen worker clock makes the coalescing test deterministic: no interval
  // can elapse, but scanning and event-loop yields are completely real.
  await instrumentWorker(page, false, true);
  const workerPromise = page.waitForEvent('worker');
  await page.goto('./#/item/dua-jawshan-kabir');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const worker = await workerPromise;
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('یا رحمت الله');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const snapshots = await worker.evaluate(() => (globalThis as any).__searchSnapshots as
    Array<{ id: number; complete: boolean; count: number }>);
  const id = snapshots.at(-1)!.id, current = snapshots.filter(snapshot => snapshot.id === id);
  const partial = current.filter(snapshot => !snapshot.complete);
  expect(partial.some(snapshot => snapshot.count > 0)).toBe(true);
  expect(partial.length).toBeLessThanOrEqual(2); // initial and first nonempty, even with more worker batches
  expect(current.at(-1)?.complete).toBe(true);
  await expect(page.locator('.result-popover .result-head span')).toContainText('۱۰۳۲');
});

test('the worker publishes drained shard progress even before the next slow shard arrives', async ({ page }) => {
  await instrumentWorker(page, false, true);
  const record = (id: string, order: number) => ({ key: `shard-${id}`, section: 'text', item: 'dua-kumayl',
    row: `r0001${order + 2}`, language: 'ar', text: 'نور', normalized: 'نور', featured: false, order });
  let releaseFirst!: () => void, releaseLast!: () => void;
  const first = new Promise<void>(resolve => { releaseFirst = resolve; });
  const last = new Promise<void>(resolve => { releaseLast = resolve; });
  await page.route('**/data/search-index.json', route => route.fulfill({ json: {
    version: 4, normalization: 'nfkd-search-v2', records: [record('initial', 0)],
    shards: ['search/000.json', 'search/001.json'],
  } }));
  await page.route('**/data/search/000.json', async route => { await first; await route.fulfill({ json: { version: 4, records: [record('first', 1)] } }); });
  await page.route('**/data/search/001.json', async route => { await last; await route.fulfill({ json: { version: 4, records: [record('last', 2)] } }); });
  const workerPromise = page.waitForEvent('worker');
  try {
    await page.goto('./');
    await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('نور');
    const worker = await workerPromise;
    const hasPartialTotal = (total: number) => worker.evaluate((value: number) =>
      (globalThis as any).__searchSnapshots.some((snapshot: { total: number; complete: boolean }) =>
        snapshot.total === value && !snapshot.complete), total);
    await expect.poll(() => hasPartialTotal(1), { timeout: 40_000 }).toBe(true);
    releaseFirst();
    await expect.poll(() => hasPartialTotal(2), { timeout: 40_000 }).toBe(true);
    await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'true');
    releaseLast();
    await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
    await expect(page.locator('.search-results-count')).toContainText('۳ نتیجه');
  } finally { releaseFirst(); releaseLast(); }
});

test('a cold reader multiword search publishes its first hits without waiting for a large batch', async ({ page }) => {
  await instrumentWorker(page);
  const workerPromise = page.waitForEvent('worker');
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const source = await workerPromise;
  const snapshots = await page.evaluate(async url => new Promise<Array<{ complete: boolean; total: number }>>((resolve, reject) => {
    const worker = new Worker(url, { type: 'module' });
    const seen: Array<{ complete: boolean; total: number }> = [];
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('cold reader search did not complete')); }, 40_000);
    worker.addEventListener('error', event => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); });
    worker.addEventListener('message', event => {
      if (event.data?.type !== 'snapshot') return;
      const snapshot = event.data.snapshot;
      seen.push({ complete: snapshot.complete, total: snapshot.textTotal });
      if (snapshot.complete) { clearTimeout(timeout); worker.terminate(); resolve(seen); }
    });
    const rows = Array.from({ length: 1200 }, (_, index) => ({ id: `r${index}`, ar: 'یا نور', fa: '' }));
    worker.postMessage({ type: 'prepare-item', item: { id: 'synthetic-cold', featured: false, rows } });
    worker.postMessage({ type: 'search', request: { id: 1, item: 'synthetic-cold', query: 'یا نور',
      languages: ['ar'], resultLimit: 0, tocLimit: 0, textLimit: 50 } });
  }), source.url());
  expect(snapshots.find(snapshot => !snapshot.complete && snapshot.total > 0)?.total).toBe(450);
  expect(snapshots.at(-1)).toEqual({ complete: true, total: 1200 });
});

test('reader multiword ranking finishes in bounded batches without an extra full-page merge', async ({ page }) => {
  await instrumentWorker(page);
  const workerPromise = page.waitForEvent('worker');
  await page.goto('./#/item/dua-jawshan-kabir');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const worker = await workerPromise;
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  const results = page.locator('.result-popover');
  // The completed scans are deliberately shared with the final OR query.
  for (const query of ['یا', 'رحمت', 'الله']) {
    await input.fill(query);
    await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  }
  const before = await worker.evaluate(() => (globalThis as any).__searchPartialSnapshots as number);
  await input.fill('یا رحمت الله');
  await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(results.locator('.result-head span')).toContainText('۱۰۳۲');
  const after = await worker.evaluate(() => (globalThis as any).__searchPartialSnapshots as number);
  const partial = after - before;
  expect(partial).toBeGreaterThan(0); // a real event-loop yield remains
  expect(partial).toBeLessThanOrEqual(2); // no fourth full ranking/merge pass
});

test('the worker falls back to bounded timer batches when MessageChannel is unavailable', async ({ page }) => {
  await instrumentWorker(page, true);
  const workerPromise = page.waitForEvent('worker');
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('العقوبت');
  const results = page.locator('.search-results');
  await expect(results).toHaveAttribute('aria-busy', 'true');
  await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.search-result[data-item-id="dua-kumayl"][data-row-id="r00072"]')).toBeVisible();
  const worker = await workerPromise;
  const counts = await worker.evaluate(() => ({
    timers: (globalThis as any).__searchTimerCalls,
    partial: (globalThis as any).__searchPartialSnapshots,
  }));
  expect(counts.partial).toBeGreaterThan(1);
  expect(counts.timers).toBeGreaterThan(1);
});
