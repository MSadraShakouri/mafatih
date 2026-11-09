import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

/** Hold real worker requests and feed controlled partial/stale responses. */
async function instrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = Worker.prototype as any;
    const post = proto.postMessage, add = proto.addEventListener;
    const control: any = {
      hold: false, pending: [], sent: 0, last: undefined, future: undefined,
      release() {
        const queued = this.pending.splice(0); this.hold = false;
        for (const entry of queued) Reflect.apply(post, entry.worker, [entry.message]);
      },
      injectEmpty(this: any, index = this.pending.length - 1, complete = false) {
        const entry = this.pending[index];
        const snapshot = { id: entry.message.request.id, complete, results: [], resultsTotal: 0,
          text: [], textTotal: 0, toc: [], tocTotal: 0 };
        entry.worker.dispatchEvent(new MessageEvent('message', { data: { type: 'snapshot', snapshot } }));
      },
      injectFuture(reader: boolean) {
        const entry = this.pending[this.pending.length - 1];
        const selector = reader ? '.result-row' : '.search-result';
        const visibleKeys = new Set([...document.querySelectorAll<HTMLElement>(selector)].map(node => node.dataset.resultKey));
        const source = reader ? this.future.text : this.future.results;
        const hit = source.find((value: any) => !visibleKeys.has(value.record.key));
        if (!hit) throw new Error('Need a genuinely new hit for the streaming test');
        const text = hit.record.section === 'text' ? [hit] : [];
        const toc = hit.record.section === 'toc' ? [hit] : [];
        const snapshot = { id: entry.message.request.id, complete: false, results: [hit], resultsTotal: 1,
          text, textTotal: text.length, toc, tocTotal: toc.length };
        entry.worker.dispatchEvent(new MessageEvent('message', { data: { type: 'snapshot', snapshot } }));
        return hit.record.key;
      },
      failLatest() {
        const entry = this.pending.pop(); this.hold = false;
        entry.worker.dispatchEvent(new MessageEvent('message', { data: { type: 'error', id: entry.message.request.id, message: 'test failure' } }));
      },
    };
    (window as any).__searchControl = control;
    proto.addEventListener = function(type: string, listener: any, options: any) {
      if (type === 'message' && typeof listener === 'function') {
        const wrapped = (event: MessageEvent) => {
          if (event.data?.type === 'snapshot' && event.data.snapshot.complete) control.last = event.data.snapshot;
          listener.call(this, event);
        };
        return Reflect.apply(add, this, [type, wrapped, options]);
      }
      return Reflect.apply(add, this, [type, listener, options]);
    };
    proto.postMessage = function(message: any, ...rest: any[]) {
      if (message?.type === 'search') {
        control.sent++;
        if (control.hold) {
          control.pending.push({ worker: this, message });
          control.injectEmpty();
          return;
        }
      }
      return Reflect.apply(post, this, [message, ...rest]);
    };
  });
}
async function globalComplete(page: Page): Promise<void> {
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.search-results-count')).toContainText('نتیجه');
}
async function readerComplete(page: Page): Promise<void> {
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.result-head')).not.toContainText('در حال');
}

for (const scope of ['global', 'reader'] as const) {
  test(`${scope}: empty partials keep existing DOM and new hits stream above retained results without labels`, async ({ page }) => {
    await instrument(page);
    await page.goto(scope === 'global' ? './' : './#/item/dua-kumayl');
    if (scope === 'reader') await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    const input = page.getByRole('searchbox', { name: scope === 'global' ? 'جست‌وجو در فهرست و متن' : 'جست‌وجو در این متن' });
    const selector = scope === 'global' ? '.search-result' : '.result-row';
    const panel = scope === 'global' ? '.search-results' : '.result-popover';
    const complete = scope === 'global' ? globalComplete : readerComplete;
    await input.fill('رحمت'); await complete(page);
    await page.evaluate(() => { (window as any).__searchControl.future = (window as any).__searchControl.last; });
    await input.fill('الهم'); await complete(page);
    const first = page.locator(selector).first(); await expect(first).toBeVisible();
    await page.evaluate(selector => {
      (window as any).__oldNode = document.querySelector(selector);
      (window as any).__searchControl.hold = true;
      (window as any).__blankFrame = false;
      const container = document.querySelector(selector)!.parentElement!;
      new MutationObserver(() => { if (!container.querySelector(selector)) (window as any).__blankFrame = true; })
        .observe(container, { childList: true, subtree: true });
    }, selector);
    await input.fill('رحمت');
    await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
    await expect(page.locator(panel)).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(220);
    // Retained results and streaming still work, without a visible or live-region loading message.
    await expect(page.locator('body')).not.toContainText('در حال جست‌وجو', { timeout: 1000 });
    expect(await page.evaluate(() => (window as any).__oldNode.isConnected)).toBe(true);
    await expect(page.locator(`${selector}[data-previous="true"]`).first()).toBeVisible();
    await expect(page.locator('.search-previous-heading, [aria-description="نتیجهٔ جست‌وجوی قبلی"]')).toHaveCount(0);
    const newKey = await page.evaluate(reader => (window as any).__searchControl.injectFuture(reader), scope === 'reader');
    await expect.poll(() => page.locator(`${selector}[data-previous="false"]`).count()).toBeGreaterThan(0);
    const newRow = page.locator(`${selector}[data-previous="false"]`).first();
    await expect(newRow).toHaveAttribute('data-result-key', newKey);
    await expect(page.locator(`${selector}[data-previous="true"]`).first()).toBeVisible();
    expect(await page.evaluate(() => (window as any).__oldNode.isConnected)).toBe(true);
    expect(await page.evaluate(() => (window as any).__blankFrame)).toBe(false);
    await page.evaluate(() => (window as any).__searchControl.release());
    await complete(page);
    await expect(page.locator(`${selector}[data-previous="true"]`)).toHaveCount(0);
  });
}

