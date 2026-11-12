import { expect, test, type Page } from '@playwright/test';

// Actual app event paths under Chromium touch emulation, not a physical phone.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test.setTimeout(60_000);
const reader = (page: Page) => page.locator('main[data-screen="reader"]');
const readerSearch = (page: Page) => page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
const homeSearch = (page: Page) => page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
const position = (page: Page) => page.evaluate(() => window.scrollY);
const point = (x: number, y: number, id = 1) => [{ x, y, id, radiusX: 1, radiusY: 1, force: 1 }];
async function doubleTap(page: Page, x: number, y: number): Promise<void> {
  await page.touchscreen.tap(x, y); await page.waitForTimeout(60); await page.touchscreen.tap(x, y);
}
async function titlePoint(page: Page): Promise<{ x: number; y: number }> {
  const box = (await page.locator('.reader-header .header-title').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function swipeDown(page: Page, x: number, from: number, to: number, cancel = false): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(x, from) });
    for (let n = 1; n <= 6; n++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x, from + (to - from) * n / 6) });
      await page.waitForTimeout(12);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

test('after choosing a search result a body double tap starts and pauses without closing the query or moving the pointer', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.locator('#current-marker').focus(); await page.keyboard.press('ArrowDown');
  const markerY = () => page.locator('#current-marker').evaluate(e => {
    const b = e.getBoundingClientRect(); return b.top + b.height / 2;
  });
  const selectedPointer = await markerY();
  await readerSearch(page).fill('الهم');
  const result = page.locator('.result-row[data-row-id="r00028"][data-language="ar"] button');
  await expect(result).toBeVisible({ timeout: 40_000 }); await result.click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00028');
  await expect(page.locator('.result-popover')).toBeHidden();
  await expect(readerSearch(page)).toHaveValue('الهم');
  expect(Math.abs((await markerY()) - selectedPointer)).toBeLessThan(2);
  expect(await page.evaluate(() => Boolean(document.elementFromPoint(190, 580)?.closest('.content')))).toBe(true);
  await doubleTap(page, 190, 580);
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(readerSearch(page)).toBeVisible(); await expect(readerSearch(page)).toHaveValue('الهم');
  const start = await position(page); await page.waitForTimeout(500);
  expect((await position(page)) - start).toBeGreaterThan(4);
  await page.waitForTimeout(400); await doubleTap(page, 190, 580);
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await expect(readerSearch(page)).toHaveValue('الهم');
  await expect(page.locator('#current-marker')).toHaveAttribute('aria-disabled', 'false');
  const before = await markerY(); await page.locator('#current-marker').focus(); await page.keyboard.press('ArrowDown');
  expect((await markerY()) - before).toBeCloseTo(16, 0);
});

test('a mouse double click also toggles the reading body while search stays open', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await readerSearch(page).fill('الهم');
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await page.mouse.dblclick(190, 580);
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(readerSearch(page)).toHaveValue('الهم');
  await page.mouse.dblclick(190, 580);
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await expect(readerSearch(page)).toBeVisible();
});

test('header double tap goes to the top without changing playback and without treating buttons as the header gesture', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('#play')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1400));
  const title = await titlePoint(page); await doubleTap(page, title.x, title.y);
  await expect.poll(() => position(page)).toBeLessThanOrEqual(1);
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.evaluate(() => window.scrollTo(0, 1400));
  const bookmark = page.getByRole('button', { name: 'نشان شخصی' });
  await bookmark.tap(); await bookmark.tap();
  expect(await position(page)).toBeGreaterThan(1300);
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await doubleTap(page, title.x, title.y);
  await expect.poll(() => position(page)).toBeLessThan(10);
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
});

test('header long press opens and focuses in-text search, which initially pauses playback', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('#play')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  const title = await titlePoint(page), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(title.x, title.y) });
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(readerSearch(page)).toBeVisible(); await expect(readerSearch(page)).toBeFocused();
    await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  } finally { await cdp.detach(); }
  expect(await position(page)).toBeGreaterThan(1300);
});

test('moved and cancelled header presses and a held header button do not open search or jump', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('#play')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1400));
  const title = await titlePoint(page), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(title.x, title.y) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(title.x + 30, title.y) });
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(readerSearch(page)).toHaveCount(0);
    expect(await position(page)).toBeGreaterThan(1300);
    const button = (await page.getByRole('button', { name: 'نشان شخصی' }).boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(button.x + button.width / 2, button.y + button.height / 2) });
    await page.waitForTimeout(700);
    await expect(readerSearch(page)).toHaveCount(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByRole('button', { name: 'نشان شخصی' })).toHaveAttribute('aria-pressed', 'true');
    expect(await position(page)).toBeGreaterThan(1300);
  } finally { await cdp.detach(); }
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).focus();
  await page.keyboard.press('Enter'); await expect(readerSearch(page)).toBeVisible();
});

