import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

const homeInput = 'جست‌وجو در فهرست و متن';
const readerInput = 'جست‌وجو در این متن';
const arabic = 'نمایش متن عربی';
const persian = 'نمایش متن فارسی';

async function completeGlobal(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('.search-results-count')).toContainText('نتیجه', { timeout: 40_000 });
  await expect(page.locator('.search-results')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
}
async function openReader(page: import('@playwright/test').Page, query = 'الهم'): Promise<void> {
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: readerInput }).fill(query);
  await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.result-head')).toContainText('نتیجه', { timeout: 40_000 });
}

test('global search is lazy, starts Arabic-only, uses real results and restores its query on Back', async ({ page }) => {
  const workers: string[] = [], searchRequests: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  page.on('request', request => { if (/\/data\/search(?:\/|-index)/.test(request.url())) searchRequests.push(request.url()); });
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: homeInput });
  await expect(input).toBeVisible(); await expect(input).toBeEnabled();
  expect(workers).toEqual([]); expect(searchRequests).toEqual([]);
  await input.fill('الهم');
  await completeGlobal(page);
  expect(workers.length).toBe(1); expect(searchRequests.some(url => url.includes('search-index.json'))).toBe(true);
  await expect(page.getByRole('button', { name: arabic })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('.search-result[data-search-kind="text"]').count()).toBeGreaterThan(0);
  await expect(page.locator('.search-result[data-search-kind="text"][data-language="fa"]')).toHaveCount(0);
  const hit = page.locator('.search-result[data-item-id="dua-kumayl"][data-row-id="r00012"]');
  await expect(hit).toBeVisible();
  await expect(hit.locator('mark').first()).toContainText('اَللّٰهُمَّ');
  await hit.locator('button').click();
  await expect(page).toHaveURL(/#\/item\/dua-kumayl\?row=r00012&lang=ar&offset=/);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00012');
  await expect(page.locator('article mark')).toHaveCount(0);
  const offset = await page.evaluate(() => {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const text = document.querySelector('[data-row-id="r00012"] p[lang="ar"]')!.textContent!;
    return { offset: Number(params.get('offset')), originalStart: Array.from(text).slice(Number(params.get('offset')), Number(params.get('offset')) + 12).join('') };
  });
  expect(offset.originalStart).toContain('اَللّٰهُمَّ');
  await page.goBack();
  await expect(page.getByRole('searchbox', { name: homeInput })).toHaveValue('الهم');
  await completeGlobal(page);
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'false');
});

test('global filters are selectable, empty states are honest, and more preserves ranked results', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: homeInput });
  await input.fill('الهم'); await completeGlobal(page);
  const first = await page.locator('.search-result').first().getAttribute('data-result-key');
  const more = page.getByRole('button', { name: 'نمایش بیشتر' });
  await more.scrollIntoViewIfNeeded(); await more.click();
  await expect.poll(() => page.locator('.search-result').count(), { timeout: 40_000 }).toBeGreaterThan(50);
  expect(await page.locator('.search-result').first().getAttribute('data-result-key')).toBe(first);
  const later = page.locator('.search-result').nth(60).locator('button');
  await later.scrollIntoViewIfNeeded();
  const priorScroll = await page.evaluate(() => window.scrollY);
  await later.click();
  await page.goBack(); await completeGlobal(page);
  await expect.poll(() => page.locator('.search-result').count()).toBeGreaterThan(50);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(priorScroll - 5);
  await page.getByRole('button', { name: persian }).click();
  await page.getByRole('button', { name: arabic }).click();
  await completeGlobal(page);
  await expect(page.getByRole('button', { name: arabic })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.search-result[data-search-kind="text"][data-language="fa"]').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.search-result[data-search-kind="text"][data-language="ar"]')).toHaveCount(0);
  await input.fill('الفبایناموجودچندواژه'); await completeGlobal(page);
  await expect(page.locator('.search-empty:visible')).toContainText('نتیجه‌ای پیدا نشد');
  await input.fill('۔۔۔'); await expect(page.locator('.search-empty:visible')).toContainText('واژه یا عدد');
  await page.getByRole('button', { name: 'پاک کردن جست‌وجو' }).click();
  await expect(input).toHaveValue(''); await expect(page.getByRole('link', { name: 'فهرست مفاتیح' })).toBeVisible();
  await input.fill('کمیل'); await page.getByRole('button', { name: persian }).click();
  await completeGlobal(page);
  await expect(page.locator('.search-result[data-search-kind="toc"]').first()).toBeVisible();
  await expect(page.locator('.search-result[data-search-kind="text"]')).toHaveCount(0);
});

