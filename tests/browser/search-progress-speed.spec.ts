import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

// Control worker snapshots and page timers independently. This tests the real
// UI queue without making a fragile wall-clock performance assertion.
async function installWorker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class ControlledWorker {
      private listeners: Array<(event: { data: unknown }) => void> = [];
      private request?: { id: number; query: string };
      private requests: Array<{ id: number; query: string }> = [];
      constructor() { (window as any).__controlledSearchWorker = this; }
      addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
        if (type === 'message') this.listeners.push(listener);
      }
      postMessage(message: { type: string; request?: { id: number; query: string } }): void {
        if (message.type === 'search' && message.request) { this.request = message.request; this.requests.push(message.request); }
      }
      terminate(): void {}
      hasRequest(): boolean { return Boolean(this.request); }
      sentRequests(): Array<{ id: number; query: string }> { return this.requests; }
      emit(complete: boolean, count = 0): void {
        if (!this.request) throw new Error('Expected a search request');
        const hits = Array.from({ length: count }, (_, index) => ({
          record: { key: `row:dua-kumayl:r0001${index + 2}:ar`, section: 'text', item: 'dua-kumayl',
            row: `r0001${index + 2}`, language: 'ar', text: 'رحمت', normalized: 'رحمت', featured: false, order: index },
          matchedWords: ['رحمت'], directMatches: 1,
          relevance: { score: 6, matchedSequenceWords: 1, exactSequenceWords: 1 },
        }));
        const snapshot = { id: this.request.id, complete, results: hits, resultsTotal: count,
          toc: [], tocTotal: 0, text: hits, textTotal: count };
        for (const listener of this.listeners) listener({ data: { type: 'snapshot', snapshot } });
      }
    }
    (window as any).Worker = ControlledWorker;
  });
}

async function deliverCompletion(page: Page): Promise<void> {
  await page.clock.runFor(35); // let the rapid-input coalescer dispatch
  expect(await page.evaluate(() => (window as any).__controlledSearchWorker?.hasRequest())).toBe(true);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false));
  await page.clock.runFor(20); // a partial update is waiting on its 80ms throttle
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true));
  await page.clock.runFor(1); // a final answer should not wait for the partial timer
}

for (const item of [false, true]) test(`${item ? 'in-text' : 'global'} search coalesces a quick edit but dispatches within 21ms`, async ({ page }) => {
  await installWorker(page);
  if (item) {
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  } else await page.goto('./');
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  const input = page.getByRole('searchbox', { name: item ? 'جست‌وجو در این متن' : 'جست‌وجو در فهرست و متن' });
  await input.fill('رحم');
  await page.clock.runFor(10);
  await input.fill('رحمت');
  await page.clock.runFor(11);
  const requests = await page.evaluate(() => (window as any).__controlledSearchWorker.sentRequests());
  expect(requests).toHaveLength(1);
  expect(requests[0].query).toBe('رحمت');
  await page.clock.runFor(20);
  expect(await page.evaluate(() => (window as any).__controlledSearchWorker.sentRequests())).toHaveLength(1);
});

for (const item of [false, true]) test(`${item ? 'in-text' : 'global'} search still coalesces sustained rapid typing`, async ({ page }) => {
  await installWorker(page);
  if (item) {
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  } else await page.goto('./');
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  const input = page.getByRole('searchbox', { name: item ? 'جست‌وجو در این متن' : 'جست‌وجو در فهرست و متن' });
  const edits = ['ر', 'رح', 'رحم', 'رحمت', 'رحمتا', 'رحمتال'];
  for (const [index, query] of edits.entries()) {
    await input.fill(query);
    if (index < edits.length - 1) await page.clock.runFor(25);
  }
  await page.clock.runFor(35);
  const requests = await page.evaluate(() => (window as any).__controlledSearchWorker.sentRequests());
  expect(requests.length).toBeLessThanOrEqual(3);
  expect(requests[0].query).toBe('رح'); // a broad one-character scan is avoided when typing continues
  expect(requests.at(-1).query).toBe(edits.at(-1));
});

test('global search renders a completed snapshot without the partial-update delay', async ({ page }) => {
  await installWorker(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  const catalog = page.waitForResponse(response => response.url().endsWith('/data/catalog.json') && response.ok());
  await input.focus(); await catalog;
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  await input.fill('رحمت');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'true');
  await deliverCompletion(page);
  expect(await page.locator('.search-results').getAttribute('aria-busy')).toBe('false');
  expect(await page.locator('.search-results-count').textContent()).toContain('۰ نتیجه');
});

test('in-text search renders a completed snapshot without the partial-update delay', async ({ page }) => {
  await installWorker(page); await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('رحمت');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'true');
  await deliverCompletion(page);
  expect(await page.locator('.result-popover').getAttribute('aria-busy')).toBe('false');
  expect(await page.locator('.result-head').textContent()).toContain('۰ نتیجه');
});

