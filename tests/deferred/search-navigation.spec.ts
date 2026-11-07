import { expect, test } from '@playwright/test';

test('a TOC heading result returns to the corresponding heading without opening an item', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('تعقیبات');
  const result = page.locator('[data-search-kind="toc"][data-result-key="toc:0.4.1.2"]');
  await expect(result).toBeVisible();
  await result.getByRole('button').click();
  await expect(page.locator('#search-panel')).toBeHidden();
  await expect(page.locator('[data-toc-path="0.4.1.2"] > span')).toBeFocused();
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
});

test('show more works when its button has keyboard focus', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('الله');
  const section = page.locator('[data-search-section="results"]');
  const more = section.getByRole('button', { name: 'نمایش بیشتر' });
  await expect(more).toBeVisible();
  await more.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => section.locator('li').count()).toBeGreaterThan(30);
  await expect(section.locator('li').nth(30).locator('a, button').first()).toBeFocused();
});

test('the same search worker and index are reused when moving from library to reader', async ({ page, context }) => {
  let indexRequests = 0;
  context.on('request', request => { if (request.url().includes('/data/search-index.json')) indexRequests += 1; });
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill('کمیل');
  const result = page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"] a');
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این مطلب' }).fill('کمیل');
  await expect(page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]')).toBeVisible();
  expect(indexRequests).toBe(1);
});
