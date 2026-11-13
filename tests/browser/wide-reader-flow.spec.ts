import { expect, test, type Page } from '@playwright/test';

// Real Jawshan data and bundled fonts in Chromium's phone emulation, not a physical phone.
test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
test.setTimeout(60_000);

for (const mode of ['wide-25', 'wide-50'] as const) {
  test(`${mode}: a grouped Arabic phrase starts in the remaining space and wraps by word`, async ({ page, request }) => {
    await page.addInitScript(mode => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: mode,
    })), mode);
    const data = await (await request.get('./data/items/dua-jawshan-kabir.json')).json() as {
      rows: { id: string; ar: string; fa: string }[];
    };
    await page.goto('./#/item/dua-jawshan-kabir');
    await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-wide-layout', mode);
    await expect(page.locator('article .reader-band').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // The reader starts above a long introduction. Scroll to the reported
    // passage as a reader would, rather than inspecting an off-screen band.
    await page.locator('[data-row-id="r00025"] p[lang="ar"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const detail = await page.evaluate(() => {
      const article = document.querySelector<HTMLElement>('article.reader')!;
      const first = article.querySelector<HTMLElement>('[data-row-id="r00025"]')!;
      const second = article.querySelector<HTMLElement>('[data-row-id="r00026"]')!;
      const firstArabic = first.querySelector<HTMLParagraphElement>('p[lang="ar"]')!;
      const secondArabic = second.querySelector<HTMLParagraphElement>('p[lang="ar"]')!;
      const charRect = (paragraph: HTMLElement, last = false) => {
        const text = paragraph.textContent!, offset = last ? text.length - 1 : 0;
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        let remaining = offset, node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
          if (remaining < node.length) {
            const range = document.createRange(); range.setStart(node, remaining); range.setEnd(node, remaining + 1);
            const box = range.getBoundingClientRect(); return { top: box.top, left: box.left, right: box.right };
          }
          remaining -= node.length;
        }
        throw Error('Could not locate a character in the original paragraph');
      };
      const persian = [first, second].map(row => {
        const paragraph = row.querySelector<HTMLParagraphElement>('p[lang="fa"]')!, box = paragraph.getBoundingClientRect();
        return { text: paragraph.textContent, width: box.width, left: box.left, right: box.right, top: box.top,
          display: getComputedStyle(paragraph).display };
      });
      return {
        sameBand: first.parentElement === second.parentElement && first.parentElement?.classList.contains('reader-band'),
        first: charRect(firstArabic), secondStart: charRect(secondArabic), secondEnd: charRect(secondArabic, true),
        ar: [firstArabic.textContent, secondArabic.textContent], persian,
        width: article.getBoundingClientRect().width, documentWidth: document.documentElement.scrollWidth,
      };
    });
    console.log('Jawshan grouped flow', mode, JSON.stringify(detail));
    const display = (text: string) => text.replace(/[0-9٠-٩]/gu, d => '۰۱۲۳۴۵۶۷۸۹'['٠١٢٣٤٥٦٧٨٩'.includes(d) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : Number(d)]!);
    const rows = data.rows.filter(row => row.id === 'r00025' || row.id === 'r00026');
    expect(detail.sameBand).toBe(true);
    expect(detail.ar).toEqual(rows.map(row => display(row.ar)));
    expect(detail.persian.map(row => row.text)).toEqual(rows.map(row => display(row.fa)));
    expect(Math.abs(detail.secondStart.top - detail.first.top), 'the next phrase should start on the first line').toBeLessThan(1);
    expect(detail.secondEnd.top - detail.secondStart.top, 'only the remaining words should wrap').toBeGreaterThan(20);
    expect(detail.persian.every(row => row.display !== 'contents' && row.width > 0)).toBe(true);
    expect(Math.abs(detail.persian[0]!.top - detail.persian[1]!.top)).toBeLessThan(1);
    expect(detail.persian[0]!.left - detail.persian[1]!.right).toBeCloseTo(12, 1);
    expect(detail.documentWidth).toBeLessThanOrEqual(393);
  });
}

test('a deep link to the first word on a wrapped continuation aligns that word with the pointer', async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  const data = await (await request.get('./data/items/dua-jawshan-kabir.json')).json() as { rows: { id: string; ar: string }[] };
  const text = data.rows.find(row => row.id === 'r00026')!.ar;
  const utf16 = text.indexOf('الدَّعَواتِ'); expect(utf16).toBeGreaterThan(0);
  const offset = Array.from(text.slice(0, utf16)).length;
  await page.goto(`./#/item/dua-jawshan-kabir?row=r00026&lang=ar&offset=${offset}`);
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-offset', String(offset));
  const geometry = await page.evaluate(offset => {
    const paragraph = document.querySelector<HTMLParagraphElement>('[data-row-id="r00026"] p[lang="ar"]')!;
    let remaining = Array.from(paragraph.textContent!).slice(0, offset).join('').length;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (remaining < node.length) {
        const range = document.createRange(); range.setStart(node, remaining); range.collapse(true);
        const line = range.getBoundingClientRect(), pointer = document.querySelector('#current-marker')!.getBoundingClientRect();
        return { line: line.top + line.height / 2, pointer: pointer.top + pointer.height / 2 };
      }
      remaining -= node.length;
    }
    throw Error('Original word offset vanished');
  }, offset);
  expect(Math.abs(geometry.line - geometry.pointer)).toBeLessThan(2);
});

