import { expect, test } from '@playwright/test';

const homeNames = ['فهرست مفاتیح', 'نشان‌های من'];
const topicNames = ['ادعیه', 'اعمال', 'زیارات', 'نمازها و تعقیبات', 'قرآن', 'سایر مطالب', 'فهرست منتخب'];

test('home and topic screens use stationary centered headers; placeholder features remain visible', async ({ page }) => {
  const searchRequests: string[] = [], workers: string[] = [];
  page.on('request', request => { if (/\/data\/search(?:\/|-index)/.test(request.url())) searchRequests.push(request.url()); });
  page.on('worker', worker => workers.push(worker.url()));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./');
  await expect(page.locator('.library-name')).toHaveText(homeNames);
  const search = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن — به‌زودی' });
  await expect(search).toBeVisible(); await expect(search).toBeDisabled(); await expect(search).not.toBeFocused();
  await expect(page.locator('header button')).toHaveCount(0);
  const center = async () => page.locator('header h1').evaluate(e => { const r = e.getBoundingClientRect(); return r.x + r.width / 2; });
  const homeCenter = await center(); expect(homeCenter).toBeCloseTo(195, 1);
  await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
  await expect(page.locator('.library-name')).toHaveText(topicNames);
  expect(await center()).toBeCloseTo(homeCenter, 1);
  await expect(page.getByRole('button', { name: 'بازگشت به فهرست' })).toBeVisible();
  for (const node of await page.locator('.toc-screen .library-item').all()) {
    expect(await node.locator('.library-name').evaluate(e => getComputedStyle(e).textAlign)).toBe('center');
    expect((await node.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('link', { name: 'ادعیه', exact: true }).click();
  expect(await center()).toBeCloseTo(homeCenter, 1);
  await page.getByRole('button', { name: 'بازگشت به فهرست' }).click();
  await expect(page.locator('.library-name')).toHaveText(topicNames);
  await page.getByRole('button', { name: 'بازگشت به فهرست' }).click();
  await expect(page.locator('.library-name')).toHaveText(homeNames);
  expect(await center()).toBeCloseTo(homeCenter, 1);
  await page.getByRole('link', { name: 'نشان‌های من' }).click();
  await expect(page.locator('.library-empty')).toContainText('هنوز فعال نشده‌اند');
  expect(await center()).toBeCloseTo(homeCenter, 1);
  expect(searchRequests).toEqual([]); expect(workers).toEqual([]);
});

test('real prayer, Quran, other, and featured entries navigate without simulated content', async ({ page }) => {
  await page.goto('./'); await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
  await page.getByRole('link', { name: 'ادعیه', exact: true }).click();
  await page.getByRole('link', { name: 'فصل ششم: بیان بعضی از دعاهای مشهور' }).click();
  await page.getByRole('link', { name: 'دعای کمیل بن زیاد' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  for (const label of ['نشان شخصی', 'پیمایش خودکار', 'جست‌وجو در متن']) {
    const control = page.getByRole('button', { name: label }); await expect(control).toBeVisible(); await expect(control).toHaveAttribute('aria-disabled', 'true');
  }
  await page.getByRole('button', { name: 'نشان شخصی' }).click({ force: true });
  await expect(page.getByRole('status')).toContainText('هنوز فعال نشده است');
  await page.evaluate(() => history.back());
  await expect(page.getByRole('link', { name: 'دعای کمیل بن زیاد' })).toBeVisible();
  await page.goto('./#/contents/quran');
  await page.getByRole('link', { name: 'سوره یس', exact: true }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'sura-yasin');
  await expect(page.locator('article [data-row-id]').first()).toBeVisible();
  await page.goto('./#/contents/other');
  await page.getByRole('link', { name: 'مقدمه', exact: true }).first().click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'item-mqdmh');
  await page.goto('./#/contents/featured');
  await expect(page.locator('a[data-item-id="dua-kumayl"]')).toBeVisible();
  const featuredCount = await page.locator('a[data-item-id]').count(); expect(featuredCount).toBe(36);
});

test('browser Back has a library fallback after direct item entry; settings Back returns to the reader', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await expect(page.locator('main[data-screen="settings"]')).toBeVisible();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
  await page.evaluate(() => history.back());
  await expect(page.locator('.library-name')).toHaveText(homeNames);
  await page.goto('./#/settings/dua-kumayl'); await expect(page.locator('main[data-screen="settings"]')).toBeVisible();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', 'dua-kumayl');
});

test('layout stays within viewport at phone and desktop widths', async ({ page }) => {
  await page.goto('./');
  for (const width of [320, 390, 760, 1200]) {
    await page.setViewportSize({ width, height: 760 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('header .header-inner').evaluate(e => e.getBoundingClientRect().height)).toBe(48);
    for (const link of await page.locator('.library-item').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});
