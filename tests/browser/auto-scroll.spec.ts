import { expect, test, type Page } from '@playwright/test';

// These exercise the real app routes, not the standalone preview.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const reader = (page: Page) => page.locator('main[data-screen="reader"]');
const open = async (page: Page): Promise<void> => {
  await page.goto('./#/item/dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(page.locator('#play')).toHaveCount(1, { timeout: 1500 });
};
const center = (page: Page) => page.locator('#current-marker').evaluate(element => {
  const b = element.getBoundingClientRect(); return b.top + b.height / 2;
});

test('the real reader scrolls with the chosen marker, pause icon and no persistent button highlight', async ({ page }) => {
  await open(page);
  const play = page.locator('#play');
  await expect(play).toHaveAttribute('aria-label', 'شروع پیمایش خودکار');
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#current-marker')).toBeVisible();
  await expect(page.locator('#guide-layer')).toBeVisible();
  await page.waitForTimeout(150);
  expect(Number(await page.locator('#guide-layer').evaluate(e => getComputedStyle(e, '::before').opacity))).toBeGreaterThan(.7);
  const before = await page.evaluate(() => scrollY);
  await play.click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(play).toHaveAttribute('aria-label', 'مکث پیمایش خودکار');
  expect(await play.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))).toEqual(['M9 5v14', 'M15 5v14']);
  await page.waitForTimeout(650);
  expect((await page.evaluate(() => scrollY)) - before).toBeGreaterThan(5);
  expect(await play.evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(Number(await page.locator('#guide-layer').evaluate(e => getComputedStyle(e, '::before').opacity))).toBeLessThan(.05);
  await play.click(); await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  expect(await play.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))).toEqual(['m7 6 5 5 5-5', 'm7 13 5 5 5-5']);
});

test('Comfort target drags the marker without scrolling or stealing the header', async ({ page, context }) => {
  await open(page); const marker = page.locator('#current-marker');
  const box = (await marker.boundingBox())!, x = box.x + box.width - 60, y = box.y + box.height / 2;
  const before = await center(page), scrollBefore = await page.evaluate(() => scrollY);
  const cdp = await context.newCDPSession(page);
  const at = (v: number) => [{ x, y: v, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(y) });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(y + i * 15) }); await page.waitForTimeout(15); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await center(page)) - before).toBeGreaterThan(80);
  expect(Math.abs((await page.evaluate(() => scrollY)) - scrollBefore)).toBeLessThan(2);
  await marker.focus(); await page.keyboard.press('End');
  const target = await page.evaluate(() => document.elementFromPoint(innerWidth - 25, 24)?.closest('button')?.getAttribute('aria-label'));
  expect(target).toBe('نشان شخصی');
});

test('holding the actual reader stops text, advances the ghost and trains Smart speed', async ({ page, context }) => {
  await open(page); await page.locator('#play').click(); await page.waitForTimeout(650);
  const cdp = await context.newCDPSession(page), point = [{ x: 190, y: 200, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point });
  await expect(reader(page)).toHaveAttribute('data-phase', 'holding');
  const before = await page.evaluate(() => scrollY), fixed = await center(page);
  const ghost = page.locator('#expected-marker'); await expect(ghost).toBeVisible();
  const top = await ghost.evaluate(e => e.getBoundingClientRect().top); await page.waitForTimeout(1000);
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(2);
  expect(Math.abs((await center(page)) - fixed)).toBeLessThan(1);
  expect((await ghost.evaluate(e => e.getBoundingClientRect().top)) - top).toBeGreaterThan(12);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  expect(Number(await reader(page).getAttribute('data-speed'))).toBeLessThan(16);
});

test('Smart disables settings speed; Smart persists but the speed resets on a fresh launch', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await expect(page.locator('#smart-toggle')).toHaveCount(1, { timeout: 1500 });
  const smart = page.locator('#smart-toggle'), faster = page.locator('#settings-faster');
  await expect(smart).toHaveAttribute('aria-checked', 'true'); await expect(faster).toBeDisabled();
  expect(Number(await page.locator('.settings-stepper').evaluate(e => getComputedStyle(e).opacity))).toBeLessThan(1);
  await smart.click(); await expect(smart).toHaveAttribute('aria-checked', 'false'); await expect(faster).toBeEnabled();
  await faster.click(); await expect(page.locator('#settings-speed-output')).toHaveText('۱۸');
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(reader(page)).toHaveAttribute('data-speed', '18'); await page.reload();
  await expect(reader(page)).toHaveAttribute('data-speed', '16');
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await expect(page.locator('#smart-toggle')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#settings-faster')).toBeEnabled(); await expect(page.locator('#settings-speed-output')).toHaveText('۱۶');
});

