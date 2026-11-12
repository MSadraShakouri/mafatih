import { expect, test, type Page } from '@playwright/test';

// Real generated item data and bundled fonts in Chromium, not physical devices.
test.use({ viewport: { width: 1200, height: 800 } });
test.setTimeout(60_000);
const reader = (page: Page) => page.locator('main[data-screen="reader"]');
const modes = { normal: 'چیدمان معمولی', 'wide-0': 'کنار هم، بدون طول اضافه', 'wide-25': 'کنار هم، تا ۲۵٪ طول اضافه', 'wide-50': 'کنار هم، تا ۵۰٪ طول اضافه' } as const;
type Mode = keyof typeof modes;
async function preset(page: Page, mode: Mode, font = 'scheherazade', size = 100): Promise<void> {
  await page.addInitScript(({ mode, font, size }) => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font, arabicSize: size, translationSize: 100, explanationSize: 100, wideLayout: mode,
  })), { mode, font, size });
}
async function openSettings(page: Page): Promise<void> { await page.getByRole('button', { name: 'تنظیمات متن' }).click(); }
async function back(page: Page): Promise<void> { await page.getByRole('button', { name: 'بازگشت به دعا' }).click(); }

async function referenceLine(page: Page, language: 'ar' | 'fa' = 'ar'): Promise<{ row: string; language: string; offset: number; top: number }> {
  return page.evaluate(language => {
    const bands = [...document.querySelectorAll<HTMLElement>('article.reader .reader-band')];
    const paragraph = bands[Math.min(30, bands.length - 1)]!.querySelector<HTMLParagraphElement>(`:scope > [data-row-id] p[lang="${language}"]`)!;
    const b = paragraph.getBoundingClientRect();
    window.scrollBy(0, b.top - 105);
    const box = paragraph.getBoundingClientRect();
    const x = Math.max(1, Math.min(innerWidth - 1, box.right - 8)), y = Math.max(box.top + 1, Math.min(120, box.bottom - 1));
    const caret = (document as any).caretPositionFromPoint?.(x, y);
    if (!caret || !paragraph.contains(caret.offsetNode)) throw Error('Could not locate a reference caret');
    const prefix = document.createRange(); prefix.selectNodeContents(paragraph); prefix.setEnd(caret.offsetNode, caret.offset);
    const line = document.createRange(); line.setStart(caret.offsetNode, caret.offset); line.collapse(true);
    return { row: paragraph.closest<HTMLElement>('[data-row-id]')!.dataset.rowId!, language: paragraph.lang,
      offset: prefix.toString().length, top: line.getBoundingClientRect().top };
  }, language);
}
async function lineTop(page: Page, marker: { row: string; language: string; offset: number }): Promise<number> {
  return page.evaluate(({ row, language, offset }) => {
    const paragraph = [...document.querySelectorAll<HTMLElement>('article [data-row-id]')].find(e => e.dataset.rowId === row)
      ?.querySelector<HTMLParagraphElement>(`p[lang="${language}"]`);
    if (!paragraph) throw Error('Reference row or language vanished');
    let remaining = offset, node: Text | null; const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    while ((node = walker.nextNode() as Text | null) && remaining > node.length) remaining -= node.length;
    if (!node) throw Error('Reference offset vanished');
    const range = document.createRange(); range.setStart(node, remaining); range.collapse(true); return range.getBoundingClientRect().top;
  }, marker);
}

test('normal is the default; the three side-by-side choices are explicit, opt-in and persistent', async ({ page }) => {
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-jawshan-kabir');
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'false');
  await expect(page.locator('article .reader-band')).toHaveCount(0);
  await openSettings(page);
  const options = page.getByRole('radiogroup', { name: 'چیدمان متن' });
  for (const name of Object.values(modes)) await expect(options.getByRole('radio', { name })).toBeVisible();
  await expect(options.getByRole('radio', { name: modes.normal })).toBeChecked();
  await options.getByRole('radio', { name: modes['wide-25'] }).check(); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-25');
  await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.reload(); await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-25');
  await openSettings(page); await expect(options.getByRole('radio', { name: modes['wide-25'] })).toBeChecked();
  await options.getByRole('radio', { name: modes.normal }).check(); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'false');
  await expect(page.locator('article .reader-band')).toHaveCount(0);
});

