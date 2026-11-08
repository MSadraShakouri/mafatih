import { codePointToUtf16Offset, textRange } from './text-offset.js';
import type { ReadingAnchor } from './routes.js';

/** Go to the actual matched line, leaving the reader text completely unmarked. */
export function scrollToReadingAnchor(main: HTMLElement, anchor: ReadingAnchor): boolean {
  const row = [...main.querySelectorAll<HTMLElement>('[data-row-id]')]
    .find(element => element.dataset.rowId === anchor.row);
  const paragraph = row?.querySelector<HTMLParagraphElement>(`p[lang="${anchor.language}"]`);
  if (!paragraph) return false;
  const offset = codePointToUtf16Offset(paragraph.textContent ?? '', anchor.offset);
  const range = textRange(paragraph, offset);
  if (range) {
    const bounds = range.getBoundingClientRect();
    if (bounds.height || bounds.width) {
      // Keep the actual matched line below the sticky 48px reader header.
      const headerHeight = main.querySelector<HTMLElement>('.app-header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: Math.max(0, window.scrollY + bounds.top - headerHeight - 8), behavior: 'auto' });
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