async function wordLine(page: Page, row: string, offset: number): Promise<number> {
  return page.evaluate(({ row, offset }) => {
    const paragraph = document.querySelector<HTMLElement>(`article [data-row-id="${row}"] p[lang="ar"]`)!;
    let remaining = Array.from(paragraph.textContent!).slice(0, offset).join('').length;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (remaining < node.length) {
        const range = document.createRange(); range.setStart(node, remaining); range.collapse(true);
        const box = range.getBoundingClientRect(); return box.top + box.height / 2;
      }
      remaining -= node.length;
    }
    throw Error('The source word offset is missing');
  }, { row, offset });
}

async function jawshanWordOffset(page: Page): Promise<number> {
  return page.locator('[data-row-id="r00026"] p[lang="ar"]').evaluate(paragraph => {
    const text = paragraph.textContent!, utf16 = text.indexOf('الدَّعَواتِ');
    if (utf16 < 0) throw Error('The expected original word is missing');
    return Array.from(text.slice(0, utf16)).length;
  });
}

async function pointerLine(page: Page): Promise<number> {
  return page.locator('#current-marker').evaluate(element => {
    const box = element.getBoundingClientRect(); return box.top + box.height / 2;
  });
}

test('in-text search prepares an off-screen phrase and aligns a match at its wrapped word', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir');
  await expect(page.locator('article .reader-band').first()).toBeVisible();
  const offset = await jawshanWordOffset(page);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }); await input.fill('الدعوات');
  const hit = page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button');
  await expect(hit).toBeVisible({ timeout: 40_000 }); await hit.click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-offset', String(offset));
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  expect(Math.abs(await wordLine(page, 'r00026', offset) - await pointerLine(page))).toBeLessThan(2);
  await expect(input).toHaveValue('الدعوات');
});

test('the same wrapped source word remains in place through settings and a width change', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir?row=r00026&lang=ar&offset=12');
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
  const offset = await jawshanWordOffset(page); expect(offset).toBe(12);
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  const line = await wordLine(page, 'r00026', offset);
  await page.evaluate(delta => window.scrollBy(0, delta), line - 112);
  await page.waitForTimeout(100);
  const before = await wordLine(page, 'r00026', offset);
  expect(before).toBeGreaterThan(80); expect(before).toBeLessThan(145);
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('radio', { name: 'کنار هم، تا ۲۵٪ طول اضافه' }).check();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-wide-layout', 'wide-25');
  await expect.poll(async () => Math.abs(await wordLine(page, 'r00026', offset) - before)).toBeLessThan(3);
  await page.waitForTimeout(100);
  const beforeResize = await wordLine(page, 'r00026', offset);
  await page.setViewportSize({ width: 430, height: 852 });
  await expect.poll(async () => Math.abs(await wordLine(page, 'r00026', offset) - beforeResize)).toBeLessThan(3);
});

for (const scenario of [
  { width: 320, font: 'scheherazade', size: 100, mode: 'wide-50', first: 'r00025', second: 'r00026' },
  { width: 393, font: 'noto-naskh', size: 100, mode: 'wide-25', first: 'r00025', second: 'r00026' },
  { width: 393, font: 'amiri', size: 154, mode: 'wide-25', first: 'r00033', second: 'r00034' },
  { width: 393, font: 'scheherazade', size: 100, mode: 'wide-50', first: 'r00025', second: 'r00026', fallback: true },
] as const) {
  test(`visible Arabic flows at ${scenario.width}px, ${scenario.font} ${scenario.size}%${'fallback' in scenario ? ', without canvas or IntersectionObserver' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 852 });
    await page.addInitScript(({ font, size, mode }) => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font, arabicSize: size, translationSize: 100, explanationSize: 100, wideLayout: mode,
    })), scenario);
    if ('fallback' in scenario) await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
      Reflect.deleteProperty(window, 'IntersectionObserver');
    });
    await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
    await page.locator(`[data-row-id="${scenario.first}"] p[lang="ar"]`).scrollIntoViewIfNeeded();
    await expect.poll(async () => {
      const first = await wordLine(page, scenario.first, 0), second = await wordLine(page, scenario.second, 0);
      return Math.abs(first - second);
    }).toBeLessThan(1);
    const group = page.locator(`[data-row-id="${scenario.first}"]`).locator('..');
    await expect(group.locator(`[data-row-id="${scenario.second}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-row-id="${scenario.second}"] p[lang="ar"]`)).toHaveClass(/wide-arabic-flow/u);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(scenario.width);
  });
}

