import { expect, test } from '@playwright/test';
import { displayedSource, runtimeItem, sourceSegments } from './row-source-fixture.js';

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

test('Samat keeps both excerpts and their ellipsis after joining the boundary', async ({ page, request }) => {
  const item = await runtimeItem(request, 'dua-samat');
  await page.goto('./#/item/dua-samat');
  const value = await displayedSource(page, item, 'r00117', 'fa');
  expect(value).not.toContain('\n');
  expect(value).toContain('خدایا! به حق این دعا… خدایا! به حق این دعا');
  expect(value.split('خدایا! به حق این دعا')).toHaveLength(3);
  for (const part of sourceSegments(item, 'r00117', 'fa')) {
    const paragraph = page.locator(`article [data-row-id="${part.row}"] p[lang="${part.language}"]`);
    expect(await paragraph.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
  }
});

test('list markers and Jawshan section numbers are attached to their intended existing rows', async ({ page, request }) => {
  await page.goto('./#/item/item-mqdmh');
  const heading = page.locator('article [data-row-id="r00006"] p[lang="fa"]');
  const bullet = page.locator('article [data-row-id="r00007"] p[lang="fa"]');
  await expect(heading).toBeVisible(); await expect(bullet).toBeVisible();
  expect((await heading.textContent())!.trim()).not.toMatch(/\*$/u);
  expect((await bullet.textContent())!).toMatch(/^\* /u);
  await page.goto('./#/item/dua-jawshan-kabir');
  for (const [marker, destination, source] of [
    ['(۱۱)', 'r00118', 'r00126'], ['(۱۵)', 'r00159', 'r00166'], ['(۳۸)', 'r00396', 'r00399'],
  ]) {
    const section = page.locator(`article [data-row-id="${destination}"] p[lang="fa"]`);
    const priorLocation = page.locator(`article [data-row-id="${source}"] p[lang="fa"]`);
    await expect(section).toBeVisible(); await expect(priorLocation).toBeVisible();
    expect((await section.textContent())!.startsWith(marker + ' ')).toBe(true);
    expect((await priorLocation.textContent())!).not.toContain(marker);
  }
  expect(await page.locator('article [data-row-id="r00126"] p[lang="fa"]').textContent()).toBe('ای پناهم در دماندگی،');
  const jamea = await runtimeItem(request, 'ziyarat-jamea-kabira');
  await page.goto('./#/item/ziyarat-jamea-kabira');
  const beforeInstruction = await displayedSource(page, jamea, 'r00313', 'ar');
  const instruction = await displayedSource(page, jamea, 'r00314', 'ar');
  expect(beforeInstruction.trim()).not.toMatch(/-$/u);
  expect(instruction).toMatch(/^- /u);
});
