import type { WideLayout } from './reader-preferences.js';
import type { ReaderItem } from './data.js';
import { captureVisibleReaderPosition, restoreVisibleReaderPosition } from './reader-position.js';
import { textPoint } from './text-offset.js';

type PartialWidths = Map<number, Map<string, number>>;
interface MeasuredItem {
  key: string;
  text: readonly string[];
  kinds: readonly (string | undefined)[];
  widths: (number | null)[];
  partialWidths: PartialWidths;
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

interface WordBreak { start: number; end: number }
export interface WideArabicCut { offset: number; hangFrom?: number }

/** Only break at ordinary word spacing, never at a no-break space or inside a grapheme. */
function wordBreaks(text: string): WordBreak[] {
  const result: WordBreak[] = [];
  // NBSP, narrow NBSP, figure space and word joiner deliberately are not breaks.
  for (const match of text.matchAll(/[ \t\u1680\u2000-\u2006\u2008-\u200a\u205f\u3000\u200b]+/gu)) {
    const start = match.index!, end = start + match[0].length;
    if (!start || end >= text.length || text[start - 1] === '\u2060' || text[end] === '\u2060' ||
        /^\p{M}/u.test(text.slice(end))) continue;
    result.push({ start, end });
  }
  return result;
}

/**
 * Find only the points at which an Arabic field crosses a visual line. The
 * other fields remain intact flex items, so Persian layout and DOM row order
 * are unchanged. Measurements are of the original display text, not of the
 * canonical data or a guessed character count.
 */
export function planWideArabicBreaks(widths: readonly (number | null)[], texts: readonly string[],
  bands: readonly WideBand[], width: number, measure: (row: number, start: number, end: number) => number,
  gap = WIDE_ROW_GAP): Map<number, WideArabicCut[]> {
  const cuts = new Map<number, WideArabicCut[]>();
  if (!(width > 0) || !Number.isFinite(width)) return cuts;
  for (const band of bands) {
    let used = 0;
    for (let row = band.start; row < band.end; row++) {
      const text = texts[row] ?? '', natural = widths[row];
      if (!text || natural === null || natural === undefined || !Number.isFinite(natural)) continue;
      let start = 0, candidates: WordBreak[] | undefined;
      while (start < text.length) {
        const separator = used > 0 ? gap : 0, room = width - used - separator;
        const remaining = start ? measure(row, start, text.length) : natural;
        // Flex max-content sizes round up; reserve the same pixels before
        // choosing a cut so a fitting prefix does not itself wrap.
        if (Number.isFinite(remaining) && Math.ceil(remaining) <= room + 0.001) {
          used += separator + Math.ceil(remaining); break;
        }
        candidates ??= wordBreaks(text);
        let low = 0, high = candidates.length;
        while (low < high) {
          const middle = Math.floor((low + high) / 2), candidate = candidates[middle]!;
          if (candidate.end <= start) { low = middle + 1; continue; }
          // At a natural line break the separator hangs rather than consuming
          // inline space. Preserve it in the text, but test the shaped words.
          const size = measure(row, start, candidate.start);
          if (Number.isFinite(size) && Math.ceil(size) <= room + 0.001) low = middle + 1;
          else high = middle;
        }
        const candidate = low ? candidates[low - 1]! : undefined;
        if (candidate && candidate.end > start && room > 0 && text.slice(start, candidate.start).trim()) {
          const full = measure(row, start, candidate.end);
          const points = cuts.get(row) ?? [];
          points.push({ offset: candidate.end,
            ...(!Number.isFinite(full) || Math.ceil(full) > room + 0.001 ? { hangFrom: candidate.start } : {}) });
          cuts.set(row, points); start = candidate.end; used = 0; continue;
        }
        // No word fits after the previous phrase: start this one on the next
        // line. If even its first word is too wide, let CSS break it as before.
        if (used > 0) { used = 0; continue; }
        used = width; break;
      }
    }
  }
  return cuts;
}

function rememberWidth(cache: PartialWidths, row: number, start: number, end: number, compute: () => number): number {
  let values = cache.get(row);
  if (!values) { values = new Map(); cache.set(row, values); }
  const key = `${start}:${end}`, cached = values.get(key);
  if (cached !== undefined) return cached;
  const value = compute(); values.set(key, value); return value;
}

/** Split only the display nodes; the paragraph, row ID and exact text stay put. */
function fragmentArabicParagraph(paragraph: HTMLParagraphElement, cuts: readonly WideArabicCut[]): boolean {
  const text = paragraph.textContent ?? '', boundaries = [0, ...cuts.map(cut => cut.offset), text.length];
  const pieces: HTMLSpanElement[] = [];
  const plain = paragraph.childNodes.length === 1 && paragraph.firstChild?.nodeType === Node.TEXT_NODE;
  const appendRange = (parent: HTMLElement, start: number, end: number): boolean => {
    if (start === end) return true;
    if (plain) { parent.append(document.createTextNode(text.slice(start, end))); return true; }
    const a = textPoint(paragraph, start), b = textPoint(paragraph, end);
    if (!a || !b) return false;
    const range = document.createRange(); range.setStart(a.node, a.offset); range.setEnd(b.node, b.offset);
    parent.append(range.cloneContents()); return true;
  };
  for (let i = 1; i < boundaries.length; i++) {
    const start = boundaries[i - 1]!, end = boundaries[i]!, hangFrom = cuts[i - 1]?.hangFrom;
    const piece = document.createElement('span'); piece.className = 'wide-arabic-fragment';
    if (!appendRange(piece, start, hangFrom ?? end)) return false;
    if (hangFrom !== undefined) {
      // A zero-width inline box preserves the exact separator in DOM/search/
      // Range offsets without letting a hanging line-end space waste room.
      const hanging = document.createElement('span'); hanging.className = 'wide-hanging-space';
      if (!appendRange(hanging, hangFrom, end)) return false;
      piece.append(hanging);
    }
    pieces.push(piece);
  }
  paragraph.replaceChildren(...pieces); paragraph.classList.add('wide-arabic-flow');
  // Chromium drops the implicit paragraph role for display:contents. Restore
  // that semantic without adding duplicate text to the accessibility tree.
  if (!paragraph.hasAttribute('role')) paragraph.setAttribute('role', 'paragraph');
  return true;
}

/**
 * Wrap existing row nodes, never their text or IDs. CSS lays the Arabic fields
 * together above the Persian fields; DOM/a11y order remains the original row
 * order and does not claim the historical pairings were reviewed.
 */
export function attachWideReaderLayout(main: HTMLElement, choice: WideLayout, item?: ReaderItem): {
  reflow(row?: string): void; prepareRow(row: string, pointerY?: number, preservePosition?: boolean): HTMLElement | undefined; dispose(): void;
} {
  const article = main.querySelector<HTMLElement>('article.reader');
  if (!article || choice === 'normal') return { reflow: () => {}, prepareRow: () => undefined, dispose: () => {} };
  const rows = [...article.querySelectorAll<HTMLElement>(':scope > [data-row-id]')];
  const texts: string[] = new Array(rows.length).fill('');
  const paragraphs = rows.map((row, index) => {
    if (row.dataset.kind === 'instruction' || row.dataset.kind === 'note') return null;
    const arabic = row.querySelector<HTMLParagraphElement>('p[data-text-role="arabic"]');
    const text = arabic?.textContent ?? ''; texts[index] = text;
    return text.trim() && !/[\r\n]/u.test(text) ? arabic : null;
  });
  // With no two eligible source rows next to each other, no width or viewport
  // can produce a band. Preserve the existing rows without measuring them.
  if (!paragraphs.some((paragraph, index) => paragraph && index > 0 && paragraphs[index - 1])) {
    return { reflow: () => {}, prepareRow: () => undefined, dispose: () => {} };
  }
  // Canvas uses the browser's Arabic shaper, selected bundled font and the
  // same kerning as the visible text. Measure the separately styled verse
  // markers at their normal weight. This avoids an extra full reader layout.
  const sample = paragraphs.find(paragraph => paragraph !== null);
  // Capture original nodes only when a row needs fragment measurements. The
  // untouched rows pay no allocation cost, and a resize can restore exactly
  // the same text nodes and marker elements.
  const originals: (Node[] | undefined)[] = new Array(rows.length);
  const originalChildren = (row: number): Node[] => originals[row] ??= [...paragraphs[row]!.childNodes];
  const canvas = document.createElement('canvas'); canvas.lang = 'ar';
  let context: CanvasRenderingContext2D | null = null;
  try { context = canvas.getContext('2d'); } catch { /* Fall back to DOM measurement. */ }
  const supported = sample && context && 'fontKerning' in context &&
    paragraphs.every(paragraph => !paragraph || [...paragraph.children].every(child => child.classList.contains('quran-verse-marker')));
  let widths: (number | null)[] | undefined, initialWidth: number | undefined, useDOMParts = false;
  let partialWidths: PartialWidths = new Map(), domProbes: Map<number, HTMLParagraphElement> | undefined;
  let measurePart: (row: number, start: number, end: number) => number = () => NaN;
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
    let currentFont = '';
    if (matches) { widths = cached.widths; partialWidths = cached.partialWidths; }
    else {
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
      if (cacheable) measuredItems.set(item, { key, widths, partialWidths,
        text: item.rows.map(row => row.ar), kinds: item.rows.map(row => row.kind) });
    }
    measurePart = (row, start, end) => rememberWidth(partialWidths, row, start, end, () => {
      let width = 0, offset = 0;
      for (const node of originalChildren(row)) {
        const value = node.textContent ?? '', left = Math.max(0, start - offset), right = Math.min(value.length, end - offset);
        if (right > left) {
          const font = node instanceof Element ? marker : bold;
          if (font !== currentFont) { ctx.font = font; currentFont = font; }
          width += ctx.measureText(value.slice(left, right)).width;
        }
        offset += value.length;
        if (offset >= end) break;
      }
      return width;
    });
    // The surrounding content determines article width. Hide the unfinished
    // article for this single synchronous measurement so the browser needn't
    // lay out thousands of ungrouped paragraphs before laying out the result.
    const content = article.parentElement!, contentStyle = getComputedStyle(content);
    initialWidth = content.clientWidth - parseFloat(contentStyle.paddingLeft) - parseFloat(contentStyle.paddingRight);
  } catch { article.hidden = false; widths = undefined; initialWidth = undefined; }
  if (!widths) {
    // Older WebViews without canvas kerning or unexpected markup use actual
    // DOM fields for the initial widths, just as in the unfragmented reader.
    article.classList.add('wide-measuring');
    widths = paragraphs.map(paragraph => paragraph ? paragraph.getBoundingClientRect().width : null);
    initialWidth = article.getBoundingClientRect().width;
    article.classList.remove('wide-measuring');
    useDOMParts = true; partialWidths = new Map();
    measurePart = (row, start, end) => rememberWidth(partialWidths, row, start, end, () => {
      const paragraph = domProbes?.get(row); if (!paragraph) return NaN;
      const a = textPoint(paragraph, start), b = textPoint(paragraph, end); if (!a || !b) return NaN;
      const range = document.createRange(); range.setStart(a.node, a.offset); range.setEnd(b.node, b.offset);
      return range.getBoundingClientRect().width;
    });
  }
  const measuredWidths = widths;
  const allowance = choice === 'wide-25' ? .25 : choice === 'wide-50' ? .5 : 0;
  interface BandState { band: WideBand; done: boolean }
  let signature = '', disposed = false, plannedWidth = 0, verifyFrame = 0, lastWidth = -1, nearFrame = 0;
  let lastPreparedScroll = NaN, remainingBands = 0;
  const preparedDestinations = new Map<string, { pointer: number; height: number }>();
  let fragmented: number[] = [], states = new WeakMap<HTMLElement, BandState>();

