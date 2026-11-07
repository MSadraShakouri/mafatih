import { expect, test } from '@playwright/test';

// This mocks the Capacitor native bridge in Chromium. It verifies JS wiring
// and fallbacks, not Android compilation, WebView behavior, or a device.
test('Capacitor backButton listener drives history, direct-link fallbacks, and root minimize', async ({ page }) => {
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
  await press(true); await expect(page.locator('.library-name')).toHaveText(['فهرست مفاتیح', 'نشان‌های من']);
  await press(false);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __nativeCalls: string[] }).__nativeCalls)).toEqual(['minimizeApp']);

  // App-owned navigations should use WebView history rather than an external URL.
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
