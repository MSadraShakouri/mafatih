import { codePointToUtf16Offset } from './text-offset.js';
import type { ReadingAnchor } from './routes.js';

/** Go to the actual matched line, leaving the reader text completely unmarked. */
export function scrollToReadingAnchor(main: HTMLElement, anchor: ReadingAnchor): boolean {
  const row = [...main.querySelectorAll<HTMLElement>('[data-row-id]')]
    .find(element => element.dataset.rowId === anchor.row);
  const paragraph = row?.querySelector<HTMLParagraphElement>(`p[lang="${anchor.language}"]`);
  if (!paragraph) return false;
  const first = paragraph.firstChild;
  if (first?.nodeType === Node.TEXT_NODE) {
    const range = document.createRange();
    const offset = codePointToUtf16Offset(first.textContent ?? '', anchor.offset);
    range.setStart(first, offset);
    range.collapse(true);
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
