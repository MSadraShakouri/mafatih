import { expect, test } from '@playwright/test';

/** Delay real search messages and inject an empty partial response for that same request. */
async function instrument(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    const control: { hold: boolean; sent: number; pending: Array<{ worker: Worker; message: any }>; release: () => void } = {
      hold: false, sent: 0, pending: [],
      release() {
        const pending = this.pending.splice(0);
        this.hold = false;
        for (const entry of pending) Reflect.apply(original, entry.worker, [entry.message]);
      },
    };
    (window as any).__searchControl = control;
    Worker.prototype.postMessage = function(this: Worker, message: any) {
      if (message?.type === 'search') {
        control.sent += 1;
        if (control.hold) {
          control.pending.push({ worker: this, message });
          this.dispatchEvent(new MessageEvent('message', { data: { type: 'snapshot', snapshot: {
            id: message.request.id, complete: false, results: [], resultsTotal: 0, toc: [], text: [], tocTotal: 0, textTotal: 0,
          } } }));
          return;
        }
      }
      Reflect.apply(original, this, arguments);
    } as typeof Worker.prototype.postMessage;
  });
}
async function open(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  return page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
}
async function complete(page: import('@playwright/test').Page) {
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 20000 });
}

test('previous hits stay visible through an empty partial response until new hits arrive', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('کمیل');
  await complete(page);
  const results = page.locator('[data-search-results]');
  const previous = page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]');
  await expect(previous).toBeVisible();
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('الهی عظم البلا');
  await expect(results).toHaveAttribute('data-search-previous', 'true');
  await expect(results).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('status')).toContainText('نتایج پیشین');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await page.waitForTimeout(200); // The injected empty partial has passed the UI's flush interval.
  await expect(previous).toBeVisible();
  await page.evaluate(() => (window as any).__searchControl.release());
  await complete(page);
  await expect(results).not.toHaveAttribute('data-search-previous', 'true');
  await expect(results).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('[data-search-kind="text"][data-item-id="dua-frj-zman-ajl"][data-row-id="r00003"]')).toBeVisible();
});

test('a completed empty search replaces the previous hits rather than leaving them indefinitely', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('کمیل');
  await complete(page);
  const previous = page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]');
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('اینواژهوابستگیبههیچمتنیندارد');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await expect(previous).toBeVisible();
  await page.evaluate(() => (window as any).__searchControl.release());
  await complete(page);
  await expect(previous).toHaveCount(0);
  await expect(page.locator('[data-search-results]')).toContainText('هنوز نتیجه‌ای نیست.');
  await expect(page.locator('[data-search-results]')).toHaveAttribute('aria-busy', 'false');
});

test('a trailing space or removed mark with identical normalized terms sends no new search', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('کمیل');
  await complete(page);
  const previous = page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]');
  const count = await page.evaluate(() => (window as any).__searchControl.sent);
  await input.fill('کمیل ');
  await page.waitForTimeout(150);
  await expect(previous).toBeVisible();
  expect(await page.evaluate(() => (window as any).__searchControl.sent)).toBe(count);
  await input.fill('کِمیل');
  await page.waitForTimeout(150);
  await expect(previous).toBeVisible();
  expect(await page.evaluate(() => (window as any).__searchControl.sent)).toBe(count);
  // A real space creating a second term is not a no-op.
  await input.fill('کمیل دعا');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.sent)).toBeGreaterThan(count);
});

test('rapid replacement keeps the old page while stale intermediate snapshots are discarded', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('کمیل');
  await complete(page);
  const previous = page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]');
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('یا رب');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await input.fill('الهی عظم البلا');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(2);
  await expect(previous).toBeVisible();
  // Even a completed response for the superseded middle query must be ignored.
  await page.evaluate(() => {
    const { worker, message } = (window as any).__searchControl.pending[0];
    worker.dispatchEvent(new MessageEvent('message', { data: { type: 'snapshot', snapshot: {
      id: message.request.id, complete: true, results: [], resultsTotal: 0, toc: [], text: [], tocTotal: 0, textTotal: 0,
    } } }));
  });
  await page.waitForTimeout(150);
  await expect(previous).toBeVisible();
  await page.evaluate(() => (window as any).__searchControl.release());
  await complete(page);
  const first = page.locator('[data-search-section="results"] li').first();
  await expect(first).toHaveAttribute('data-item-id', 'dua-frj-zman-ajl');
  await expect(first).toHaveAttribute('data-row-id', 'r00003');
});