async function scrollWholeItem(page: Page): Promise<void> {
  const coverage = await page.evaluate(async () => {
    const blocks = [...document.querySelector<HTMLElement>('article.reader')!.children];
    const visited = new Set<Element>();
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const collect = () => {
      for (const block of blocks) {
        const box = block.getBoundingClientRect();
        if (box.height > 0 && box.bottom > 0 && box.top < innerHeight) visited.add(block);
      }
    };
    window.scrollTo(0, 0);
    let steps = 0, reachedEnd = false;
    while (steps++ < 5000) {
      await frame(); collect();
      // Preparing a band can change the document height. Recalculate the end
      // on every step, and confirm it is stable before stopping at the bottom.
      const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      if (window.scrollY >= end - 1) {
        await frame(); collect();
        const currentEnd = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        if (Math.abs(currentEnd - end) <= 1 && window.scrollY >= currentEnd - 1) { reachedEnd = true; break; }
        continue;
      }
      window.scrollTo(0, Math.min(end, window.scrollY + Math.floor(innerHeight / 2)));
    }
    return { reachedEnd, steps, total: blocks.length, visited: visited.size,
      missing: blocks.filter(block => !visited.has(block)).slice(0, 8).map(block =>
        (block as HTMLElement).dataset.rowId ?? block.querySelector<HTMLElement>('[data-row-id]')?.dataset.rowId) };
  });
  expect(coverage.reachedEnd, JSON.stringify(coverage)).toBe(true);
  expect(coverage.visited, JSON.stringify(coverage)).toBe(coverage.total);
}

const displayDigits = (text: string | null) => (text ?? '').replace(/[0-9٠-٩]/gu,
  digit => '۰۱۲۳۴۵۶۷۸۹'['٠١٢٣٤٥٦٧٨٩'.includes(digit) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : Number(digit)]!);

test('scrolling all of Jawshan preserves every original row and keeps Persian paragraphs independent', async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  const data = await (await request.get('./data/items/dua-jawshan-kabir.json')).json() as {
    rows: { id: string; ar: string | null; fa: string | null; kind?: string }[];
  };
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await scrollWholeItem(page);
  const result = await page.evaluate(() => ({
    rows: [...document.querySelectorAll<HTMLElement>('article [data-row-id]')].map(row => ({
      id: row.dataset.rowId, ar: row.querySelector('p[lang="ar"]')?.textContent ?? '',
      fa: row.querySelector('p[lang="fa"]')?.textContent ?? '', kind: row.dataset.kind,
    })),
    fragments: document.querySelectorAll('article p[lang="ar"].wide-arabic-flow').length,
    alteredPersian: document.querySelectorAll('article p[lang="fa"].wide-arabic-flow, article p[lang="fa"] .wide-arabic-fragment').length,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(result.rows).toEqual(data.rows.map(row => ({ id: row.id, ar: displayDigits(row.ar), fa: displayDigits(row.fa), kind: row.kind })));
  expect(result.fragments).toBeGreaterThan(200);
  expect(result.alteredPersian).toBe(0); expect(result.documentWidth).toBeLessThanOrEqual(393);
});

test('grouped Quran verse markers and their original text survive Arabic line flow', async ({ page, request }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  const data = await (await request.get('./data/items/sura-yasin.json')).json() as {
    rows: { id: string; ar: string | null; fa: string | null }[];
  };
  await page.goto('./#/item/sura-yasin'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await scrollWholeItem(page);
  const result = await page.evaluate(() => ({
    rows: [...document.querySelectorAll<HTMLElement>('article [data-row-id]')].map(row => ({
      id: row.dataset.rowId, ar: row.querySelector('p[lang="ar"]')?.textContent ?? '',
      fa: row.querySelector('p[lang="fa"]')?.textContent ?? '',
      markers: row.querySelectorAll('p[lang="ar"] .quran-verse-marker').length,
    })),
    fragmentedWithMarkers: document.querySelectorAll('article p.wide-arabic-flow:has(.quran-verse-marker)').length,
  }));
  expect(result.fragmentedWithMarkers).toBeGreaterThan(0);
  expect(result.rows).toEqual(data.rows.map(row => ({ id: row.id, ar: displayDigits(row.ar), fa: displayDigits(row.fa),
    markers: [...(row.ar ?? '').matchAll(/﴿[0-9٠-٩۰-۹]+﴾/gu)].length })));
});

test('position on a wrapped continuation survives settings without caret-from-point APIs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir?row=r00026&lang=ar&offset=12');
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
  const offset = await jawshanWordOffset(page), line = await wordLine(page, 'r00026', offset);
  await page.evaluate(delta => {
    window.scrollBy(0, delta);
    Object.defineProperty(document, 'caretPositionFromPoint', { value: undefined, configurable: true });
    Object.defineProperty(document, 'caretRangeFromPoint', { value: undefined, configurable: true });
  }, line - 112);
  await page.waitForTimeout(100); const before = await wordLine(page, 'r00026', offset);
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('radio', { name: 'کنار هم، تا ۲۵٪ طول اضافه' }).check();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-wide-layout', 'wide-25');
  await expect.poll(async () => Math.abs(await wordLine(page, 'r00026', offset) - before)).toBeLessThan(3);
});

test('a final word can use the remaining space even when its following space would hang', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.locator('[data-row-id="r00034"] p[lang="ar"]').scrollIntoViewIfNeeded();
  const beforeOffset = await page.locator('[data-row-id="r00034"] p[lang="ar"]').evaluate(p => Array.from(p.textContent!).length - 1);
  const sameBand = await page.locator('[data-row-id="r00034"]').evaluate(row =>
    row.parentElement === document.querySelector('[data-row-id="r00035"]')?.parentElement);
  expect(sameBand).toBe(true);
  await expect.poll(async () => Math.abs(await wordLine(page, 'r00034', beforeOffset) - await wordLine(page, 'r00035', 0)))
    .toBeLessThan(1);
});

