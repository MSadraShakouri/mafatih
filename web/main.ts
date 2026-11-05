import './style.css';
import { DataClient } from './data.js';
import { scrollToReadingAnchor } from './reader-anchor.js';
import { renderItem, renderLibrary, renderMessage } from './render.js';
import { parseRoute } from './routes.js';
import { SearchClient } from './search-client.js';
import { attachSearch } from './search-panel.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing app root');
const app: HTMLElement = root;

// In both /mafatih/ on Pages and Capacitor's local origin, './' resolves to
// the directory containing index.html, even when a hash route is open.
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const data = new DataClient(base);
const search = new SearchClient(base);
let renderId = 0;
let disposeSearch: (() => void) | undefined;

async function renderRoute(): Promise<void> {
  const id = ++renderId;
  disposeSearch?.();
  disposeSearch = undefined;
  const route = parseRoute(window.location.hash);
  if (route.kind === 'not-found') {
    app.replaceChildren(renderMessage('این صفحه پیدا نشد.', true));
    return;
  }
  app.replaceChildren(renderMessage('در حال بارگذاری…'));
  try {
    const [catalog, item] = await Promise.all([
      data.catalog(),
      route.kind === 'item' ? data.item(route.id) : Promise.resolve(undefined),
    ]);
    if (id !== renderId) return;
    const content = item ? renderItem(item) : renderLibrary(catalog);
    app.replaceChildren(content);
    disposeSearch = attachSearch(content, catalog, search, item?.id);
    if (route.kind === 'item' && route.anchor) {
      requestAnimationFrame(() => {
        if (id === renderId) scrollToReadingAnchor(content, route.anchor!);
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  } catch (error: unknown) {
    console.error('Unable to load the requested data', error);
    if (id === renderId) app.replaceChildren(renderMessage('داده بارگذاری نشد.', true));
  }
}

window.addEventListener('hashchange', () => { void renderRoute(); });
void renderRoute();