/** Hold explicit font preparation while the still-visible settings screen is usable. */
async function holdFontPreparation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const fonts = document.fonts, original = fonts.load.bind(fonts);
    const gate = { enabled: true, pending: [] as { font: string; release: () => void }[] };
    (window as any).__readerFontGate = gate;
    fonts.load = (font: string, text?: string): Promise<FontFace[]> => {
      const actual = original(font, text);
      if (!gate.enabled) return actual;
      return new Promise((resolve, reject) => {
        gate.pending.push({ font, release: () => { void actual.then(resolve, reject); } });
      });
    };
  });
}
async function releaseFontPreparation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gate = (window as any).__readerFontGate;
    gate.enabled = false;
    for (const pending of gate.pending.splice(0)) pending.release();
  });
}

test('a grouped choice made while returning from settings is not lost', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(reader(page)).toBeVisible();
  await openSettings(page); await holdFontPreparation(page);
  try {
    await back(page);
    await page.waitForFunction(() => (window as any).__readerFontGate.pending.length > 0);
    await expect(page.locator('main[data-screen="settings"]')).toBeVisible();
    await page.getByRole('radio', { name: modes['wide-50'] }).check();
  } finally { await releaseFontPreparation(page); }
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-50');
  await expect(page.locator('article .reader-band').first()).toBeVisible({ timeout: 5_000 });
});

test('a font changed during a pending grouped return is prepared before grouping', async ({ page }) => {
  await preset(page, 'wide-50'); await page.goto('./#/item/dua-kumayl');
  await expect(reader(page)).toBeVisible(); await openSettings(page); await holdFontPreparation(page);
  try {
    await back(page);
    await page.waitForFunction(() => (window as any).__readerFontGate.pending.some((entry: { font: string }) => entry.font.includes('Scheherazade')));
    await expect(page.locator('main[data-screen="settings"]')).toBeVisible();
    await page.getByRole('radio', { name: 'امیری' }).check();
    await page.waitForFunction(() => (window as any).__readerFontGate.pending.some((entry: { font: string }) => entry.font.includes('Amiri')));
    await page.evaluate(() => {
      const gate = (window as any).__readerFontGate;
      const index = gate.pending.findIndex((entry: { font: string }) => entry.font.includes('Scheherazade'));
      gate.pending.splice(index, 1)[0].release();
    });
    // Either the app mounted too early, or it requested the new font for the
    // reader in addition to the settings preview's own preparation.
    await page.waitForFunction(() => document.querySelector('main[data-screen="reader"]') ||
      (window as any).__readerFontGate.pending.filter((entry: { font: string }) => entry.font.includes('Amiri')).length >= 2);
    expect(await reader(page).count()).toBe(0);
  } finally { await releaseFontPreparation(page); }
  await expect(reader(page)).toHaveAttribute('data-reader-font', 'amiri');
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-50');
  await expect(page.locator('article .reader-band').first()).toBeVisible();
});

test('leaving a delayed grouped return cannot replace the newer route', async ({ page }) => {
  await page.goto('./#/item/dua-kumayl'); await expect(reader(page)).toBeVisible();
  await openSettings(page); await holdFontPreparation(page);
  try {
    await back(page);
    await page.waitForFunction(() => (window as any).__readerFontGate.pending.length > 0);
    await page.getByRole('radio', { name: modes['wide-50'] }).check();
    await page.evaluate(() => (window as any).__readerFontGate.pending.shift().release());
    // The newly enabled layout now waits for its own font preparation.
    await page.waitForFunction(() => (window as any).__readerFontGate.pending.length > 0);
    await page.evaluate(() => { window.location.hash = '#/'; });
    await expect(page.locator('main[data-screen="library"]')).toBeVisible();
  } finally { await releaseFontPreparation(page); }
  await page.waitForTimeout(100); // Allow the released stale preparation to finish.
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
  await expect(reader(page)).toHaveCount(0);
});

