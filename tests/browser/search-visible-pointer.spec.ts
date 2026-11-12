import { expect, test, type Page } from '@playwright/test';

// Real app routes in Chromium mobile emulation; this is not an Android device test.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test.setTimeout(60_000);
const reader = (page: Page) => page.locator('main[data-screen="reader"]');
const marker = (page: Page) => page.locator('#current-marker');
const markerY = (page: Page) => marker(page).evaluate(element => {
  const box = element.getBoundingClientRect(); return box.top + box.height / 2;
});
const anchorLine = (page: Page) => page.evaluate(() => {
  const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
  const paragraph = main.querySelector<HTMLElement>(`[data-row-id="${main.dataset.anchorRow}"] p[lang="ar"]`)!;
  let remaining = Array.from(paragraph.textContent ?? '').slice(0, Number(main.dataset.anchorOffset)).join('').length;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (remaining <= node.length) {
      const range = document.createRange(); range.setStart(node, remaining); range.collapse(true);
      const box = range.getBoundingClientRect(); return box.top + box.height / 2;
    }
    remaining -= node.length;
  }
  throw Error('The original match offset could not be mapped through the reader DOM');
});

async function dragPointer(page: Page, x: number, y: number, distance: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const at = (v: number) => [{ x, y: v, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(y) });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(y + distance * i / 6) });
      await page.waitForTimeout(12);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

test('the pointer remains visible and movable during in-text search, with the query retained', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await expect(marker(page)).toBeVisible();
  await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await expect(marker(page)).toBeVisible();
  await expect(marker(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('#guide-layer')).toBeVisible();
  const stoppedAt = await page.evaluate(() => scrollY);
  await page.waitForTimeout(350);
  expect(Math.abs((await page.evaluate(() => scrollY)) - stoppedAt), 'opening search stops auto-scroll').toBeLessThan(2);

  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  const results = page.locator('.result-popover');
  await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const hit = page.locator('.result-row[data-row-id="r00028"][data-language="ar"]');
  await expect(hit).toBeVisible();
  const box = (await marker(page).boundingBox())!;
  const before = await markerY(page), scrollBeforeDrag = await page.evaluate(() => scrollY);
  await dragPointer(page, box.x + box.width - 60, before, 90);
  expect((await markerY(page)) - before, 'the usual Comfort grip moves the pointer').toBeGreaterThan(80);
  expect(Math.abs((await page.evaluate(() => scrollY)) - scrollBeforeDrag), 'dragging the pointer must not scroll the reader').toBeLessThan(2);
  await expect(results).toBeVisible();

  await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00028');
  await expect(results).toBeHidden();
  await expect(input).toHaveValue('الهم');
  await expect(marker(page)).toBeVisible(); await expect(page.locator('#guide-layer')).toBeVisible();
  expect(Math.abs((await anchorLine(page)) - (await markerY(page))), 'the selected match meets the moved pointer').toBeLessThan(2);
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: 'نمایش فهرست نتایج' }).click();
  await expect(results).toBeVisible(); await expect(input).toHaveValue('الهم');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(input).toHaveValue('الهم'); await expect(marker(page)).toBeVisible();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
});

test('search results and the pointer both remain usable when their vertical positions overlap', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  const results = page.locator('.result-popover');
  await expect(results).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const hit = page.locator('.result-row').first(), button = hit.locator('button');
  await expect(button).toBeVisible(); await expect(marker(page)).toBeVisible();
  const row = await hit.getAttribute('data-row-id'), box = (await button.boundingBox())!;
  await marker(page).focus(); await page.keyboard.press('End');
  const steps = Math.max(0, Math.round((box.y + box.height / 2 - (await markerY(page))) / 16));
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowDown');
  const y = await markerY(page);
  expect(y).toBeGreaterThan(box.y); expect(y).toBeLessThan(box.y + box.height);
  await expect(results).toBeVisible();
  const x = box.x + box.width - 6;
  const targetIsResult = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.result-row button')), { x, y });
  expect(targetIsResult, 'the marker grip must not steal the right side of a result').toBe(true);
  const markerBox = (await marker(page).boundingBox())!;
  const targetIsMarker = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('#current-marker')),
    { x: markerBox.x + markerBox.width - 5, y });
  expect(targetIsMarker, 'the pointer itself remains visible and reachable at the edge').toBe(true);
  await page.mouse.click(x, y);
  await expect(reader(page)).toHaveAttribute('data-anchor-row', row!);
  await expect(results).toBeHidden(); await expect(input).toHaveValue('الهم');

  await page.getByRole('button', { name: 'نمایش فهرست نتایج' }).click();
  await expect(results).toBeVisible();
  const nowBox = (await marker(page).boundingBox())!, before = await markerY(page);
  await dragPointer(page, nowBox.x + nowBox.width - 5, before, 80);
  expect((await markerY(page)) - before, 'the pointer can be dragged beside an open results panel').toBeGreaterThan(70);
  await expect(results).toBeVisible();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
});

test('the result panel keeps its previous usable width across screen sizes', async ({ page }) => {
  for (const width of [320, 390, 760, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('./#/item/dua-kumayl');
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    const results = page.locator('.result-popover'); await expect(results).toBeVisible();
    const dimensions = await results.evaluate(node => {
      const element = node as HTMLElement, after = element.getBoundingClientRect().width;
      // Measure the previous symmetric inset with the same viewport and content.
      element.style.left = '12px'; element.style.right = '12px';
      const before = element.getBoundingClientRect().width;
      element.style.removeProperty('left'); element.style.removeProperty('right');
      return { before, after };
    });
    console.log(`Search results width at ${width}px: ${dimensions.before.toFixed(1)} → ${dimensions.after.toFixed(1)}px`);
    expect(dimensions.after).toBeCloseTo(dimensions.before, 1);
  }
});

test('backgrounding search hides the pointer and foregrounding restores it without starting playback', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(marker(page)).toBeVisible();
  const visibility = (hidden: boolean) => page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await visibility(true); await expect(marker(page)).toBeHidden();
  await visibility(false); await expect(marker(page)).toBeVisible();
  await expect(marker(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
});
