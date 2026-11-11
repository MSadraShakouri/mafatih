import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

// Control worker snapshots and page timers independently. This tests the real
// UI queue without making a fragile wall-clock performance assertion.
async function installWorker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class ControlledWorker {
      private listeners: Array<(event: { data: unknown }) => void> = [];
      private request?: { id: number };
      constructor() { (window as any).__controlledSearchWorker = this; }
      addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
        if (type === 'message') this.listeners.push(listener);
      }
      postMessage(message: { type: string; request?: { id: number } }): void {
        if (message.type === 'search') this.request = message.request;
      }
      terminate(): void {}
      hasRequest(): boolean { return Boolean(this.request); }
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
  await page.clock.runFor(35); // the normal 30ms rapid-input coalescer
  expect(await page.evaluate(() => (window as any).__controlledSearchWorker?.hasRequest())).toBe(true);
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(false));
  await page.clock.runFor(20); // a partial update is waiting on its 80ms throttle
  await page.evaluate(() => (window as any).__controlledSearchWorker.emit(true));
  await page.clock.runFor(1); // a final answer should not wait for the partial timer
}

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
