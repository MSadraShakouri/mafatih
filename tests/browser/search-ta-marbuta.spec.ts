import { expect, test } from '@playwright/test';

test.setTimeout(60_000);
const query = 'العقوبت'; // the source has الْعُقُوبَةِ, not a literal ت
const mark = 'الْعُقُوبَةِ';

test('global search finds and highlights ة through a typed ت and opens the source anchor', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' }).fill(query);
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const result = page.locator('.search-result[data-item-id="dua-kumayl"][data-row-id="r00072"]');
  await expect(result).toBeVisible({ timeout: 40_000 });
  await expect(result.locator('mark')).toHaveText(mark);
  await result.locator('button').click();
  await expect(page).toHaveURL(/#\/item\/dua-kumayl\?row=r00072&lang=ar&offset=/);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00072');
  const actual = await page.evaluate(() => {
    const offset = Number(new URLSearchParams(location.hash.split('?')[1]).get('offset'));
    const source = document.querySelector('[data-row-id="r00072"] p[lang="ar"]')!.textContent!;
    return Array.from(source).slice(offset, offset + Array.from('الْعُقُوبَةِ').length).join('');
  });
  expect(actual).toBe(mark);
});

test('global query changes from ه to ة and finds an ordinary ت, including a joined match', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  const result = page.locator('.search-result[data-item-id="dua-kumayl"][data-row-id="r00012"]');
  await input.fill('برحمهکالتی');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(result).toHaveCount(0);
  await input.fill('برحمةکالتی');
  await expect(result).toBeVisible({ timeout: 12_000 });
  await expect(result.locator('mark')).toContainText('رَحْمَتِكَ');
  await result.locator('button').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00012');
});

test('in-text query changes from ه to ة and finds an ordinary ت', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  const result = page.locator('.result-row[data-row-id="r00012"][data-language="ar"]');
  await input.fill('رحمهک');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(result).toHaveCount(0);
  await input.fill('رحمةک');
  await expect(result).toBeVisible({ timeout: 12_000 });
  await expect(result.locator('mark')).toHaveText('رَحْمَتِكَ');
  await result.locator('button').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00012');
});

test('in-text highlights both approved lam spellings of a source ة when ت is typed', async ({ page }) => {
  await page.goto('./#/item/amal-aamal-mkhsvsh-byst');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('اللیلت');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const result = page.locator('.result-row[data-row-id="r00006"][data-language="ar"]');
  await expect(result).toBeVisible();
  await expect(result.locator('mark')).toHaveText(['اَللیلَةَ', 'الیلَةَ']);
});

test('a typed ه follows a ت-key lam alias but does not highlight ordinary ت', async ({ page }) => {
  await page.goto('./#/item/ziyarat-ashura');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('اللاه');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const result = page.locator('.result-row[data-row-id="r00039"][data-language="ar"]');
  await expect(result).toBeVisible();
  await expect(result.locator('mark')).toHaveText(['الاةِ']);
  await expect(result).toContainText('بِمُوالاتِكُمْ'); // ordinary ت is not highlighted
});

test('in-text search uses the same ة match and can still find it with ه', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await input.fill(query);
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const result = page.locator('.result-row[data-row-id="r00072"][data-language="ar"]');
  await expect(result).toBeVisible();
  await expect(result.locator('mark')).toHaveText(mark);
  await result.locator('button').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00072');
  await input.fill('العقوبه');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect(page.locator('.result-row[data-row-id="r00072"] mark')).toHaveText(mark);
});