test('fragmented Arabic retains paragraph semantics and readable text in Chromium accessibility', async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  // These cover both an ordinary split and one with a hanging line-end space.
  await page.locator('[data-row-id="r00026"] p[lang="ar"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await page.locator('[data-row-id="r00034"] p[lang="ar"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-row-id="r00035"] p[lang="ar"] .wide-hanging-space')).toHaveCount(1);
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send('DOM.enable'); await cdp.send('Accessibility.enable');
    const doc = await cdp.send('DOM.getDocument');
    const full = await cdp.send('Accessibility.getFullAXTree');
    const nodes = new Map(full.nodes.map(node => [node.nodeId, node]));
    const staticText = (id: string): string[] => {
      const node = nodes.get(id); if (!node) return [];
      if (node.role?.value === 'StaticText') return [String(node.name?.value ?? '')];
      return (node.childIds ?? []).flatMap(staticText);
    };
    for (const row of ['r00026', 'r00035']) {
      const selector = `[data-row-id="${row}"] p[lang="ar"]`;
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
      const partial = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const paragraph = partial.nodes[0]!;
      expect(paragraph.ignored, row).toBe(false);
      expect(paragraph.role?.value, row).toBe('paragraph');
      const text = await page.locator(selector).evaluate(p => {
        const range = document.createRange(); range.selectNodeContents(p);
        return { lang: p.getAttribute('lang'), content: p.textContent, range: range.toString() };
      });
      expect(text.lang).toBe('ar'); expect(text.range).toBe(text.content);
      const normalize = (value: string) => value.replace(/\s+/gu, ' ').trim();
      expect(normalize(staticText(paragraph.nodeId).join(' '))).toBe(normalize(text.content!));
    }
  } finally { await cdp.detach(); }
});

for (const fallback of [false, true]) {
  test(`a far jump prepares the visible Arabic without losing its position${fallback ? ' without canvas' : ''}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    })));
    if (fallback) await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
    });
    await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
    const next = page.locator('[data-row-id="r00499"] p[lang="ar"]');
    await expect(next).not.toHaveClass(/wide-arabic-flow/u);
    const jump = await page.evaluate(() => {
      const first = document.querySelector<HTMLElement>('[data-row-id="r00498"] p[lang="ar"]')!;
      const group = first.closest<HTMLElement>('.reader-band')!;
      window.scrollTo(0, window.scrollY + group.getBoundingClientRect().top - 130);
      const range = document.createRange(); range.setStart(first.firstChild!, 0); range.collapse(true);
      const box = range.getBoundingClientRect(); return { line: box.top + box.height / 2, distance: window.scrollY };
    });
    expect(jump.distance).toBeGreaterThan(30_000);
    await expect(next).toHaveClass(/wide-arabic-flow/u);
    await expect.poll(async () => Math.abs(await wordLine(page, 'r00499', 0) - await wordLine(page, 'r00498', 0))).toBeLessThan(1);
    expect(Math.abs(await wordLine(page, 'r00498', 0) - jump.line)).toBeLessThan(3);
    expect(await page.locator('.wide-measuring').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  });
}

for (const scenario of [
  { item: 'dua-jawshan-kabir', width: 393 },
  { item: 'sura-yasin', width: 1200 },
] as const) {
  test(`DOM measurement agrees with canvas for all grouped ${scenario.item} fragments`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 852 });
    await page.addInitScript(() => {
      localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
        font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
      }));
      if (new URL(location.href).searchParams.get('noCanvas') === '1') {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
      }
    });
    const signature = async (noCanvas: boolean) => {
      await page.goto(`./?noCanvas=${Number(noCanvas)}#/item/${scenario.item}`);
      await expect(page.locator('article .reader-band').first()).toBeVisible();
      await scrollWholeItem(page);
      return page.locator('article .reader-band').evaluateAll(bands => bands.map(band =>
        [...band.querySelectorAll<HTMLElement>(':scope > [data-row-id]')].map(row => {
          const paragraph = row.querySelector<HTMLElement>('p[lang="ar"]')!;
          return { row: row.dataset.rowId, fragments: [...paragraph.querySelectorAll<HTMLElement>(':scope > .wide-arabic-fragment')]
            .map(fragment => ({ text: fragment.textContent, hanging: fragment.querySelector('.wide-hanging-space')?.textContent ?? '' })) };
        })));
    };
    const canvas = await signature(false), dom = await signature(true);
    expect(canvas.flat().filter(row => row.fragments.length > 0).length).toBeGreaterThan(0);
    expect(dom).toEqual(canvas);
    expect(await page.locator('.wide-measuring').count()).toBe(0);
  });
}

test('seeking a grouped search result reuses its row instead of rescanning the reader', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  const hit = page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button'); await expect(hit).toBeVisible();
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
    const query = main.querySelectorAll.bind(main);
    (window as unknown as { seekRowScans: number }).seekRowScans = 0;
    (main as any).querySelectorAll = (selector: string) => {
      if (selector === '[data-row-id]' && !main.dataset.anchorRow) (window as unknown as { seekRowScans: number }).seekRowScans++;
      return query(selector);
    };
  });
  await hit.click(); await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
  expect(await page.evaluate(() => (window as unknown as { seekRowScans: number }).seekRowScans)).toBe(0);
});

