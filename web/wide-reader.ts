import type { WideLayout } from './reader-preferences.js';
import type { ReaderItem } from './data.js';
import { captureVisibleReaderPosition, restoreVisibleReaderPosition } from './reader-position.js';

interface MeasuredItem {
  key: string;
  text: readonly string[];
  kinds: readonly (string | undefined)[];
  widths: (number | null)[];
}
// DataClient retains at most eight items. Weak keys ensure this cache cannot
// keep an evicted item (or its text) alive. Never persist device font metrics.
const measuredItems = new WeakMap<ReaderItem, MeasuredItem>();
let fontRevision = 0, fontSet: FontFaceSet | undefined;
try {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (fonts && typeof fonts.addEventListener === 'function') {
    fontSet = fonts;
    for (const event of ['loading', 'loadingdone', 'loadingerror']) {
      fonts.addEventListener(event, () => { fontRevision++; });
    }
  }
} catch { /* Partial font APIs can still use uncached measurements. */ }

/** Stable source-row indexes. A null width is a boundary, never a missing row. */
export interface WideBand { start: number; end: number }
export const WIDE_ROW_GAP = 12;

/** Greedy consecutive grouping; a row already too long is left whole and alone. */
export function planWideBands(widths: readonly (number | null)[], width: number, allowance: number,
  gap = WIDE_ROW_GAP): WideBand[] {
  if (!(width > 0) || !Number.isFinite(width)) return [];
  const capacity = width * (1 + allowance), bands: WideBand[] = [];
  let start = -1, end = -1, sum = 0;
  const flush = (): void => { if (end - start >= 2) bands.push({ start, end }); start = -1; end = -1; sum = 0; };
  for (const [index, natural] of widths.entries()) {
    if (natural === null || !Number.isFinite(natural) || natural <= 0 || natural > capacity) { flush(); continue; }
    if (start >= 0 && sum + gap + natural > capacity) flush();
    if (start < 0) { start = index; end = index + 1; sum = natural; }
    else { end = index + 1; sum += gap + natural; }
  }
  flush(); return bands;
}

/**
 * Wrap existing row nodes, never their text or IDs. CSS lays the Arabic fields
 * together above the Persian fields; DOM/a11y order remains the original row
 * order and does not claim the historical pairings were reviewed.
 */
