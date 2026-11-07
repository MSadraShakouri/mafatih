import { expect, test } from '@playwright/test';

test('corrected Arabic punctuation is shown in the reader', async ({ page }) => {
  await page.goto('./#/item/amal-aaddt-lkl-hvl');
  const row = page.locator('[data-row-id="r00008"] p[lang="ar"]');
  await expect(row).toContainText('تَصْدیقاً؛');
  await expect(row).not.toContainText('تَصْدیقاً ؛');
});

test('Persian reader text and generated English paragraphs use corrected punctuation', async ({ page }) => {
  await page.goto('./#/item/amal-aamal-msjd-shlh');
  const row = page.locator('[data-row-id="r00002"] p[lang="fa"]');
  await expect(row).toContainText('فرمود: آری… تا آخر خبر');
  await expect(row).not.toContainText('آری …');
  const english = await page.evaluate(async () => {
    const response = await fetch(new URL('data/english/dua-before-reading-book--part5.json', document.baseURI));
    if (!response.ok) throw new Error(`English data request failed: ${response.status}`);
    return await response.json() as { paragraphs: Array<{ id: string; text: string }> };
  });
  const paragraph = english.paragraphs.find(part => part.id === 'p00001');
  expect(paragraph?.text).toContain('Istikharah()');
  expect(paragraph?.text).not.toContain('Istikharah( )');
});
