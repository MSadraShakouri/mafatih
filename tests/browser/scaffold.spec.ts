import { expect, test } from '@playwright/test';

test('the real catalog and an item load without requests to another origin', async ({ page }) => {
  const otherOrigins: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(test.info().project.use.baseURL as string).origin) otherOrigins.push(url.href);
  });

  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();

  await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
  await page.getByRole('link', { name: 'ادعیه', exact: true }).click();
  await page.getByRole('link', { name: 'فصل ششم: بیان بعضی از دعاهای مشهور' }).click();
  const firstItem = page.locator('a[data-item-id="dua-kumayl"]');
  await expect(firstItem).toBeVisible();
  await firstItem.click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(page.locator('article [data-row-id]').first()).toBeVisible();
  await expect(page.locator('article p').first()).toBeVisible();
  expect(otherOrigins).toEqual([]);
});

test('a direct item route survives reload under each deployment base', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  const reader = page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-item-id', 'dua-kumayl');
  const rowCount = await page.locator('article [data-row-id]').count();
  expect(rowCount).toBeGreaterThan(0);
  await page.reload();
  await expect(reader).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(page.locator('article [data-row-id]')).toHaveCount(rowCount);
  await expect(page.locator('article p[lang="fa"][dir="rtl"]').first()).toBeVisible();
  await expect(page.locator('article p[lang="ar"][dir="rtl"]').first()).toBeVisible();
});

test('an invalid route is reported without treating it as a file path', async ({ page }) => {
  const itemRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/data/items/')) itemRequests.push(request.url());
  });
  await page.goto('./#/item/%2e%2e');
  await expect(page.getByRole('status')).toContainText('پیدا نشد');
  expect(itemRequests).toEqual([]);
});
