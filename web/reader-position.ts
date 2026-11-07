import { codePointToUtf16Offset, utf16ToCodePointOffset } from './text-offset.js';

/** A visual position in one actual row field, not an inferred translation pair. */
export interface VisibleReaderPosition {
  row: string;
  language: 'ar' | 'fa';
  /** Offset in Unicode code points; DOM Range offsets are UTF-16. */
  offset: number;
  viewportTop: number;
}

interface CaretDocument {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
}

// A reader's article is immutable for its lifetime; search controls are outside
// it. Avoid repeatedly querying thousands of paragraphs during a long scroll.
const paragraphCache = new WeakMap<HTMLElement, HTMLParagraphElement[]>();
function readerParagraphs(main: HTMLElement): HTMLParagraphElement[] {
  let paragraphs = paragraphCache.get(main);
  if (!paragraphs) {
    paragraphs = [...main.querySelectorAll<HTMLParagraphElement>('article [data-row-id] p[lang="ar"], article [data-row-id] p[lang="fa"]')];
    paragraphCache.set(main, paragraphs);
  }
  return paragraphs;
}

function codePointBoundary(text: string, offset: number): number {
  const position = Math.max(0, Math.min(text.length, offset));
  if (position > 0 && position < text.length && /[\uD800-\uDBFF]/u.test(text[position - 1]!) && /[\uDC00-\uDFFF]/u.test(text[position]!)) return position - 1;
  return position;
}

function rangeRect(node: Text, offset: number): DOMRect | undefined {
  const range = document.createRange();
  const position = codePointBoundary(node.data, offset);
  range.setStart(node, position);
  range.collapse(true);
  let rect = range.getBoundingClientRect();
  if (!rect.height && node.length) {
    const next = position < node.length ? position + (node.data.codePointAt(position)! > 0xffff ? 2 : 1) : position;
    const previous = Array.from(node.data.slice(0, position)).at(-1);
    const start = position < node.length ? position : position - (previous?.length ?? 0);
    range.setStart(node, start);
    range.setEnd(node, next);
    rect = range.getBoundingClientRect();
  }
  return rect.height ? rect : undefined;
}

/** Fallback for browsers without a caret-from-point API. */
function closestLineOffset(node: Text, targetY: number): number {
  const points = Array.from(node.data);
  const offsets = [0];
  for (const point of points) offsets.push(offsets[offsets.length - 1]! + point.length);
  let low = 0, high = points.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const rect = rangeRect(node, offsets[middle]!);
    if (rect && rect.bottom < targetY) low = middle + 1;
    else high = middle;
  }
  return offsets[Math.min(low, points.length)]!;
}

/** Capture the visible line, including an offset inside a long row. */
export function captureVisibleReaderPosition(main: HTMLElement): VisibleReaderPosition | undefined {
  // At the very top, staying at the top is less surprising than scrolling the
  // header out of view to keep the first paragraph at an exact pixel.
  if (window.scrollY <= 1) return undefined;
  const targetY = Math.min(120, Math.max(32, window.innerHeight * 0.2));
  const paragraphs = readerParagraphs(main);
  // The plain reader flows in source order, so paragraph bottoms are ordered.
  let low = 0, high = paragraphs.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (paragraphs[middle]!.getBoundingClientRect().bottom <= targetY) low = middle + 1;
    else high = middle;
  }
  for (let index = low; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]!;
    const box = paragraph.getBoundingClientRect();
    if (box.top >= window.innerHeight) break;
    if (box.height <= 0) continue;
    const node = paragraph.firstChild;
    const row = paragraph.closest<HTMLElement>('[data-row-id]')?.dataset.rowId;
    const language = paragraph.lang;
    if (!(node instanceof Text) || !row || (language !== 'ar' && language !== 'fa')) continue;
    const x = Math.max(1, Math.min(window.innerWidth - 1, box.right - 8));
    const y = Math.max(1, Math.min(window.innerHeight - 1, Math.max(box.top + 1, targetY)));
    const caretDocument = document as unknown as CaretDocument;
    const caret = caretDocument.caretPositionFromPoint?.(x, y);
    const range = caret ? null : caretDocument.caretRangeFromPoint?.(x, y);
    const caretNode = caret?.offsetNode ?? range?.startContainer;
    const caretOffset = caret?.offset ?? range?.startOffset;
    const offset = codePointBoundary(node.data, caretNode === node && caretOffset !== undefined ? caretOffset : closestLineOffset(node, y));
    const rect = rangeRect(node, offset);
    if (!rect) continue;
    return { row, language, offset: utf16ToCodePointOffset(node.data, offset), viewportTop: rect.top };
  }
  return undefined;
}

/** Restore the same occurrence and line after a font or text-size reflow. */
export function restoreVisibleReaderPosition(main: HTMLElement, position: VisibleReaderPosition | undefined): void {
  if (!position || !main.isConnected) return;
  const row = [...main.querySelectorAll<HTMLElement>('[data-row-id]')].find(element => element.dataset.rowId === position.row);
  const paragraph = row?.querySelector<HTMLParagraphElement>(`p[lang="${position.language}"]`);
  const node = paragraph?.firstChild;
  if (!(node instanceof Text)) return;
  const rect = rangeRect(node, codePointToUtf16Offset(node.data, position.offset));
  if (rect) {
    const desiredTop = Math.min(position.viewportTop, Math.max(0, window.innerHeight - 32));
    window.scrollBy({ top: rect.top - desiredTop, behavior: 'auto' });
  }
}

/** Keep the last visible line across viewport-width/orientation changes. */
export function keepReaderPositionOnResize(main: HTMLElement): { refresh(): void; dispose(): void } {
  let position = captureVisibleReaderPosition(main);
  let previousWidth = window.innerWidth;
  let pending = 0;
  const refresh = (): void => { position = captureVisibleReaderPosition(main); };
  const onScroll = (): void => {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { pending = 0; refresh(); });
  };
  const onResize = (): void => {
    const widthChanged = previousWidth !== window.innerWidth;
    previousWidth = window.innerWidth;
    // Browser chrome and virtual keyboards can change only the height while
    // a finger is scrolling. They do not rewrap text; don't fight that scroll.
    if (!widthChanged) return;
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    restoreVisibleReaderPosition(main, position);
    refresh();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  return {
    refresh,
    dispose: () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (pending) cancelAnimationFrame(pending);
    },
  };
}
