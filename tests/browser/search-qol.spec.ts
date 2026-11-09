import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

const readerInput = 'جست‌وجو در این متن';

test('the reader opens an empty results panel immediately, outside taps dismiss it, and IME Search shows it', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: readerInput });
  await expect(input).toBeFocused();
  await expect(page.locator('.result-popover')).toBeVisible();
  await expect(page.locator('.result-empty')).toContainText('واژه‌ای بنویسید');
  await page.locator('article.reader').click({ position: { x: 8, y: 470 }, force: true });
  await expect(page.locator('.result-popover')).toBeHidden();
  await expect(page.locator('.result-reopen')).toBeVisible();
  await page.locator('.result-reopen').click(); await expect(page.locator('.result-popover')).toBeVisible();
  await input.fill('الهم');
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  // Touching the search row keeps the results open.
  await input.click(); await expect(page.locator('.result-popover')).toBeVisible();
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(input).not.toBeFocused(); await expect(page.locator('.result-popover')).toBeVisible();
  await expect(page.locator('.result-row').first()).toBeVisible();
  // Some Android IMEs emit submit rather than an Enter keydown.
  await input.click(); await expect(page.locator('.result-popover')).toBeVisible();
  await page.locator('.query-shell').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await expect(page.locator('.result-popover')).toBeVisible();
});

test('there are no search examples, the requested settings previews remain, and Arabic alone is bold', async ({ page }) => {
  await page.goto('./');
  const home = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await home.click();
  await expect(page.locator('.search-suggestions, .suggestion-chip')).toHaveCount(0);
  await home.fill('الهم');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const globalArabic = page.locator('.search-excerpt[lang="ar"]').first();
  await expect(globalArabic).toBeVisible();
  expect(await globalArabic.evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
  await page.goto('./#/item/dua-kumayl');
  const arabic = page.locator('article p[lang="ar"]').first(), persian = page.locator('article p[lang="fa"]').first();
  await expect(arabic).toBeVisible();
  expect(await arabic.evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
  expect(await persian.evaluate(node => getComputedStyle(node).fontWeight)).toBe('400');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: readerInput }).fill('الهم');
  const inTextArabic = page.locator('.result-snippet[lang="ar"]').first();
  await expect(inTextArabic).toBeVisible({ timeout: 40_000 });
  expect(await inTextArabic.evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('button', { name: 'دیدن نمونهٔ متن عربی' }).click();
  const preview = page.locator('.size-preview p[lang="ar"]');
  await expect(preview).toBeVisible();
  expect(await preview.evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
  await expect(page.locator('.font-example').first()).toBeVisible();
});

test('home is usable before a delayed catalog and reader search does not download library shards', async ({ page, context }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/data/catalog.json', async route => { await gate; await route.continue(); });
  await page.goto('./');
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'فهرست مفاتیح' })).toBeVisible();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await expect(input).toBeEnabled(); await input.fill('الهم');
  await expect(input).toHaveValue('الهم');
  release();
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.search-result').first()).toBeVisible();

  // A fresh direct reader session has no reason to load the 14 MB global index.
  await page.close();
  const readerPage = await context.newPage();
  const searchData: string[] = [];
  readerPage.on('request', request => { if (/\/data\/search(?:\/|-index)/.test(request.url())) searchData.push(request.url()); });
  await readerPage.goto('./#/item/dua-kumayl');
  await readerPage.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await readerPage.getByRole('searchbox', { name: readerInput }).fill('الهم');
  await expect(readerPage.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(readerPage.locator('.result-row').first()).toBeVisible();
  expect(searchData).toEqual([]);
});

test('slow navigation leaves the current screen usable without a loading message', async ({ page, context }) => {
  let release!: () => void, requests = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/data/items/dua-kumayl.json', async route => {
    requests++; await gate; await route.continue().catch(() => {});
  });
  try {
    await page.goto('./');
    await expect(page.locator('main[data-screen="library"]')).toBeVisible();
    await page.evaluate(() => { location.hash = '#/item/dua-kumayl'; });
    await expect.poll(() => requests).toBe(1);
    await page.waitForTimeout(550); // Beyond the former 350 ms notice delay.
    await expect(page.locator('main[data-screen="library"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'فهرست مفاتیح' })).toBeVisible();
    await expect(page.locator('#app')).not.toContainText('در حال آماده‌سازی', { timeout: 1000 });
    release();
    await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
    await expect(page.locator('#app')).not.toContainText('در حال آماده‌سازی');
  } finally { release(); }
});

test.describe('touch dismissal', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('completed outside tap hides results; the row and delayed clear keep their target', async ({ page }) => {
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
    const input = page.getByRole('searchbox', { name: readerInput });
    const panel = page.locator('.result-popover');
    await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
    await input.tap(); await expect(panel).toBeVisible();
    const client = await page.context().newCDPSession(page);
    // At touch-down it is not yet known whether this will be Back or a tap.
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
    await expect(panel).toBeVisible(); await expect(input).toBeFocused();
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(panel).toBeHidden(); await expect(input).not.toBeFocused();
    await expect(page.locator('.result-reopen')).toBeVisible();
    await page.locator('.result-reopen').tap(); await expect(panel).toBeVisible();
    const clear = page.getByRole('button', { name: 'پاک کردن جست‌وجو' });
    const box = await clear.boundingBox(); expect(box).not.toBeNull();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }] });
    await expect(panel).toBeVisible();
    expect(await clear.boundingBox()).toEqual(box);
    await page.waitForTimeout(350); // Android can delay the synthesized click.
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(input).toHaveValue(''); await expect(panel).toBeVisible();
    await expect(page.locator('.result-empty')).toContainText('واژه‌ای بنویسید');
    await client.detach();
  });
});

test.describe('reopening in-text search', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('the header icon moves only a collapsed start caret to the end', async ({ page }) => {
    await page.goto('./#/item/dua-kumayl');
    const open = page.getByRole('button', { name: 'جست‌وجو در متن' });
    const close = page.getByRole('button', { name: 'بستن جست‌وجو' });
    await open.tap();
    const input = page.getByRole('searchbox', { name: readerInput });
    await input.fill('الهم');
    await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
    const selection = () => input.evaluate(node => [(node as HTMLInputElement).selectionStart, (node as HTMLInputElement).selectionEnd]);
    const reopen = async () => { await close.tap(); await open.tap(); await expect(input).toBeFocused(); };

    await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(0, 0));
    await reopen();
    expect(await selection()).toEqual([4, 4]);
    await expect(input).toHaveValue('الهم');

    // An intentional insertion point or selection remains the user's choice.
    for (const [start, end] of [[2, 2], [0, 2], [1, 3]] as const) {
      await input.evaluate((node, range) => (node as HTMLInputElement).setSelectionRange(range[0]!, range[1]!), [start, end]);
      await reopen();
      expect(await selection()).toEqual([start, end]);
    }
  });
});