test('a search jump prepares adjacent destination bands before its first frame', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await expect(page.locator('[data-row-id="r00029"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  const hit = page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button'); await expect(hit).toBeVisible();
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
    const state = window as unknown as { destinationReady?: boolean };
    const observer = new MutationObserver(() => {
      if (main.dataset.anchorRow !== 'r00026') return;
      state.destinationReady = document.querySelector('[data-row-id="r00029"] p[lang="ar"]')!.classList.contains('wide-arabic-flow');
      observer.disconnect();
    });
    observer.observe(main, { attributes: true, attributeFilter: ['data-anchor-row'] });
  });
  await hit.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { destinationReady?: boolean }).destinationReady)).toBe(true);
  await page.waitForTimeout(80);
  expect(Math.abs(await wordLine(page, 'r00026', 12) - await pointerLine(page))).toBeLessThan(2);
});

for (const fallback of [false, true]) {
  test(`a far in-text result stays aligned after destination preparation${fallback ? ' without canvas' : ''}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    })));
    if (fallback) await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
    });
    await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
    const hit = page.locator('.result-row[data-row-id="r00499"][data-language="ar"] button');
    await expect(hit).toBeVisible(); await hit.click();
    await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00499');
    await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-offset', '9');
    await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(30_000);
    await page.waitForTimeout(80);
    expect(Math.abs(await wordLine(page, 'r00499', 9) - await pointerLine(page))).toBeLessThan(2);
  });
}

for (const fallback of [false, true]) {
  test(`the first search destination is prepared in idle time without moving the reader${fallback ? ' without canvas' : ''}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    })));
    if (fallback) await page.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
    });
    await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
    const destination = page.locator('[data-row-id="r00026"] p[lang="ar"]');
    await expect(destination).not.toHaveClass(/wide-arabic-flow/u);
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
    await expect(page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button')).toBeVisible();
    await expect(destination).toHaveClass(/wide-arabic-flow/u);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  });
}

test('preparing a search destination above the reader keeps the current source line in place', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.locator('[data-row-id="r00498"] p[lang="ar"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await page.evaluate(delta => window.scrollBy(0, delta), (await wordLine(page, 'r00498', 0)) - 125);
  await page.waitForTimeout(80); const before = await wordLine(page, 'r00498', 0);
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  await expect(page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button')).toBeVisible();
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await page.waitForTimeout(80); expect(Math.abs(await wordLine(page, 'r00498', 0) - before)).toBeLessThan(3);
});

test('a prepared search destination is reused without measuring its neighborhood again', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  const hit = page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button'); await expect(hit).toBeVisible();
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
    const band = document.querySelector<HTMLElement>('[data-row-id="r00026"]')!.closest<HTMLElement>('.reader-band')!;
    const rect = band.getBoundingClientRect.bind(band);
    (window as unknown as { repeatedDestinationMeasure: number }).repeatedDestinationMeasure = 0;
    band.getBoundingClientRect = () => {
      if (!main.dataset.anchorRow) (window as unknown as { repeatedDestinationMeasure: number }).repeatedDestinationMeasure++;
      return rect();
    };
  });
  await hit.click(); await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
  expect(await page.evaluate(() => (window as unknown as { repeatedDestinationMeasure: number }).repeatedDestinationMeasure)).toBe(0);
});

test('idle preparation follows the first completed result when streaming changes the ranking', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  const destination = page.locator('[data-row-id="r00499"] p[lang="ar"]');
  await expect(destination).not.toHaveClass(/wide-arabic-flow/u);
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
  await expect(page.locator('.result-row[data-row-id="r00499"][data-language="ar"] button')).toBeVisible();
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect(destination).toHaveClass(/wide-arabic-flow/u);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
});

test('idle preparation waits for spare time rather than blocking a busy frame', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const callbacks: IdleRequestCallback[] = [];
    (window as unknown as { idleCallbacks: IdleRequestCallback[] }).idleCallbacks = callbacks;
    window.requestIdleCallback = callback => { callbacks.push(callback); return callbacks.length; };
    window.cancelIdleCallback = () => {};
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { idleCallbacks: IdleRequestCallback[] }).idleCallbacks.length)).toBe(1);
  await page.evaluate(() => (window as unknown as { idleCallbacks: IdleRequestCallback[] }).idleCallbacks[0]!(
    { didTimeout: false, timeRemaining: () => 0 }));
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  await expect.poll(() => page.evaluate(() => (window as unknown as { idleCallbacks: IdleRequestCallback[] }).idleCallbacks.length)).toBe(2);
  await page.evaluate(() => (window as unknown as { idleCallbacks: IdleRequestCallback[] }).idleCallbacks[1]!(
    { didTimeout: false, timeRemaining: () => 50 }));
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
});

