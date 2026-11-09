import { expect, test } from '@playwright/test';

// Satr treats its in-file find bar as UI state. Its Android Back callback
// closes that state directly; it does not push another WebView history entry
// just for opening find, then call history.back() to close it.
const mockNativeBridge = (page: import('@playwright/test').Page) => page.addInitScript(() => {
  const w = window as any;
  w.androidBridge = {};
  w.Capacitor = {
    PluginHeaders: [{ name: 'App', methods: [
      { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' },
      { name: 'minimizeApp', rtype: 'promise' },
    ] }],
    nativeCallback: (_plugin: string, method: string, options: { eventName?: string }, callback: (event: { canGoBack: boolean }) => void) => {
      if (method === 'addListener' && options.eventName === 'backButton') w.__testBack = callback;
      return 'listener';
    },
    nativePromise: () => Promise.resolve(),
  };
});

test('native in-file search is a UI layer, not a new history navigation', async ({ page }) => {
  await mockNativeBridge(page);
  await page.goto('./#/item/dua-kumayl');
  await page.waitForFunction(() => typeof (window as any).__testBack === 'function');
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  const before = await page.evaluate(() => ({ length: history.length, state: history.state }));
  const reader = page.locator('article.reader');
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 700); });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const position = await page.evaluate(() => window.scrollY);
  await reader.evaluate(node => (window as any).__sameReader = node);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  expect(await page.evaluate(() => ({ length: history.length, state: history.state }))).toEqual(before);

  // Model the OS consuming Back for its IME: no app callback, no navigation.
  await input.blur();
  await expect(input).toBeVisible(); await expect(input).toHaveValue('الهم');
  await expect(page.locator('.result-popover')).toBeVisible();
  await page.evaluate(() => (window as any).__testBack({ canGoBack: true }));
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  expect(await reader.evaluate(node => node === (window as any).__sameReader)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(position);
  expect(await page.evaluate(() => ({ length: history.length, state: history.state }))).toEqual(before);
  await page.evaluate(() => (window as any).__testBack({ canGoBack: true }));
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
});

test('browser guard is established by interaction, not opening the find bar', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  // In Satr the guard is installed on the first interaction, before search.
  await page.locator('article.reader').click({ position: { x: 40, y: 200 } });
  const afterInteraction = await page.evaluate(() => history.length);
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 700); });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const position = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  expect(await page.evaluate(() => history.length)).toBe(afterInteraction);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(position);
  await page.goForward(); await expect(input).toHaveValue('الهم');
  expect(await page.evaluate(() => window.scrollY)).toBe(position);
  await page.goBack(); await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  await page.goBack(); await expect(page.locator('main[data-screen="library"]')).toBeVisible();
});

test('closing the find bar with its own button does not navigate history', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const before = await page.evaluate(() => history.state?.__mafatihNavigation?.id);
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => history.state?.__mafatihNavigation?.id)).toBe(before);
  await page.goBack();
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
});

// The phone Back change must not silently change the existing desktop Escape
// behavior: first clear the query/results, then close the empty find bar.
test('desktop Escape keeps the existing clear-then-close behavior', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.press('Escape');
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(page.locator('.result-popover')).toBeHidden();
  await input.press('Escape');
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
});