for (const [mode, allowance] of [['wide-0', 0], ['wide-25', .25], ['wide-50', .5]] as const) {
  test(`${mode}: Arabic-sized neighboring groups stay inside the viewport and keep exact row pairs and order`, async ({ page, request }) => {
    await preset(page, mode); const response = await request.get('./data/items/dua-jawshan-kabir.json');
    const data = await response.json() as { rows: { id: string; ar: string; fa: string; kind?: string }[] };
    await page.goto('./#/item/dua-jawshan-kabir');
    await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
    const rendered = await page.locator('article [data-row-id]').evaluateAll(elements => elements.map(element => ({
      id: (element as HTMLElement).dataset.rowId!, ar: element.querySelector('p[lang="ar"]')?.textContent ?? '',
      fa: element.querySelector('p[lang="fa"]')?.textContent ?? '', kind: (element as HTMLElement).dataset.kind,
    })));
    const display = (text: string) => text.replace(/[0-9٠-٩]/gu, d => '۰۱۲۳۴۵۶۷۸۹'['٠١٢٣٤٥٦٧٨٩'.includes(d) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : Number(d)]!);
    expect(rendered).toEqual(data.rows.map(({ id, ar, fa, kind }) => ({ id, ar: display(ar), fa: display(fa), kind })));
    const measurements = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
      const article = main.querySelector<HTMLElement>('article.reader')!, width = article.getBoundingClientRect().width;
      const groups = [...article.querySelectorAll<HTMLElement>('.reader-band')];
      const probe = document.createElement('div'); probe.className = 'reader';
      probe.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;width:0;'; main.append(probe);
      const paragraphs: HTMLElement[][] = [];
      for (const group of groups) {
        const copy: HTMLElement[] = [];
        for (const row of group.querySelectorAll<HTMLElement>(':scope > [data-row-id]')) {
          const original = row.querySelector<HTMLElement>('p[data-text-role="arabic"]');
          if (!original) throw Error('A grouped row lacks Arabic');
          const p = original.cloneNode(true) as HTMLElement;
          p.style.cssText = 'width:max-content;max-width:none;white-space:pre;text-wrap:nowrap;text-align:start;';
          probe.append(p); copy.push(p);
        }
        paragraphs.push(copy);
      }
      const detail = groups.map((group, index) => {
        const children = [...group.querySelectorAll<HTMLElement>(':scope > [data-row-id]')];
        const arabic = children.map(child => child.querySelector<HTMLElement>('p[lang="ar"]')!.getBoundingClientRect());
        const persian = children.map(child => child.querySelector<HTMLElement>('p[lang="fa"]')?.getBoundingClientRect()).filter((box): box is DOMRect => !!box);
        return { count: children.length, gap: parseFloat(getComputedStyle(group).columnGap) || 0,
          natural: paragraphs[index]!.reduce((sum, p) => sum + p.getBoundingClientRect().width, 0),
          arabic: arabic.map(b => ({ top: b.top, bottom: b.bottom, left: b.left, right: b.right })),
          persian: persian.map(b => ({ top: b.top, bottom: b.bottom, left: b.left, right: b.right })),
          articleLeft: article.getBoundingClientRect().left, articleRight: article.getBoundingClientRect().right };
      });
      probe.remove(); return { width, documentWidth: document.documentElement.scrollWidth, detail };
    });
    expect(measurements.width).toBeGreaterThan(1000);
    expect(measurements.documentWidth).toBeLessThanOrEqual(1201);
    expect(measurements.detail.length).toBeGreaterThan(20);
    expect(Math.max(...measurements.detail.map(g => g.count))).toBeGreaterThanOrEqual(4);
    expect(new Set(measurements.detail.map(g => g.count)).size).toBeGreaterThan(1);
    for (const group of measurements.detail) {
      expect(group.count).toBeGreaterThanOrEqual(2);
      expect(group.natural + group.gap * (group.count - 1)).toBeLessThanOrEqual(measurements.width * (1 + allowance) + 2);
      if (group.persian.length) expect(Math.min(...group.persian.map(b => b.top))).toBeGreaterThanOrEqual(Math.max(...group.arabic.map(b => b.bottom)) - 1);
      for (const box of [...group.arabic, ...group.persian]) {
        expect(box.left).toBeGreaterThanOrEqual(group.articleLeft - 1);
        expect(box.right).toBeLessThanOrEqual(group.articleRight + 1);
      }
      for (const language of [group.arabic, group.persian]) for (let i = 1; i < language.length; i++) {
        const before = language[i - 1]!, current = language[i]!;
        expect(current.top + 1 >= before.top).toBe(true);
        if (Math.abs(current.top - before.top) < 1) expect(current.right).toBeLessThan(before.right);
      }
    }
  });
}

