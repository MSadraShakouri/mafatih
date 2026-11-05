import type { Catalog, ReaderItem, Title, TocNode } from './data.js';
import { itemHref } from './routes.js';

function titleText(title: Title, fallback: string): { text: string; lang: string; dir: 'rtl' | 'ltr' } {
  if (title.fa) return { text: title.fa, lang: 'fa', dir: 'rtl' };
  if (title.ar) return { text: title.ar, lang: 'ar', dir: 'rtl' };
  if (title.en) return { text: title.en, lang: 'en', dir: 'ltr' };
  return { text: fallback, lang: 'en', dir: 'ltr' };
}

function tocList(nodes: TocNode[], names: Map<string, Title>): HTMLUListElement {
  const list = document.createElement('ul');
  for (const node of nodes) {
    const entry = document.createElement('li');
    if (node.item) {
      const link = document.createElement('a');
      link.href = itemHref(node.item);
      link.dataset.itemId = node.item;
      // The source TOC title takes precedence; a catalog title is only a
      // display fallback, not a new or corrected canonical title.
      link.textContent = node.title || titleText(names.get(node.item) ?? { fa: '', ar: '', en: '' }, node.item).text;
      link.dir = 'auto';
      entry.append(link);
    } else {
      const heading = document.createElement('span');
      heading.textContent = node.title;
      heading.dir = 'auto';
      entry.append(heading);
    }
    if (node.children.length) entry.append(tocList(node.children, names));
    list.append(entry);
  }
  return list;
}

export function renderLibrary(catalog: Catalog): HTMLElement {
  const main = document.createElement('main');
  main.dataset.screen = 'library';
  const heading = document.createElement('h1');
  heading.textContent = 'فهرست مفاتیح';
  main.append(heading, tocList(catalog.toc, new Map(catalog.items.map((item) => [item.id, item.title]))));
  return main;
}

export function renderItem(item: ReaderItem): HTMLElement {
  const main = document.createElement('main');
  main.dataset.screen = 'reader';
  main.dataset.itemId = item.id;

  const back = document.createElement('a');
  back.href = '#/';
  back.textContent = 'بازگشت به فهرست';
  main.append(back);

  const heading = document.createElement('h1');
  const title = titleText(item.title, item.id);
  heading.textContent = title.text;
  heading.lang = title.lang;
  heading.dir = title.dir;
  main.append(heading);

  const article = document.createElement('article');
  for (const row of item.rows) {
    // Only an explicit instruction kind changes the semantic element. Empty
    // Arabic alone is not a classification, and unknown rows are retained.
    const block = document.createElement(row.kind === 'instruction' ? 'aside' : 'section');
    block.className = 'reader-row';
    block.dataset.rowId = row.id;
    if (row.kind) block.dataset.kind = row.kind;
    if (row.kind === 'instruction') block.setAttribute('aria-label', 'دستور');
    for (const [language, value] of [['ar', row.ar], ['fa', row.fa]] as const) {
      if (!value) continue;
      const paragraph = document.createElement('p');
      paragraph.lang = language;
      paragraph.dir = 'rtl';
      paragraph.className = language;
      // Source text is text, not markup. Preserve repeats and source breaks.
      paragraph.textContent = value;
      block.append(paragraph);
    }
    article.append(block);
  }
  main.append(article);
  return main;
}

export function renderMessage(message: string, linkBack = false): HTMLElement {
  const main = document.createElement('main');
  const text = document.createElement('p');
  text.setAttribute('role', 'status');
  text.textContent = message;
  main.append(text);
  if (linkBack) {
    const back = document.createElement('a');
    back.href = '#/';
    back.textContent = 'بازگشت به فهرست';
    main.append(back);
  }
  return main;
}