test('reader header keeps bookmark and icon positions, reader DOM and one-line original highlights', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/item/dua-kumayl');
  await expect(page.locator('main[data-screen="reader"]')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { readerNode?: Element }).readerNode = document.querySelector('article.reader')!; window.scrollTo(0, 700); });
  const normalHeader = await page.locator('.app-header').boundingBox();
  const normalSearch = await page.getByRole('button', { name: 'جست‌وجو در متن' }).boundingBox();
  const before = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: readerInput });
  await expect(input).toBeFocused();
  await expect(page.getByRole('button', { name: 'نشان شخصی' })).toHaveAttribute('aria-pressed', 'false');
  const activeHeader = await page.locator('.app-header').boundingBox();
  const activeSearch = await page.getByRole('button', { name: 'بستن جست‌وجو' }).boundingBox();
  expect(normalHeader!.height).toBe(49); expect(activeHeader!.height).toBe(49);
  expect(activeSearch!.x).toBe(normalSearch!.x); expect(Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(2);
  expect(await page.evaluate(() => (window as unknown as { readerNode?: Element }).readerNode === document.querySelector('article.reader'))).toBe(true);
  await input.fill('الهم'); await expect(page.locator('.result-row').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.result-reopen')).toBeHidden();
  await expect(page.locator('.search-header-row')).not.toContainText('نتیجه');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const snippet = page.locator('.result-snippet.ar').first(), mark = snippet.locator('mark').first();
  await expect(mark).toContainText('اَللّٰهُمَّ');
  await expect.poll(() => mark.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(243, 228, 188)');
  for (const width of [320, 390, 760, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    expect((await page.locator('.app-header').boundingBox())!.height).toBe(49);
    const x = (await page.getByRole('button', { name: 'بستن جست‌وجو' }).boundingBox())!.x;
    expect(x).toBe((Math.max(0, width - 760) / 2) + (width <= 360 ? 48 : 52));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const style = await snippet.evaluate(node => ({ whiteSpace: getComputedStyle(node).whiteSpace, textOverflow: getComputedStyle(node).textOverflow }));
    expect(style).toEqual({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
    if (width === 320) expect(await snippet.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 270 });
  await expect.poll(async () => (await page.locator('.result-popover').boundingBox())?.y ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => { const box = await page.locator('.result-popover').boundingBox(); return box ? box.y + box.height : Infinity; })
    .toBeLessThanOrEqual(270);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.result-row[data-row-id="r00028"] button').click();
  await expect(page.locator('.result-popover')).toBeHidden();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00028');
  await expect(page.locator('article mark')).toHaveCount(0);
  await expect(page.locator('.result-reopen')).toBeVisible();
  await page.locator('.result-reopen').click();
  await expect(page.locator('.result-popover')).toBeVisible();
  await expect(input).not.toBeFocused();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { readerNode?: Element }).readerNode === document.querySelector('article.reader'))).toBe(true);
  await page.goForward(); await expect(page.getByRole('searchbox', { name: readerInput })).toHaveValue('الهم');
});

test('in-text filters default to Arabic, show an honest empty panel, and Persian can be enabled', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'گزینه‌های زبان' }).click();
  await expect(page.getByRole('button', { name: arabic })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: persian }).click();
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: arabic }).click();
  await expect(page.getByRole('button', { name: arabic })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'گزینه‌های زبان' }).click();
  const input = page.getByRole('searchbox', { name: readerInput });
  await input.fill('درود');
  await expect(page.locator('.result-row[data-language="fa"]').first()).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.result-row[data-language="ar"]')).toHaveCount(0);
  await input.fill('الفبایناموجودچندواژه');
  await expect(page.locator('.result-popover')).toBeVisible();
  await expect(page.locator('.result-empty')).toContainText('نتیجه‌ای پیدا نشد', { timeout: 40_000 });
  await expect(page.locator('.result-reopen')).toBeHidden();
});

