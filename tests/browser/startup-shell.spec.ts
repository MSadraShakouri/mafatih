import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test('the real home and its search field are painted before the module; hydration preserves a typed query', async ({ page, context }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let entryRequested = false;
  await context.route('**/assets/index-*.js', async route => { entryRequested = true; await gate; await route.continue(); });
  const loading = page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
  await expect(page.locator('.header-title h1')).toHaveText('مفاتیح الجنان');
  await expect(page.locator('.library-name')).toHaveText(['فهرست مفاتیح', 'نشان‌های من']);
  await expect(page.locator('#app')).not.toContainText('در حال بارگذاری');
  await expect.poll(() => entryRequested).toBe(true);
  const field = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  // Identify the original element, not a look-alike reconstructed by JS.
  await field.evaluate(node => { (window as any).__prebuiltSearch = node; });
  await field.fill('الهم');
  release(); await loading;
  await expect(field).toHaveValue('الهم');
  expect(await field.evaluate(node => node === (window as any).__prebuiltSearch)).toBe(true);
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.search-result').first()).toBeVisible();
});

test('the prebuilt shell applies system dark and a saved light override before the module', async ({ browser, baseURL }) => {
  for (const [stored, expected] of [[null, 'dark'], ['light', 'light'], ['dark', 'dark']] as const) {
    const context = await browser.newContext({ baseURL, colorScheme: 'dark' });
    if (stored) await context.addInitScript(value => localStorage.setItem('mafatih.theme.v1', value), stored);
    await context.route('**/assets/index-*.js', route => route.abort());
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.locator('main[data-screen="library"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
    const paper = await page.locator('#app').evaluate(node => getComputedStyle(node).backgroundColor);
    expect(paper).toBe(expected === 'dark' ? 'rgb(16, 25, 21)' : 'rgb(250, 246, 239)');
    await context.close();
  }
});

test('the idle home avoids fetching the catalog and search shards until needed', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', request => { if (/\/data\/(?:catalog\.json|search(?:\/|-index))/.test(request.url())) requested.push(request.url()); });
  await page.goto('./');
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
  await page.waitForTimeout(400);
  expect(requested).toEqual([]);
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).click();
  await expect.poll(() => requested.some(url => url.includes('catalog.json'))).toBe(true);
});
