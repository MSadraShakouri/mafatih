import { expect, test, type Page } from '@playwright/test';

const open = (page: Page) => page.getByRole('button', { name: 'تنظیمات متن' }).click();
const back = (page: Page) => page.getByRole('button', { name: 'بازگشت به دعا' }).click();
const select = (page: Page, name: string) => page.getByRole('button', { name: `دیدن نمونهٔ ${name}` }).click();
const plus = (page: Page, name: string) => page.getByRole('button', { name: `بزرگ‌تر کردن ${name}` });
const minus = (page: Page, name: string) => page.getByRole('button', { name: `کوچک‌تر کردن ${name}` });

interface LineMarker { row: string; language: string; offset: number; top: number }
async function visibleLine(page: Page): Promise<LineMarker> {
  return page.evaluate(() => {
    const targetY = Math.min(120, Math.max(32, innerHeight * 0.2));
    const paragraph = [...document.querySelectorAll<HTMLParagraphElement>('article [data-row-id] p[lang]')].find(element => {
      const box = element.getBoundingClientRect(); return box.bottom > targetY && box.top < innerHeight && box.height > 0;
    });
    if (!paragraph) throw Error('No visible reader paragraph');
    const box = paragraph.getBoundingClientRect();
    const caret = document.caretPositionFromPoint(Math.max(1, Math.min(innerWidth - 1, box.right - 8)),
      Math.max(1, Math.min(innerHeight - 1, Math.max(box.top + 1, targetY))));
    if (!caret || caret.offsetNode !== paragraph.firstChild) throw Error('Reference caret did not hit reader text');
    const range = document.createRange(); range.setStart(caret.offsetNode, caret.offset); range.collapse(true);
    return { row: paragraph.closest<HTMLElement>('[data-row-id]')!.dataset.rowId!, language: paragraph.lang,
      offset: caret.offset, top: range.getBoundingClientRect().top };
  });
}
async function lineTop(page: Page, marker: LineMarker): Promise<number> {
  return page.evaluate(({ row, language, offset }) => {
    const paragraph = [...document.querySelectorAll<HTMLElement>('article [data-row-id]')]
      .find(element => element.dataset.rowId === row)?.querySelector<HTMLParagraphElement>(`p[lang="${language}"]`);
    if (!paragraph?.firstChild) throw Error('Reference line was removed');
    const range = document.createRange(); range.setStart(paragraph.firstChild, offset); range.collapse(true);
    return range.getBoundingClientRect().top;
  }, marker);
}

test('font and independent sizes start at the requested baselines, select before adjusting, and persist', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(test.info().project.use.baseURL as string).origin) foreign.push(request.url()); });
  await page.goto('./#/item/ziyarat-warith');
  const reader = page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-reader-font', 'scheherazade');
  const ar = page.locator('article p[data-text-role="arabic"]').first();
  const fa = page.locator('article p[data-text-role="translation"]').first();
  const note = page.locator('article p[data-text-role="explanation"]').first();
  const sizes = async () => Promise.all([ar, fa, note].map(locator => locator.evaluate(e => parseFloat(getComputedStyle(e).fontSize))));
  expect(await sizes()).toEqual([25.3, 16.5, 14.3]);
  await open(page);
  await expect(page.locator('main[data-screen="settings"]')).toBeVisible();
  expect(await page.locator('.font-name').allTextContents()).toEqual(['شهرزاد نو', 'امیری', 'نوتو نسخ عربی']);
  await expect(page.getByRole('radio', { name: 'شهرزاد نو' })).toBeChecked();
  await expect(page.locator('.size-preview:visible')).toHaveCount(0);
  await expect(plus(page, 'متن عربی')).toBeDisabled();
  await select(page, 'متن عربی');
  await expect(page.locator('#size-preview-arabicSize')).toBeVisible();
  await expect(page.locator('.step-value').nth(0)).toHaveText('۱۰۰٪');
  await expect(plus(page, 'متن عربی')).toBeEnabled();
  await plus(page, 'متن عربی').click();
  await expect(page.locator('.step-value').nth(0)).toHaveText('۱۰۴٪');
  await select(page, 'ترجمهٔ فارسی');
  await expect(page.locator('#size-preview-arabicSize')).toBeHidden();
  await expect(page.locator('#size-preview-translationSize')).toBeVisible();
  await plus(page, 'ترجمهٔ فارسی').click(); await plus(page, 'ترجمهٔ فارسی').click();
  await select(page, 'توضیحات'); await minus(page, 'توضیحات').click();
  await page.getByText('نوتو نسخ عربی', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'نوتو نسخ عربی' })).toBeChecked();
  await expect(page.getByRole('button', { name: /بازنشانی/ })).toHaveCount(0);
  await expect(page.getByText('دربارهٔ قلم‌ها و مجوز آن‌ها')).toHaveCount(0);
  await back(page); await expect(reader).toHaveAttribute('data-reader-font', 'noto-naskh');
  const changed = await sizes();
  expect(changed[0]).toBeCloseTo(25.3 * 1.04, 2); expect(changed[1]).toBeCloseTo(16.5 * 1.09, 2); expect(changed[2]).toBeCloseTo(14.3 * .96, 2);
  await page.reload(); await expect(reader).toHaveAttribute('data-reader-font', 'noto-naskh');
  const reloaded = await sizes(); expect(reloaded[0]).toBeCloseTo(changed[0]!, 2); expect(reloaded[1]).toBeCloseTo(changed[1]!, 2); expect(reloaded[2]).toBeCloseTo(changed[2]!, 2);
  expect(foreign).toEqual([]);
});