test('stale idle preparation is cancelled when the query changes or search closes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const state: { callbacks: IdleRequestCallback[]; cancelled: number[] } = { callbacks: [], cancelled: [] };
    (window as unknown as { idleState: typeof state }).idleState = state;
    window.requestIdleCallback = callback => { state.callbacks.push(callback); return state.callbacks.length; };
    window.cancelIdleCallback = id => { state.cancelled.push(id); };
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }); await input.fill('الدعوات');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { idleState: { callbacks: unknown[] } }).idleState.callbacks.length)).toBe(1);
  await input.fill('فعله لطيف');
  await expect(page.locator('.result-row[data-row-id="r00499"][data-language="ar"] button')).toBeVisible();
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { idleState: { callbacks: unknown[] } }).idleState.callbacks.length)).toBe(2);
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  const cancelled = await page.evaluate(() => {
    const state = (window as unknown as { idleState: { callbacks: IdleRequestCallback[]; cancelled: number[] } }).idleState;
    // Exercise the stale callbacks even if a host dispatches them after cancel.
    for (const callback of state.callbacks) callback({ didTimeout: false, timeRemaining: () => 50 });
    return state.cancelled;
  });
  expect(cancelled).toEqual([1, 2]);
  for (const id of ['r00026', 'r00499']) {
    await expect(page.locator(`[data-row-id="${id}"] p[lang="ar"]`)).not.toHaveClass(/wide-arabic-flow/u);
  }
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
});

test('search still prepares and aligns its destination when idle callbacks are unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    Reflect.deleteProperty(window, 'requestIdleCallback');
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  const destination = page.locator('[data-row-id="r00026"] p[lang="ar"]');
  await expect(destination).not.toHaveClass(/wide-arabic-flow/u);
  await page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button').click();
  await expect(destination).toHaveClass(/wide-arabic-flow/u);
  await page.waitForTimeout(80); expect(Math.abs(await wordLine(page, 'r00026', 12) - await pointerLine(page))).toBeLessThan(2);
});

for (const key of ['End', 'Home'] as const) {
  test(`a search jump respects the moved reading pointer (${key}) after idle preparation`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    })));
    await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
    await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
    await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
    const hit = page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button'); await expect(hit).toBeVisible();
    await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
    await page.locator('#current-marker').focus(); await page.keyboard.press(key);
    const pointer = await pointerLine(page);
    if (key === 'End') expect(pointer).toBeLessThan(80); else expect(pointer).toBeGreaterThan(800);
    await hit.click(); await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
    await page.waitForTimeout(80);
    expect(Math.abs(await wordLine(page, 'r00026', 12) - await pointerLine(page))).toBeLessThan(2);
  });
}

test('a prepared search destination is recalculated after a viewport-width change', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('الدعوات');
  const hit = page.locator('.result-row[data-row-id="r00026"][data-language="ar"] button'); await expect(hit).toBeVisible();
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await page.setViewportSize({ width: 430, height: 852 }); await page.waitForTimeout(80);
  await hit.click(); await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00026');
  await page.waitForTimeout(80);
  expect(Math.abs(await wordLine(page, 'r00026', 12) - await pointerLine(page))).toBeLessThan(2);
});

test('the first two completed search results are prepared in bounded idle steps and reused', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await expect(page.locator('[data-row-id="r00198"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main[data-screen="reader"]')!;
    const band = document.querySelector<HTMLElement>('[data-row-id="r00198"]')!.closest<HTMLElement>('.reader-band')!;
    const rect = band.getBoundingClientRect.bind(band);
    (window as unknown as { repeatedSecondMeasure: number }).repeatedSecondMeasure = 0;
    band.getBoundingClientRect = () => {
      if (!main.dataset.anchorRow) (window as unknown as { repeatedSecondMeasure: number }).repeatedSecondMeasure++;
      return rect();
    };
  });
  await page.locator('.result-row[data-row-id="r00198"][data-language="ar"] button').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00198');
  expect(await page.evaluate(() => (window as unknown as { repeatedSecondMeasure: number }).repeatedSecondMeasure)).toBe(0);
});