test('pulling down on the home screen focuses the existing visible search without navigation', async ({ page }) => {
  await page.goto('./'); await expect(homeSearch(page)).toBeVisible();
  await homeSearch(page).evaluate(node => { (window as any).__homeSearch = node; });
  await swipeDown(page, 190, 500, 660);
  await expect(homeSearch(page)).toBeFocused(); await expect(homeSearch(page)).toBeVisible();
  expect(await position(page)).toBeLessThanOrEqual(1);
  expect(await homeSearch(page).evaluate(node => node === (window as any).__homeSearch)).toBe(true);
  expect(new URL(page.url()).hash === '' || new URL(page.url()).hash === '#/').toBe(true);
  await homeSearch(page).fill('الهم'); await expect(homeSearch(page)).toHaveValue('الهم');
});

test('a home pull starting on a menu link focuses search instead of following the link; a tap still follows it', async ({ page }) => {
  await page.goto('./');
  const link = page.getByRole('link', { name: 'فهرست مفاتیح' }), box = (await link.boundingBox())!;
  await swipeDown(page, box.x + box.width / 2, box.y + box.height / 2, box.y + box.height / 2 + 140);
  await expect(homeSearch(page)).toBeFocused();
  expect(new URL(page.url()).hash === '' || new URL(page.url()).hash === '#/').toBe(true);
  await link.tap(); await expect(page).toHaveURL(/#\/contents/);
});

test('cancelled, sideways, multi-finger and already-scrolled gestures do not focus home search', async ({ page }) => {
  await page.goto('./'); const input = homeSearch(page); await expect(input).not.toBeFocused();
  await swipeDown(page, 190, 500, 660, true); await expect(input).not.toBeFocused();
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(90, 500) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(210, 510) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(input).not.toBeFocused();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(180, 500, 1) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [...point(180, 500, 1), ...point(240, 500, 2)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [...point(180, 650, 1), ...point(240, 650, 2)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(input).not.toBeFocused();
  } finally { await cdp.detach(); }
  await input.fill('الهم'); await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await input.blur(); await page.evaluate(() => window.scrollTo(0, 900));
  expect(await position(page)).toBeGreaterThan(400);
  await swipeDown(page, 190, 500, 650);
  await expect(input).not.toBeFocused(); await expect(input).toHaveValue('الهم');
});

test('a header tap, an intervening control tap, and another header tap are not a double tap', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('#play')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1400));
  const title = await titlePoint(page);
  await page.touchscreen.tap(title.x, title.y);
  await page.getByRole('button', { name: 'نشان شخصی' }).tap();
  await page.touchscreen.tap(title.x, title.y);
  expect(await position(page)).toBeGreaterThan(1300);
  await expect(page.getByRole('button', { name: 'نشان شخصی' })).toHaveAttribute('aria-pressed', 'true');
});

test('restarting during search keeps the existing results, and browser Back closes only search', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  await readerSearch(page).fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const first = await page.locator('.result-row').first().getAttribute('data-result-key');
  await doubleTap(page, 190, 580);
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(readerSearch(page)).toHaveValue('الهم');
  await page.getByRole('button', { name: 'نمایش فهرست نتایج' }).tap();
  await expect(page.locator('.result-row').first()).toHaveAttribute('data-result-key', first!);
  await page.goBack();
  await expect(readerSearch(page)).toHaveCount(0);
  await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
});

test('a simulated native Back closes just search after playback restarts', async ({ page }) => {
  await page.addInitScript(() => {
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
  await page.goto('./#/item/dua-kumayl'); await page.waitForFunction(() => typeof (window as any).__testBack === 'function');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  await readerSearch(page).fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await doubleTap(page, 190, 580); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.evaluate(() => (window as any).__testBack({ canGoBack: true }));
  await expect(readerSearch(page)).toHaveCount(0);
  await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
});

test('a long header touch cancelled by the system never opens search', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('#play')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1400));
  const title = await titlePoint(page), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(title.x, title.y) });
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(readerSearch(page)).toHaveCount(0);
    expect(await position(page)).toBeGreaterThan(1300);
  } finally { await cdp.detach(); }
});