test('editing an already-pending reader search retains its rows without measuring their layout', async ({ page }) => {
  await installWorker(page); await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('رحم'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 20));
  await page.clock.runFor(1);
  const rows = page.locator('.result-row');
  await expect(rows).toHaveCount(20);
  const before = await page.locator('.result-popover').evaluate(node => {
    node.scrollTop = 240;
    const top = node.getBoundingClientRect().top;
    const visible = [...node.querySelectorAll<HTMLElement>('.result-row')].find(row => row.getBoundingClientRect().bottom > top)!;
    return { key: visible.dataset.resultKey, top: visible.getBoundingClientRect().top, scroll: node.scrollTop };
  });
  expect(before.scroll).toBeGreaterThan(0);
  await page.evaluate(() => {
    const original = Element.prototype.getBoundingClientRect;
    (window as any).__restoreRowRects = () => { Element.prototype.getBoundingClientRect = original; };
    (window as any).__rowRects = 0;
    Element.prototype.getBoundingClientRect = function() {
      if (this.classList.contains('result-row')) (window as any).__rowRects++;
      return original.call(this);
    };
  });
  await input.fill('رحمت');
  const measured = await page.evaluate(() => {
    (window as any).__restoreRowRects(); return (window as any).__rowRects;
  });
  expect(measured).toBe(0);
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toHaveAttribute('data-previous', 'true');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'true');
  const after = await page.locator('.result-popover').evaluate((node, key) => {
    const visible = [...node.querySelectorAll<HTMLElement>('.result-row')].find(row => row.dataset.resultKey === key)!;
    return { top: visible.getBoundingClientRect().top, scroll: node.scrollTop };
  }, before.key);
  expect(after.scroll).toBe(before.scroll);
  expect(Math.abs(after.top - before.top)).toBeLessThan(1);
});

test('global search paints the first partial hits promptly without building a whole page at once', async ({ page }) => {
  await installWorker(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  const catalog = page.waitForResponse(response => response.url().endsWith('/data/catalog.json') && response.ok());
  await input.focus(); await catalog;
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  await input.fill('رحمت'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 20));
  const rows = page.locator('.search-result'), current = page.locator('.search-result[data-previous="false"]');
  await expect(current).toHaveCount(10); // first hits are available without waiting
  await expect(current.first().locator('mark')).toHaveText('رحمت');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'true');
  await current.first().locator('button').focus();
  await page.clock.runFor(85);
  await expect(current).toHaveCount(10); // no moving a focused target
  await input.focus(); await page.clock.runFor(1);
  await expect(current).toHaveCount(20);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true, 20));
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false');

  await input.fill('رحمه'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 20));
  await expect(current).toHaveCount(10);
  await input.fill('رحمت'); // discard the pending expansion from the old query
  await page.clock.runFor(90);
  await expect(rows).toHaveCount(20);
  await expect(current).toHaveCount(0);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true, 2));
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false');
  await expect(rows).toHaveCount(2);
});

test('global result wrap measurements batch layout reads before writing row flags', async ({ page }) => {
  await installWorker(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  const catalog = page.waitForResponse(response => response.url().endsWith('/data/catalog.json') && response.ok());
  await input.focus(); await catalog;
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  await input.fill('رحمت'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true, 20));
  await expect(page.locator('.search-result')).toHaveCount(20);
  await page.evaluate(() => {
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;
    const rect = Element.prototype.getBoundingClientRect;
    (window as any).__interleavedLayout = 0;
    (window as any).__restoreMeasurementHooks = () => {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
      Element.prototype.getBoundingClientRect = rect;
    };
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() {
      if (this.classList.contains('search-result-body')) {
        if (document.querySelector('.search-result[data-index-wrap="true"]')) (window as any).__interleavedLayout++;
        return 100;
      }
      return width.get!.call(this);
    } });
    Element.prototype.getBoundingClientRect = function() {
      if (this.classList.contains('search-result-body')) return DOMRect.fromRect({ x: 0, width: 100, height: 20 });
      if (this.tagName === 'MARK' && this.closest('.search-result-body')) return DOMRect.fromRect({ x: -20, width: 10, height: 20 });
      return rect.call(this);
    };
  });
  await page.clock.runFor(20);
  const measured = await page.evaluate(() => {
    (window as any).__restoreMeasurementHooks();
    return { interleaved: (window as any).__interleavedLayout,
      wrapped: document.querySelectorAll('.search-result[data-index-wrap="true"]').length };
  });
  expect(measured.wrapped).toBe(20); // all offscreen matches are still made visible
  expect(measured.interleaved).toBe(0);
});