test('the allowance changes groups; phone portrait also groups and resizing recalculates', async ({ page }) => {
  await preset(page, 'wide-0'); await page.goto('./#/item/dua-jawshan-kabir');
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  const signature = () => page.locator('.reader-band').evaluateAll(bands => bands.map(b => [...b.querySelectorAll<HTMLElement>(':scope > [data-row-id]')].map(r => r.dataset.rowId).join(',')));
  const zero = await signature();
  await openSettings(page); await page.getByRole('radio', { name: modes['wide-50'] }).check(); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-50');
  const fifty = await signature(); expect(fifty).not.toEqual(zero);
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  await expect(page.locator('.reader-band').first()).toBeVisible();
  await expect.poll(signature).not.toEqual(fifty);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  expect(await signature()).toEqual(fifty);
});

test('explanatory, Persian-only and long Arabic rows remain intact; no row or translation is omitted', async ({ page, request }) => {
  await preset(page, 'wide-0'); await page.setViewportSize({ width: 760, height: 800 });
  const checkRows = async (item: string) => {
    const data = await (await request.get(`./data/items/${item}.json`)).json() as { rows: { id: string; ar: string; fa: string }[] };
    const display = (text: string) => text.replace(/[0-9٠-٩]/gu, d => '۰۱۲۳۴۵۶۷۸۹'['٠١٢٣٤٥٦٧٨٩'.includes(d) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : Number(d)]!);
    const actual = await page.locator('article [data-row-id]').evaluateAll(nodes => nodes.map(node => ({
      id: (node as HTMLElement).dataset.rowId!, ar: node.querySelector('p[lang="ar"]')?.textContent ?? '',
      fa: node.querySelector('p[lang="fa"]')?.textContent ?? '',
    })));
    expect(actual).toEqual(data.rows.map(({ id, ar, fa }) => ({ id, ar: display(ar), fa: display(fa) })));
  };
  await page.goto('./#/item/amal-aamal-asr-jmah'); await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  await checkRows('amal-aamal-asr-jmah');
  const explanation = page.locator('[data-kind="instruction"]').first(); await expect(explanation).toBeVisible();
  expect(await explanation.evaluate(e => e.parentElement?.classList.contains('reader-band'))).toBe(false);
  const noArabic = page.locator('article [data-row-id]').filter({ hasNot: page.locator('p[data-text-role="arabic"]') }).first();
  expect(await noArabic.evaluate(e => e.parentElement?.classList.contains('reader-band'))).toBe(false);
  await page.goto('./#/item/ziyarat-ashura'); await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  await checkRows('ziyarat-ashura');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(761);
  const longRows = await page.locator('article > .reader-row p[data-text-role="arabic"]').evaluateAll(nodes => nodes.filter(p => {
    const cs = getComputedStyle(p); return p.getBoundingClientRect().height > parseFloat(cs.lineHeight) * 2;
  }).length);
  expect(longRows).toBeGreaterThan(0);
});

test('search still aligns the original row to the pointer in a wide opted-in layout', async ({ page }) => {
  await preset(page, 'wide-25'); await page.goto('./#/item/dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  const markerBox = await page.locator('#current-marker').boundingBox();
  expect(markerBox!.x + markerBox!.width).toBeCloseTo(1200, 0);
  await page.locator('#current-marker').focus(); await page.keyboard.press('ArrowUp');
  const chosen = await page.locator('#current-marker').evaluate(e => { const b=e.getBoundingClientRect(); return b.top+b.height/2; });
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الهم');
  const hit = page.locator('.result-row[data-row-id="r00028"][data-language="ar"] button');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.click();
  await expect(reader(page)).toHaveAttribute('data-anchor-row', 'r00028');
  const line = await page.locator('[data-row-id="r00028"] p[lang="ar"]').evaluate(p => {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), node = walker.nextNode()!;
    const range = document.createRange(); range.setStart(node, 0); range.collapse(true);
    const b = range.getBoundingClientRect(); return b.top + b.height / 2;
  });
  expect(Math.abs(line - chosen)).toBeLessThan(2);
  await expect(page.getByRole('searchbox', { name: 'جست‌وجو در این متن' })).toHaveValue('الهم');
});

