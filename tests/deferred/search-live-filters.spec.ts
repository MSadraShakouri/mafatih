import { expect, test } from '@playwright/test';
import { normalizeSearch } from '../../src/normalize.js';

async function openSearch(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  return page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
}
async function complete(page: import('@playwright/test').Page) {
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 20000 });
}

test('ordered exact text wins over weak TOC and split rows show matching source excerpts', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('عظم البلاء و برح الخفاء');
  await complete(page);
  const sections = page.locator('[data-search-results] > section');
  await expect(sections).toHaveCount(1);
  await expect(sections).toHaveAttribute('data-search-section', 'results');
  const first = sections.locator('li').first();
  await expect(first).toHaveAttribute('data-search-kind', 'text');
  await expect(first).toHaveAttribute('data-item-id', 'dua-azm-al-bala');
  await expect(first).toHaveAttribute('data-row-id', 'r00002');
  await expect(first.locator('.search-kind')).toHaveText('متن عربی');
  await expect(first.locator('.search-match-count')).toHaveText('۵ واژه');
  await expect(first.locator('.featured-mark')).toBeVisible();
  const unstarred = sections.locator('li').nth(1);
  await expect(unstarred).toHaveAttribute('data-item-id', 'namaz-sahb-alzman-alyh');
  await expect(unstarred.locator('.search-match-count')).toHaveText('۵ واژه');
  await expect(unstarred.locator('.featured-mark')).toHaveCount(0);
  const continuation = first.locator('[data-continuation-row="r00003"]');
  await expect(continuation).toBeVisible();
  const marks = (await continuation.locator('mark').allTextContents()).map(normalizeSearch);
  expect(marks.some(mark => mark.includes('برح'))).toBe(true);
  expect(marks.some(mark => mark.includes('الخفاء'))).toBe(true);
  await first.locator('a').click();
  await expect(page).toHaveURL(/#\/item\/dua-azm-al-bala\?row=r00002&lang=ar&offset=/);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00002');
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('switching both language filters retains TOC counts in the unified list', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('الله');
  await complete(page);
  const counts = page.locator('.search-counts');
  const label = (await counts.textContent())!.match(/فهرست: [۰-۹]+/)![0];
  const arabic = page.getByRole('checkbox', { name: 'عربی' });
  const persian = page.getByRole('checkbox', { name: 'فارسی' });
  await arabic.uncheck();
  await complete(page);
  await expect(counts).toContainText(label);
  await expect(page.locator('[data-search-kind="text"][data-language="ar"]')).toHaveCount(0);
  await expect(page.locator('[data-search-kind="text"][data-language="fa"]').first()).toBeVisible();
  await persian.uncheck();
  await complete(page);
  await expect(counts).toContainText(label);
  await expect(page.locator('[data-search-kind="text"]')).toHaveCount(0);
  await expect(page.locator('[data-search-kind="toc"]').first()).toBeVisible();
  await arabic.check();
  await complete(page);
  await expect(page.locator('[data-search-kind="text"][data-language="fa"]')).toHaveCount(0);
  await expect(page.locator('[data-search-kind="text"][data-language="ar"]').first()).toBeVisible();
});

test('typing and replacing an unaccented multiword query while shards load settles on the latest results', async ({ page, context }) => {
  await context.route('**/data/search/*.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.continue();
  });
  const input = await openSearch(page);
  await input.pressSequentially('بسم الله الرحمن الرحیم', { delay: 5 });
  await input.fill('کمیل');
  await complete(page);
  await expect(input).toHaveValue('کمیل');
  await expect(page.locator('[data-search-kind="text"]')).toHaveCount(5);
  await expect(page.locator('[data-search-kind="text"][data-item-id="amal-fzylt-msjd-kvfh"][data-row-id="r00003"]')).toHaveCount(0);
  await expect(page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]')).toBeVisible();
});