test('editing an already-pending global search preserves retained rows without measuring them', async ({ page }) => {
  await installWorker(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  const catalog = page.waitForResponse(response => response.url().endsWith('/data/catalog.json') && response.ok());
  await input.focus(); await catalog;
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  await input.fill('رحم'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 20));
  await page.clock.runFor(85); // allow the remaining progressive page to appear
  const rows = page.locator('.search-result');
  await expect(rows).toHaveCount(20);
  await input.fill('رحمت'); // all retained rows are now marked previous
  const before = await page.evaluate(() => {
    window.scrollTo(0, 400);
    const visible = [...document.querySelectorAll<HTMLElement>('.search-result')]
      .find(row => row.getBoundingClientRect().bottom > 0 && row.getBoundingClientRect().top < innerHeight)!;
    const original = Element.prototype.getBoundingClientRect;
    (window as any).__restoreGlobalRects = () => { Element.prototype.getBoundingClientRect = original; };
    (window as any).__globalRowRects = 0;
    Element.prototype.getBoundingClientRect = function() {
      if (this.classList.contains('search-result')) (window as any).__globalRowRects++;
      return original.call(this);
    };
    return { key: visible.dataset.resultKey, top: original.call(visible).top, scroll: window.scrollY };
  });
  expect(before.scroll).toBeGreaterThan(0);
  await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>('.library-search input')!;
    field.value = 'رحمته'; field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const after = await page.evaluate(key => {
    (window as any).__restoreGlobalRects();
    const row = [...document.querySelectorAll<HTMLElement>('.search-result')].find(value => value.dataset.resultKey === key)!;
    return { count: (window as any).__globalRowRects, top: row.getBoundingClientRect().top, scroll: window.scrollY };
  }, before.key);
  expect(after.count).toBe(0);
  expect(after.scroll).toBe(before.scroll);
  expect(Math.abs(after.top - before.top)).toBeLessThan(1);
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toHaveAttribute('data-previous', 'true');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'true');

  // A later partial response can mix current and previous rows. On the next
  // edit their item groups must be reconciled, not treated as all unchanged.
  await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 1));
  await page.clock.runFor(1);
  await expect(rows.nth(1)).toHaveAttribute('data-group-start', 'true');
  await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>('.library-search input')!;
    field.value = 'رحمتها'; field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(rows.nth(1)).toHaveAttribute('data-group-start', 'false');
  await expect(rows.nth(1)).toHaveAttribute('data-previous', 'true');
});

for (const item of [false, true]) test(`${item ? 'in-text' : 'global'} unchanged hits do not rewrite row attributes on completion`, async ({ page }) => {
  await installWorker(page);
  if (item) {
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  } else await page.goto('./');
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  const input = page.getByRole('searchbox', { name: item ? 'جست‌وجو در این متن' : 'جست‌وجو در فهرست و متن' });
  await input.fill('رحمت'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 2));
  await page.clock.runFor(1);
  const list = page.locator(item ? '.result-list' : '.search-result-list');
  await expect(list.locator(item ? '.result-row' : '.search-result')).toHaveCount(2);
  await list.evaluate(node => {
    (window as any).__rowWrites = [];
    const observer = new MutationObserver(records => (window as any).__rowWrites.push(...records));
    observer.observe(node, { attributes: true, subtree: true, attributeFilter: ['data-render-key', 'data-previous'] });
  });
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true, 2));
  await page.clock.runFor(1);
  expect(await page.evaluate(() => (window as any).__rowWrites.length)).toBe(0);
});

for (const item of [false, true]) test(`${item ? 'in-text' : 'global'} search shows the first current hit promptly without moving a focused result`, async ({ page }) => {
  await installWorker(page);
  if (item) {
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  } else {
    await page.goto('./');
    const catalog = page.waitForResponse(response => response.url().endsWith('/data/catalog.json') && response.ok());
    await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).focus(); await catalog;
  }
  await page.clock.install({ time: new Date('2024-12-10T08:00:00Z') });
  await page.clock.pauseAt(new Date('2024-12-10T10:00:00Z'));
  const input = page.getByRole('searchbox', { name: item ? 'جست‌وجو در این متن' : 'جست‌وجو در فهرست و متن' });
  await input.fill('رحمت'); await page.clock.runFor(35);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false, 1));
  await page.clock.runFor(1);
  const rows = page.locator(item ? '.result-row' : '.search-result');
  const results = page.locator(item ? '.result-popover' : '.search-results');
  expect(await rows.count()).toBe(1);
  expect(await results.getAttribute('aria-busy')).toBe('true');
  await rows.first().locator('button').focus();
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true, 2));
  await page.clock.runFor(1);
  expect(await rows.count()).toBe(1);
  expect(await results.getAttribute('aria-busy')).toBe('true');
  await input.focus(); await page.clock.runFor(1);
  expect(await rows.count()).toBe(2);
  expect(await results.getAttribute('aria-busy')).toBe('false');
});
