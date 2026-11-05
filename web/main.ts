import './style.css';
import { DataClient } from './data.js';
import { renderItem, renderLibrary, renderMessage } from './render.js';
import { parseRoute } from './routes.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing app root');
const app: HTMLElement = root;

// In both /mafatih/ on Pages and Capacitor's local origin, './' resolves to
// the directory containing index.html, even when a hash route is open.
const data = new DataClient(new URL(import.meta.env.BASE_URL, document.baseURI));
let renderId = 0;

async function renderRoute(): Promise<void> {
  const id = ++renderId;
  const route = parseRoute(window.location.hash);
  if (route.kind === 'not-found') {
    app.replaceChildren(renderMessage('این صفحه پیدا نشد.', true));
    return;
  }
  app.replaceChildren(renderMessage('در حال بارگذاری…'));
  try {
    const content = route.kind === 'library'
      ? renderLibrary(await data.catalog())
      : renderItem(await data.item(route.id));
    // A slow response from a previous route must not replace the current one.
    if (id === renderId) app.replaceChildren(content);
  } catch (error: unknown) {
    console.error('Unable to load the requested data', error);
    if (id === renderId) app.replaceChildren(renderMessage('داده بارگذاری نشد.', true));
  }
}

window.addEventListener('hashchange', () => { void renderRoute(); });
void renderRoute();
