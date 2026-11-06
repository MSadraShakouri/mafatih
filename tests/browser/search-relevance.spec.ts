import { expect, test } from '@playwright/test';
import { normalizeSearch } from '../../src/normalize.js';

async function open(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  return page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
}
async function complete(page: import('@playwright/test').Page) {
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 20000 });
}

test('real unaccented queries surface the phrase and the long prayer before unrelated titles', async ({ page }) => {
  const input = await open(page);
  await input.fill('یا رب');
  await complete(page);
  let first = page.locator('[data-search-section="results"] li').first();
  await expect(first).toHaveAttribute('data-search-kind', 'text');
  await expect(first).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(first).toHaveAttribute('data-row-id', 'r00098');
  const marks = (await first.locator('mark').allTextContents()).map(normalizeSearch);
  expect(marks.some(mark => mark.includes('یا'))).toBe(true);
  expect(marks.some(mark => mark.includes('رب'))).toBe(true);

  await input.fill('الهی عظم البلا');
  await complete(page);
  first = page.locator('[data-search-section="results"] li').first();
  await expect(first).toHaveAttribute('data-item-id', 'dua-frj-zman-ajl');
  await expect(first).toHaveAttribute('data-row-id', 'r00003');
  await expect(page.locator('[data-search-section="results"] li').nth(1)).toHaveAttribute('data-search-kind', 'toc');
});

test('a mistyped middle term still leaves a strong nearby sequence near the top', async ({ page }) => {
  const input = await open(page);
  await input.fill('الهی اشتباه البلا و برح الخفاء');
  await complete(page);
  const target = page.locator('[data-search-kind="text"][data-item-id="dua-frj-zman-ajl"][data-row-id="r00003"][data-language="ar"]');
  await expect(target).toBeVisible();
  const rank = await target.evaluate(row => [...row.parentElement!.children].indexOf(row));
  expect(rank).toBeLessThan(5);
  await expect(target.locator('.search-matched-terms')).toContainText('الهی');
  await expect(target.locator('.search-matched-terms')).not.toContainText('اشتباه');
});

test('the split variation previews all three source rows and navigates to the first matching row', async ({ page }) => {
  const input = await open(page);
  await input.fill('الهی عظم البلا و برح الخفا و انکشف الغطا');
  await complete(page);
  const second = page.locator('[data-search-section="results"] li').nth(1);
  await expect(second).toHaveAttribute('data-item-id', 'dua-azm-al-bala');
  await expect(second).toHaveAttribute('data-row-id', 'r00002');
  await expect(second.locator('[data-continuation-row="r00003"] mark').first()).toBeVisible();
  await expect(second.locator('[data-continuation-row="r00004"] mark').first()).toBeVisible();
  await second.locator('a').click();
  await expect(page).toHaveURL(/row=r00002&lang=ar&offset=/);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00002');
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('stale version 3 search indexes are rejected and retry loads version 4', async ({ page, context }) => {
  let old = true;
  await context.route('**/data/search-index.json', async route => {
    if (old) {
      old = false;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 3, normalization: 'nfkd-search-v2', records: [], shards: [] }) });
    } else await route.continue();
  });
  const input = await open(page);
  await input.fill('کمیل');
  await expect(page.getByRole('status')).toContainText('ناموفق', { timeout: 15000 });
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await complete(page);
  await expect(page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]')).toBeVisible();
});

test('stale version 3 shards are rejected and a fresh retry can finish', async ({ page, context }) => {
  let old = true;
  await context.route('**/data/search/*.json', async route => {
    if (old) {
      old = false;
      const response = await route.fetch();
      const payload = await response.json();
      await route.fulfill({ response, json: { ...payload, version: 3 } });
    } else await route.continue();
  });
  const input = await open(page);
  await input.fill('کمیل');
  await expect(page.getByRole('status')).toContainText('ناموفق', { timeout: 15000 });
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await complete(page);
  await expect(page.locator('[data-search-kind="text"][data-item-id="dua-kumayl"]').first()).toBeVisible();
});

test('a cached common word emits provisional hits while the new sequence is still ranked', async ({ page }) => {
  const input = await open(page);
  await input.fill('و');
  await complete(page);
  await input.fill('و الهی عظم البلا و برح الخفا و انکشف الغطا');
  await expect(page.locator('[data-search-section="results"] li').first()).toBeVisible();
  await expect(page.getByRole('status')).toContainText('در حال جست‌وجو');
  await complete(page);
  const first = page.locator('[data-search-section="results"] li').first();
  await expect(first).toHaveAttribute('data-item-id', 'dua-frj-zman-ajl');
  await expect(first).toHaveAttribute('data-row-id', 'r00003');
});
