import { expect, test } from '@playwright/test';

const homeNames = ['فهرست مفاتیح', 'نشان‌های من'];
const topicNames = ['ادعیه', 'اعمال', 'زیارات', 'نمازها و تعقیبات', 'قرآن', 'سایر مطالب', 'فهرست منتخب'];

test('home and topic screens use stationary centered headers; search loads lazily', async ({ page }) => {
  const searchRequests: string[] = [], workers: string[] = [];
  page.on('request', request => { if (/\/data\/search(?:\/|-index)/.test(request.url())) searchRequests.push(request.url()); });
  page.on('worker', worker => workers.push(worker.url()));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./');
  await expect(page.locator('.library-name')).toHaveText(homeNames);
  const search = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await expect(search).toBeVisible(); await expect(search).toBeEnabled(); await expect(search).not.toBeFocused();
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
  // Topic data is loaded asynchronously; don't measure a detached old header.
  await expect(page.getByRole('heading', { name: 'ادعیه', exact: true })).toBeVisible();
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
  for (const label of ['نشان شخصی', 'پیمایش خودکار']) {
    const control = page.getByRole('button', { name: label }); await expect(control).toBeVisible(); await expect(control).toHaveAttribute('aria-disabled', 'true');
  }
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).not.toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'نشان شخصی' }).click({ force: true });
  await expect(page.locator('.inline-message')).toContainText('هنوز فعال نشده است');
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

test('entering the TOC starts its catalog before Quran is chosen, without preloading search indexes', async ({ page, context }) => {
  let release!: () => void, catalogRequests = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const searchRequests: string[] = [];
  page.on('request', request => { if (/\/data\/search(?:\/|-index)/.test(request.url())) searchRequests.push(request.url()); });
  await context.route('**/data/catalog.json', async route => {
    catalogRequests++; await gate; await route.continue().catch(() => {});
  });
  try {
    await page.goto('./');
    await page.waitForTimeout(300);
    expect(catalogRequests).toBe(0);
    await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
    await expect.poll(() => catalogRequests, { timeout: 2000 }).toBe(1);
    release();
    await page.getByRole('link', { name: 'قرآن', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'قرآن', exact: true })).toBeVisible();
    await expect(page.locator('.toc-screen a[data-item-id="sura-yasin"]')).toHaveText('سوره یس');
    expect(catalogRequests).toBe(1);
    expect(searchRequests).toEqual([]);
  } finally { release(); }
});

test('leaving the TOC cancels an unused catalog warm-up, and returning retries', async ({ page, context }) => {
  let release!: () => void, requests = 0, aborted = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  page.on('requestfailed', request => { if (request.url().endsWith('/data/catalog.json')) aborted++; });
  await context.route('**/data/catalog.json', async route => {
    requests++; if (requests === 1) await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('./');
    await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
    await expect.poll(() => requests).toBe(1);
    await page.evaluate(() => { location.hash = '#/'; });
    await expect(page.getByRole('link', { name: 'فهرست مفاتیح' })).toBeVisible();
    await expect.poll(() => aborted).toBe(1);
    await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
    await expect.poll(() => requests).toBe(2);
    await page.getByRole('link', { name: 'قرآن', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'قرآن', exact: true })).toBeVisible();
    release();
    await expect(page.locator('body')).not.toContainText('داده بارگذاری نشد.');
  } finally { release(); }
});

test('a catalog error is visible and navigation can retry', async ({ page, context }) => {
  await context.route('**/data/catalog.json', route => route.abort());
  await page.goto('./#/contents/quran');
  await expect(page.getByRole('status')).toContainText('داده بارگذاری نشد.');
  await context.unroute('**/data/catalog.json');
  await page.getByRole('link', { name: 'بازگشت به فهرست' }).click();
  await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
  await page.getByRole('link', { name: 'قرآن', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'قرآن', exact: true })).toBeVisible();
});

test('the completed catalog remains available to search after visiting the TOC', async ({ page }) => {
  let catalogs = 0;
  page.on('request', request => { if (request.url().endsWith('/data/catalog.json')) catalogs++; });
  await page.goto('./');
  const loaded = page.waitForResponse(response => response.url().endsWith('/data/catalog.json') && response.ok());
  await page.getByRole('link', { name: 'فهرست مفاتیح' }).click();
  await loaded;
  await page.getByRole('link', { name: 'قرآن', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'قرآن', exact: true })).toBeVisible();
  await page.evaluate(() => { location.hash = '#/'; });
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).click();
  await page.waitForTimeout(200);
  expect(catalogs).toBe(1);
});