test('idle preparation handles one result per callback and cancels the remainder on close', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const state: { callbacks: IdleRequestCallback[]; cancelled: number[] } = { callbacks: [], cancelled: [] };
    (window as unknown as { idleSteps: typeof state }).idleSteps = state;
    window.requestIdleCallback = callback => { state.callbacks.push(callback); return state.callbacks.length; };
    window.cancelIdleCallback = id => { state.cancelled.push(id); };
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { idleSteps: { callbacks: unknown[] } }).idleSteps.callbacks.length)).toBe(1);
  await page.evaluate(() => (window as unknown as { idleSteps: { callbacks: IdleRequestCallback[] } }).idleSteps.callbacks[0]!(
    { didTimeout: false, timeRemaining: () => 50 }));
  await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).toHaveClass(/wide-arabic-flow/u);
  await expect(page.locator('[data-row-id="r00198"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  await expect.poll(() => page.evaluate(() => (window as unknown as { idleSteps: { callbacks: unknown[] } }).idleSteps.callbacks.length)).toBe(2);
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  const cancelled = await page.evaluate(() => {
    const state = (window as unknown as { idleSteps: { callbacks: IdleRequestCallback[]; cancelled: number[] } }).idleSteps;
    state.callbacks[1]!({ didTimeout: false, timeRemaining: () => 50 }); return state.cancelled;
  });
  expect(cancelled).toEqual([2]);
  await expect(page.locator('[data-row-id="r00198"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
});

test('selecting a result invalidates pending idle work even without cancelIdleCallback', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const callbacks: IdleRequestCallback[] = [];
    (window as unknown as { uncancellableIdle: IdleRequestCallback[] }).uncancellableIdle = callbacks;
    window.requestIdleCallback = callback => { callbacks.push(callback); return callbacks.length; };
    Reflect.deleteProperty(window, 'cancelIdleCallback');
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { uncancellableIdle: IdleRequestCallback[] }).uncancellableIdle.length)).toBe(1);
  await page.locator('.result-row[data-row-id="r00198"][data-language="ar"] button').click();
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row', 'r00198');
  await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  // Reopening makes the same request key current again. The old callback must
  // not prepare another destination or queue its own remaining work.
  await page.getByRole('button', { name: 'نمایش فهرست نتایج' }).click();
  await page.evaluate(() => (window as unknown as { uncancellableIdle: IdleRequestCallback[] }).uncancellableIdle[0]!(
    { didTimeout: false, timeRemaining: () => 50 }));
  await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  expect(await page.evaluate(() => (window as unknown as { uncancellableIdle: IdleRequestCallback[] }).uncancellableIdle.length)).toBe(1);
});

test('hiding the result list cancels pending idle work before it can be reopened', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const state: { callbacks: IdleRequestCallback[]; cancelled: number[] } = { callbacks: [], cancelled: [] };
    (window as unknown as { hiddenIdle: typeof state }).hiddenIdle = state;
    window.requestIdleCallback = callback => { state.callbacks.push(callback); return state.callbacks.length; };
    window.cancelIdleCallback = id => { state.cancelled.push(id); };
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { hiddenIdle: { callbacks: unknown[] } }).hiddenIdle.callbacks.length)).toBe(1);
  await page.getByRole('button', { name: 'بستن فهرست نتایج' }).click();
  expect(await page.evaluate(() => (window as unknown as { hiddenIdle: { cancelled: number[] } }).hiddenIdle.cancelled)).toEqual([1]);
  await page.getByRole('button', { name: 'نمایش فهرست نتایج' }).click();
  await page.evaluate(() => (window as unknown as { hiddenIdle: { callbacks: IdleRequestCallback[] } }).hiddenIdle.callbacks[0]!(
    { didTimeout: false, timeRemaining: () => 50 }));
  await expect(page.locator('[data-row-id="r00499"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
});

test('a stale idle callback cannot replace or run a newer request with the same query', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const state: { callbacks: IdleRequestCallback[]; cancelled: number[] } = { callbacks: [], cancelled: [] };
    (window as unknown as { repeatedIdle: typeof state }).repeatedIdle = state;
    window.requestIdleCallback = callback => { state.callbacks.push(callback); return state.callbacks.length; };
    window.cancelIdleCallback = id => { state.cancelled.push(id); };
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  const input = page.getByRole('searchbox', { name: 'جست‌وجو در این متن' });
  for (const [query, count] of [['الدعوات', 1], ['فعله لطيف', 2], ['الدعوات', 3]] as const) {
    await input.fill(query); await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
    await expect.poll(() => page.evaluate(() => (window as unknown as { repeatedIdle: { callbacks: unknown[] } }).repeatedIdle.callbacks.length)).toBe(count);
  }
  await page.evaluate(() => (window as unknown as { repeatedIdle: { callbacks: IdleRequestCallback[] } }).repeatedIdle.callbacks[0]!(
    { didTimeout: false, timeRemaining: () => 50 }));
  await expect(page.locator('[data-row-id="r00026"] p[lang="ar"]')).not.toHaveClass(/wide-arabic-flow/u);
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  expect(await page.evaluate(() => (window as unknown as { repeatedIdle: { cancelled: number[] } }).repeatedIdle.cancelled)).toEqual([1, 2, 3]);
});

test('disposing the reader cancels pending idle preparation on navigation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
      font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
    }));
    const state: { callbacks: IdleRequestCallback[]; cancelled: number[]; old?: HTMLElement } = { callbacks: [], cancelled: [] };
    (window as unknown as { disposeIdle: typeof state }).disposeIdle = state;
    window.requestIdleCallback = callback => { state.callbacks.push(callback); return state.callbacks.length; };
    window.cancelIdleCallback = id => { state.cancelled.push(id); };
  });
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await page.getByRole('searchbox', { name: 'جست‌وجو در این متن' }).fill('فعله لطيف');
  await expect(page.locator('#intext-results')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => page.evaluate(() => (window as unknown as { disposeIdle: { callbacks: unknown[] } }).disposeIdle.callbacks.length)).toBe(1);
  await page.evaluate(() => {
    const state = (window as unknown as { disposeIdle: { old?: HTMLElement } }).disposeIdle;
    state.old = document.querySelector<HTMLElement>('[data-row-id="r00499"] p[lang="ar"]')!;
    window.location.hash = '#/';
  });
  await expect(page.locator('main[data-screen="library"]')).toBeVisible();
  const result = await page.evaluate(() => {
    const state = (window as unknown as { disposeIdle: { callbacks: IdleRequestCallback[]; cancelled: number[]; old: HTMLElement } }).disposeIdle;
    state.callbacks[0]!({ didTimeout: false, timeRemaining: () => 50 });
    return { cancelled: state.cancelled, connected: state.old.isConnected, fragmented: state.old.classList.contains('wide-arabic-flow'),
      callbacks: state.callbacks.length };
  });
  expect(result).toEqual({ cancelled: [1], connected: false, fragmented: false, callbacks: 1 });
  await expect(page.locator('main[data-screen="reader"]')).toHaveCount(0);
});

