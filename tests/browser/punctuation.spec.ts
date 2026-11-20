import { expect, test } from '@playwright/test';
import { displayedSource, runtimeItem } from './row-source-fixture.js';

test('corrected Arabic punctuation is shown in the reader', async ({ page }) => {
  await page.goto('./#/item/amal-aaddt-lkl-hvl');
  const row = page.locator('[data-row-id="r00008"] p[lang="ar"]');
  await expect(row).toContainText('تَصْدیقاً؛');
  await expect(row).not.toContainText('تَصْدیقاً ؛');
});

test('Persian reader text and generated English paragraphs use corrected punctuation', async ({ page, request }) => {
  const item = await runtimeItem(request, 'amal-aamal-msjd-shlh');
  await page.goto('./#/item/amal-aamal-msjd-shlh');
  const row = await displayedSource(page, item, 'r00002', 'fa');
  expect(row).toContain('فرمود: آری… تا آخر خبر');
  expect(row).not.toContain('آری …');
  const english = await page.evaluate(async () => {
    const response = await fetch(new URL('data/english/dua-before-reading-book--part5.json', document.baseURI));
    if (!response.ok) throw new Error(`English data request failed: ${response.status}`);
    return await response.json() as { paragraphs: Array<{ id: string; text: string }> };
  });
  const paragraph = english.paragraphs.find(part => part.id === 'p00001');
  expect(paragraph?.text).toContain('Istikharah()');
  expect(paragraph?.text).not.toContain('Istikharah( )');
});
