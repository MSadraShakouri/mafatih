import { expect, test } from '@playwright/test';

// Mock the Capacitor bridge, not Android's IME. Android consumes the first
// physical Back with its keyboard; these callbacks represent the later Back
// that reaches the app. The WebView can keep or lose input focus in between.
test('Satr-style native Back closes the top layer, navigates, and confirms exit', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      androidBridge: object;
      Capacitor: object;
      __testBack?: (event: { canGoBack: boolean }) => void;
      __nativeCalls: string[];
    };
    w.androidBridge = {};
    w.__nativeCalls = [];
    w.Capacitor = {
      PluginHeaders: [{ name: 'App', methods: [
        { name: 'addListener', rtype: 'callback' },
        { name: 'removeListener', rtype: 'callback' },
        { name: 'minimizeApp', rtype: 'promise' },
      ] }],
      nativeCallback: (_plugin: string, method: string, options: { eventName?: string }, callback: (event: { canGoBack: boolean }) => void) => {
        if (method === 'addListener' && options.eventName === 'backButton') w.__testBack = callback;
        return 'mock-listener-id';
      },
      nativePromise: (_plugin: string, method: string) => { w.__nativeCalls.push(method); return Promise.resolve(); },
    };
  });
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  await page.waitForFunction(() => typeof (window as unknown as { __testBack?: unknown }).__testBack === 'function');
  const press = (canGoBack: boolean) => page.evaluate(value => (window as unknown as { __testBack: (e: { canGoBack: boolean }) => void }).__testBack({ canGoBack: value }), canGoBack);
  const open = page.getByRole('button', { name: 'جست‌وجو در متن' });
  const query = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });

  // A WebView may leave the field focused after Android hid the IME. Focus
  // alone must not make the app consume an extra Back (a three-press bug).
  await open.click(); await expect(query).toBeFocused();
  await press(true); await expect(open).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(history.state?.__mafatihNavigation?.readerSearch))).toBe(false);
  // Or the OS may blur first. The callback after the IME's own press still
  // closes search and leaves the reader mounted.
  await open.click(); await expect(query).toBeFocused(); await query.blur();
  await press(true); await expect(open).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(history.state?.__mafatihNavigation?.readerSearch))).toBe(false);
  await press(true); await expect(page.locator('.library-name')).toHaveText(['فهرست مفاتیح', 'نشان‌های من']);

  // The library has a persistent search field; Back dismisses its results
  // before arming exit, even if Android kept that field focused.
  const global = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await global.fill('الله'); await expect(global).toBeFocused();
  await press(false); await expect(global).toHaveValue('');
  await expect(page.locator('[data-contents]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __nativeCalls: string[] }).__nativeCalls)).toEqual([]);
  await press(false); await expect(page.getByRole('status').filter({ hasText: 'برای خروج دوباره' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __nativeCalls: string[] }).__nativeCalls)).toEqual([]);
  await press(false);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __nativeCalls: string[] }).__nativeCalls)).toEqual(['minimizeApp']);

  // App-owned navigations use WebView history rather than an external URL.
  await page.getByText('فهرست مفاتیح', { exact: true }).click();
  await page.getByText('ادعیه', { exact: true }).click();
  await expect(page).toHaveURL(/#\/contents\/dua$/);
  await press(true); await expect(page).toHaveURL(/#\/contents$/);
  await press(true); await expect(page.locator('.library-name')).toHaveText(['فهرست مفاتیح', 'نشان‌های من']);

  await page.goto('./#/settings/dua-kumayl');
  await expect(page.locator('main[data-screen="settings"]')).toBeVisible();
  await page.waitForFunction(() => typeof (window as unknown as { __testBack?: unknown }).__testBack === 'function');
  await press(false); await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await press(false); await expect(page.locator('.library-name')).toHaveText(['فهرست مفاتیح', 'نشان‌های من']);
});
