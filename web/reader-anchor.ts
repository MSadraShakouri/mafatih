import { codePointToUtf16Offset, textRange } from './text-offset.js';
import type { ReadingAnchor } from './routes.js';

/** The reader controller owns the marker in both reading and in-text search. */
export interface ReadingPointer {
  readingPosition(): number;
  setReadingPosition(y: number): void;
}

/** Align the start of the original-text match, not the union of its wrapped lines. */
export function scrollRangeToPointer(range: Range, pointer: ReadingPointer): boolean {
  const start = range.cloneRange(); start.collapse(true);
  const bounds = start.getBoundingClientRect();
  if (!bounds.height && !bounds.width) return false;
  const selected = pointer.readingPosition();
  const line = bounds.top + bounds.height / 2;
  window.scrollTo({ top: Math.max(0, window.scrollY + line - selected), behavior: 'auto' });
  const after = start.getBoundingClientRect();
  const actual = after.top + after.height / 2;
  // Scroll offsets can round to a pixel; don't move the user's marker for
  // that. At either page edge, however, it must meet the reachable line.
  if (Math.abs(actual - selected) > 1) pointer.setReadingPosition(actual);
  return true;
}

/** Go to the actual matched line, leaving the reader text completely unmarked. */
export function scrollToReadingAnchor(main: HTMLElement, anchor: ReadingAnchor, pointer?: ReadingPointer): boolean {
  const row = [...main.querySelectorAll<HTMLElement>('[data-row-id]')]
    .find(element => element.dataset.rowId === anchor.row);
  const paragraph = row?.querySelector<HTMLParagraphElement>(`p[lang="${anchor.language}"]`);
  if (!paragraph) return false;
  const offset = codePointToUtf16Offset(paragraph.textContent ?? '', anchor.offset);
  const range = textRange(paragraph, offset);
  if (range) {
    const bounds = range.getBoundingClientRect();
    if (bounds.height || bounds.width) {
      if (pointer) scrollRangeToPointer(range, pointer);
      else {
        // Keep the legacy standalone search panel usable without a controller.
        const headerHeight = main.querySelector<HTMLElement>('.app-header')?.getBoundingClientRect().height ?? 0;
        window.scrollTo({ top: Math.max(0, window.scrollY + bounds.top - headerHeight - 8), behavior: 'auto' });
      }
      main.dataset.anchorRow = anchor.row;
      main.dataset.anchorOffset = String(anchor.offset);
      return true;
    }
  }
  paragraph.scrollIntoView({ block: 'start', behavior: 'auto' });
  main.dataset.anchorRow = anchor.row;
  main.dataset.anchorOffset = String(anchor.offset);
  return true;
}
