import type { SearchHit, SearchLanguage, SearchSnapshot } from '../src/search.js';
import { normalizeSearch } from '../src/normalize.js';
import { findOriginalWordMatches, utf16ToCodePointOffset, wholeWordRanges, type TextRange } from '../src/search-text.js';
import type { Catalog, Title } from './data.js';
import { scrollToReadingAnchor } from './reader-anchor.js';
import { titleText } from './render.js';
import { itemHref, type ReadingAnchor } from './routes.js';
import { SearchClient } from './search-client.js';

const persianDigits = (number: number): string => String(number).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!);

function span(className: string, value: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = value;
  return element;
}

function markText(parent: HTMLElement, value: string, ranges: TextRange[], start = 0, end = value.length): void {
  let cursor = start;
  for (const range of ranges) {
    const left = Math.max(start, range.start);
    const right = Math.min(end, range.end);
    if (right <= left) continue;
    if (left > cursor) parent.append(document.createTextNode(value.slice(cursor, left)));
    const mark = document.createElement('mark');
    mark.textContent = value.slice(left, right);
    parent.append(mark);
    cursor = right;
  }
  if (cursor < end) parent.append(document.createTextNode(value.slice(cursor, end)));
}

function snippetBounds(value: string, focus: TextRange | undefined): { start: number; end: number } {
  const points = Array.from(value);
  const first = focus ? utf16ToCodePointOffset(value, focus.start) : 0;
  const last = focus ? utf16ToCodePointOffset(value, focus.end) : 0;
  let start = Math.max(0, first - 55);
  let end = Math.min(points.length, Math.max(last, first + 1) + 125);
  const insideWord = (character: string | undefined): boolean => Boolean(character && /[\p{L}\p{M}\p{N}\u200c\u200d\u0640]/u.test(character));
  while (start > 0 && insideWord(points[start])) start -= 1;
  while (end < points.length && insideWord(points[end])) end += 1;
  return { start: points.slice(0, start).join('').length, end: points.slice(0, end).join('').length };
}

/** Show separate short contexts when matched terms are far apart in one row. */
function markExcerpt(parent: HTMLElement, value: string, ranges: TextRange[], focuses: TextRange[]): void {
  // Bound DOM size even for a long pasted query. The matched-terms label still
  // exposes all terms if more than eight separate contexts are necessary.
  const selected = focuses.length ? focuses.slice(0, 8) : [undefined];
  const windows = selected.map(focus => snippetBounds(value, focus)).sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];
  for (const window of windows) {
    const previous = merged.at(-1);
    if (previous && window.start <= previous.end) previous.end = Math.max(previous.end, window.end);
    else merged.push({ ...window });
  }
  merged.forEach((window, index) => {
    if (index > 0) parent.append(document.createTextNode(' … '));
    else if (window.start > 0) parent.append(document.createTextNode('…'));
    markText(parent, value, ranges, window.start, window.end);
    if (index === merged.length - 1 && window.end < value.length) parent.append(document.createTextNode('…'));
  });
}

function itemName(names: Map<string, Title>, item: string): string {
  return titleText(names.get(item) ?? { fa: '', ar: '', en: '' }, item).text;
}

function star(): HTMLElement {
  const element = span('featured-mark', ' ★');
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'برگزیده');
  return element;
}

/**
 * Adds the same accessible, deliberately unstyled search to the library and
 * the reader. The final header layout remains a separate design decision.
 */