  const prepareBatch = (batch: readonly BandState[]): void => {
    if (!batch.length) return;
    let probe: HTMLElement | undefined;
    if (useDOMParts) {
      // Measure all newly nearby rows in one hidden layout, rather than
      // forcing a full reader layout for every candidate word or at startup.
      probe = document.createElement('div'); probe.className = 'reader wide-measuring';
      probe.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;width:0;pointer-events:none';
      domProbes = new Map();
      for (const state of batch) for (let index = state.band.start; index < state.band.end; index++) {
        const paragraph = paragraphs[index]; if (!paragraph || domProbes.has(index)) continue;
        const copy = paragraph.cloneNode(true) as HTMLParagraphElement;
        domProbes.set(index, copy); probe.append(copy);
      }
      main.append(probe);
    }
    try {
      // Complete all DOM reads before replacing any visible children. In the
      // no-canvas fallback this avoids a reader-wide layout per band.
      const plans: Map<number, WideArabicCut[]>[] = [];
      for (const state of batch) {
        if (state.done || disposed) continue;
        state.done = true; remainingBands--;
        plans.push(planWideArabicBreaks(measuredWidths, texts, [state.band], lastWidth, measurePart));
      }
      for (const cuts of plans) for (const [index, offsets] of cuts) {
        const paragraph = paragraphs[index];
        if (paragraph) {
          originalChildren(index);
          if (fragmentArabicParagraph(paragraph, offsets)) fragmented.push(index);
        }
      }
    } finally { probe?.remove(); domProbes = undefined; }
  };
  const prepareRow = (id: string, pointerY?: number, preservePosition = false): HTMLElement | undefined => {
    if (disposed || !main.isConnected) return undefined;
    const row = rows.find(element => element.dataset.rowId === id), group = row?.parentElement;
    const state = group && states.get(group);
    if (pointerY !== undefined && row) {
      const prepared = preparedDestinations.get(id);
      if (prepared?.pointer === pointerY && prepared.height === innerHeight) return row;
      // A search jump is about to place this row in view. Prepare the nearby
      // destination bands together so the subsequent scroll needs no second
      // visible reflow or position capture before its first painted frame.
      const block = group === article ? row : group;
      if (block && block !== article) {
        const box = block.getBoundingClientRect();
        const margin = Math.max(600, Math.round(innerHeight * 1.25));
        const pointer = Math.max(0, Math.min(innerHeight, pointerY));
        const before = pointer + margin, after = innerHeight - pointer + margin;
        const pending: BandState[] = [];
        const add = (node: Element): void => {
          const candidate = states.get(node as HTMLElement); if (candidate && !candidate.done) pending.push(candidate);
        };
        add(block);
        for (let node = block.previousElementSibling; node; node = node.previousElementSibling) {
          if (node.getBoundingClientRect().bottom < box.top - before) break; add(node);
        }
        for (let node = block.nextElementSibling; node; node = node.nextElementSibling) {
          if (node.getBoundingClientRect().top > box.bottom + after) break; add(node);
        }
        const position = preservePosition && pending.length && box.top - before < innerHeight
          ? captureVisibleReaderPosition(main) : undefined;
        prepareBatch(pending);
        if (position) restoreVisibleReaderPosition(main, position);
        // Keep this small even after many searches in one reader session.
        if (!preparedDestinations.has(id) && preparedDestinations.size >= 8) {
          const oldest = preparedDestinations.keys().next().value;
          if (oldest !== undefined) preparedDestinations.delete(oldest);
        }
        preparedDestinations.set(id, { pointer: pointerY, height: innerHeight });
      }
    } else if (state && !state.done) prepareBatch([state]);
    return row;
  };
  // Prepare bands before they enter view instead of shaping every word in a
  // long item at startup. Search and restored positions explicitly prepare
  // their destination, including when it is far outside the viewport.
  const prepareNear = (): void => {
    nearFrame = 0;
    if (disposed || !main.isConnected || !remainingBands) return;
    const blocks = article.children, margin = Math.max(600, Math.round(innerHeight * 1.25));
    let low = 0, high = blocks.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (blocks[middle]!.getBoundingClientRect().bottom < -margin) low = middle + 1;
      else high = middle;
    }
    const pending: BandState[] = []; let protect = false;
    for (let i = low; i < blocks.length; i++) {
      const block = blocks[i] as HTMLElement, box = block.getBoundingClientRect();
      if (box.top > innerHeight + margin) break;
      const state = states.get(block);
      if (state && !state.done) { pending.push(state); if (box.top < innerHeight) protect = true; }
    }
    const position = protect ? captureVisibleReaderPosition(main) : undefined;
    prepareBatch(pending);
    if (position) restoreVisibleReaderPosition(main, position);
    lastPreparedScroll = window.scrollY;
  };
  const scheduleNear = (): void => {
    if (remainingBands && !nearFrame && !disposed) nearFrame = requestAnimationFrame(prepareNear);
  };
  const onScroll = (): void => {
    // The ahead-of-view margin means a half-screen step is ample; avoid
    // searching the document on every frame of a long automatic scroll.
    if (!Number.isFinite(lastPreparedScroll) || Math.abs(window.scrollY - lastPreparedScroll) >= innerHeight / 2) scheduleNear();
  };
  const reflow = (row?: string): void => {
    if (disposed || !main.isConnected) return;
    const available = initialWidth ?? article.getBoundingClientRect().width; initialWidth = undefined; plannedWidth = available;
    const bands = planWideBands(measuredWidths, available, allowance);
    const nextSignature = bands.map(({ start, end }) => `${start}:${end}`).join('|');
    if (signature === nextSignature && Math.abs(lastWidth - available) < .01 && article.firstElementChild) {
      if (row) prepareRow(row); return;
    }
    signature = nextSignature; lastWidth = available; preparedDestinations.clear();
    for (const index of fragmented) {
      const paragraph = paragraphs[index]!;
      paragraph.classList.remove('wide-arabic-flow'); paragraph.replaceChildren(...originals[index]!);
    }
    fragmented = []; states = new WeakMap(); remainingBands = 0; lastPreparedScroll = NaN;
    const fragment = document.createDocumentFragment(); let index = 0, bandIndex = 0;
    while (index < rows.length) {
      const band = bands[bandIndex];
      if (band && band.start === index) {
        const group = document.createElement('div'); group.className = 'reader-band';
        let total = 0;
        for (; index < band.end; index++) {
          total += (index > band.start ? WIDE_ROW_GAP : 0) + Math.ceil(measuredWidths[index]!);
          group.append(rows[index]!);
        }
        // Bands that already fit need no deferred state at all (the normal
        // case for the zero-overflow choice).
        if (total > available + .001) { states.set(group, { band, done: false }); remainingBands++; }
        fragment.append(group); bandIndex++;
      } else fragment.append(rows[index++]!);
    }
    article.replaceChildren(fragment);
    if (row) prepareRow(row);
    scheduleNear();
  };
  reflow(); article.hidden = false;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleNear, { passive: true });
  // Non-overlay desktop scrollbars can alter the width after the article is
  // revealed. Correct that before the first paint without losing a saved line.
  verifyFrame = requestAnimationFrame(() => {
    verifyFrame = 0;
    if (disposed || !main.isConnected || Math.abs(article.getBoundingClientRect().width - plannedWidth) < .5) return;
    const position = captureVisibleReaderPosition(main); reflow(position?.row); restoreVisibleReaderPosition(main, position);
  });
  return { reflow, prepareRow, dispose: () => {
    disposed = true; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', scheduleNear);
    if (verifyFrame) cancelAnimationFrame(verifyFrame);
    if (nearFrame) cancelAnimationFrame(nearFrame);
  } };
}