test('superseded snapshots are ignored and a finished no-hit query replaces the old page', async ({ page }) => {
  await instrument(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('الهم'); await globalComplete(page);
  await page.evaluate(() => { (window as any).__oldNode = document.querySelector('.search-result'); (window as any).__searchControl.hold = true; });
  await input.fill('رحمت');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await input.fill('الفبایناموجودچندواژه');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(2);
  await page.evaluate(() => (window as any).__searchControl.injectEmpty(0, true));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__oldNode.isConnected)).toBe(true);
  await page.evaluate(() => (window as any).__searchControl.release());
  await globalComplete(page);
  await expect(page.locator('.search-result')).toHaveCount(0);
  await expect(page.locator('.search-empty').first()).toContainText('نتیجه‌ای پیدا نشد');
});

test('a failed replacement preserves the old results and offers a working retry', async ({ page }) => {
  await instrument(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('الهم'); await globalComplete(page);
  await page.evaluate(() => { (window as any).__oldNode = document.querySelector('.search-result'); (window as any).__searchControl.hold = true; });
  await input.fill('رحمت');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await page.evaluate(() => (window as any).__searchControl.failLatest());
  await expect(page.locator('.search-results-count')).toContainText('ناموفق');
  expect(await page.evaluate(() => (window as any).__oldNode.isConnected)).toBe(true);
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await globalComplete(page);
  await expect(page.locator('.search-result[data-previous="true"]')).toHaveCount(0);
});

test('a dismissed reader panel stays dismissed when partial and complete results arrive', async ({ page }) => {
  await instrument(page); await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم'); await readerComplete(page);
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('رحمت');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await page.locator('article.reader').click({ position: { x: 8, y: 470 }, force: true });
  await expect(page.locator('.result-popover')).toBeHidden();
  await page.evaluate(() => (window as any).__searchControl.release());
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.result-popover')).toBeHidden();
  await page.locator('.result-reopen').click();
  await expect(page.locator('.result-popover')).toBeVisible();
});

test('pointer reopening while a search is pending does not freeze subsequent streamed results', async ({ page }) => {
  await instrument(page); await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم'); await readerComplete(page);
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('رحمت');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await page.locator('article.reader').click({ position: { x: 8, y: 470 }, force: true });
  await expect(page.locator('.result-popover')).toBeHidden();
  await page.locator('.result-reopen').click();
  await expect(page.locator('.result-popover')).toBeVisible();
  await page.evaluate(() => (window as any).__searchControl.release());
  await readerComplete(page);
  await expect(page.locator('.result-row[data-previous="true"]')).toHaveCount(0);
});

test('normalization-only changes do not resubmit or collapse an expanded page', async ({ page }) => {
  await instrument(page); await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('الله'); await globalComplete(page);
  await page.getByRole('button', { name: 'نمایش بیشتر' }).click();
  await expect.poll(() => page.locator('.search-result').count(), { timeout: 40_000 }).toBeGreaterThan(50);
  await globalComplete(page);
  const count = await page.locator('.search-result').count();
  const sent = await page.evaluate(() => (window as any).__searchControl.sent);
  await input.fill('الله '); await page.waitForTimeout(160);
  expect(await page.evaluate(() => (window as any).__searchControl.sent)).toBe(sent);
  await expect(page.locator('.search-result')).toHaveCount(count);
  // A real replacement must retain the entire expanded page, not just 50.
  await page.evaluate(() => { (window as any).__searchControl.hold = true; });
  await input.fill('رحمت');
  await expect.poll(() => page.evaluate(() => (window as any).__searchControl.pending.length)).toBe(1);
  await page.waitForTimeout(180);
  await expect(page.locator('.search-result[data-previous="true"]')).toHaveCount(count);
  await page.evaluate(() => (window as any).__searchControl.release());
  await globalComplete(page);
});