test('continuation excerpts keep the separator, original marks and same-line ellipsis', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openReader(page, 'شیء قوت');
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  const snippet = page.locator('.result-row[data-row-id="r00012"] .result-snippet');
  await expect(snippet).toContainText(' · ');
  expect(await snippet.evaluate(node => ({ width: node.clientWidth, full: node.scrollWidth,
    whiteSpace: getComputedStyle(node).whiteSpace, ellipsis: getComputedStyle(node).textOverflow })))
    .toMatchObject({ whiteSpace: 'nowrap', ellipsis: 'ellipsis' });
  const boxes = await snippet.locator('mark').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(boxes.length).toBeGreaterThan(1);
  expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(2);
});

test('language choices are shared for a session and reset to Arabic-only on reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox', { name: homeInput }).fill('کمیل');
  await page.getByRole('button', { name: persian }).click();
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'true');
  await completeGlobal(page);
  await page.locator('.search-result[data-item-id="dua-kumayl"]').first().locator('button').click();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('button', { name: 'گزینه‌های زبان' }).click();
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('button', { name: 'گزینه‌های زبان' }).click();
  await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: arabic })).toHaveAttribute('aria-pressed', 'true');
});

test('approved short-B aliases find unchanged full-corpus source in both scopes', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox', { name: homeInput }).fill('بالطف');
  await completeGlobal(page);
  const globalHit = page.locator('.search-result[data-item-id="dua-samat"][data-row-id="r00131"]');
  await expect(globalHit).toBeVisible({ timeout: 40_000 });
  await expect(globalHit.locator('mark').first()).toContainText('بِاللُّطْفِ');
  await page.goto('./#/item/dua-samat');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: readerInput });
  for (const query of ['بالطف', 'باللطف']) {
    await input.fill(query);
    const hit = page.locator('.result-row[data-row-id="r00131"]');
    await expect(hit).toBeVisible({ timeout: 40_000 });
    await expect(hit.locator('mark').first()).toContainText('بِاللُّطْفِ');
  }
  await page.goto('./#/item/namaz-adab-kyfyt');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: readerInput }).fill('بالعب');
  await expect(page.locator('.result-row[data-row-id="r00011"] mark').first()).toContainText('بالَّلِعبِ', { timeout: 40_000 });
});

test('Persian in-text result jumps to the matched line inside a long original row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('./#/item/namaz-hnvt-myt');
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('button', { name: 'گزینه‌های زبان' }).click();
  await page.getByRole('button', { name: persian }).click();
  const input = page.getByRole('searchbox', { name: readerInput });
  await input.fill('جماعت');
  const hit = page.locator('.result-row[data-row-id="r00002"][data-language="fa"]');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.locator('button').click();
  const reader = page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-anchor-row', 'r00002');
  const position = await reader.evaluate(main => {
    const offset = Number(main.dataset.anchorOffset), paragraph = main.querySelector('[data-row-id="r00002"] p[lang="fa"]')!;
    const text = paragraph.textContent!, range = document.createRange();
    range.setStart(paragraph.firstChild!, Array.from(text).slice(0, offset).join('').length); range.collapse(true);
    return { offset, top: range.getBoundingClientRect().top, paragraphTop: paragraph.getBoundingClientRect().top };
  });
  expect(position.offset).toBeGreaterThan(500); expect(position.top).toBeGreaterThanOrEqual(0);
  expect(position.top).toBeLessThan(120); expect(position.paragraphTop).toBeLessThan(-100);
  await expect(page.locator('article mark')).toHaveCount(0);
});

test('outside clicks dismiss overlays without swallowing header and input actions', async ({ page }) => {
  await openReader(page);
  const input = page.getByRole('searchbox', { name: readerInput });
  await page.locator('.result-head span').click(); await expect(page.locator('.result-popover')).toBeVisible();
  await input.click(); await expect(page.locator('.result-popover')).toBeVisible();
  await expect(input).toBeFocused();
  await page.waitForTimeout(400); await expect(page.locator('.result-popover')).toBeVisible();
  await input.fill('رحمت'); await expect(page.locator('.result-popover')).toBeVisible({ timeout: 40_000 });
  await page.getByRole('button', { name: 'نشان شخصی' }).click();
  await expect(page.locator('.result-popover')).toBeVisible();
  await expect(page.getByRole('button', { name: 'نشان شخصی' })).toHaveAttribute('aria-pressed', 'true');
  expect((await page.locator('.app-header').boundingBox())!.height).toBe(49);
  await page.waitForTimeout(2500);
  await expect(page.locator('.result-popover')).toBeVisible();
  await page.getByRole('button', { name: 'گزینه‌های زبان' }).click();
  await expect(page.locator('.filter-menu')).toBeVisible(); await expect(page.locator('.result-popover')).toBeHidden();
  await page.locator('article.reader').click({ position: { x: 8, y: 470 }, force: true });
  await expect(page.locator('.filter-menu')).toBeHidden(); await expect(page.locator('.result-reopen')).toBeVisible();
  await page.locator('.result-reopen').click(); await expect(page.locator('.result-popover')).toBeVisible();
  await page.getByRole('button', { name: 'پاک کردن جست‌وجو' }).click();
  await expect(input).toHaveValue(''); await expect(page.locator('.result-popover')).toBeVisible();
  await expect(page.locator('.result-empty')).toContainText('واژه‌ای بنویسید');
});

