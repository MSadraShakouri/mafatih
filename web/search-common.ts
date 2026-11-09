import { appendDisplayText, displayDigits } from './display-text.js';
import type { SearchHit, SearchLanguage } from '../src/search.js';
import { expandedWords } from '../src/lam-aliases.js';
import { findOriginalWordMatches, utf16ToCodePointOffset, type TextRange } from '../src/search-text.js';
import { matchedSubstringRanges } from './highlight-substring.js';

/** In-memory choices are shared by the two searches, and reset on app reload. */
export interface SearchSession {
  languages: Set<SearchLanguage>;
  libraryQuery: string;
  libraryScroll: number;
  libraryLimit: number;
  readerItem: string;
  readerQuery: string;
}
export const createSearchSession = (): SearchSession => ({
  languages: new Set<SearchLanguage>(['ar']), libraryQuery: '', libraryScroll: 0, libraryLimit: 50, readerItem: '', readerQuery: '',
});

export const digits = (number: number): string => displayDigits(String(number), 'ui');
export const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

export function markText(parent: HTMLElement, text: string, ranges: readonly TextRange[], start = 0, end = text.length): void {
  const language = parent.lang === 'ar' || parent.lang === 'fa' || parent.lang === 'en' ? parent.lang : 'ui';
  appendDisplayText(parent, text, language, ranges, start, end);
}

/** An exact source substring, including its Arabic combining marks, not a whole-word highlight. */
export function originalMatches(text: string, words: readonly string[], limit = 100): TextRange[] {
  return matchedSubstringRanges(text, findOriginalWordMatches(text, expandedWords(words), limit));
}

function excerptBounds(text: string, first?: TextRange, before = 22, after = 55): TextRange {
  const points = Array.from(text);
  const a = first ? utf16ToCodePointOffset(text, first.start) : 0;
  const z = first ? utf16ToCodePointOffset(text, first.end) : 0;
  let start = Math.max(0, a - before), end = Math.min(points.length, Math.max(z, a + 1) + after);
  const word = (x: string | undefined): boolean => Boolean(x && /[\p{L}\p{M}\p{N}\u200c\u200d\u0640]/u.test(x));
  while (start > 0 && word(points[start])) start--;
  while (end < points.length && word(points[end])) end++;
  return { start: points.slice(0, start).join('').length, end: points.slice(0, end).join('').length };
}

/** Reader list: one line, with the final source tail left to native ellipsis. */
export function appendCompactExcerpt(parent: HTMLElement, text: string, words: readonly string[], continuation = false): void {
  const matches = originalMatches(text, words);
  const bounds = excerptBounds(text, matches[0]);
  const end = continuation ? bounds.end : text.length;
  if (bounds.start > 0) parent.append(document.createTextNode('… '));
  markText(parent, text, matches, bounds.start, end);
  if (end < text.length) parent.append(document.createTextNode(' …'));
}

/** Global list keeps the selected design's separate contexts for distant terms. */
export function appendGlobalExcerpts(parent: HTMLElement, text: string, language: SearchLanguage, words: readonly string[]): void {
  const matches = findOriginalWordMatches(text, expandedWords(words));
  const ranges = matchedSubstringRanges(text, matches);
  const seen = new Set<string>();
  const focuses = matches.filter(match => {
    if (seen.has(match.word)) return false;
    seen.add(match.word); return true;
  }).slice(0, 8);
  const windows = (focuses.length ? focuses : [undefined]).map(focus => excerptBounds(text, focus, 28, 60)).sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];
  for (const window of windows) {
    const last = merged.at(-1);
    if (last && window.start <= last.end) last.end = Math.max(last.end, window.end);
    else merged.push({ ...window });
  }
  for (const [index, window] of merged.entries()) {
    const excerpt = element('span', `search-excerpt ${language}`);
    excerpt.lang = language; excerpt.dir = 'rtl';
    if ((index === 0 && window.start > 0) || index > 0) excerpt.append(document.createTextNode('… '));
    markText(excerpt, text, ranges, window.start, window.end);
    if (index === merged.length - 1 && window.end < text.length) excerpt.append(document.createTextNode(' …'));
    parent.append(excerpt);
  }
}

export const foundCount = (hit: SearchHit): number => new Set([
  ...hit.matchedWords, ...(hit.continuation ?? []).flatMap(part => part.matchedWords),
]).size;

// Allow ordinary finger jitter when deciding whether a completed touch was a tap.
export const TOUCH_TAP_SLOP = 12;

/** Dismiss the keyboard on an outside tap or a real touch scroll, without consuming the tap. */
export function dismissKeyboardOnOutsideTouch(input: HTMLInputElement,
  onScroll?: (target: EventTarget | null) => void): () => void {
  let start: { id: number; x: number; y: number; target: EventTarget | null; moved: boolean; dragged: boolean } | undefined;
  const findTouch = (touches: TouchList, id: number): Touch | undefined =>
    Array.from(touches).find(touch => touch.identifier === id);
  const onTouch = (event: TouchEvent): void => {
    if (start || event.target === input || (document.activeElement !== input && !onScroll)) return;
    const touch = event.changedTouches[0];
    if (touch) start = { id: touch.identifier, x: touch.clientX, y: touch.clientY, target: event.target, moved: false, dragged: false };
  };
  const onMove = (event: TouchEvent): void => {
    if (!start) return;
    const touch = findTouch(event.changedTouches, start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (dx || dy) start.moved = true;
    if (Math.hypot(dx, dy) > TOUCH_TAP_SLOP) start.dragged = true;
  };
  const onTouchScroll = (event: Event): void => {
    if (!start?.moved) return;
    const scroller = event.target, target = start.target;
    // Only a scroller containing the touched target can represent this drag.
    if (scroller instanceof Element && (!(target instanceof Node) || !scroller.contains(target))) return;
    if (!(scroller instanceof Element) && !(scroller instanceof Document)) return;
    start = undefined;
    onScroll?.(target);
    if (document.activeElement === input) input.blur();
  };
  const onEnd = (event: TouchEvent): void => {
    if (!start) return;
    const touch = findTouch(event.changedTouches, start.id);
    if (!touch) return;
    const wasTap = !start.dragged && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) <= TOUCH_TAP_SLOP;
    start = undefined;
    if (wasTap && document.activeElement === input) input.blur();
  };
  const onCancel = (event: TouchEvent): void => {
    if (start && (!event.changedTouches.length || findTouch(event.changedTouches, start.id))) start = undefined;
  };
  // A touchstart may turn into Android Back. Wait for an outside tap or an
  // actual scroll; cancellation alone does not dismiss anything. Capturing
  // scroll observes both the document and a scrollable results panel.
  document.addEventListener('touchstart', onTouch, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('touchcancel', onCancel, { passive: true });
  document.addEventListener('scroll', onTouchScroll, { capture: true, passive: true });
  return () => {
    document.removeEventListener('touchstart', onTouch); document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd); document.removeEventListener('touchcancel', onCancel);
    document.removeEventListener('scroll', onTouchScroll, true);
  };
}

/** Enter / native Search reveals the results and closes the keyboard, without interrupting IME composition. */
export function installSearchKeyboard(form: HTMLFormElement, input: HTMLInputElement, escape: () => void,
  showResults: () => void): void {
  input.setAttribute('enterkeyhint', 'search');
  const submit = (): void => { input.blur(); showResults(); };
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); submit(); }
    else if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); escape(); }
  });
  // Android IMEs differ: some emit only a search event or only form submit.
  input.addEventListener('search', submit);
  form.addEventListener('submit', event => { event.preventDefault(); submit(); });
}
