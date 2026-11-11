import { expect, test, type Page } from '@playwright/test';

// These use the real built app and Chromium emulation, not a physical device.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test.setTimeout(60_000);
const reader = (page: Page) => page.locator('main[data-screen="reader"]');
const markerY = (page: Page) => page.locator('#current-marker').evaluate(element => {
  const box = element.getBoundingClientRect(); return box.top + box.height / 2;
});
const anchorLine = (page: Page, language: 'ar' | 'fa') => page.evaluate(language => {
  const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
  const paragraph = main.querySelector<HTMLElement>(`[data-row-id="${main.dataset.anchorRow}"] p[lang="${language}"]`)!;
  const text = paragraph.textContent ?? '', codePoints = Number(main.dataset.anchorOffset);
  let remaining = Array.from(text).slice(0, codePoints).join('').length;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (remaining <= node.length) {
      const range = document.createRange(); range.setStart(node, remaining); range.collapse(true);
      const box = range.getBoundingClientRect();
      return { line: box.top + box.height / 2, top: box.top, height: box.height,
        scroll: window.scrollY, maximum: document.documentElement.scrollHeight - innerHeight };
    }
    remaining -= node.length;
  }
  throw Error('The recorded source offset could not be mapped through the reader DOM');
}, language);

async function expectGlobalComplete(page: Page): Promise<void> {
  await expect(page.locator('.search-results-count')).toContainText('نتیجه', { timeout: 40_000 });
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
}


test('a global text result is placed on the reader pointer', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('الهم');
  await expectGlobalComplete(page);
  const hit = page.locator('.search-result[data-item-id="dua-kumayl"][data-row-id="r00012"]');
  await expect(hit).toBeVisible(); await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00012');
  await expect(page.locator('#current-marker')).toBeVisible();
  const result = await anchorLine(page, 'ar'), pointer = await markerY(page);
  console.log(`Global matched line ${result.line.toFixed(1)}px; pointer ${pointer.toFixed(1)}px`);
  expect(result.height).toBeGreaterThan(0);
  expect(Math.abs(result.line - pointer), 'matched line and pointer should coincide').toBeLessThan(2);
  await expect(page.locator('article mark')).toHaveCount(0);
});


test('an in-text result moves to the chosen pointer while leaving search open and paused', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('#current-marker')).toBeVisible();
  await page.locator('#current-marker').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
  const chosen = await markerY(page);
  await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill('الهم');
  const hit = page.locator('.result-row[data-row-id="r00028"][data-language="ar"]');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00028');
  await expect(input).toBeVisible(); await expect(page.locator('.result-popover')).toBeHidden();
  await expect(page.locator('#current-marker')).toBeHidden();
  await expect(page.locator('#guide-layer')).toBeHidden();
  const flash = () => page.evaluate(() => Boolean((CSS as any).highlights?.has('active-search-match')));
  expect(await flash()).toBe(true);
  await expect.poll(flash, { timeout: 4000 }).toBe(false);
  await expect(page.locator('#current-marker')).toBeHidden();
  const result = await anchorLine(page, 'ar');
  console.log(`In-text matched line ${result.line.toFixed(1)}px; chosen pointer ${chosen.toFixed(1)}px`);
  expect(Math.abs(result.line - chosen), 'match should move to the chosen pointer position').toBeLessThan(2);
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await expect(page.locator('#current-marker')).toBeVisible();
  expect(Math.abs((await markerY(page)) - chosen)).toBeLessThan(2);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'false');
});


test('near the beginning, the pointer moves only as needed when the page cannot scroll farther', async ({ page }) => {
  await page.goto('./#/item/sura-yasin');
  await expect(page.locator('#current-marker')).toBeVisible();
  const initial = await markerY(page);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('بسم');
  const hit = page.locator('.result-row[data-row-id="r00002"][data-language="ar"]');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00002');
  const line = await anchorLine(page, 'ar');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await expect(page.locator('#current-marker')).toBeVisible();
  const pointer = await markerY(page);
  console.log(`Beginning-edge line ${line.line.toFixed(1)}px; pointer ${pointer.toFixed(1)}px (initial ${initial.toFixed(1)}px)`);
  expect(Math.abs(pointer - line.line), 'pointer should meet the line when scrolling is clamped').toBeLessThan(2);
  expect(line.scroll).toBeLessThanOrEqual(1);
  expect(pointer).toBeLessThan(initial - 100);
  const header = await page.locator('.reader-header').boundingBox();
  expect(pointer).toBeGreaterThan(header!.y + header!.height);
});


test('a global result near the beginning also adjusts the pointer when necessary', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('بسم');
  await expectGlobalComplete(page);
  const hit = page.locator('.search-result[data-item-id="sura-yasin"][data-row-id="r00002"]');
  await expect(hit).toBeVisible(); await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00002');
  const line = await anchorLine(page, 'ar'), pointer = await markerY(page);
  console.log(`Global beginning-edge line ${line.line.toFixed(1)}px; pointer ${pointer.toFixed(1)}px`);
  expect(Math.abs(pointer - line.line)).toBeLessThan(2);
  expect(line.scroll).toBeLessThanOrEqual(1);
  expect(pointer).toBeLessThan(300);
});


test('near the end, the pointer moves down only as needed when scrolling reaches the bottom', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('#current-marker')).toBeVisible();
  await page.locator('#current-marker').focus(); await page.keyboard.press('End');
  const chosen = await markerY(page);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الميامين');
  const hit = page.locator('.result-row[data-row-id="r00267"][data-language="ar"]');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00267');
  const line = await anchorLine(page, 'ar');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  const pointer = await markerY(page);
  console.log(`Ending-edge line ${line.line.toFixed(1)}px; pointer ${pointer.toFixed(1)}px (initial ${chosen.toFixed(1)}px)`);
  expect(Math.abs(pointer - line.line)).toBeLessThan(2);
  expect(Math.abs(line.maximum - line.scroll)).toBeLessThanOrEqual(1);
  expect(pointer).toBeGreaterThan(chosen + 100);
});


test('a short item that cannot scroll moves the pointer to the match', async ({ page }) => {
  await page.goto('./#/item/khavas-tavyz-nashnvayy-gvsh');
  await expect(page.locator('#current-marker')).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('باقر');
  const hit = page.locator('.result-row[data-row-id="r00001"][data-language="ar"]');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.locator('button').click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00001');
  const line = await anchorLine(page, 'ar');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  const pointer = await markerY(page);
  console.log(`Short-item line ${line.line.toFixed(1)}px; pointer ${pointer.toFixed(1)}px`);
  expect(line.maximum).toBeLessThanOrEqual(1);
  expect(Math.abs(pointer - line.line)).toBeLessThan(2);
});