export function attachSearch(main: HTMLElement, catalog: Catalog, client: SearchClient, item?: string): () => void {
  const tools = main.querySelector<HTMLElement>('[data-search-toolbar]');
  if (!tools) return () => {};
  const contents = main.querySelector<HTMLElement>('[data-contents]');
  const names = new Map(catalog.items.map(entry => [entry.id, entry.title]));
  const open = document.createElement('button');
  open.type = 'button';
  open.textContent = 'جست‌وجو';
  open.setAttribute('aria-expanded', 'false');
  open.setAttribute('aria-controls', 'search-panel');
  tools.append(open);

  const panel = document.createElement('section');
  panel.id = 'search-panel';
  panel.className = 'search-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', item ? 'جست‌وجو در این مطلب' : 'جست‌وجو در مفاتیح');
  tools.after(panel);

  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  const label = document.createElement('label');
  label.htmlFor = 'search-query';
  label.textContent = item ? 'جست‌وجو در این مطلب' : 'جست‌وجو در فهرست و متن';
  const input = document.createElement('input');
  input.id = 'search-query';
  input.type = 'search';
  input.autocomplete = 'off';
  input.dir = 'auto';
  input.maxLength = 300;
  form.append(label, input);
  const hint = document.createElement('p');
  hint.className = 'search-hint';
  hint.textContent = 'هر واژه جداگانه جست‌وجو می‌شود؛ وجود یک واژه برای نمایش نتیجه کافی است. واژه‌های نزدیک و به‌ترتیب رتبهٔ بهتری دارند. نیم‌فاصله بخشی از یک واژه است.';
  form.append(hint);

  const filters = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'زبان متن';
  filters.append(legend);
  const toggles = new Map<SearchLanguage, HTMLInputElement>();
  for (const [language, name] of [['ar', 'عربی'], ['fa', 'فارسی']] as const) {
    const filterLabel = document.createElement('label');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.value = language;
    toggle.checked = true;
    toggle.addEventListener('change', () => run(true));
    filterLabel.append(toggle, document.createTextNode(` ${name}`));
    filters.append(filterLabel);
    toggles.set(language, toggle);
  }
  form.append(filters);
  const status = document.createElement('p');
  status.className = 'search-status';
  status.setAttribute('role', 'status');
  const results = document.createElement('div');
  results.dataset.searchResults = '';
  results.hidden = true;
  panel.append(form, status, results);

  let resultLimit = 30;
  let latest: SearchSnapshot | undefined;
  let pendingTimer: number | undefined;
  let pointerDown = false;
  let destroyed = false;
  let lastAnnouncement = '';
  let lastBaseKey: string | undefined;
  let lastRequestKey: string | undefined;
  let requestedFocus: number | undefined;
  const rangeCache = new Map<string, { matches: TextRange[]; words: TextRange[]; focuses: TextRange[] }>();

  function rangesFor(keyPart: string, text: string, matchedWords: string[]): { matches: TextRange[]; words: TextRange[]; focuses: TextRange[] } {
    const key = `${keyPart}\u0000${matchedWords.join('\u0000')}`;
    const cached = rangeCache.get(key);
    if (cached) return cached;
    const byWord = findOriginalWordMatches(text, matchedWords);
    const matches = byWord.map(({ start, end }) => ({ start, end }));
    const seen = new Set<string>();
    const focuses = byWord.filter(match => {
      if (seen.has(match.word)) return false;
      seen.add(match.word);
      return true;
    }).map(({ start, end }) => ({ start, end }));
    const value = { matches, words: wholeWordRanges(text, matches), focuses };
    rangeCache.set(key, value);
    if (rangeCache.size > 300) rangeCache.delete(rangeCache.keys().next().value!);
    return value;
  }

  function announce(value: string): void {
    if (lastAnnouncement !== value) { lastAnnouncement = value; status.textContent = value; }
  }

  function close(): void {
    panel.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    if (contents) contents.hidden = false;
    client.cancel();
    window.clearTimeout(pendingTimer);
    pendingTimer = undefined;
    latest = undefined;
    lastBaseKey = undefined;
    lastRequestKey = undefined;
    delete results.dataset.searchPrevious;
    results.removeAttribute('aria-busy');
    requestedFocus = undefined;
  }

  function jumpToToc(path: string): void {
    if (!contents || !/^\d+(?:\.\d+)*$/.test(path)) return;
    close();
    const entry = [...contents.querySelectorAll<HTMLElement>('[data-toc-path]')]
      .find(element => element.dataset.tocPath === path);
    const target = entry?.firstElementChild as HTMLElement | null | undefined;
    target?.scrollIntoView({ block: 'start', behavior: 'auto' });
    target?.focus({ preventScroll: true });
  }

  function renderHit(hit: SearchHit): HTMLLIElement {
    const { record } = hit;
    const row = document.createElement('li');
    row.dataset.resultKey = record.key;
    row.dataset.searchKind = record.section;
    if (record.item) row.dataset.itemId = record.item;
    const { matches, words: ranges, focuses } = rangesFor(record.key, record.text, hit.matchedWords);
    let control: HTMLAnchorElement | HTMLButtonElement;
    if (record.item) {
      const link = document.createElement('a');
      if (record.section === 'text' && record.row && (record.language === 'ar' || record.language === 'fa')) {
        const first = matches[0];
        const anchor: ReadingAnchor = { row: record.row, language: record.language,
          offset: first ? utf16ToCodePointOffset(record.text, first.start) : 0 };
        link.href = itemHref(record.item, anchor);
        link.addEventListener('click', event => {
          if (window.location.hash === link.hash && main.dataset.itemId === record.item) {
            event.preventDefault();
            close();
            scrollToReadingAnchor(main, anchor);
          }
        });
        row.dataset.rowId = record.row;
        row.dataset.language = record.language;
      } else {
        link.href = itemHref(record.item);
        link.addEventListener('click', event => {
          if (window.location.hash === link.hash && main.dataset.itemId === record.item) {
            event.preventDefault();
            close();
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        });
      }
      control = link;
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.addEventListener('click', () => { if (record.tocPath) jumpToToc(record.tocPath); });
      control = button;
    }
    control.className = 'search-hit';

    if (record.section === 'toc') {
      const title = span('search-hit-title', '');
      title.dir = 'auto';
      markText(title, record.text, ranges);
      control.append(title);
      if (record.featured) control.append(star());
      control.append(span('search-kind', 'فهرست'));
      if (record.context) {
        const context = span('search-context', record.context);
        context.dir = 'auto';
        control.append(context);
      }
    } else if (record.item) {
      const title = span('search-hit-title', itemName(names, record.item));
      title.dir = 'auto';
      control.append(title);
      if (record.featured) control.append(star());
      control.append(span('search-kind', record.language === 'ar' ? 'متن عربی' : 'متن فارسی'));
      const excerpt = document.createElement('span');
      excerpt.className = 'search-excerpt';
      excerpt.lang = record.language;
      excerpt.dir = 'rtl';
      markExcerpt(excerpt, record.text, ranges, focuses);
      control.append(excerpt);
      if (hit.continuation?.length) {
        control.append(span('search-continuation-label', 'ادامه در سطرهای بعدی:'));
        for (const part of hit.continuation.slice(0, 8)) {
          const next = document.createElement('span');
          next.className = 'search-excerpt search-continuation';
          next.lang = record.language;
          next.dir = 'rtl';
          next.dataset.continuationRow = part.row;
          const detail = rangesFor(`${record.key}:${part.row}`, part.text, part.matchedWords);
          markExcerpt(next, part.text, detail.words, detail.focuses);
          control.append(next);
        }
        if (hit.continuation.length > 8) control.append(span('search-continuation-label', '… ادامه در متن'));
      }
    }
    const foundWords = [...new Set([...hit.matchedWords, ...(hit.continuation ?? []).flatMap(part => part.matchedWords)])];
    control.append(span('search-match-count', `${persianDigits(foundWords.length)} واژه`));
    if (foundWords.length > 1) {
      const terms = span('search-matched-terms', `واژه‌های یافته‌شده: ${foundWords.join('، ')}`);
      terms.dir = 'auto';
      control.append(terms);
    }
    row.append(control);
    return row;
  }

  function section(snapshot: SearchSnapshot): HTMLElement {
    const section = document.createElement('section');
    section.dataset.searchSection = 'results';
    const heading = document.createElement('h2');
    heading.textContent = `نتایج (${persianDigits(snapshot.resultsTotal)})`;
    section.append(heading);
    const counts = document.createElement('p');
    counts.className = 'search-counts';
    counts.textContent = `فهرست: ${persianDigits(snapshot.tocTotal)}، متن: ${persianDigits(snapshot.textTotal)}`;
    section.append(counts);
    if (!snapshot.results.length) {
      const empty = document.createElement('p');
      empty.textContent = 'هنوز نتیجه‌ای نیست.';
      section.append(empty);
    } else {
      const list = document.createElement('ol');
      for (const hit of snapshot.results) list.append(renderHit(hit));
      section.append(list);
    }
    if (snapshot.resultsTotal > resultLimit) {
      const more = document.createElement('button');
      more.type = 'button';
      more.dataset.searchMore = '';
      more.textContent = 'نمایش بیشتر';
      more.addEventListener('click', () => {
        requestedFocus = snapshot.results.length;
        resultLimit += 30;
        run(false);
      });
      section.append(more);
    }
    return section;
  }

  function flush(): void {
    pendingTimer = undefined;
    if (!latest || destroyed || panel.hidden || pointerDown || (results.contains(document.activeElement) && requestedFocus === undefined)) return;
    const snapshot = latest;
    latest = undefined;
    delete results.dataset.searchPrevious;
    results.setAttribute('aria-busy', snapshot.complete ? 'false' : 'true');
    // Keep the first visible result in place as incremental results are sorted.
    const visible = window.scrollY > 0 ? [...results.querySelectorAll<HTMLElement>('[data-result-key]')]
      .find(element => element.getBoundingClientRect().bottom > 0 && element.getBoundingClientRect().top < window.innerHeight) : undefined;
    const key = visible?.dataset.resultKey;
    const before = visible?.getBoundingClientRect().top;
    results.replaceChildren(section(snapshot));
    if (key && before !== undefined) {
      const after = [...results.querySelectorAll<HTMLElement>('[data-result-key]')].find(element => element.dataset.resultKey === key);
      if (after) window.scrollBy(0, after.getBoundingClientRect().top - before);
    }
    if (requestedFocus !== undefined) {
      const choices = results.querySelectorAll<HTMLElement>('[data-search-section="results"] li > a, [data-search-section="results"] li > button');
      choices[requestedFocus]?.focus();
      requestedFocus = undefined;
    }
    announce(snapshot.complete ? `${persianDigits(snapshot.resultsTotal)} نتیجه` : 'در حال جست‌وجو…');
  }

  function queue(snapshot: SearchSnapshot): void {
    // Do not replace useful previous hits with an empty provisional snapshot.
    // A completed zero-result search must still replace them.
    if (results.dataset.searchPrevious === 'true' && !snapshot.complete && !snapshot.results.length) return;
    latest = snapshot;
    if (pendingTimer === undefined) pendingTimer = window.setTimeout(flush, 80);
  }

  function run(reset: boolean): void {
    if (destroyed || panel.hidden) return;
    const query = input.value;
    const languages = [...toggles].filter(([, toggle]) => toggle.checked).map(([language]) => language);
    if (!query.trim()) {
      window.clearTimeout(pendingTimer);
      pendingTimer = undefined;
      latest = undefined;
      lastBaseKey = undefined;
      lastRequestKey = undefined;
      client.cancel();
      if (contents) contents.hidden = false;
      results.hidden = true;
      results.replaceChildren();
      delete results.dataset.searchPrevious;
      results.removeAttribute('aria-busy');
      announce('');
      return;
    }
    const baseKey = JSON.stringify([normalizeSearch(query), languages, item ?? null]);
    // A trailing/repeated space or a removed mark may change the input without
    // changing any search term. Preserve the ongoing work and displayed page.
    if (reset && baseKey === lastBaseKey) return;
    if (reset) { resultLimit = 30; requestedFocus = undefined; }
    const requestKey = JSON.stringify([baseKey, resultLimit]);
    if (!reset && requestKey === lastRequestKey) return;
    window.clearTimeout(pendingTimer);
    pendingTimer = undefined;
    latest = undefined;
    const previousHits = Boolean(results.querySelector('[data-result-key]'));
    if (previousHits && (baseKey !== lastBaseKey || results.dataset.searchPrevious === 'true')) {
      results.dataset.searchPrevious = 'true';
      // "Show more" belongs to the old query; do not apply it to the new one.
      const more = results.querySelector<HTMLButtonElement>('[data-search-more]');
      if (more) more.disabled = true;
    } else delete results.dataset.searchPrevious;
    lastBaseKey = baseKey;
    lastRequestKey = requestKey;
    results.querySelector('[data-search-retry]')?.remove();
    if (contents) contents.hidden = true;
    results.hidden = false;
    results.setAttribute('aria-busy', 'true');
    announce(results.dataset.searchPrevious === 'true'
      ? 'در حال جست‌وجو… نتایج پیشین نمایش داده می‌شوند.' : 'در حال جست‌وجو…');
    client.search({ query, languages, ...(item ? { item } : {}), resultLimit, tocLimit: 0, textLimit: 0 }, queue, () => {
      // Discard snapshots already queued by the failed worker; keep any shown
      // hits visible and make retry explicit instead of flashing an empty page.
      window.clearTimeout(pendingTimer);
      pendingTimer = undefined;
      latest = undefined;
      lastBaseKey = undefined;
      lastRequestKey = undefined;
      requestedFocus = undefined;
      results.setAttribute('aria-busy', 'false');
      announce('بارگذاری جست‌وجو ناموفق بود. دوباره تلاش کنید.');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.dataset.searchRetry = '';
      retry.textContent = 'تلاش دوباره';
      retry.addEventListener('click', () => {
        input.focus();
        run(true);
      });
      if (results.querySelector('[data-result-key]')) results.append(retry);
      else results.replaceChildren(retry);
    });
  }

  open.addEventListener('click', () => {
    if (!panel.hidden) { close(); open.focus(); return; }
    panel.hidden = false;
    open.setAttribute('aria-expanded', 'true');
    input.focus();
    if (input.value.trim()) run(false);
  });
  input.addEventListener('input', () => run(true));
  form.addEventListener('submit', event => event.preventDefault());
  results.addEventListener('pointerdown', () => { pointerDown = true; });
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);
  results.addEventListener('focusout', deferFlush);
  function releasePointer(): void { pointerDown = false; deferFlush(); }
  function deferFlush(): void {
    if (latest && pendingTimer === undefined) pendingTimer = window.setTimeout(flush, 100);
  }

  return () => {
    destroyed = true;
    client.cancel();
    window.clearTimeout(pendingTimer);
    window.removeEventListener('pointerup', releasePointer);
    window.removeEventListener('pointercancel', releasePointer);
  };
}
