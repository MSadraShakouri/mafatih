import { localizeSearchInput } from './display-text.js';
import type { SearchHit, SearchLanguage, SearchSnapshot } from '../src/search.js';
import { normalizeSearch } from '../src/normalize.js';
import { utf16ToCodePointOffset } from '../src/search-text.js';
import type { Catalog } from './data.js';
import { titleText } from './render.js';
import { itemHref, topicHref } from './routes.js';
import { TOPICS, topicNodes } from './topic-navigation.js';
import { SearchClient } from './search-client.js';
import { hitSignature, markPrevious, mergeSearchHits, reconcileRows, type DisplayHit, type KeyedNode } from './search-results.js';
import {
  appendGlobalExcerpts, digits, dismissKeyboardOnOutsideTouch, element as el, foundCount,
  installSearchKeyboard, markText, originalMatches, type SearchSession,
} from './search-common.js';

const PAGE_SIZE = 50;

export interface GlobalSearch {
  close(): boolean;
  restore(query: string): void;
  dispose(): void;
}

/** The home shell is usable while its catalog and search worker prepare. */
export function attachGlobalSearch(main: HTMLElement, getCatalog: () => Promise<Catalog>, client: SearchClient,
  session: SearchSession, navigate: (href: string) => void, onState: (query: string, active: boolean) => void,
  restoreScroll = false): GlobalSearch {
  const slot = main.querySelector<HTMLElement>('.library-search-slot');
  const contents = main.querySelector<HTMLElement>('[data-contents]');
  if (!slot) return { close: () => false, restore: () => {}, dispose: () => {} };
  const names = new Map<string, ReturnType<typeof titleText>>();
  let catalog: Catalog | undefined, catalogLoading = false, catalogFailed = false;
  const tocTargets = new Map<string, string>();
  function tocTarget(path: string | undefined): string {
    if (!path || !catalog) return '#/contents';
    const cached = tocTargets.get(path); if (cached) return cached;
    const choices = TOPICS.filter(topic => topic.id !== 'featured' && topicNodes(catalog!, topic.id, path));
    const target = choices.length === 1 ? topicHref(choices[0]!.id, path) : '#/contents';
    tocTargets.set(path, target); return target;
  }

  // Hydrate the actual prebuilt search field; never replace what was painted
  // (or discard a query typed while the module was still loading).
  const root = slot.querySelector<HTMLElement>('.library-search')!;
  const form = root.querySelector<HTMLFormElement>('.search-form')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const clear = form.querySelector<HTMLButtonElement>('.search-clear')!;
  input.value = session.libraryQuery || input.value;
  const tools = el('div', 'search-tools');
  const group = el('div', 'search-languages'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'زبان متن');
  const toggles = new Map<SearchLanguage, HTMLButtonElement>();
  for (const [language, label] of [['ar', 'عربی'], ['fa', 'فارسی']] as const) {
    const button = el('button', 'search-language', label); button.type = 'button';
    button.setAttribute('aria-label', `نمایش متن ${label}`);
    button.addEventListener('click', () => {
      if (session.languages.has(language)) session.languages.delete(language); else session.languages.add(language);
      limit = PAGE_SIZE; run();
    });
    toggles.set(language, button); group.append(button);
  }
  tools.append(group);
  const summary = el('div', 'search-summary');
  const heading = el('h2', 'visually-hidden', 'نتایج');
  const status = el('span', 'search-results-count'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  summary.append(heading, status);
  const toolbar = el('div', 'search-toolbar'); toolbar.append(tools, summary); root.append(toolbar);
  const results = el('div', 'search-results'); results.setAttribute('aria-label', 'نتایج جست‌وجو');
  const list = el('ol', 'search-result-list');
  const empty = el('div', 'search-empty'); empty.hidden = true;
  const failure = el('div', 'search-empty'); failure.hidden = true;
  failure.append(el('strong', '', 'بارگذاری جست‌وجو ناموفق بود.'));
  const retry = el('button', 'search-more', 'تلاش دوباره'); retry.type = 'button'; failure.append(retry);
  const more = el('button', 'search-more', 'نمایش بیشتر'); more.type = 'button'; more.hidden = true;
  results.append(list, empty, failure, more); root.append(results);

  let limit = session.libraryLimit, destroyed = false, pointerDown = false, searching = false, searchFailed = false;
  let pointerFallback = 0;
  let pending: SearchSnapshot | undefined, timer: number | undefined;
  let baseKey = '', requestKey = '', focusIndex: number | undefined;
  let display: DisplayHit[] = [], previous: DisplayHit[] = [], retainedIsOldQuery = false;
  let total = 0, currentCount = 0;
  let needsRestore = restoreScroll && session.libraryScroll > 0 && Boolean(input.value.trim());
  let measureFrame = 0, measureVersion = 0;
  const measured = new WeakMap<HTMLElement, number>();

  function scheduleMeasurement(): void {
    if (measureFrame) cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      for (const row of results.querySelectorAll<HTMLElement>('.search-result[data-search-kind="text"]')) {
        if (measured.get(row) === measureVersion) continue;
        delete row.dataset.indexWrap;
        if (row.dataset.multi === 'true') { measured.set(row, measureVersion); continue; }
        const body = row.querySelector<HTMLElement>('.search-result-body');
        const mark = body?.querySelector<HTMLElement>('mark');
        if (!body || !mark || !body.offsetWidth) continue;
        const bounds = body.getBoundingClientRect(), match = mark.getBoundingClientRect();
        if (match.left < bounds.left + 14 || match.right > bounds.right + 1) row.dataset.indexWrap = 'true';
        measured.set(row, measureVersion);
      }
    });
  }
  const resize = (): void => { measureVersion++; scheduleMeasurement(); };
  window.addEventListener('resize', resize, { passive: true });
  document.fonts?.addEventListener('loadingdone', resize);
  void document.fonts?.ready.then(() => { if (!destroyed) resize(); }).catch(() => {});

  function resultRow(hit: SearchHit, multi: boolean, prior?: SearchHit, next?: SearchHit): HTMLLIElement {
    const record = hit.record;
    const sameItem = Boolean(record.item && prior?.record.item === record.item);
    const showTitle = !sameItem || record.section === 'toc';
    const itemName = record.item ? (names.get(record.item) ?? { text: record.item, lang: 'en', dir: 'ltr' as const })
      : { text: record.text, lang: 'fa', dir: 'rtl' as const };
    const row = el('li', 'search-result');
    row.dataset.resultKey = record.key; row.dataset.searchKind = record.section;
    row.dataset.itemId = record.item ?? ''; row.dataset.language = record.language;
    row.dataset.matchCount = String(foundCount(hit)); row.dataset.featured = String(record.featured);
    row.dataset.groupStart = String(!sameItem); row.dataset.groupEnd = String(!next || next.record.item !== record.item);
    row.dataset.multi = String(multi);
    if (record.row) row.dataset.rowId = record.row;
    const button = el('button', 'search-result-button'); button.type = 'button';
    if (showTitle) {
      const top = el('span', 'search-result-top'), title = el('span', 'search-result-title');
      if (record.section === 'toc') markText(title, record.text, originalMatches(record.text, hit.matchedWords));
      else { title.textContent = itemName.text; title.lang = itemName.lang; title.dir = itemName.dir; }
      top.append(title);
      if (record.featured && !sameItem) {
        const star = el('span', 'search-star', '★'); star.setAttribute('role', 'img'); star.setAttribute('aria-label', 'برگزیده'); top.append(star);
      }
      button.append(top);
    }
    let excerpt = '';
    if (record.section === 'text' && (record.language === 'ar' || record.language === 'fa')) {
      const body = el('span', 'search-result-body');
      appendGlobalExcerpts(body, record.text, record.language, hit.matchedWords);
      if (hit.continuation?.length) {
        const separator = el('span', 'search-continuation-separator', ' · '); separator.setAttribute('aria-hidden', 'true'); body.append(separator);
        for (const part of hit.continuation.slice(0, 8)) appendGlobalExcerpts(body, part.text, record.language, part.matchedWords);
      }
      excerpt = (body.textContent ?? '').replaceAll(' · ', '، ادامه '); button.append(body);
    }
    const kind = record.section === 'toc' ? 'عنوان فهرست' : `متن ${record.language === 'ar' ? 'عربی' : 'فارسی'}`;
    button.setAttribute('aria-label', [itemName.text, kind, record.featured ? 'برگزیده' : '', multi ? `${digits(foundCount(hit))} واژهٔ همسان` : '', excerpt].filter(Boolean).join('، '));
    button.addEventListener('click', () => {
      if (!record.item) { navigate(tocTarget(record.tocPath)); return; }
      if (record.section === 'text' && record.row && (record.language === 'ar' || record.language === 'fa')) {
        const match = originalMatches(record.text, hit.matchedWords)[0];
        navigate(itemHref(record.item, { row: record.row, language: record.language,
          offset: match ? utf16ToCodePointOffset(record.text, match.start) : 0 }));
      } else navigate(itemHref(record.item));
    });
    row.append(button); return row;
  }

  function renderDisplay(): void {
    const visible = window.scrollY > 0 && !needsRestore ? [...results.querySelectorAll<HTMLElement>('[data-result-key]')]
      .find(node => node.getBoundingClientRect().bottom > 0 && node.getBoundingClientRect().top < innerHeight) : undefined;
    const key = visible?.dataset.resultKey, top = visible?.getBoundingClientRect().top;
    const nodes: KeyedNode[] = [];
    for (const [index, entry] of display.entries()) {
      const prior = display[index - 1]?.previous === entry.previous ? display[index - 1]?.hit : undefined;
      const next = display[index + 1]?.previous === entry.previous ? display[index + 1]?.hit : undefined;
      const signature = JSON.stringify([hitSignature(entry.hit), entry.multi, prior?.record.item, next?.record.item]);
      nodes.push({ key: `hit:${entry.hit.record.key}`, signature,
        create: () => resultRow(entry.hit, entry.multi, prior, next), update: node => markPrevious(node, entry.previous) });
    }
    reconcileRows(list, nodes);
    const active = Boolean(input.value.trim());
    results.hidden = !active;
    const failed = searchFailed || catalogFailed;
    results.setAttribute('aria-busy', String(searching && !failed));
    const statusText = failed ? 'بارگذاری جست‌وجو ناموفق بود.'
      : searching ? 'در حال جست‌وجو…' : active ? `${digits(total)} نتیجه` : '';
    if (status.textContent !== statusText) status.textContent = statusText;
    failure.hidden = !failed || !active;
    empty.hidden = !active || display.length > 0 || failed;
    empty.replaceChildren();
    if (!empty.hidden) {
      if (searching || !catalog) empty.append(el('span', '', 'در حال جست‌وجو…'));
      else if (!normalizeSearch(input.value)) empty.append(el('span', '', 'برای جست‌وجو، دست‌کم یک واژه یا عدد بنویسید.'));
      else empty.append(el('strong', '', 'نتیجه‌ای پیدا نشد.'), el('span', '',
        !session.languages.size ? 'برای جست‌وجوی متن، عربی یا فارسی را روشن کنید.' : 'واژهٔ دیگری را بنویسید.'));
    }
    more.hidden = !active || total <= currentCount || currentCount === 0;
    more.disabled = searching || failed;
    if (key && top !== undefined) {
      const after = [...results.querySelectorAll<HTMLElement>('[data-result-key]')].find(node => node.dataset.resultKey === key);
      if (after) window.scrollBy(0, after.getBoundingClientRect().top - top);
    }
    if (focusIndex !== undefined && currentCount > focusIndex) {
      list.querySelectorAll<HTMLButtonElement>('.search-result[data-previous="false"] .search-result-button')[focusIndex]?.focus({ preventScroll: true });
      focusIndex = undefined;
    }
    if (needsRestore && !searching && !failed) {
      needsRestore = false; requestAnimationFrame(() => { if (!destroyed) window.scrollTo({ top: session.libraryScroll, behavior: 'auto' }); });
    }
    scheduleMeasurement();
  }
  function showSnapshot(snapshot: SearchSnapshot): void {
    total = snapshot.resultsTotal; currentCount = snapshot.results.length; searching = !snapshot.complete;
    const multi = normalizeSearch(input.value).split(' ').filter(Boolean).length > 1;
    display = mergeSearchHits(snapshot.results, previous, snapshot.complete, multi, previous.length, retainedIsOldQuery);
    if (snapshot.complete) previous = [];
    renderDisplay();
  }
  function flush(): void {
    timer = undefined;
    if (destroyed || pointerDown || !pending || !catalog || (results.contains(document.activeElement) && focusIndex === undefined)) return;
    const snapshot = pending; pending = undefined; showSnapshot(snapshot);
  }
  function queue(snapshot: SearchSnapshot): void {
    if (destroyed) return;
    pending = snapshot;
    if (timer === undefined) timer = window.setTimeout(flush, 80);
  }
  function resetQueue(): void { window.clearTimeout(timer); timer = undefined; pending = undefined; }
  function ensureCatalog(): void {
    if (catalog || catalogLoading || destroyed) return;
    catalogLoading = true; catalogFailed = false;
    void getCatalog().then(value => {
      if (destroyed) return;
      catalog = value; catalogLoading = false;
      for (const item of value.items) names.set(item.id, titleText(item.title, item.id));
      if (pending && timer === undefined) flush();
      else if (input.value.trim()) renderDisplay();
    }).catch(() => {
      if (destroyed) return;
      catalogLoading = false; catalogFailed = true;
      if (input.value.trim()) renderDisplay();
    });
  }
  function run(): void {
    if (destroyed) return;
    const query = input.value, active = Boolean(query.trim());
    if (active) ensureCatalog();
    onState(query, active || document.activeElement === input);
    session.libraryQuery = query; session.libraryLimit = limit;
    root.dataset.active = String(active); clear.hidden = !active; toolbar.hidden = !active;
    if (contents) contents.hidden = active;
    for (const [language, button] of toggles) button.setAttribute('aria-pressed', String(session.languages.has(language)));
    if (!active || !normalizeSearch(query)) {
      client.cancel(); resetQueue(); baseKey = ''; requestKey = ''; display = []; previous = [];
      searching = false; searchFailed = false; total = 0; currentCount = 0;
      renderDisplay(); return;
    }
    const nextBase = JSON.stringify([normalizeSearch(query), [...session.languages].sort()]);
    const nextRequest = JSON.stringify([nextBase, limit]);
    if (nextRequest === requestKey) return;
    resetQueue();
    const changed = nextBase !== baseKey;
    previous = display.slice(); retainedIsOldQuery = changed;
    if (changed) { focusIndex = undefined; currentCount = 0; total = 0; }
    baseKey = nextBase; requestKey = nextRequest; searching = true; searchFailed = false;
    if (changed) display = previous.map(entry => ({ ...entry, previous: true }));
    renderDisplay();
    client.search({ query, languages: [...session.languages], tocLimit: 0, textLimit: 0, resultLimit: limit }, queue, () => {
      if (destroyed) return;
      resetQueue(); requestKey = ''; searching = false; searchFailed = true; renderDisplay();
    });
  }
  input.addEventListener('focus', () => { onState(input.value, true); ensureCatalog(); client.prepareGlobal(); });
  input.addEventListener('blur', () => { if (!input.value.trim()) onState(input.value, false); });
  input.addEventListener('input', event => {
    if (!(event as InputEvent).isComposing) localizeSearchInput(input);
    if (normalizeSearch(input.value) !== normalizeSearch(session.libraryQuery)) limit = PAGE_SIZE;
    needsRestore = false; run();
  });
  input.addEventListener('compositionend', () => { localizeSearchInput(input); run(); });
  clear.addEventListener('click', () => { input.value = ''; session.libraryScroll = 0; needsRestore = false; limit = PAGE_SIZE; run(); });
  more.addEventListener('click', () => { if (!searching && !searchFailed) { focusIndex = currentCount; limit += PAGE_SIZE; run(); } });
  retry.addEventListener('click', () => { catalogFailed = false; searchFailed = false; ensureCatalog(); requestKey = ''; run(); });
  installSearchKeyboard(form, input, () => {
    if (input.value) { input.value = ''; session.libraryScroll = 0; needsRestore = false; limit = PAGE_SIZE; run(); }
    else input.blur();
  }, () => { run(); });
  const stopKeyboard = dismissKeyboardOnOutsideTouch(input);
  const onDown = (): void => { pointerDown = true; };
  const releasePointer = (): void => {
    pointerDown = false; clearTimeout(pointerFallback);
    if (pending && timer === undefined) timer = window.setTimeout(flush, 0);
  };
  const onUp = (): void => { if (pointerDown) pointerFallback = window.setTimeout(releasePointer, 500); };
  results.addEventListener('pointerdown', onDown);
  document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
  document.addEventListener('click', releasePointer, true);
  results.addEventListener('focusout', () => window.setTimeout(() => { if (pending && timer === undefined) flush(); }, 0));
  run();
  return {
    close(): boolean {
      if (!input.value.trim() && document.activeElement !== input) return false;
      input.value = ''; input.blur(); session.libraryScroll = 0; needsRestore = false; limit = PAGE_SIZE; run();
      return true;
    },
    restore(query): void {
      if (input.value === query) return;
      input.value = query; needsRestore = false; limit = PAGE_SIZE; run();
    },
    dispose(): void {
    destroyed = true; session.libraryQuery = input.value; resetQueue(); client.cancel(); stopKeyboard(); clearTimeout(pointerFallback);
    window.removeEventListener('resize', resize); document.fonts?.removeEventListener('loadingdone', resize);
    document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp);
    document.removeEventListener('click', releasePointer, true);
    if (measureFrame) cancelAnimationFrame(measureFrame);
    },
  };
}
