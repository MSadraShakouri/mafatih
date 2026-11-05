import { expect, test } from '@playwright/test';
import { normalizeSearch } from '../../src/normalize.js';

test('live search shows TOC results before delayed text shards at both deployment bases', async ({ page, context }) => {
  await context.route('**/data/search/*.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  const foreign: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== new URL(test.info().project.use.baseURL as string).origin) foreign.push(request.url());
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  const query = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await query.fill('کمیل');
  const contents = page.locator('[data-search-section="toc"]');
  await expect(contents.locator('[data-item-id="dua-kumayl"]')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('در حال جست‌وجو');
  await expect(contents.locator('[data-item-id="dua-kumayl"] mark')).toContainText('کمیل');
  await expect(contents.locator('[data-item-id="dua-kumayl"] .featured-mark')).toBeVisible();
  await expect(page.locator('[data-search-section="text"]')).toBeVisible();
  expect(foreign).toEqual([]);
});

test('searching a reader shares the index, limits results to that item, and opens an unmarked row', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این مطلب' }).fill('الهی ربی');
  const result = page.locator('[data-search-section="text"] [data-item-id="dua-kumayl"][data-row-id="r00076"][data-language="ar"]');
  await expect(result).toBeVisible();
  await expect(result.locator('mark').first()).toBeVisible();
  await result.locator('a').click();
  await expect(page).toHaveURL(/#\/item\/dua-kumayl\?row=r00076&lang=ar&offset=/);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(page.locator('article [data-row-id="r00076"] p[lang="ar"]')).toBeVisible();
  await expect(page.locator('article mark')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('long-row search links open at the matching line, not just at the start of the row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('./#/item/namaz-hnvt-myt');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این مطلب' }).fill('جماعت');
  const result = page.locator('[data-search-section="text"] [data-row-id="r00002"][data-language="fa"]');
  await expect(result).toBeVisible();
  await result.locator('a').click();
  await expect(page).toHaveURL(/row=r00002&lang=fa&offset=/);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00002');
  const location = await page.evaluate(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const offset = Number(params.get('offset'));
    const paragraph = document.querySelector('[data-row-id="r00002"] p[lang="fa"]')!;
    const text = paragraph.textContent!;
    const utf16 = Array.from(text).slice(0, offset).join('').length;
    const range = document.createRange();
    range.setStart(paragraph.firstChild!, utf16);
    range.collapse(true);
    return { offset, lineTop: range.getBoundingClientRect().top, paragraphTop: paragraph.getBoundingClientRect().top };
  });
  expect(location.offset).toBeGreaterThan(500);
  expect(location.lineTop).toBeGreaterThanOrEqual(0);
  expect(location.lineTop).toBeLessThan(120);
  expect(location.paragraphTop).toBeLessThan(-100);
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('rapid query changes discard stale display updates and language filters affect text results', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این مطلب' });
  await input.fill('رحمان');
  await input.fill('الهی');
  await expect(page.locator('[data-search-section="text"] [data-language="ar"]').first()).toBeVisible();
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 15000 });
  const snippets = await page.locator('[data-search-section="text"] .search-excerpt').allTextContents();
  expect(snippets.length).toBeGreaterThan(0);
  for (const text of snippets) expect(normalizeSearch(text).replace(/ /g, '')).toContain('الهی');
  await page.getByRole('checkbox', { name: 'عربی' }).uncheck();
  await expect(page.locator('[data-search-section="text"] [data-language="ar"]')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 15000 });
  await expect(page.locator('[data-search-section="text"] [data-language="ar"]')).toHaveCount(0);
  await expect(input).toHaveValue('الهی');
});

test('a failed search shard offers a retry and rebuilds the worker', async ({ page, context }) => {
  let failOnce = true;
  await context.route('**/data/search/*.json', async route => {
    if (failOnce) {
      failOnce = false;
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('کمیل');
  await expect(page.getByRole('status')).toContainText('ناموفق', { timeout: 15000 });
  // A previously queued partial snapshot must not replace the retry control.
  await page.waitForTimeout(180);
  await expect(page.getByRole('button', { name: 'تلاش دوباره' })).toBeVisible();
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await expect(page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 15000 });
  await expect(page.locator('[data-search-section="text"] li').first()).toBeVisible();
});
