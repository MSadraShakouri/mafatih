import { expect, test } from '@playwright/test';

test('Ashura renders corrected in-row breaks without changing row identities or punctuation', async ({ page }) => {
  await page.goto('./#/item/ziyarat-ashura');
  const article = page.locator('article');
  await expect(article.locator('[data-row-id="r00032"] p[lang="ar"]')).toBeVisible();
  const paragraphs = await article.locator('p[lang="ar"], p[lang="fa"]').allTextContents();
  expect(paragraphs.length).toBeGreaterThan(0);
  expect(paragraphs.every(value => !/[\r\n\u0085\u2028\u2029\v\f]/u.test(value))).toBe(true);
  const punctuation = await article.locator('[data-row-id="r00032"] p[lang="ar"]').textContent();
  expect(punctuation).toMatch(/لِقِتالِكَ؛$/u);
  expect(punctuation).not.toMatch(/؛؛/u);
  const persian = await article.locator('[data-row-id="r00003"] p[lang="fa"]').textContent();
  expect(persian).toContain('حسین (درود بر او)، و ما');
});

test('a retained Samat excerpt boundary still renders as source text', async ({ page }) => {
  await page.goto('./#/item/dua-samat');
  const paragraph = page.locator('article [data-row-id="r00117"] p[lang="fa"]');
  await expect(paragraph).toBeVisible();
  const value = await paragraph.textContent();
  expect(value).toContain('\n');
  expect(await paragraph.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
});
