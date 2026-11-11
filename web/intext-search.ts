import { localizeSearchInput } from './display-text.js';
import { textRange } from './text-offset.js';
import type { ReaderItem } from './data.js';
import type { SearchHit, SearchLanguage, SearchSnapshot } from '../src/search.js';
import { normalizeSearch } from '../src/normalize.js';
import { utf16ToCodePointOffset, type TextRange } from '../src/search-text.js';
import { SearchClient } from './search-client.js';
import { hitSignature, markPrevious, mergeSearchHits, reconcileRows, type DisplayHit, type KeyedNode } from './search-results.js';
import {
  appendCompactExcerpt, digits, dismissKeyboardOnOutsideTouch, element as el, installSearchKeyboard,
  originalMatches, TOUCH_TAP_SLOP, type SearchSession,
} from './search-common.js';

const PAGE_SIZE = 50;
const listIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>';
const clearIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

export interface InTextSearch {
  open(focus?: boolean): void;
  close(): void;
  isOpen(): boolean;
  inputFocused(): boolean;
  blurInput(): void;
  dispose(): void;
}

/** Keep the reader DOM and its scroll position intact while replacing its 49px header. */
export function attachInTextSearch(main: HTMLElement, item: ReaderItem, client: SearchClient,
  session: SearchSession, requestClose: () => void, onOpenChange: (open: boolean) => void): InTextSearch {
  const header = main.querySelector<HTMLElement>('.reader-header')!;
  const normal = header.querySelector<HTMLElement>('.header-inner')!;
  const bookmark = normal.querySelector<HTMLButtonElement>('.header-side.start .icon-button')!;
  const bookmarkHome = bookmark.parentElement!;
  const search = normal.querySelector<HTMLButtonElement>('[data-reader-search]')!;
  const searchHome = search.parentElement!, searchNext = search.nextSibling;
  const inlineMessage = header.querySelector<HTMLElement>('.inline-message');
  if (session.readerItem !== item.id) { session.readerItem = item.id; session.readerQuery = ''; }

  const row = el('div', 'search-header-row'); row.setAttribute('role', 'search');
  const form = el('form', 'query-shell');
  const input = el('input', 'query-input'); input.type = 'search'; input.maxLength = 300; input.autocomplete = 'off'; input.dir = 'rtl';
  input.placeholder = 'جست‌وجو در متن'; input.setAttribute('aria-label', 'جست‌وجو در این متن'); input.value = session.readerQuery;
  const clear = el('button', 'query-clear'); clear.type = 'button'; clear.innerHTML = clearIcon; clear.setAttribute('aria-label', 'پاک کردن جست‌وجو');
  form.append(input, clear);
  const reopen = el('button', 'icon-button result-reopen'); reopen.type = 'button'; reopen.innerHTML = listIcon;
  reopen.setAttribute('aria-label', 'نمایش فهرست نتایج'); reopen.title = 'نمایش فهرست نتایج'; reopen.setAttribute('aria-controls', 'intext-results');
  const filter = el('button', 'icon-button language-picker', 'زبان'); filter.type = 'button';
  filter.setAttribute('aria-label', 'گزینه‌های زبان'); filter.title = 'گزینه‌های زبان'; filter.setAttribute('aria-controls', 'intext-languages');
  const popovers = el('div', 'search-popovers');
  const results = el('section', 'result-popover'); results.id = 'intext-results'; results.setAttribute('aria-label', 'نتایج جست‌وجو');
  results.setAttribute('role', 'region'); results.tabIndex = 0; results.hidden = true;
  const head = el('div', 'result-head'), headText = el('span');
  const hide = el('button', 'icon-button'); hide.type = 'button'; hide.innerHTML = clearIcon;
  hide.setAttribute('aria-label', 'بستن فهرست نتایج');
  hide.addEventListener('click', () => { listOpen = false; visibility(); }); head.append(headText, hide);
  const empty = el('p', 'result-empty');
  const list = el('ol', 'result-list');
  const more = el('button', 'search-more', 'نمایش بیشتر'); more.type = 'button'; more.hidden = true;
  results.append(head, empty, list, more);
  const menu = el('section', 'filter-menu'); menu.id = 'intext-languages'; menu.setAttribute('aria-label', 'گزینه‌های جست‌وجو'); menu.hidden = true;
  const filterHeading = el('p', 'filter-heading', 'زبان متن'), filterActions = el('div', 'filter-actions');
  const toggles = new Map<SearchLanguage, HTMLButtonElement>();
  for (const [language, label] of [['ar', 'عربی'], ['fa', 'فارسی']] as const) {
    const button = el('button', 'filter-choice', label); button.type = 'button'; button.setAttribute('aria-label', `نمایش متن ${label}`);
    button.addEventListener('click', () => {
      if (session.languages.has(language)) session.languages.delete(language); else session.languages.add(language);
      limit = PAGE_SIZE; run();
    });
    toggles.set(language, button); filterActions.append(button);
  }
  menu.append(filterHeading, filterActions);
  const error = el('section', 'search-error-popover'); error.setAttribute('role', 'alert'); error.hidden = true;
  error.append(el('span', '', 'بارگذاری جست‌وجو ناموفق بود.'));
  const retry = el('button', 'search-retry', 'تلاش دوباره'); retry.type = 'button'; error.append(retry);
  popovers.append(results, menu, error);
  const live = el('div', 'visually-hidden'); live.dataset.readerSearchStatus = '';
  live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  main.append(popovers, live);

  let open = false, destroyed = false, listOpen = false, menuOpen = false, errorOpen = false, searching = false;
  let display: DisplayHit[] = [], previous: DisplayHit[] = [], retainedIsOldQuery = false;
  let total = 0, currentCount = 0, limit = PAGE_SIZE;
  let pending: SearchSnapshot | undefined, timer: number | undefined, pointerInResults = false;
  let baseKey = '', requestKey = '', requestedFocus: number | undefined;
  let seekSerial = 0, flashTimer = 0;
  let pointerStart: { reopenHidden: boolean; touch?: {
    target: EventTarget | null; id: number; x: number; y: number; dragged: boolean;
  } } | undefined;
  let fallbackTimer = 0;
  const stripes = new Map<string, boolean>();

  function visibility(): void {
    results.hidden = !(open && listOpen);
    menu.hidden = !(open && menuOpen);
    error.hidden = !(open && errorOpen);
    // Keep the touched header target stationary until its click is delivered.
    reopen.hidden = !open || (pointerStart ? pointerStart.reopenHidden : (listOpen || menuOpen || errorOpen));
    reopen.setAttribute('aria-expanded', String(!results.hidden));
    filter.setAttribute('aria-expanded', String(!menu.hidden));
    clear.hidden = !input.value;
    for (const [language, button] of toggles) button.setAttribute('aria-pressed', String(session.languages.has(language)));
    geometry();
  }
  function geometry(): void {
    if (!open) return;
    const bottom = Math.max(0, header.getBoundingClientRect().bottom);
    const visual = window.visualViewport;
    const available = Math.max(0, (visual?.offsetTop ?? 0) + (visual?.height ?? innerHeight) - bottom - 12);
    main.style.setProperty('--search-header-bottom', `${bottom}px`);
    main.style.setProperty('--search-available-height', `${available}px`);
  }
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(geometry);
  observer?.observe(header);
  window.addEventListener('scroll', geometry, { passive: true });
  window.addEventListener('resize', geometry, { passive: true });
  window.visualViewport?.addEventListener('resize', geometry, { passive: true });
  window.visualViewport?.addEventListener('scroll', geometry, { passive: true });
  const stopKeyboard = dismissKeyboardOnOutsideTouch(input, target => dismissOutside(target));

  function clearFlash(): void {
    const highlights = (CSS as typeof CSS & { highlights?: Map<string, unknown> }).highlights;
    highlights?.delete('active-search-match');
  }
  function resetSeek(): void { seekSerial++; clearTimeout(flashTimer); clearFlash(); }
  async function seek(hit: SearchHit, range?: TextRange): Promise<void> {
    const serial = ++seekSerial;
    try { await document.fonts.ready; } catch { /* use the available fonts */ }
    if (serial !== seekSerial || !open || destroyed) return;
    const record = hit.record;
    const block = [...main.querySelectorAll<HTMLElement>('[data-row-id]')].find(node => node.dataset.rowId === record.row);
    const paragraph = block?.querySelector<HTMLParagraphElement>(`p[lang="${record.language}"]`);
    if (!paragraph) return;
    // Display digits are one-for-one with the source, but verse markers may
    // split the DOM into multiple text nodes. Source UTF-16 offsets still map.
    const text = record.text, start = Math.max(0, Math.min(text.length, range?.start ?? 0));
    const end = Math.max(start, Math.min(text.length, range?.end ?? start));
    const selection = textRange(paragraph, start, end);
    if (!selection) return;
    const top = window.scrollY + selection.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 15;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    main.dataset.anchorRow = record.row; main.dataset.anchorOffset = String(utf16ToCodePointOffset(text, start));
    clearTimeout(flashTimer); clearFlash();
    const highlights = (CSS as typeof CSS & { highlights?: Map<string, unknown> }).highlights;
    const HighlightClass = (globalThis as typeof globalThis & { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
    if (highlights && HighlightClass && end > start) {
      highlights.set('active-search-match', new HighlightClass(selection));
      flashTimer = window.setTimeout(clearFlash, 2200);
    }
    live.textContent = 'به متن رفت';
  }
  function resultRow(hit: SearchHit): HTMLLIElement {
    const record = hit.record;
    const li = el('li', 'result-row'); li.dataset.resultKey = record.key; li.dataset.language = record.language;
    li.dataset.rowId = record.row ?? ''; li.dataset.itemId = record.item ?? ''; li.dataset.searchKind = 'text';
    if (!stripes.has(record.key)) stripes.set(record.key, stripes.size % 2 === 0);
    li.dataset.stripe = String(stripes.get(record.key));
    const button = el('button'); button.type = 'button';
    const snippet = el('span', `result-snippet ${record.language}`); snippet.lang = record.language; snippet.dir = 'rtl';
    const continuations = (hit.continuation ?? []).slice(0, 2);
    appendCompactExcerpt(snippet, record.text, hit.matchedWords, continuations.length > 0);
    for (const [index, continuation] of continuations.entries()) {
      snippet.append(document.createTextNode(' · '));
      appendCompactExcerpt(snippet, continuation.text, continuation.matchedWords, index < continuations.length - 1);
    }
    button.append(snippet);
    button.setAttribute('aria-label', `نتیجه در ${record.language === 'ar' ? 'متن عربی' : 'متن فارسی'}، ${snippet.textContent ?? ''}`);
    button.addEventListener('click', () => {
      const match = originalMatches(record.text, hit.matchedWords, 200)[0];
      listOpen = false; menuOpen = false; visibility(); void seek(hit, match);
    });
    li.append(button); return li;
  }
  function renderResults(): void {
    const scroll = results.scrollTop;
    const visible = !results.hidden ? [...results.querySelectorAll<HTMLElement>('[data-result-key]')]
      .find(node => node.getBoundingClientRect().bottom > results.getBoundingClientRect().top) : undefined;
    const key = visible?.dataset.resultKey, top = visible?.getBoundingClientRect().top;
    const nodes: KeyedNode[] = [];
    for (const entry of display) {
      nodes.push({ key: `hit:${entry.hit.record.key}`, signature: hitSignature(entry.hit),
        create: () => resultRow(entry.hit), update: node => markPrevious(node, entry.previous) });
    }
    reconcileRows(list, nodes);
    const query = input.value.trim(), valid = Boolean(normalizeSearch(query));
    const label = !query || searching ? 'جست‌وجو در متن' : `${digits(total)} نتیجه`;
    if (headText.textContent !== label) headText.textContent = label;
    results.setAttribute('aria-busy', String(searching && !errorOpen));
    empty.hidden = display.length > 0 || searching;
    if (!empty.hidden) empty.textContent = !query ? 'برای جست‌وجو، واژه‌ای بنویسید.'
      : !valid ? 'برای جست‌وجو، دست‌کم یک واژه یا عدد بنویسید.'
        : !session.languages.size ? 'برای جست‌وجوی متن، عربی یا فارسی را روشن کنید.'
          : 'نتیجه‌ای پیدا نشد.';
    more.hidden = total <= currentCount || currentCount === 0;
    more.disabled = searching || errorOpen;
    results.scrollTop = scroll;
    if (key && top !== undefined) {
      const after = [...results.querySelectorAll<HTMLElement>('[data-result-key]')].find(node => node.dataset.resultKey === key);
      if (after) results.scrollTop += after.getBoundingClientRect().top - top;
    }
    if (requestedFocus !== undefined && currentCount > requestedFocus) {
      list.querySelectorAll<HTMLButtonElement>('.result-row[data-previous="false"] button')[requestedFocus]?.focus({ preventScroll: true });
      requestedFocus = undefined;
    }
  }
  function showSnapshot(snapshot: SearchSnapshot): void {
    total = snapshot.textTotal; currentCount = snapshot.text.length; searching = !snapshot.complete;
    const multi = normalizeSearch(input.value).split(' ').filter(Boolean).length > 1;
    display = mergeSearchHits(snapshot.text, previous, snapshot.complete, multi, previous.length, retainedIsOldQuery);
    if (snapshot.complete) previous = [];
    renderResults();
    if (snapshot.complete) live.textContent = total ? `${digits(total)} نتیجه` : 'نتیجه‌ای پیدا نشد';
    visibility();
  }
  function flush(): void {
    timer = undefined;
    if (!open || destroyed || !pending || pointerInResults || (results.contains(document.activeElement) && requestedFocus === undefined)) return;
    const snapshot = pending; pending = undefined; showSnapshot(snapshot);
  }
  function queue(snapshot: SearchSnapshot): void {
    if (!open || destroyed) return;
    pending = snapshot;
    if (timer === undefined) timer = window.setTimeout(flush, 80);
  }
  function resetQueue(): void { window.clearTimeout(timer); timer = undefined; pending = undefined; }
  function run(): void {
    if (!open || destroyed) return;
    const query = input.value; session.readerQuery = query; visibility();
    if (!query.trim() || !normalizeSearch(query) || !session.languages.size) {
      client.cancel(); resetQueue(); baseKey = ''; requestKey = ''; display = []; previous = [];
      total = 0; currentCount = 0; searching = false; errorOpen = false;
      live.textContent = query.trim() ? 'نتیجه‌ای پیدا نشد' : ''; renderResults(); visibility(); return;
    }
    const nextBase = JSON.stringify([normalizeSearch(query), [...session.languages].sort(), item.id]);
    const nextRequest = JSON.stringify([nextBase, limit]);
    if (nextRequest === requestKey) return;
    resetQueue();
    const changed = nextBase !== baseKey;
    previous = display.slice(); retainedIsOldQuery = changed;
    if (changed) { currentCount = 0; total = 0; requestedFocus = undefined; resetSeek(); }
    baseKey = nextBase; requestKey = nextRequest; errorOpen = false; searching = true;
    if (changed) display = previous.map(entry => ({ ...entry, previous: true }));
    // Do not leave a previous completed search's announcement in the live region.
    live.textContent = '';
    renderResults(); visibility();
    client.search({ query, languages: [...session.languages], item: item.id, tocLimit: 0, textLimit: limit, resultLimit: 0 }, queue, () => {
      if (!open || destroyed) return;
      resetQueue(); requestKey = ''; searching = false; errorOpen = true; listOpen = true; menuOpen = false;
      live.textContent = 'بارگذاری جست‌وجو ناموفق بود.'; renderResults(); visibility();
    });
  }
  input.addEventListener('input', event => {
    if (!(event as InputEvent).isComposing) localizeSearchInput(input);
    if (normalizeSearch(input.value) !== normalizeSearch(session.readerQuery)) limit = PAGE_SIZE;
    listOpen = true; menuOpen = false; run();
  });
  input.addEventListener('compositionend', () => { localizeSearchInput(input); run(); });
  input.addEventListener('focus', () => {
    if (!listOpen && !menuOpen && !errorOpen) { listOpen = true; visibility(); }
  });
  clear.addEventListener('click', () => { input.value = ''; listOpen = true; menuOpen = false; limit = PAGE_SIZE; run(); });
  more.addEventListener('click', () => { if (!searching && !errorOpen) { requestedFocus = currentCount; limit += PAGE_SIZE; run(); } });
  installSearchKeyboard(form, input, () => {
    if (input.value) { input.value = ''; listOpen = false; menuOpen = false; limit = PAGE_SIZE; run(); }
    else requestClose();
  }, () => { listOpen = true; menuOpen = false; visibility(); run(); });
  reopen.addEventListener('click', event => {
    // Only transfer focus for keyboard activation. Pointer clicks also focus
    // buttons in many browsers; focusing the panel then would unnecessarily
    // freeze streamed results until the user taps elsewhere.
    const keyboardActivation = event.detail === 0;
    listOpen = true; menuOpen = false; errorOpen = false; visibility();
    if (keyboardActivation) results.focus({ preventScroll: true });
  });
  filter.addEventListener('click', () => {
    menuOpen = !menuOpen; errorOpen = false;
    if (menuOpen) listOpen = false; else listOpen = true;
    visibility();
  });
  retry.addEventListener('click', () => { errorOpen = false; listOpen = true; requestKey = ''; run(); });

  const contains = (node: Node, target: EventTarget | null): boolean => target instanceof Node && node.contains(target);
  function dismissOutside(target: EventTarget | null): void {
    if (!open || destroyed) return;
    // The search row is part of the interaction, not an outside touch.
    if (!contains(row, target) && !contains(results, target)) listOpen = false;
    if (!contains(menu, target) && !contains(filter, target)) menuOpen = false;
    if (!contains(error, target)) errorOpen = false;
    visibility();
  }
  const onPointerDown = (event: PointerEvent): void => {
    if (!open) return;
    // Freeze streaming and header geometry until the click is delivered.
    pointerInResults = true;
    pointerStart = { reopenHidden: reopen.hidden,
      ...(event.pointerType === 'touch' ? { touch: { target: event.target, id: event.pointerId,
        x: event.clientX, y: event.clientY, dragged: false } } : {}) };
    // Android may claim a touch as Back and cancel it. Do not dismiss on
    // touch-down and briefly hide the results during that gesture.
    if (event.pointerType !== 'touch') dismissOutside(event.target);
  };
  const onPointerMove = (event: PointerEvent): void => {
    const touch = pointerStart?.touch;
    if (touch && event.pointerId === touch.id &&
        Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > TOUCH_TAP_SLOP) touch.dragged = true;
  };
  function releasePointer(): void {
    pointerInResults = false; pointerStart = undefined; visibility();
    if (pending && timer === undefined) timer = window.setTimeout(flush, 0);
  }
  const onClick = (event: MouseEvent): void => {
    clearTimeout(fallbackTimer);
    // Keyboard / assistive-technology clicks may have no preceding pointer.
    if (!pointerStart && !contains(search, event.target)) dismissOutside(event.target);
    releasePointer();
  };
  const onPointerUp = (event: PointerEvent): void => {
    const before = pointerStart;
    if (!before) { releasePointer(); return; }
    if (before.touch && event.pointerId === before.touch.id) {
      const touch = before.touch;
      const wasTap = !touch.dragged && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) <= TOUCH_TAP_SLOP;
      if (!wasTap) { releasePointer(); return; }
      delete before.touch; dismissOutside(touch.target);
    }
    clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(() => { if (pointerStart === before) releasePointer(); }, 500);
  };
  const onPointerCancel = (): void => {
    clearTimeout(fallbackTimer); releasePointer();
  };
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
  document.addEventListener('pointercancel', onPointerCancel, { capture: true, passive: true });
  document.addEventListener('click', onClick);
  results.addEventListener('focusout', () => window.setTimeout(() => { if (pending && timer === undefined) flush(); }, 0));

  function enter(focus = false): void {
    if (destroyed || open) return;
    onOpenChange(true);
    open = true; listOpen = true; menuOpen = false; errorOpen = false; limit = PAGE_SIZE;
    input.value = session.readerQuery;
    if (inlineMessage) inlineMessage.hidden = true;
    row.append(bookmark, form, reopen, search, filter);
    search.setAttribute('aria-label', 'بستن جست‌وجو'); search.title = 'بستن جست‌وجو'; search.setAttribute('aria-pressed', 'true');
    normal.replaceWith(row); header.classList.add('infile-active');
    client.prepareItem(item);
    run(); visibility();
    if (focus) {
      input.focus({ preventScroll: true });
      // When reopening with the caret still at the start, prepare to append.
      // Preserve deliberate mid-text carets and non-collapsed selections.
      if (input.value && input.selectionStart === 0 && input.selectionEnd === 0) {
        const end = input.value.length; input.setSelectionRange(end, end);
      }
    }
  }
  function close(): void {
    if (!open) return;
    open = false; input.blur(); session.readerQuery = input.value; client.cancel(); resetQueue(); resetSeek();
    baseKey = ''; requestKey = ''; display = []; previous = []; total = 0; currentCount = 0; searching = false;
    listOpen = false; menuOpen = false; errorOpen = false; pointerInResults = false; pointerStart = undefined;
    clearTimeout(fallbackTimer); reconcileRows(list, []);
    bookmarkHome.append(bookmark); searchHome.insertBefore(search, searchNext);
    search.setAttribute('aria-label', 'جست‌وجو در متن'); search.title = 'جست‌وجو در متن'; search.removeAttribute('aria-pressed');
    row.replaceWith(normal); header.classList.remove('infile-active');
    if (inlineMessage) inlineMessage.hidden = true;
    onOpenChange(false);
    live.textContent = 'جست‌وجو بسته شد'; visibility();
  }
  return {
    open: enter, close, isOpen: () => open, inputFocused: () => document.activeElement === input, blurInput: () => input.blur(),
    dispose: () => {
      close(); destroyed = true; resetQueue(); clearTimeout(fallbackTimer); stopKeyboard(); observer?.disconnect();
      window.removeEventListener('scroll', geometry); window.removeEventListener('resize', geometry);
      window.visualViewport?.removeEventListener('resize', geometry); window.visualViewport?.removeEventListener('scroll', geometry);
      document.removeEventListener('pointerdown', onPointerDown, true); document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true); document.removeEventListener('pointercancel', onPointerCancel, true);
      document.removeEventListener('click', onClick);
      popovers.remove(); live.remove();
    },
  };
}
