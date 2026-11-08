import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test('Quran endings are Persian digits and normal weight, while Arabic words stay bold and source is untouched', async ({ page, request }) => {
  const data = await (await request.get('./data/items/sura-yasin.json')).json() as { rows: Array<{ id: string; ar: string }> };
  const source = data.rows.find(row => row.id === 'r00003')!.ar;
  expect(source).toContain('﴿1﴾');
  await page.goto('./#/item/sura-yasin');
  const paragraph = page.locator('[data-row-id="r00003"] p[lang="ar"]');
  const marker = paragraph.locator('.quran-verse-marker');
  await expect(marker).toHaveText('﴿۱﴾');
  expect(await paragraph.evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
  expect(await marker.evaluate(node => getComputedStyle(node).fontWeight)).toBe('400');
  expect((await paragraph.textContent())!.length).toBe(source.length);

  await page.goto('./#/item/ziyarat-al-yasyn-amam');
  const quote = page.locator('[data-row-id="r00005"] p[lang="ar"]');
  await expect(quote).toContainText('﴿لَايَنْفَعُ');
  await expect(quote.locator('.quran-verse-marker')).toHaveCount(0);
  expect(await quote.evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
});

test('Persian UI digits and search highlights include numeric markers without changing English queries', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در فهرست و متن' });
  await input.fill('test123'); await expect(input).toHaveValue('test123');
  await input.fill('1'); await expect(input).toHaveValue('۱');
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const marker = page.locator('.search-excerpt[lang="ar"] .quran-verse-marker').first();
  await expect(marker).toBeVisible();
  await expect(marker).toContainText('۱');
  expect(await marker.evaluate(node => getComputedStyle(node).fontWeight)).toBe('400');
  const marked = marker.locator('mark').first(); await expect(marked).toBeVisible();
  expect(await marked.evaluate(node => getComputedStyle(node).fontWeight)).toBe('400');
});

test('anchors, search matches and reading position work across multiple marker nodes and astral characters', async ({ page, context }) => {
  const text = `آغاز ﴿12﴾ ${'واژه '.repeat(250)}🌙 ادامه ﴿34﴾ پایان`;
  const target = Array.from(text.slice(0, text.indexOf('ادامه'))).length;
  const initialAnchor = 400;
  await context.route('**/data/items/sura-yasin.json', async route => {
    const response = await route.fetch();
    const data = await response.json() as { rows: Array<{ id: string; ar: string; fa: string }> };
    const row = data.rows.find(value => value.id === 'r00003')!; row.ar = text; row.fa = '';
    await route.fulfill({ response, json: data });
  });
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(`./#/item/sura-yasin?row=r00003&lang=ar&offset=${initialAnchor}`);
  const reader = page.locator('main[data-screen="reader"]');
  const paragraph = page.locator('[data-row-id="r00003"] p[lang="ar"]');
  await expect(reader).toHaveAttribute('data-anchor-offset', String(initialAnchor));
  await expect(paragraph.locator('.quran-verse-marker')).toHaveText(['﴿۱۲﴾', '﴿۳۴﴾']);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
  const visible = await page.evaluate(() => {
    const paragraph = document.querySelector<HTMLElement>('[data-row-id="r00003"] p[lang="ar"]')!;
    const box = paragraph.getBoundingClientRect(), y = Math.min(120, Math.max(32, innerHeight * .2));
    const caret = document.caretPositionFromPoint(Math.max(1, Math.min(innerWidth - 1, box.right - 8)), y)!;
    if (!paragraph.contains(caret.offsetNode)) throw new Error('Expected a caret within the synthetic row');
    const prefix = document.createRange(); prefix.selectNodeContents(paragraph); prefix.setEnd(caret.offsetNode, caret.offset);
    const range = document.createRange(); range.setStart(caret.offsetNode, caret.offset); range.collapse(true);
    return { offset: Array.from(prefix.toString()).length, top: range.getBoundingClientRect().top };
  });
  expect(visible.offset).toBeGreaterThan(12); // beyond the first marker span
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('button', { name: 'دیدن نمونهٔ متن عربی' }).click();
  await page.getByRole('button', { name: 'بزرگ‌تر کردن متن عربی' }).evaluate(button => {
    for (let i = 0; i < 7; i++) (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(reader).toHaveAttribute('data-item-id', 'sura-yasin');
  await expect.poll(() => page.evaluate(({ offset, top }) => {
    const paragraph = document.querySelector<HTMLElement>('[data-row-id="r00003"] p[lang="ar"]')!;
    const utf16 = Array.from(paragraph.textContent ?? '').slice(0, offset).join('').length;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let remaining = utf16, node: Text | null;
    while ((node = walker.nextNode() as Text | null) && remaining > node.length) remaining -= node.length;
    if (!node) return Infinity;
    const range = document.createRange(); range.setStart(node, remaining); range.collapse(true);
    return Math.abs(range.getBoundingClientRect().top - top);
  }, visible)).toBeLessThan(3);
  // Search is executed against the original text; the highlight can be after
  // a marker span and an astral character, not just the first text node.
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const field = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  await field.fill('ادامه');
  const hit = page.locator('.result-row[data-row-id="r00003"]');
  await expect(hit).toBeVisible(); await hit.locator('button').click();
  await expect(reader).toHaveAttribute('data-anchor-offset', String(target));
  const selection = await page.evaluate(() => {
    const highlights = (CSS as any).highlights;
    const highlight = highlights?.get('active-search-match');
    return highlight ? [...highlight].map((range: Range) => range.toString()) : null;
  });
  if (selection) expect(selection).toEqual(['ادامه']);

  // Numeric search matches and highlights inside the normal-weight span.
  await page.locator('.result-reopen').click(); await field.fill('12');
  await expect(field).toHaveValue('۱۲');
  const markerHit = page.locator('.result-row[data-row-id="r00003"] .quran-verse-marker');
  await expect(markerHit.first()).toBeVisible();
  await expect(markerHit.first().locator('mark')).toHaveText('۱۲');
  expect(await markerHit.first().locator('mark').evaluate(node => getComputedStyle(node).fontWeight)).toBe('400');
  await page.locator('.result-row[data-row-id="r00003"] button').click();
  const numberOffset = Array.from(text.slice(0, text.indexOf('12'))).length;
  await expect(reader).toHaveAttribute('data-anchor-offset', String(numberOffset));
});