test('the same visible source line stays in place through a layout change and viewport resize', async ({ page }) => {
  await preset(page, 'wide-50'); await page.goto('./#/item/dua-jawshan-kabir');
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  const initial = await referenceLine(page); await page.waitForTimeout(80);
  await openSettings(page); await page.getByRole('radio', { name: modes['wide-0'] }).check(); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-0');
  await expect.poll(async () => Math.abs(await lineTop(page, initial) - initial.top)).toBeLessThan(3);
  const beforeResize = await referenceLine(page); await page.waitForTimeout(80);
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  await expect.poll(async () => Math.abs(await lineTop(page, beforeResize) - beforeResize.top)).toBeLessThan(3);
});

test('font and size changes regroup using shaped text while preserving a Persian line', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 800 }); await preset(page, 'wide-25');
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  const signature = () => page.locator('.reader-band').evaluateAll(bands => bands.map(b =>
    [...b.querySelectorAll<HTMLElement>(':scope > [data-row-id]')].map(row => row.dataset.rowId).join(',')));
  const before = await signature(), marker = await referenceLine(page, 'fa');
  await page.waitForTimeout(80); await openSettings(page);
  await page.getByText('امیری', { exact: true }).click();
  await page.getByRole('button', { name: 'دیدن نمونهٔ متن عربی' }).click();
  await page.getByRole('button', { name: 'بزرگ‌تر کردن متن عربی' }).evaluate(button => {
    for (let i = 0; i < 8; i++) (button as HTMLButtonElement).click();
  });
  await back(page); await expect(reader(page)).toHaveAttribute('data-reader-font', 'amiri');
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-25');
  expect(await signature()).not.toEqual(before);
  await expect.poll(async () => Math.abs(await lineTop(page, marker) - marker.top)).toBeLessThan(3);
  const actual = await page.locator('article p[data-text-role="arabic"]').first().evaluate(node => ({
    size: parseFloat(getComputedStyle(node).fontSize), font: getComputedStyle(node).fontFamily,
  }));
  expect(actual.size).toBeGreaterThan(25.3); expect(actual.font).toContain('Mafatih Amiri');
});

test('a deep link into a verse-marker span keeps its original row and offset in a group', async ({ page }) => {
  await preset(page, 'wide-50'); await page.goto('./#/item/sura-yasin');
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  const anchor = await page.evaluate(() => {
    const marker = [...document.querySelectorAll<HTMLElement>('.reader-band .quran-verse-marker')]
      .find(node => Number(node.closest<HTMLElement>('[data-row-id]')!.dataset.rowId!.slice(1)) >= 30)!;
    if (!marker) throw Error('No grouped verse marker in the real item');
    const paragraph = marker.closest('p')!, prefix = document.createRange();
    prefix.selectNodeContents(paragraph); prefix.setEndBefore(marker);
    return { row: marker.closest<HTMLElement>('[data-row-id]')!.dataset.rowId!, offset: Array.from(prefix.toString()).length + 1 };
  });
  await page.goto(`./#/item/sura-yasin?row=${anchor.row}&lang=ar&offset=${anchor.offset}`);
  await expect(reader(page)).toHaveAttribute('data-anchor-row', anchor.row);
  await expect(reader(page)).toHaveAttribute('data-anchor-offset', String(anchor.offset));
  const geometry = await page.evaluate(({ row, offset }) => {
    const paragraph = document.querySelector<HTMLElement>(`[data-row-id="${row}"] p[lang="ar"]`)!;
    if (!paragraph.closest('.reader-band') || !paragraph.querySelector('.quran-verse-marker')) throw Error('Grouped marker disappeared');
    let remaining = Array.from(paragraph.textContent!).slice(0, offset).join('').length;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (remaining <= node.length) {
        const range = document.createRange(); range.setStart(node, remaining); range.collapse(true);
        const r = range.getBoundingClientRect(), m = document.querySelector('#current-marker')!.getBoundingClientRect();
        return { line: r.top + r.height / 2, pointer: m.top + m.height / 2 };
      }
      remaining -= node.length;
    }
    throw Error('Original marker offset could not be mapped through the DOM');
  }, anchor);
  expect(Math.abs(geometry.line - geometry.pointer)).toBeLessThan(2);
});

