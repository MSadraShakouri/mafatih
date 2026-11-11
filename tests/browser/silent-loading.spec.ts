import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

/** Hold search requests while allowing their genuine worker and snapshots to run later. */
async function holdSearches(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = Worker.prototype as any;
    const post = proto.postMessage;
    const add = proto.addEventListener;
    const control: any = {
      hold: false, pending: [], lastComplete: undefined,
      release() {
        this.hold = false;
        for (const entry of this.pending.splice(0)) Reflect.apply(post, entry.worker, [entry.message]);
      },
      failLatest() {
        const entry = this.pending.pop(); this.hold = false;
        entry.worker.dispatchEvent(new MessageEvent('message', {
          data: { type: 'error', id: entry.message.request.id, message: 'test failure' },
        }));
      },
    };
    (window as any).__silentSearch = control;
    proto.addEventListener = function(type: string, listener: any, options: any) {
      if (type === 'message' && typeof listener === 'function') {
        const wrapped = (event: MessageEvent) => {
          if (event.data?.type === 'snapshot' && event.data.snapshot.complete) control.lastComplete = event.data.snapshot;
          listener.call(this, event);
        };
        return Reflect.apply(add, this, [type, wrapped, options]);
      }
      return Reflect.apply(add, this, [type, listener, options]);
    };
    proto.postMessage = function(message: any, ...rest: any[]) {
      if (message?.type === 'search' && control.hold) {
        control.pending.push({ worker: this, message });
        // A real search can first deliver an incomplete empty snapshot.
        const snapshot = { id: message.request.id, complete: false, results: [], resultsTotal: 0,
          text: [], textTotal: 0, toc: [], tocTotal: 0 };
        this.dispatchEvent(new MessageEvent('message', { data: { type: 'snapshot', snapshot } }));
        return;
      }
      return Reflect.apply(post, this, [message, ...rest]);
    };
  });
}

for (const scope of ['global', 'reader'] as const) {
  test(`${scope}: initial and replacement searches wait silently without a false empty result`, async ({ page }) => {
    await holdSearches(page);
    await page.goto(scope === 'global' ? './' : './#/item/dua-kumayl');
    if (scope === 'reader') await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    const input = page.getByRole('searchbox', { name: scope === 'global' ? 'جست‌وجو در فهرست و متن' : 'جست‌وجو در این متن' });
    const panel = page.locator(scope === 'global' ? '.search-results' : '.result-popover');
    const empty = page.locator(scope === 'global' ? '.search-empty:visible' : '.result-empty:visible');
    const status = page.locator(scope === 'global' ? '.search-results-count' : '[data-reader-search-status]');
    const rows = page.locator(scope === 'global' ? '.search-result' : '.result-row');

    await page.evaluate(() => { (window as any).__silentSearch.hold = true; });
    await input.fill('الفبایناموجودچندواژه');
    await expect.poll(() => page.evaluate(() => (window as any).__silentSearch.pending.length)).toBe(1);
    await expect(panel).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(220); // Allow the empty partial to reach the UI.
    await expect(page.locator('body')).not.toContainText('در حال جست‌وجو', { timeout: 1000 });
    await expect(empty).toHaveCount(0);
    await expect(panel).not.toContainText(/(?:۰|0)\s*نتیجه|نتیجه‌ای پیدا نشد/);
    await expect(status).not.toContainText(/(?:۰|0)\s*نتیجه|نتیجه‌ای پیدا نشد/);

    await page.evaluate(() => (window as any).__silentSearch.release());
    await expect(panel).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
    await expect(empty).toContainText('نتیجه‌ای پیدا نشد');

    // A previous finished no-hit announcement must not persist into the new search.
    await page.evaluate(() => { (window as any).__silentSearch.hold = true; });
    await input.fill('الهم');
    await expect.poll(() => page.evaluate(() => (window as any).__silentSearch.pending.length)).toBe(1);
    await expect(panel).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(220);
    await expect(page.locator('body')).not.toContainText('در حال جست‌وجو', { timeout: 1000 });
    await expect(empty).toHaveCount(0);
    await expect(status).not.toContainText('نتیجه‌ای پیدا نشد');
    const head = page.locator(scope === 'global' ? '.search-results-count' : '.result-head');
    await expect(head).not.toContainText(/(?:۰|0)\s*نتیجه/);

    await page.evaluate(() => (window as any).__silentSearch.release());
    await expect(panel).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
    await expect(rows.first()).toBeVisible();
  });

  test(`${scope}: a genuine search failure still offers a working retry`, async ({ page }) => {
    await holdSearches(page);
    await page.goto(scope === 'global' ? './' : './#/item/dua-kumayl');
    if (scope === 'reader') await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    const input = page.getByRole('searchbox', { name: scope === 'global' ? 'جست‌وجو در فهرست و متن' : 'جست‌وجو در این متن' });
    const panel = page.locator(scope === 'global' ? '.search-results' : '.result-popover');
    const error = page.locator(scope === 'global' ? '.search-empty:visible' : '.search-error-popover:visible');
    const rows = page.locator(scope === 'global' ? '.search-result' : '.result-row');
    await page.evaluate(() => { (window as any).__silentSearch.hold = true; });
    await input.fill('الهم');
    await expect.poll(() => page.evaluate(() => (window as any).__silentSearch.pending.length)).toBe(1);
    await page.evaluate(() => (window as any).__silentSearch.failLatest());
    await expect(error).toContainText('بارگذاری جست‌وجو ناموفق بود.');
    await expect(panel).toHaveAttribute('aria-busy', 'false');
    await page.getByRole('button', { name: 'تلاش دوباره' }).click();
    await expect(panel).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
  });
}

test('global search remains silent while its worker is finished but the catalog is pending', async ({ page, context }) => {
  await holdSearches(page);
  let release!: () => void, requests = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/data/catalog.json', async route => {
    requests++; await gate; await route.continue().catch(() => {});
  });
  try {
    await page.goto('./');
    await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('الهم');
    await expect.poll(() => requests).toBe(1);
    await expect.poll(() => page.evaluate(() => Boolean((window as any).__silentSearch.lastComplete)), { timeout: 40_000 }).toBe(true);
    const panel = page.locator('.search-results');
    await expect(panel).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('body')).not.toContainText('در حال جست‌وجو', { timeout: 1000 });
    await expect(page.locator('.search-empty:visible')).toHaveCount(0);
    await expect(page.locator('.search-results-count')).not.toContainText(/(?:۰|0)\s*نتیجه/);
    release();
    await expect(panel).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
    await expect(page.locator('.search-result').first()).toBeVisible();
  } finally { release(); }
});
