import { appendDisplayText, displayDigits } from './display-text.js';
import type { Catalog, ReaderItem, Title } from './data.js';
import { ICONS, type IconName } from './icons.js';
import { itemHref, settingsHref, topicHref, type Route } from './routes.js';
import { readerBlocks, readerTextRole } from './reader-blocks.js';
import { TOPICS, topicNodeTitle, topicNodes } from './topic-navigation.js';

export function titleText(title: Title, fallback: string): { text: string; lang: string; dir: 'rtl' | 'ltr' } {
  if (title.fa) return { text: displayDigits(title.fa, 'fa'), lang: 'fa', dir: 'rtl' };
  if (title.ar) return { text: displayDigits(title.ar, 'ar'), lang: 'ar', dir: 'rtl' };
  if (title.en) return { text: title.en, lang: 'en', dir: 'ltr' };
  return { text: fallback, lang: 'en', dir: 'ltr' };
}

export interface RenderActions {
  back(fallback: string): void;
  openSettings(itemId: string): void;
  toggleReaderSearch(itemId: string): void;
  toggleAutoScroll(itemId: string): void;
  isBookmarked(itemId: string): boolean;
  toggleBookmark(itemId: string): { selected: boolean; persisted: boolean };
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function icon(name: IconName): HTMLSpanElement {
  const symbol = element('span', 'symbol');
  symbol.innerHTML = ICONS[name];
  return symbol;
}

function iconButton(name: IconName, label: string, action: () => void): HTMLButtonElement {
  const button = element('button', 'icon-button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(icon(name));
  button.addEventListener('click', action);
  return button;
}

/** Library header reserves 44px on both sides, even before Back is shown. */
export function makeHeader(title: string, mode: 'library' | 'reader' | 'settings', actions: RenderActions,
  options: { backFallback?: string; itemId?: string } = {}): HTMLElement {
  const header = element('header', `app-header ${mode}-header`);
  const inner = element('div', 'header-inner');
  const right = element('div', 'header-side start');
  const left = element('div', 'header-side end');
  const status = element('div', 'inline-message');
  status.hidden = true;
  status.setAttribute('role', 'status');
  if (mode === 'reader' && options.itemId) {
    const id = options.itemId;
    let noticeTimer = 0;
    const bookmark = iconButton('bookmark', 'نشان شخصی', () => {
      const result = actions.toggleBookmark(id);
      bookmark.setAttribute('aria-pressed', String(result.selected));
      window.clearTimeout(noticeTimer);
      if (!result.persisted) {
        status.textContent = 'ذخیرهٔ دائمی در دسترس نیست؛ تغییر نشان فقط در این نشست نگه داشته می‌شود.';
        status.hidden = false;
        noticeTimer = window.setTimeout(() => { status.hidden = true; }, 4000);
      } else status.hidden = true;
    });
    bookmark.dataset.bookmark = '';
    bookmark.setAttribute('aria-pressed', String(actions.isBookmarked(id)));
    right.append(bookmark);
    const play = iconButton('scroll', 'شروع پیمایش خودکار', () => actions.toggleAutoScroll(options.itemId!));
    play.id = 'play'; play.setAttribute('aria-pressed', 'false'); left.append(play);
    const search = iconButton('search', 'جست‌وجو در متن', () => actions.toggleReaderSearch(options.itemId!));
    search.dataset.readerSearch = '';
    left.append(search);
    left.append(iconButton('settings', 'تنظیمات متن', () => actions.openSettings(options.itemId!)));
  } else if (options.backFallback) {
    right.append(iconButton('back', mode === 'settings' ? 'بازگشت به دعا' : 'بازگشت به فهرست',
      () => actions.back(options.backFallback!)));
  }
  const titleBox = element('div', 'header-title');
  const heading = element('h1', '', displayDigits(title, 'ui'));
  heading.title = displayDigits(title, 'ui');
  titleBox.append(heading);
  inner.append(right, titleBox, left);
  header.append(inner, status);
  return header;
}

function menuLink(title: string, href: string, id: string, bookmark = false): HTMLAnchorElement {
  const link = element('a', 'library-item');
  link.href = href;
  link.dataset.menuId = id;
  if (bookmark) {
    link.classList.add('bookmark-entry');
    link.append(icon('bookmark'));
  }
  link.append(element('span', 'library-name', displayDigits(title, 'ui')));
  const arrow = icon('next'); arrow.classList.add('item-arrow'); link.append(arrow);
  return link;
}

export function renderLibrary(catalog: Catalog, route: Extract<Route, { kind: 'contents' | 'bookmarks' }>,
  actions: RenderActions, bookmarkIds: readonly string[] = []): HTMLElement {
  const main = element('main');
  main.dataset.screen = 'library';
  let title = 'مفاتیح الجنان';
  let backFallback: string | undefined;
  if (route.kind === 'bookmarks') { title = 'نشان‌های من'; backFallback = '#/'; }
  if (route.kind === 'contents') {
    backFallback = route.topic ? '#/contents' : '#/';
    title = route.topic ? TOPICS.find(topic => topic.id === route.topic)!.label : 'فهرست مفاتیح';
    if (route.topic && route.sourcePath) {
      title = topicNodeTitle(catalog, route.topic, route.sourcePath) ?? 'فهرست مفاتیح';
      backFallback = topicHref(route.topic);
    }
  }
  main.append(makeHeader(title, 'library', actions, { backFallback }));
  const content = element('div', `content library ${route.kind === 'contents' ? 'toc-screen' : 'bookmarks-screen'}`);
  const list = element('nav', 'library-list');
  list.setAttribute('aria-label', 'فهرست');
  list.dataset.contents = '';
  if (route.kind === 'bookmarks') {
    if (!bookmarkIds.length) content.append(element('p', 'library-empty', 'هنوز نشانی ذخیره نکرده‌اید.'));
    for (const id of bookmarkIds) {
      const item = catalog.items.find(entry => entry.id === id);
      const title = item ? titleText(item.title, id) : { text: id, lang: 'en', dir: 'ltr' as const };
      const link = menuLink(title.text, itemHref(id), id, true);
      link.dataset.itemId = id;
      const name = link.querySelector<HTMLElement>('.library-name')!;
      name.lang = title.lang; name.dir = title.dir;
      list.append(link);
    }
  } else if (route.kind === 'contents' && !route.topic) {
    for (const topic of TOPICS) list.append(menuLink(topic.label, topicHref(topic.id), `__topic_${topic.id}__`));
  } else if (route.kind === 'contents' && route.topic) {
    const nodes = topicNodes(catalog, route.topic, route.sourcePath);
    if (!nodes) content.append(element('p', 'library-empty', 'این بخش پیدا نشد.'));
    else if (!nodes.length) content.append(element('p', 'library-empty', 'موردی در این بخش نیست.'));
    else for (const node of nodes) {
      const href = node.children.length && node.sourcePath ? topicHref(route.topic, node.sourcePath)
        : node.item ? itemHref(node.item) : undefined;
      if (!href) continue;
      const link = menuLink(node.title, href, node.sourcePath ?? node.item ?? '');
      if (node.sourcePath) link.dataset.tocPath = node.sourcePath;
      if (node.item && !node.children.length) link.dataset.itemId = node.item;
      list.append(link);
    }
  }
  content.append(list); main.append(content); return main;
}

export function renderItem(item: ReaderItem, actions: RenderActions): HTMLElement {
  const main = element('main');
  main.dataset.screen = 'reader';
  main.dataset.itemId = item.id;
  const title = titleText(item.title, item.id);
  const header = makeHeader(title.text, 'reader', actions, { itemId: item.id });
  const heading = header.querySelector('h1');
  if (heading) { heading.lang = title.lang; heading.dir = title.dir; }
  main.append(header);
  const content = element('div', 'content');
  const article = element('article', 'reader');
  article.setAttribute('aria-label', title.text);
  for (const display of readerBlocks(item.rows)) {
    const { row } = display;
    const block = element(display.kind === 'instruction' ? 'aside' : 'section', 'reader-row');
    block.dataset.rowId = row.id;
    if (row.kind) block.dataset.kind = row.kind;
    if (display.kind === 'instruction' || row.kind === 'note') {
      block.append(element('span', 'reader-kind-label', display.kind === 'instruction' ? 'راهنما' : 'توضیح'));
      if (display.kind === 'instruction') block.setAttribute('aria-label', 'راهنما');
    }
    for (const [language, value] of [['ar', row.ar], ['fa', row.fa]] as const) {
      if (!value) continue;
      const paragraph = element('p', language);
      appendDisplayText(paragraph, value, language);
      paragraph.lang = language; paragraph.dir = 'rtl';
      paragraph.dataset.textRole = readerTextRole(row, language);
      // Marker spans and Persian digits are display only; source wording and offsets remain intact.
      block.append(paragraph);
    }
    article.append(block);
  }
  content.append(article); main.append(content); return main;
}

export function renderMessage(message: string, linkBack = false): HTMLElement {
  const main = element('main', 'content');
  const text = element('p', '', message); text.setAttribute('role', 'status'); main.append(text);
  if (linkBack) { const back = element('a', '', 'بازگشت به فهرست'); back.href = '#/'; main.append(back); }
  return main;
}