test('dark mode retains the chosen gold marks and IME composition is not submitted', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openReader(page);
  const input = page.getByRole('searchbox', { name: readerInput });
  await input.focus();
  await page.evaluate(() => {
    document.querySelector<HTMLInputElement>('.query-input')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
  });
  await expect(input).toBeFocused();
  await expect(page.locator('.result-popover')).toHaveAttribute('aria-busy', 'false', { timeout: 40_000 });
  await expect.poll(() => page.locator('.result-snippet mark').first().evaluate(node => getComputedStyle(node).backgroundColor))
    .toBe('rgb(105, 87, 53)');
  await input.press('Enter'); await expect(input).not.toBeFocused();
});

test('failed global shard offers a retry and rapid replacement ignores stale results', async ({ page, context }) => {
  let fail = true;
  await context.route('**/data/search/*.json', async route => {
    if (fail) { fail = false; await route.abort(); } else await route.continue();
  });
  await page.goto('./');
  const input = page.getByRole('searchbox', { name: homeInput });
  await input.fill('رحمان');
  await expect(page.locator('.search-results-count')).toContainText('ناموفق', { timeout: 40_000 });
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await input.fill('الهم');
  await completeGlobal(page);
  await expect(page.locator('.search-result mark').first()).toBeVisible();
  await expect(page.locator('.search-results-count')).not.toContainText('ناموفق');
});

test.describe('touch and keyboard', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('outside touch hides results, dismisses the keyboard and preserves the tapped action', async ({ page }) => {
    await openReader(page);
    const input = page.getByRole('searchbox', { name: readerInput });
    await input.focus(); await expect(input).toBeFocused();
    await page.getByRole('button', { name: 'گزینه‌های زبان' }).tap();
    await expect(input).not.toBeFocused(); await expect(page.locator('.filter-menu')).toBeVisible();
    await page.getByRole('button', { name: persian }).tap();
    await expect(page.getByRole('button', { name: persian })).toHaveAttribute('aria-pressed', 'true');
    await expect(input).not.toBeFocused();
    await page.locator('article.reader').tap({ position: { x: 8, y: 470 }, force: true });
    await expect(page.locator('.filter-menu')).toBeHidden();
    await expect(page.locator('.result-reopen')).toBeVisible({ timeout: 40_000 });
    await page.locator('.result-reopen').tap(); await expect(page.locator('.result-popover')).toBeVisible();
    await expect(input).not.toBeFocused();
    await input.focus(); await input.press('Enter'); await expect(input).not.toBeFocused();
    await page.getByRole('button', { name: 'پاک کردن جست‌وجو' }).tap();
    await expect(input).toHaveValue(''); await expect(input).not.toBeFocused();
  });

  test('a delayed mobile click still reaches Clear, and a consumed click falls back to dismissal', async ({ page }) => {
    await openReader(page);
    const input = page.getByRole('searchbox', { name: readerInput });
    const result = await page.evaluate(async () => {
      const button = document.querySelector<HTMLButtonElement>('.query-clear')!;
      const rect = button.getBoundingClientRect(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: x, clientY: y }));
      button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: x, clientY: y }));
      await new Promise(resolve => setTimeout(resolve, 100));
      const hit = document.elementFromPoint(x, y);
      const stillClear = Boolean(hit && button.contains(hit));
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
      return stillClear;
    });
    expect(result).toBe(true); await expect(input).toHaveValue('');
    await input.fill('الهم'); await expect(page.locator('.result-popover')).toBeVisible({ timeout: 40_000 });
    await page.evaluate(() => {
      const outside = document.querySelector('article.reader')!;
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      outside.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
    });
    await expect(page.locator('.result-popover')).toBeHidden({ timeout: 3000 });
    await expect(page.locator('.result-reopen')).toBeVisible();
  });
});