test('prepared destinations have a bounded cache and are invalidated by pointer or width changes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mafatih.reader.preferences.v1', JSON.stringify({
    font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100, wideLayout: 'wide-50',
  })));
  await page.goto('./#/item/dua-jawshan-kabir'); await expect(page.locator('article .reader-band').first()).toBeVisible();
  const result = await page.evaluate(async () => {
    const source = ['r00025', 'r00026'].map(id =>
      document.querySelector<HTMLElement>(`[data-row-id="${id}"] p[lang="ar"]`)!.textContent!);
    const resource = performance.getEntriesByType('resource').find(entry => /\/wide-reader-[^/]+\.js(?:\?|$)/u.test(entry.name));
    if (!resource) throw Error('The production grouping module was not loaded');
    const module = await import(/* @vite-ignore */ resource.name) as {
      attachWideReaderLayout(main: HTMLElement, mode: 'wide-50'): {
        prepareRow(row: string, pointer: number): HTMLElement | undefined; reflow(): void; dispose(): void;
      };
    };
    // Repeat existing corpus phrases in an isolated, temporary reader so the
    // test can make nine distinct destinations without changing source data.
    const main = document.createElement('main'); main.dataset.wideActive = 'true';
    main.style.cssText = 'position:fixed;left:0;top:0;width:393px;height:0;overflow:visible';
    const content = document.createElement('div'); content.className = 'content';
    content.style.cssText = 'width:393px;box-sizing:border-box';
    const article = document.createElement('article'); article.className = 'reader'; content.append(article); main.append(content);
    for (let index = 0; index < 24; index++) {
      const row = document.createElement('div'); row.className = 'reader-row'; row.dataset.rowId = `cache-${index}`;
      const paragraph = document.createElement('p'); paragraph.lang = 'ar'; paragraph.dir = 'rtl';
      paragraph.className = 'ar'; paragraph.dataset.textRole = 'arabic'; paragraph.textContent = source[index % source.length]!;
      row.append(paragraph); article.append(row);
    }
    document.body.append(main);
    const layout = module.attachWideReaderLayout(main, 'wide-50');
    try {
      const bands = [...article.querySelectorAll<HTMLElement>(':scope > .reader-band')];
      if (bands.length < 9) throw Error(`Expected nine distinct groups, got ${bands.length}`);
      const ids = bands.slice(0, 9).map(band => band.querySelector<HTMLElement>('[data-row-id]')!.dataset.rowId!);
      for (const id of ids) layout.prepareRow(id, 426);
      let firstReads = 0, secondReads = 0;
      const first = bands[0]!, second = bands[1]!, firstRect = first.getBoundingClientRect.bind(first), secondRect = second.getBoundingClientRect.bind(second);
      first.getBoundingClientRect = () => { firstReads++; return firstRect(); };
      second.getBoundingClientRect = () => { secondReads++; return secondRect(); };
      layout.prepareRow(ids[1]!, 426); const retainedReads = secondReads;
      layout.prepareRow(ids[0]!, 426); const evictedReads = firstReads;
      layout.prepareRow(ids[0]!, 500); const changedPointerReads = firstReads - evictedReads;
      const beforeReuse = firstReads; layout.prepareRow(ids[0]!, 500); const repeatedPointerReads = firstReads - beforeReuse;
      const beforeWidth = article.getBoundingClientRect().width; content.style.width = '430px'; layout.reflow();
      const afterWidth = article.getBoundingClientRect().width;
      const row = article.querySelector<HTMLElement>(`[data-row-id="${ids[0]}"]`)!;
      const block = row.parentElement === article ? row : row.parentElement!;
      const newRect = block.getBoundingClientRect.bind(block); let afterReflowReads = 0;
      block.getBoundingClientRect = () => { afterReflowReads++; return newRect(); };
      layout.prepareRow(ids[0]!, 500);
      layout.dispose(); const afterDispose = layout.prepareRow(ids[0]!, 500);
      return { groups: bands.length, retainedReads, evictedReads, changedPointerReads, repeatedPointerReads,
        beforeWidth, afterWidth, afterReflowReads, disposed: afterDispose === undefined };
    } finally { layout.dispose(); main.remove(); }
  });
  expect(result.groups).toBeGreaterThanOrEqual(9);
  expect(result.retainedReads).toBe(0); expect(result.evictedReads).toBeGreaterThan(0);
  expect(result.changedPointerReads).toBeGreaterThan(0); expect(result.repeatedPointerReads).toBe(0);
  expect(result.afterWidth).toBeGreaterThan(result.beforeWidth);
  expect(result.afterReflowReads).toBeGreaterThan(0); expect(result.disposed).toBe(true);
});
