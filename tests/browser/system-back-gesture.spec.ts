import { expect, test } from '@playwright/test';

// Android's system Back swipe can begin as a touch in the WebView before the
// OS claims it and delivers pointercancel/touchcancel. Do not turn that first
// touch into an outside tap that blurs search or permanently hides results.
test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

for (const edge of [{ name: 'left', start: 5, end: 95 }, { name: 'right', start: 385, end: 295 }]) {
  test(`a cancelled ${edge.name}-edge gesture does not dismiss reader search or its results`, async ({ page }) => {
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
    const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
    await input.fill('الهم');
    await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
    await input.focus();
    const panel = page.locator('.result-popover');
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: edge.start, y: 700 }] });
    const focusedDuring = await input.evaluate(node => document.activeElement === node);
    await expect(panel).toBeVisible();
    // An inward, mostly horizontal move must not be mistaken for scrolling.
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: edge.end, y: 704 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await client.detach();
    expect(focusedDuring, 'an edge-down may still become Android Back and must not dismiss the IME').toBe(true);
    await expect(input).toBeVisible(); await expect(input).toHaveValue('الهم');
    await expect(panel).toBeVisible();
    await expect(page.locator('.result-row').first()).toBeVisible();
  });
}

test('an edge tap still dismisses the reader results and keyboard without eating the tap', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
  await expect(page.locator('.result-popover')).toBeVisible(); await expect(input).toBeFocused();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await expect(page.locator('.result-popover')).toBeHidden(); await expect(input).not.toBeFocused();
  await expect(page.locator('.result-reopen')).toBeVisible();
});

test('a cancelled edge gesture does not blur global search', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('الهم'); await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
  const focusedDuring = await input.evaluate(node => document.activeElement === node);
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await client.detach();
  expect(focusedDuring).toBe(true);
  await expect(input).toHaveValue('الهم');
  await expect(page.locator('.search-result').first()).toBeVisible();
});

// Chromium also sends pointercancel when a touch turns into ordinary scrolling.
// A vertical scroll is an outside interaction, not a cancelled system Back.
test('vertical scrolling from the edge keeps the outside-dismissed results closed', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
  await expect(page.locator('.result-popover')).toBeVisible(); await expect(input).toBeFocused();
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 650 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 570 }] });
  // Dismiss as soon as the reader has actually moved, before finger-up.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator('.result-popover')).toBeHidden(); await expect(input).not.toBeFocused();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await expect(page.locator('.result-reopen')).toBeVisible();
});

// Replays the event order in the supplied Android trace: pointerdown/touchstart,
// a small sideways move, then pointercancel/touchcancel. The trace did not record
// viewport width; 390px here deliberately avoids assuming a fixed edge inset.
test('recorded Back swipe does not dismiss reader search before Android claims it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 613 });
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  const panel = page.locator('.result-popover');
  await input.fill('الهم');
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  await page.locator('article.reader').evaluate(node => { (window as any).__recordedReader = node; });
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 343, y: 348 }] });
  const beforeCancel = await page.evaluate(() => ({
    focused: document.activeElement === document.querySelector('input[aria-label="جست‌وجو در این متن"]'),
    results: !(document.querySelector('.result-popover') as HTMLElement).hidden,
  }));
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 340, y: 349 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await client.detach();
  expect(beforeCancel).toEqual({ focused: true, results: true });
  await expect(input).toHaveValue('الهم'); await expect(panel).toBeVisible();
  // Model Android consuming that Back for the IME; the next Back closes find.
  await input.blur();
  await expect(input).toBeVisible(); await expect(panel).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  expect(await page.locator('article.reader').evaluate(node => node === (window as any).__recordedReader)).toBe(true);
});

test('recorded Back swipe does not blur the global search before Android claims it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 613 });
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('الهم');
  await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 343, y: 348 }] });
  const beforeCancel = await input.evaluate(node => document.activeElement === node);
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 340, y: 349 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await client.detach();
  expect(beforeCancel).toBe(true);
  await expect(input).toHaveValue('الهم'); await expect(page.locator('.search-result').first()).toBeVisible();
});

test('a drag at the top that does not scroll leaves reader search and keyboard alone', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  const panel = page.locator('.result-popover');
  await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.focus(); await page.evaluate(() => window.scrollTo(0, 0));
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 70, y: 590 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 70, y: 660 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 70, y: 725 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(input).toBeFocused(); await expect(input).toHaveValue('الهم'); await expect(panel).toBeVisible();
});

test('scrolling within the results keeps the results open and the reader in place', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  const panel = page.locator('.result-popover');
  await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const box = await panel.boundingBox(); expect(box).not.toBeNull();
  expect(await panel.evaluate(node => node.scrollHeight)).toBeGreaterThan(await panel.evaluate(node => node.clientHeight));
  const x = box!.x + box!.width / 2, y = box!.y + box!.height - 20;
  const before = await page.evaluate(() => window.scrollY);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 55 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 130 }] });
  await expect.poll(() => panel.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await expect(panel).toBeVisible(); await expect(input).toHaveValue('الهم');
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect(panel).toBeVisible();
});

test('reader scroll dismisses results even after the keyboard is already hidden', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.blur(); await expect(page.locator('.result-popover')).toBeVisible();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 650 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 570 }] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator('.result-popover')).toBeHidden();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await expect(input).toHaveValue('الهم'); await expect(input).toBeVisible();
});

test('scrolling global results hides the keyboard without clearing the search', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('الهم'); await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
  await expect(input).toBeFocused();
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 640 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 530 }] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(input).not.toBeFocused();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await expect(input).toHaveValue('الهم'); await expect(page.locator('.search-result').first()).toBeVisible();
});

test('a completed outside tap with normal finger jitter still dismisses', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).tap();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await input.focus();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 700 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 8, y: 704 }] });
  await expect(page.locator('.result-popover')).toBeVisible();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await expect(page.locator('.result-popover')).toBeHidden(); await expect(input).not.toBeFocused();
});