test('all size levels are reachable in both directions with no change on the first tap', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await open(page);
  await select(page, 'توضیحات'); const output = page.locator('.step-value').nth(2);
  await expect(output).toHaveText('۱۰۰٪');
  await minus(page, 'توضیحات').evaluate(button => { for (let i = 0; i < 32; i++) (button as HTMLButtonElement).click(); });
  await expect(output).toHaveText('۲۵٪'); await expect(minus(page, 'توضیحات')).toBeDisabled();
  await plus(page, 'توضیحات').evaluate(button => { for (let i = 0; i < 64; i++) (button as HTMLButtonElement).click(); });
  await expect(output).toHaveText('۴۰۰٪'); await expect(plus(page, 'توضیحات')).toBeDisabled();
  await minus(page, 'توضیحات').evaluate(button => { for (let i = 0; i < 32; i++) (button as HTMLButtonElement).click(); });
  await expect(output).toHaveText('۱۰۰٪');
});

test('returning from settings and resizing preserves the same visible line of a long row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('./#/item/namaz-hnvt-myt?row=r00002&lang=fa&offset=600');
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00002');
  const marker = await visibleLine(page); expect(marker.row).toBe('r00002'); expect(marker.offset).toBeGreaterThan(400);
  await open(page); await select(page, 'ترجمهٔ فارسی');
  await plus(page, 'ترجمهٔ فارسی').evaluate(button => { for (let i = 0; i < 12; i++) (button as HTMLButtonElement).click(); });
  await page.getByText('امیری', { exact: true }).click(); await back(page);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-reader-font', 'amiri');
  await expect.poll(async () => Math.abs(await lineTop(page, marker) - marker.top)).toBeLessThan(3);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const resized = await visibleLine(page); await page.setViewportSize({ width: 660, height: 600 });
  await expect.poll(async () => Math.abs(await lineTop(page, resized) - resized.top)).toBeLessThan(3);
});

test('position restoration works without caret-from-point APIs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('./#/item/namaz-hnvt-myt?row=r00002&lang=fa&offset=600');
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00002');
  const marker = await visibleLine(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'caretPositionFromPoint', { value: undefined, configurable: true });
    Object.defineProperty(document, 'caretRangeFromPoint', { value: undefined, configurable: true });
  });
  await open(page); await select(page, 'ترجمهٔ فارسی'); await plus(page, 'ترجمهٔ فارسی').click(); await back(page);
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  expect(Math.abs(await lineTop(page, marker) - marker.top)).toBeLessThan(3);
});

test('a saved font loads before a deep link is positioned below the header', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await context.route('**/*NotoNaskhArabic-Regular*.ttf', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.continue(); });
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({ font: 'noto-naskh', arabicSize: 165, translationSize: 100, explanationSize: 100 })));
  await page.goto('./#/item/amal-ttmh-aamal-mbas?row=r00009&lang=ar&offset=600');
  const reader = page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-anchor-row', 'r00009'); await expect(reader).toHaveAttribute('data-reader-font', 'noto-naskh');
  const top = await page.evaluate(() => {
    const paragraph = document.querySelector('[data-row-id="r00009"] p[lang="ar"]')!;
    const utf16 = Array.from(paragraph.textContent!).slice(0, 600).join('').length;
    const range = document.createRange(); range.setStart(paragraph.firstChild!, utf16); range.collapse(true);
    return range.getBoundingClientRect().top;
  });
  expect(top).toBeGreaterThanOrEqual(48); expect(top).toBeLessThan(120);
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('preferences continue in memory when local storage is blocked', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get: () => { throw Error('blocked'); } }));
  await page.goto('./#/item/dua-kumayl'); await open(page); await select(page, 'متن عربی'); await plus(page, 'متن عربی').click(); await back(page);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await page.evaluate(() => { location.hash = '#/item/ziyarat-warith'; });
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'ziyarat-warith');
  const size = await page.locator('article p[data-text-role="arabic"]').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  expect(size).toBeCloseTo(25.3 * 1.04, 2);
});