for (const scenario of [
  { font: 'scheherazade', size: 100, item: 'dua-jawshan-kabir', fallback: false },
  { font: 'amiri', size: 154, item: 'dua-jawshan-kabir', fallback: false },
  { font: 'noto-naskh', size: 100, item: 'sura-yasin', fallback: false },
  { font: 'amiri', size: 100, item: 'sura-yasin', fallback: true },
  { font: 'scheherazade', size: 100, item: 'dua-jawshan-kabir', fallback: false, blockedFont: 'ScheherazadeNew' },
  { font: 'amiri', size: 100, item: 'sura-yasin', fallback: false, blockedFont: 'Amiri' },
  { font: 'amiri', size: 100, item: 'sura-yasin', fallback: true, blockedFont: 'Amiri' },
]) {
  test(`greedy bands match actual shaped DOM widths: ${scenario.font}, ${scenario.size}%${scenario.fallback ? ', no canvas' : ''}${'blockedFont' in scenario ? ', font file unavailable' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 844 });
    await preset(page, 'wide-50', scenario.font, scenario.size);
    if (scenario.fallback) await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
    });
    if ('blockedFont' in scenario && scenario.blockedFont) {
      const blockedFont = scenario.blockedFont;
      await page.route(/\.ttf(?:\?.*)?$/u, route =>
        route.request().url().includes(blockedFont) ? route.abort() : route.continue());
    }
    await page.goto(`./#/item/${scenario.item}`); await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
      const article = main.querySelector<HTMLElement>('article.reader')!, width = article.getBoundingClientRect().width;
      const rows = [...article.querySelectorAll<HTMLElement>('[data-row-id]')];
      const probe = document.createElement('div'); probe.className = 'reader';
      probe.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;width:0;'; main.append(probe);
      const clones = rows.map(row => {
        const p = row.querySelector<HTMLElement>('p[data-text-role="arabic"]');
        if (!p || !p.textContent?.trim() || /[\r\n]/u.test(p.textContent)) return null;
        const clone = p.cloneNode(true) as HTMLElement;
        clone.style.cssText = 'width:max-content;max-width:none;white-space:pre;text-wrap:nowrap;text-align:start;';
        probe.append(clone); return clone;
      });
      const widths = clones.map(p => p ? p.getBoundingClientRect().width : null); probe.remove();
      const expected: string[][] = []; let group: string[] = [], sum = 0;
      const flush = () => { if (group.length >= 2) expected.push(group); group = []; sum = 0; };
      for (let i = 0; i < rows.length; i++) {
        const value = widths[i];
        if (value === null || value === undefined || value <= 0 || value > width * 1.5) { flush(); continue; }
        if (group.length && sum + 12 + value > width * 1.5) flush();
        sum += (group.length ? 12 : 0) + value; group.push(rows[i]!.dataset.rowId!);
      }
      flush();
      const actual = [...article.querySelectorAll<HTMLElement>('.reader-band')].map(band =>
        [...band.querySelectorAll<HTMLElement>(':scope > [data-row-id]')].map(row => row.dataset.rowId!));
      return { expected, actual, markers: article.querySelectorAll('.quran-verse-marker').length };
    });
    expect(result.actual.length).toBeGreaterThan(0);
    expect(result.actual).toEqual(result.expected);
    if (scenario.item === 'sura-yasin') expect(result.markers).toBeGreaterThan(70);
  });
}