test('Smart settings guard synthetic activations and manual speed retains both bounds', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  const smart = page.locator('#smart-toggle'), faster = page.locator('#settings-faster'), slower = page.locator('#settings-slower');
  await expect(page.locator('.settings-stepper')).toHaveAttribute('aria-disabled', 'true');
  await faster.evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect(page.locator('#settings-speed-output')).toHaveText('۱۶');
  await smart.click(); await expect(page.locator('.settings-stepper')).toHaveAttribute('aria-disabled', 'false');
  await faster.evaluate(button => { for (let i = 0; i < 200; i++) (button as HTMLButtonElement).click(); });
  await expect(page.locator('#settings-speed-output')).toHaveText('۵۰۰'); await expect(faster).toBeDisabled();
  await slower.evaluate(button => { for (let i = 0; i < 200; i++) (button as HTMLButtonElement).click(); });
  await expect(page.locator('#settings-speed-output')).toHaveText('۰٫۲'); await expect(slower).toBeDisabled();
  await smart.click(); await expect(faster).toBeDisabled(); await expect(slower).toBeDisabled();
  await faster.evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect(page.locator('#settings-speed-output')).toHaveText('۰٫۲');
});

test('opening in-text search stops scrolling until the reader is restarted', async ({ page }) => {
  await open(page); await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(page.getByRole('searchbox', { name: 'جست‌وجو در این متن' })).toBeVisible();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'false');
  const stopped = await page.evaluate(() => scrollY); await page.waitForTimeout(450);
  expect(Math.abs((await page.evaluate(() => scrollY)) - stopped)).toBeLessThan(2);
});

test('settings suspend the reader without losing its position or playing state', async ({ page }) => {
  await open(page); await page.evaluate(() => window.scrollTo(0, 1200)); await page.locator('#play').click(); await page.waitForTimeout(350);
  const before = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await expect(page.locator('main[data-screen="settings"]')).toBeVisible(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  const restored = await page.evaluate(() => scrollY); expect(Math.abs(restored - before)).toBeLessThan(8);
  await page.waitForTimeout(500); expect((await page.evaluate(() => scrollY)) - restored).toBeGreaterThan(4);
});

test('the paused reader does not run a continuous animation loop', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    (window as unknown as { frames: number }).frames = 0;
    window.requestAnimationFrame = callback => original(time => {
      (window as unknown as { frames: number }).frames++; callback(time);
    });
  });
  await open(page); await page.waitForTimeout(200);
  const count = () => page.evaluate(() => (window as unknown as { frames: number }).frames);
  const start = await count(); await page.waitForTimeout(500);
  expect((await count()) - start, 'idle reader animation callbacks over 500ms').toBeLessThanOrEqual(3);
  await page.locator('#play').click(); const running = await count(); await page.waitForTimeout(300);
  expect((await count()) - running).toBeGreaterThan(5);
  await page.locator('#play').click(); await page.waitForTimeout(150);
  const stopped = await count(); await page.waitForTimeout(300);
  expect((await count()) - stopped).toBeLessThanOrEqual(3);
});

test('reader text keeps its baseline width on phones and wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 }); await page.goto('./#/item/dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl');
  const article = page.locator('article.reader'), widths: number[] = [];
  await expect(article).toBeVisible();
  for (const width of [320, 390, 760, 1200]) {
    await page.setViewportSize({ width, height: 844 }); await expect(article).toBeVisible();
    widths.push(await article.evaluate(e => e.getBoundingClientRect().width));
  }
  console.log(`Reader text widths at 320/390/760/1200 CSS px: ${widths.map(x => x.toFixed(1)).join('/')}`);
  for (const [actual, expected] of widths.map((width, i) => [width, [284, 347.1, 676.4, 648][i]!] as const))
    expect(Math.abs(actual - expected)).toBeLessThan(1);
});

test('paused native touch swipes remain responsive', async ({ page, context }) => {
  const counts: number[] = [], gaps: number[] = [], cdp = await context.newCDPSession(page);
  const point = (y: number) => [{ x: 190, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  for (let run = 0; run < 5; run++) {
    if (run === 0) await page.goto('./#/item/dua-kumayl'); else await page.reload();
    await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl'); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { window.scrollTo(0, 0); (window as unknown as { sampleTimes: number[] }).sampleTimes = []; window.addEventListener('touchmove', () => (window as unknown as { sampleTimes: number[] }).sampleTimes.push(performance.now()), { passive: true }); });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(700) });
    for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(700 - 550 * i / 12) }); await page.waitForTimeout(10); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const times = await page.evaluate(() => (window as unknown as { sampleTimes: number[] }).sampleTimes);
    counts.push(times.length); gaps.push(times.slice(1).reduce((sum, time, i) => sum + time - times[i]!, 0) / Math.max(1, times.length - 1));
  }
  const middle = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
  console.log(`Paused touch gesture median: ${middle(counts)}/12 events, ${middle(gaps).toFixed(1)} ms spacing`);
  expect(middle(counts)).toBeGreaterThanOrEqual(8); expect(middle(gaps)).toBeLessThan(80);
});