export function attachWideReaderLayout(main: HTMLElement, choice: WideLayout, item?: ReaderItem): { reflow(): void; dispose(): void } {
  const article = main.querySelector<HTMLElement>('article.reader');
  if (!article || choice === 'normal') return { reflow: () => {}, dispose: () => {} };
  const rows = [...article.querySelectorAll<HTMLElement>(':scope > [data-row-id]')];
  const paragraphs = rows.map(row => {
    if (row.dataset.kind === 'instruction' || row.dataset.kind === 'note') return null;
    const arabic = row.querySelector<HTMLParagraphElement>('p[data-text-role="arabic"]');
    return arabic?.textContent?.trim() && !/[\r\n]/u.test(arabic.textContent) ? arabic : null;
  });
  // With no two eligible source rows next to each other, no width or viewport
  // can produce a band. Preserve the existing rows without measuring them.
  if (!paragraphs.some((paragraph, index) => paragraph && index > 0 && paragraphs[index - 1])) {
    return { reflow: () => {}, dispose: () => {} };
  }
  // Canvas uses the browser's Arabic shaper, selected bundled font and the
  // same kerning as the visible text. Measure the separately styled verse
  // markers at their normal weight. This avoids an extra full reader layout.
  const sample = paragraphs.find(paragraph => paragraph !== null);
  const canvas = document.createElement('canvas'); canvas.lang = 'ar';
  let context: CanvasRenderingContext2D | null = null;
  try { context = canvas.getContext('2d'); } catch { /* Fall back to DOM measurement. */ }
  const supported = sample && context && 'fontKerning' in context &&
    paragraphs.every(paragraph => !paragraph || [...paragraph.children].every(child => child.classList.contains('quran-verse-marker')));
  let widths: (number | null)[] | undefined, initialWidth: number | undefined;
  if (supported && sample && context) try {
    const ctx = context;
    article.hidden = true;
    const style = getComputedStyle(sample), family = style.fontFamily, size = style.fontSize;
    const bold = `${style.fontStyle} ${style.fontWeight} ${size} ${family}`;
    const marker = `${style.fontStyle} 400 ${size} ${family}`;
    ctx.direction = 'rtl'; ctx.fontKerning = 'normal';
    if (ctx.fontKerning !== 'normal') throw Error('Canvas kerning is unavailable');
    if ('lang' in ctx) ctx.lang = 'ar';
    // Widths do not depend on the chosen allowance or available width. Reuse
    // them only for the same in-memory item, font state, and rendered text;
    // a font load or a changed device scale makes the next visit measure again.
    const key = JSON.stringify([bold, marker, style.fontFeatureSettings, style.fontVariationSettings,
      style.fontStretch, style.fontSynthesis, style.letterSpacing, style.wordSpacing,
      window.devicePixelRatio, fontRevision]);
    const cacheable = item && fontSet?.status === 'loaded';
    const cached = cacheable ? measuredItems.get(item) : undefined;
    const matches = item && cached && cached.key === key && item.rows.length === cached.text.length &&
      item.rows.every((row, i) => row.ar === cached.text[i] && row.kind === cached.kinds[i]);
    if (matches) widths = cached.widths;
    else {
      let currentFont = '';
      widths = paragraphs.map(paragraph => {
        if (!paragraph) return null;
        let width = 0;
        for (const node of paragraph.childNodes) {
          const font = node instanceof Element ? marker : bold;
          if (font !== currentFont) { ctx.font = font; currentFont = font; }
          width += ctx.measureText(node.textContent ?? '').width;
        }
        return width;
      });
      if (cacheable) measuredItems.set(item, { key, widths, text: item.rows.map(row => row.ar), kinds: item.rows.map(row => row.kind) });
    }
    // The surrounding content determines article width. Hide the unfinished
    // article for this single synchronous measurement so the browser needn't
    // lay out thousands of ungrouped paragraphs before laying out the result.
    const content = article.parentElement!, contentStyle = getComputedStyle(content);
    initialWidth = content.clientWidth - parseFloat(contentStyle.paddingLeft) - parseFloat(contentStyle.paddingRight);
  } catch { article.hidden = false; widths = undefined; initialWidth = undefined; }
  if (!widths) {
    // Older WebViews without canvas kerning or unexpected markup use the
    // actual DOM fields instead. The class is removed synchronously.
    article.classList.add('wide-measuring');
    widths = paragraphs.map(paragraph => paragraph ? paragraph.getBoundingClientRect().width : null);
    article.classList.remove('wide-measuring');
  }
  const measuredWidths = widths;
  const allowance = choice === 'wide-25' ? .25 : choice === 'wide-50' ? .5 : 0;
  let signature = '', disposed = false, plannedWidth = 0, verifyFrame = 0;
  const reflow = (): void => {
    if (disposed || !main.isConnected) return;
    const available = initialWidth ?? article.getBoundingClientRect().width; initialWidth = undefined; plannedWidth = available;
    const bands = planWideBands(measuredWidths, available, allowance);
    const nextSignature = bands.map(({ start, end }) => `${start}:${end}`).join('|');
    if (signature === nextSignature && article.firstElementChild) return;
    signature = nextSignature;
    const fragment = document.createDocumentFragment(); let index = 0, bandIndex = 0;
    while (index < rows.length) {
      const band = bands[bandIndex];
      if (band && band.start === index) {
        const group = document.createElement('div'); group.className = 'reader-band';
        for (; index < band.end; index++) group.append(rows[index]!);
        fragment.append(group); bandIndex++;
      } else fragment.append(rows[index++]!);
    }
    article.replaceChildren(fragment);
  };
  reflow(); article.hidden = false;
  // Non-overlay desktop scrollbars can alter the width after the article is
  // revealed. Correct that before the first paint without losing a saved line.
  verifyFrame = requestAnimationFrame(() => {
    verifyFrame = 0;
    if (disposed || !main.isConnected || Math.abs(article.getBoundingClientRect().width - plannedWidth) < .5) return;
    const position = captureVisibleReaderPosition(main); reflow(); restoreVisibleReaderPosition(main, position);
  });
  return { reflow, dispose: () => { disposed = true; if (verifyFrame) cancelAnimationFrame(verifyFrame); } };
}
