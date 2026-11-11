import { expect, test } from '@playwright/test';

const bookmark = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'نشان شخصی', exact: true });

test('item bookmarks toggle, survive reload, open from the list, and can be removed', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 1500 });
  await page.evaluate(() => window.scrollTo(0, 2200));
  await bookmark(page).click(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await page.goto('./#/bookmarks');
  const saved = page.locator('a[data-item-id="dua-kumayl"]'); await expect(saved).toBeVisible();
  await expect(saved).toContainText('دعای کمیل'); await saved.click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0); // The bookmark is an item, not a position.
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true'); await bookmark(page).click();
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'false'); await page.goto('./#/bookmarks');
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toHaveCount(0);
  await expect(page.locator('.library-empty')).toBeVisible();
});

test('bookmarks are personal, independent from featured items, and work in the search header', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 1500 });
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(bookmark(page)).toBeVisible(); await bookmark(page).click(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await page.goto('./#/contents/featured'); await expect(page.locator('a[data-item-id="dua-kumayl"]')).toBeVisible();
  const featured = await page.locator('a[data-item-id]').count();
  await page.goto('./#/item/dua-kumayl'); await bookmark(page).click();
  await page.goto('./#/contents/featured'); await expect(page.locator('a[data-item-id]')).toHaveCount(featured);
});

test('multiple saved items remain distinct and keep their insertion order after reload', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await bookmark(page).click();
  await page.evaluate(() => { location.hash = '#/item/sura-yasin'; });
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'sura-yasin');
  await bookmark(page).click(); await page.reload();
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { location.hash = '#/bookmarks'; });
  await expect(page.locator('a[data-item-id]')).toHaveCount(2);
  expect(await page.locator('a[data-item-id]').evaluateAll(links => links.map(link => (link as HTMLElement).dataset.itemId))).toEqual(['dua-kumayl', 'sura-yasin']);
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toContainText('دعای کمیل');
  await expect(page.locator('a[data-item-id="sura-yasin"]')).toContainText('یس');
  await page.locator('a[data-item-id="sura-yasin"]').click(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
});

test('saved links survive a catalog failure and resolve their titles on a later visit', async ({ page, context }) => {
  await page.goto('./#/item/dua-kumayl'); await bookmark(page).click();
  let failed = false;
  await context.route('**/data/catalog.json', async route => { failed = true; await route.abort(); });
  await page.evaluate(() => { location.hash = '#/bookmarks'; });
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toBeVisible();
  await expect.poll(() => failed).toBe(true);
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toHaveText('dua-kumayl');
  await page.locator('a[data-item-id="dua-kumayl"]').click();
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await context.unroute('**/data/catalog.json');
  await page.evaluate(() => { location.hash = '#/bookmarks'; });
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toContainText('دعای کمیل');
});

test('when persistent storage is blocked, a bookmark works for the session and warns the reader', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get: () => { throw Error('denied'); } }));
  await page.goto('./#/item/dua-kumayl');
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'false');
  await bookmark(page).click(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.inline-message')).toContainText('فقط در این نشست');
  await page.evaluate(() => { location.hash = '#/bookmarks'; });
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toBeVisible();
  await page.reload(); await expect(page.locator('.library-empty')).toBeVisible();
});

test('empty or malformed saved bookmarks do not block the reader', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.bookmarks.v1', '{bad json'));
  await page.goto('./#/item/dua-kumayl');
  await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 1500 });
  await bookmark(page).click(); await expect(bookmark(page)).toHaveAttribute('aria-pressed', 'true');
  await page.goto('./#/bookmarks'); await expect(page.locator('a[data-item-id="dua-kumayl"]')).toBeVisible();
});