test('a failed replacement keeps the previous page with an explicit working retry', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('کمیل');
  await complete(page);
  const previous = page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]');
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('الهی عظم البلا');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await page.evaluate(() => {
    const control = (window as any).__searchControl;
    const { worker, message } = control.pending[0];
    control.pending.length = 0; control.hold = false;
    worker.dispatchEvent(new MessageEvent('message', { data: { type: 'error', id: message.request.id, message: 'injected error' } }));
  });
  await expect(previous).toBeVisible();
  await expect(page.getByRole('status')).toContainText('ناموفق');
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await complete(page);
  await expect(page.locator('[data-search-section="results"] li').first()).toHaveAttribute('data-item-id', 'dua-frj-zman-ajl');
});

test('show more is disabled on a retained previous page until the new results arrive', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('الله');
  await complete(page);
  const results = page.locator('[data-search-results]');
  const oldKeys = await results.locator('[data-result-key]').evaluateAll(rows => rows.map(row => row.getAttribute('data-result-key')));
  expect(oldKeys.length).toBeGreaterThan(0);
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('الهی عظم البلا');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await expect(page.getByRole('button', { name: 'نمایش بیشتر' })).toBeDisabled();
  await page.waitForTimeout(150);
  await expect(results).toHaveAttribute('data-search-previous', 'true');
  expect(await results.locator('[data-result-key]').first().getAttribute('data-result-key')).toBe(oldKeys[0]);
  await page.evaluate(() => (window as any).__searchControl.release());
  await complete(page);
  await expect(page.locator('[data-search-section="results"] li').first()).toHaveAttribute('data-item-id', 'dua-frj-zman-ajl');
});

test('a normalized no-op preserves an expanded result page and sends no search', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('الله');
  await complete(page);
  await page.getByRole('button', { name: 'نمایش بیشتر' }).click();
  await expect(page.locator('[data-search-results] [data-result-key]')).toHaveCount(60, { timeout: 20000 });
  const sent = await page.evaluate(() => (window as any).__searchControl.sent);
  await input.fill('الله ');
  await page.waitForTimeout(150);
  await expect(page.locator('[data-search-results] [data-result-key]')).toHaveCount(60);
  expect(await page.evaluate(() => (window as any).__searchControl.sent)).toBe(sent);
});

test('changing a language filter labels and retains the old results until the filtered list arrives', async ({ page }) => {
  await instrument(page);
  const input = await open(page);
  await input.fill('الله');
  await complete(page);
  const results = page.locator('[data-search-results]');
  const oldArabic = results.locator('[data-search-kind="text"][data-language="ar"]').first();
  await expect(oldArabic).toBeVisible();
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await page.getByRole('checkbox', { name: 'عربی' }).uncheck();
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await expect(results).toHaveAttribute('data-search-previous', 'true');
  await expect(page.getByRole('status')).toContainText('نتایج پیشین');
  await expect(oldArabic).toBeVisible();
  await page.evaluate(() => (window as any).__searchControl.release());
  await complete(page);
  await expect(results).not.toHaveAttribute('data-search-previous', 'true');
  await expect(results.locator('[data-search-kind="text"][data-language="ar"]')).toHaveCount(0);
});

test('previous hits also remain visible while an item-scoped search is replaced', async ({ page }) => {
  await instrument(page);
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این مطلب' });
  await input.fill('رحمت');
  await complete(page);
  const results = page.locator('[data-search-results]');
  const oldKey = await results.locator('[data-result-key]').first().getAttribute('data-result-key');
  expect(oldKey).toBeTruthy();
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('الهی');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await expect(results).toHaveAttribute('data-search-previous', 'true');
  expect(await results.locator('[data-result-key]').first().getAttribute('data-result-key')).toBe(oldKey);
  await page.evaluate(() => (window as any).__searchControl.release());
  await complete(page);
  await expect(results).not.toHaveAttribute('data-search-previous', 'true');
  await expect(results.locator('[data-result-key]').first()).toBeVisible();
  expect(await results.locator('[data-result-key]').evaluateAll(rows => rows.every(row => row.getAttribute('data-item-id') === 'dua-kumayl'))).toBe(true);
});