test('the reader keeps every row if a WebView blocks canvas text measurement', async ({ page, request }) => {
  await preset(page, 'wide-25');
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => { throw new Error('blocked canvas'); } });
  });
  const data = await (await request.get('./data/items/dua-kumayl.json')).json() as { rows: { id: string }[] };
  await page.goto('./#/item/dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(page.locator('article [data-row-id]')).toHaveCount(data.rows.length);
  await expect(page.locator('.reader-band').first()).toBeVisible();
});

test('the default reader does not load the optional grouping module', async ({ page }) => {
  const optional: string[] = [];
  page.on('request', request => { if (/\/wide-reader-[^/]+\.js(?:\?|$)/u.test(request.url())) optional.push(request.url()); });
  await page.goto('./#/item/dua-kumayl'); await expect(page.locator('#play')).toBeVisible();
  expect(optional).toHaveLength(0);
  await openSettings(page); await page.getByRole('radio', { name: modes['wide-0'] }).check(); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-active', 'true');
  expect(optional).toHaveLength(1);
});

test('repeat grouping reuses exact measurements and invalidates them when fonts change', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await preset(page, 'wide-0');
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.measureText;
    (window as unknown as { wideMeasurements: number }).wideMeasurements = 0;
    CanvasRenderingContext2D.prototype.measureText = function (text: string): TextMetrics {
      (window as unknown as { wideMeasurements: number }).wideMeasurements++;
      return original.call(this, text);
    };
  });
  const measurements = () => page.evaluate(() => (window as unknown as { wideMeasurements: number }).wideMeasurements);
  const signature = () => page.locator('.reader-band').evaluateAll(bands => bands.map(band =>
    [...band.querySelectorAll<HTMLElement>(':scope > [data-row-id]')].map(row => row.dataset.rowId).join(',')));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('#play')).toBeVisible();
  // Settings displays all font samples. Wait until those fonts have settled so
  // a legitimate font-loading event cannot invalidate a measurement mid-test.
  await openSettings(page); await page.evaluate(() => document.fonts.ready); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-0');
  const initial = await signature(), shaped = await measurements();
  expect(shaped).toBeGreaterThan(1000);
  await openSettings(page); await page.getByRole('radio', { name: modes['wide-50'] }).check();
  await page.evaluate(() => document.fonts.ready); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-50');
  expect(await signature()).not.toEqual(initial);
  expect(await measurements()).toEqual(shaped);
  await openSettings(page); await page.evaluate(() => {
    document.fonts.dispatchEvent(new Event('loadingdone'));
  }); await back(page);
  await expect(reader(page)).toHaveAttribute('data-wide-layout', 'wide-50');
  expect(await measurements() - shaped).toBeGreaterThan(1000);
});

for (const item of ['amal-aamal-an', 'amal-aamal-hfdhm-mvlvd']) {
  test(`a reader with no neighboring Arabic candidates skips measurement: ${item}`, async ({ page, request }) => {
    await page.setViewportSize({ width: 393, height: 844 });
    await preset(page, 'wide-50');
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      (window as unknown as { canvasContexts: number }).canvasContexts = 0;
      (HTMLCanvasElement.prototype as any).getContext = function (...args: unknown[]) {
        (window as unknown as { canvasContexts: number }).canvasContexts++;
        return (original as (...values: unknown[]) => unknown).apply(this, args);
      };
    });
    const data = await (await request.get(`./data/items/${item}.json`)).json() as { rows: { id: string }[] };
    await page.goto(`./#/item/${item}`); await expect(reader(page)).toHaveAttribute('data-item-id', item);
    await expect(page.locator('#play')).toBeVisible();
    await expect(page.locator('article [data-row-id]')).toHaveCount(data.rows.length);
    await expect(page.locator('article .reader-band')).toHaveCount(0);
    if (item === 'amal-aamal-an') {
      const longRow = page.locator('[data-row-id="r00003"] p[lang="ar"]');
      expect(await longRow.evaluate(node => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)))
        .toBeGreaterThan(2);
    }
    expect(await page.evaluate(() => (window as unknown as { canvasContexts: number }).canvasContexts)).toBe(0);
  });
}
