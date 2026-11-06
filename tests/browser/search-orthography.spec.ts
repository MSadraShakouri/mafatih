import { expect, test } from '@playwright/test';
import { normalizeSearch } from '../../src/normalize.js';

async function openSearch(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  return page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
}

async function completed(page: import('@playwright/test').Page) {
  await expect(page.getByRole('status')).toContainText('نتیجه', { timeout: 20000 });
}

test('diacritic-free کمیل does not match the unrelated phrase یک میل', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('کمیل');
  await completed(page);
  await expect(page.locator('[data-search-kind="toc"][data-item-id="dua-kumayl"]')).toBeVisible();
  await expect(page.locator('[data-search-kind="text"][data-item-id="amal-fzylt-msjd-kvfh"][data-row-id="r00003"]')).toHaveCount(0);
  await expect(page.locator('[data-search-kind="text"][data-item-id="ziyarat-adab-mkhsvs-hsyn"][data-row-id="r00013"]')).toHaveCount(0);
  await expect(page.locator('[data-search-kind="text"]')).toHaveCount(5);
  await expect(page.locator('[data-search-kind="text"] mark').first()).toContainText('کمیل');
});

test('half-space and joined inputs are one term; a real space searches two OR terms', async ({ page }) => {
  const input = await openSearch(page);
  const section = page.locator('[data-search-section="results"]');
  await expect(page.locator('.search-hint')).toContainText('نیم‌فاصله');
  await input.fill('اهل\u200cبیت');
  await completed(page);
  const heading = await section.locator('h2').textContent();
  const keys = await section.locator('[data-result-key]').evaluateAll(elements => elements.map(element => element.getAttribute('data-result-key')));
  expect(keys.length).toBeGreaterThan(0);
  await expect(section.locator('.search-match-count').first()).toHaveText('۱ واژه');
  await input.fill('اهلبیت');
  await completed(page);
  await expect(section.locator('h2')).toHaveText(heading!);
  expect(await section.locator('[data-result-key]').evaluateAll(elements => elements.map(element => element.getAttribute('data-result-key')))).toEqual(keys);
  await expect(section.locator('.search-match-count').first()).toHaveText('۱ واژه');
  await input.fill('اهل بیت');
  await completed(page);
  await expect(section.locator('.search-match-count').first()).toHaveText('۲ واژه');
  await expect(section.locator('.search-matched-terms').first()).toContainText('اهل');
  await expect(section.locator('.search-matched-terms').first()).toContainText('بیت');
  expect(await section.locator('h2').textContent()).not.toBe(heading);
});

test('an unaccented joined query finds an accented source with a one-letter spaced word', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('والله');
  await completed(page);
  const row = page.locator('[data-search-kind="text"][data-item-id="hadith-kisa"][data-row-id="r00112"][data-language="ar"]');
  await expect(row).toBeVisible();
  const marks = (await row.locator('.search-excerpt mark').allTextContents()).map(mark => normalizeSearch(mark).replace(/ /g, ''));
  expect(marks.some(mark => mark.includes('والله'))).toBe(true);
  await row.locator('a').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00112');
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('long result shows distant matched terms and their original marked spellings', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('الهی ربی');
  await completed(page);
  const row = page.locator('[data-search-kind="text"][data-item-id="ziyarat-rsvl-sly-allh"][data-row-id="r00003"][data-language="ar"]');
  await expect(row).toBeVisible();
  await expect(row.locator('.search-match-count')).toHaveText('۲ واژه');
  await expect(row.locator('.search-matched-terms')).toContainText('الهی');
  await expect(row.locator('.search-matched-terms')).toContainText('ربی');
  const marks = (await row.locator('.search-excerpt mark').allTextContents()).map(normalizeSearch);
  expect(marks.some(mark => mark.includes('الهی'))).toBe(true);
  expect(marks.some(mark => mark.includes('ربی'))).toBe(true);
  await expect(row.locator('.search-excerpt')).toContainText(' … ');
});

test('a joined query opens an ordinary-spaced source occurrence without reader highlighting', async ({ page }) => {
  await page.goto('./#/item/ziyarat-ashura');
  await page.getByRole('button', { name: 'جست‌وجو' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این مطلب' });
  await input.fill('اهلبیت');
  await completed(page);
  const row = page.locator('[data-search-kind="text"][data-item-id="ziyarat-ashura"][data-row-id="r00005"][data-language="fa"]');
  await expect(row).toBeVisible();
  const marks = (await row.locator('.search-excerpt mark').allTextContents()).map(mark => normalizeSearch(mark).replace(/ /g, ''));
  expect(marks.some(mark => mark.includes('اهلبیت'))).toBe(true);
  await row.locator('a').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00005');
  await expect(page.locator('article mark')).toHaveCount(0);
  const aroundAnchor = await page.evaluate(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const offset = Number(params.get('offset'));
    const text = document.querySelector('[data-row-id="r00005"] p[lang="fa"]')!.textContent!;
    return Array.from(text).slice(offset, offset + 15).join('');
  });
  expect(normalizeSearch(aroundAnchor).replace(/ /g, '')).toContain('اهلبیت');
});
