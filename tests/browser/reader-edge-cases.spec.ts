import { expect, test } from '@playwright/test';

test('narrow dark-mode settings fit and all actionable reader controls have touch-sized targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const button of await page.locator('header .icon-button').all()) {
    const box = (await button.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await button.locator('svg').evaluate(e => getComputedStyle(e).width)).toBe('16px');
  }
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  for (const button of await page.locator('.size-name, .step-button, .theme-choice').all()) {
    const box = (await button.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'روشن', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'خودکار', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('all four bundled fonts load from the app origin', async ({ page }) => {
  const fontResponses: { url: string; status: number }[] = [];
  page.on('response', response => {
    if (/\.(?:ttf|woff2)$/i.test(new URL(response.url()).pathname)) fontResponses.push({ url: response.url(), status: response.status() });
  });
  await page.goto('./#/item/dua-kumayl');
  const loaded = await page.evaluate(async () => {
    const families = ['Mafatih Amiri', 'Mafatih Noto Naskh', 'Mafatih Scheherazade', 'Vazirmatn'];
    return Promise.all(families.map(async family => {
      const faces = await document.fonts.load(`400 16px "${family}"`);
      return faces.length > 0 && faces.every(face => face.status === 'loaded');
    }));
  });
  expect(loaded).toEqual([true, true, true, true]);
  const origin = new URL(page.url()).origin;
  for (const name of ['Amiri-Regular', 'NotoNaskhArabic-Regular', 'ScheherazadeNew-Regular', 'Vazirmatn']) {
    expect(fontResponses.some(response => response.url.includes(name) && new URL(response.url).origin === origin && response.status === 200)).toBe(true);
  }
});

test('a failed font request falls back without breaking reading', async ({ page, context }) => {
  await context.route('**/*NotoNaskhArabic-Regular*.ttf', route => route.abort('failed'));
  await page.goto('./#/item/dua-kumayl'); await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByText('نوتو نسخ عربی', { exact: true }).click();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-reader-font', 'noto-naskh');
  await expect(page.locator('article p[lang="ar"]').first()).toBeVisible();
  await expect(page.locator('article p[lang="fa"]').first()).toBeVisible();
});

test('a slow earlier font load cannot override a newer selection', async ({ page, context }) => {
  await context.route('**/*NotoNaskhArabic-Regular*.ttf', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue(); });
  await page.goto('./#/item/dua-kumayl'); await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByText('نوتو نسخ عربی', { exact: true }).click(); await page.getByText('امیری', { exact: true }).click();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-reader-font', 'amiri');
  await page.waitForTimeout(850);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-reader-font', 'amiri');
});

test('only explicit instructions use the explanation size; Persian-only rows are not reclassified', async ({ page }) => {
  await page.goto('./#/item/item-mqdmh');
  const first = page.locator('article [data-row-id="r00004"] p[lang="fa"]');
  await expect(first).toHaveAttribute('data-text-role', 'translation');
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('button', { name: 'دیدن نمونهٔ توضیحات' }).click();
  await page.getByRole('button', { name: 'بزرگ‌تر کردن توضیحات' }).evaluate(button => { for (let i = 0; i < 10; i++) (button as HTMLButtonElement).click(); });
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(first).toHaveCSS('font-size', '16.5px');
});

test('licenses are bundled locally but not shown in the reader or settings', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await expect(page.getByText(/SIL OPEN FONT LICENSE/)).toHaveCount(0);
  await expect(page.locator('head link[rel="license"]')).toHaveCount(5);
  const texts = await page.evaluate(async () => Promise.all([...document.querySelectorAll<HTMLLinkElement>('head link[rel="license"]')].map(async link => (await fetch(link.href)).text())));
  expect(texts.filter(text => text.includes('SIL OPEN FONT LICENSE Version 1.1'))).toHaveLength(4);
  expect(texts.some(text => text.includes('ISC License') && text.includes('Lucide'))).toBe(true);
});
