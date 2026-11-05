import { expect, test } from '@playwright/test';

async function openSearch(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  return page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
}
async function complete(page: import('@playwright/test').Page) {
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 20000 });
}

test('visible multiword results stay grouped and prioritize word-count, star, then Arabic', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('الهی ربی');
  await complete(page);
  const sections = page.locator('[data-search-results] > section');
  await expect(sections).toHaveCount(2);
  await expect(sections.nth(0)).toHaveAttribute('data-search-section', 'toc');
  await expect(sections.nth(1)).toHaveAttribute('data-search-section', 'text');
  const ranks = await sections.nth(1).locator('li').evaluateAll(rows => rows.map(row => ({
    count: row.querySelector('.search-match-count')?.textContent?.includes('۲') ? 2 : 1,
    featured: Boolean(row.querySelector('.featured-mark')),
    language: row.getAttribute('data-language'),
  })));
  expect(ranks.some(row => row.count === 2)).toBe(true);
  expect(ranks.some(row => row.count === 1)).toBe(true); // OR, not AND
  for (let i = 1; i < ranks.length; i += 1) {
    expect(ranks[i - 1]!.count).toBeGreaterThanOrEqual(ranks[i]!.count);
    if (ranks[i - 1]!.count === ranks[i]!.count && !ranks[i - 1]!.featured) expect(ranks[i]!.featured).toBe(false);
    if (ranks[i - 1]!.count === ranks[i]!.count && ranks[i - 1]!.featured === ranks[i]!.featured && ranks[i - 1]!.language === 'fa') {
      expect(ranks[i]!.language).not.toBe('ar');
    }
  }
});

test('switching both language filters reuses results without changing the TOC section', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('الله');
  await complete(page);
  const tocHeading = await page.locator('[data-search-section="toc"] h2').textContent();
  const arabic = page.getByRole('checkbox', { name: 'عربی' });
  const persian = page.getByRole('checkbox', { name: 'فارسی' });
  await arabic.uncheck();
  await complete(page);
  await expect(page.locator('[data-search-section="toc"] h2')).toHaveText(tocHeading!);
  await expect(page.locator('[data-search-section="text"] [data-language="ar"]')).toHaveCount(0);
  await expect(page.locator('[data-search-section="text"] [data-language="fa"]').first()).toBeVisible();
  await persian.uncheck();
  await complete(page);
  await expect(page.locator('[data-search-section="toc"] h2')).toHaveText(tocHeading!);
  await expect(page.locator('[data-search-section="text"] li')).toHaveCount(0);
  await arabic.check();
  await complete(page);
  await expect(page.locator('[data-search-section="text"] [data-language="fa"]')).toHaveCount(0);
  await expect(page.locator('[data-search-section="text"] [data-language="ar"]').first()).toBeVisible();
});

test('typing and replacing an unaccented multiword query while shards load never shows stale results', async ({ page, context }) => {
  await context.route('**/data/search/*.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.continue();
  });
  const input = await openSearch(page);
  await input.pressSequentially('بسم الله الرحمن الرحیم', { delay: 5 });
  await input.fill('کمیل');
  await complete(page);
  await expect(input).toHaveValue('کمیل');
  await expect(page.locator('[data-search-section="text"] li')).toHaveCount(5);
  await expect(page.locator('[data-search-section="text"] [data-item-id="amal-fzylt-msjd-kvfh"][data-row-id="r00003"]')).toHaveCount(0);
  await expect(page.locator('[data-search-section="toc"] [data-item-id="dua-kumayl"]')).toBeVisible();
});
