import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { DataClient } from './data.js';
import { attachLegalNotices } from './legal-notices.js';
import { attachGlobalSearch, type GlobalSearch } from './global-search.js';
import { attachInTextSearch, type InTextSearch } from './intext-search.js';
import { SearchClient } from './search-client.js';
import { createSearchSession } from './search-common.js';
import { nativeBackAction } from './native-back.js';
import { scrollToReadingAnchor } from './reader-anchor.js';
import { captureVisibleReaderPosition, keepReaderPositionOnResize, restoreVisibleReaderPosition, type VisibleReaderPosition } from './reader-position.js';
import { createReaderPreferencesStore } from './reader-preferences.js';
import { applyReaderPreferences, prepareReaderFont, renderReaderSettings } from './reader-settings.js';
import { renderItem, renderLibrary, renderMessage, type RenderActions } from './render.js';
import { itemHref, parseRoute, settingsHref, type Route } from './routes.js';
import { createThemeStore } from './theme.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing app root');
const app: HTMLElement = root;
// The HTML contains the real home shell before any JavaScript runs. Preserve
// its node on first boot, then clone the same source for later home visits.
const initialHome = app.querySelector<HTMLElement>('main[data-screen="library"]');
if (!initialHome) throw new Error('Missing prebuilt home shell');
const prebuiltHome: HTMLElement = initialHome;
const homeTemplate = prebuiltHome.cloneNode(true) as HTMLElement;
const homeTemplateInput = homeTemplate.querySelector<HTMLInputElement>('input');
if (homeTemplateInput) homeTemplateInput.value = '';
// Relative base works at a Pages subdirectory and in Capacitor's local origin.
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const data = new DataClient(base);
const searchClient = new SearchClient(base);
const searchSession = createSearchSession();
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* in-memory fallback */ }
const preferences = createReaderPreferencesStore(storage);
const theme = createThemeStore(storage);
attachLegalNotices();

let renderId = 0;
let reader: HTMLElement | undefined;
let disposeReader: (() => void) | undefined;
let globalSearch: GlobalSearch | undefined;
let inTextSearch: InTextSearch | undefined;
let saved: { id: string; position: VisibleReaderPosition | undefined; scroll: number } | undefined;
let lastRequested: Route | undefined;
let lastKey = '';
let lastRouteHash = '';
let lastState: NavigationState | undefined;
let serial = 0;
const HISTORY_KEY = '__mafatihNavigation';
const native = Capacitor.isNativePlatform();
type NavigationState = { id: number; parent?: string; backGuard?: boolean; readerSearch?: boolean;
  globalSearch?: boolean; globalQuery?: string };

function navigationState(parent?: string): Record<string, unknown> {
  const old = history.state && typeof history.state === 'object' ? history.state as Record<string, unknown> : {};
  return { ...old, [HISTORY_KEY]: { id: ++serial, ...(parent === undefined ? {} : { parent }) } satisfies NavigationState };
}
function rememberEntry(): void {
  lastState = history.state?.[HISTORY_KEY] as NavigationState | undefined;
  lastKey = `${window.location.hash}|${lastState?.id ?? 'external'}`;
}
/** Like Satr, install a browser Back guard on interaction, before opening find.
 * Android's App plugin handles Back directly and must not create this entry. */
function ensureBrowserGuard(): void {
  if (native) return;
  const state = history.state?.[HISTORY_KEY] as NavigationState | undefined;
  if (state?.backGuard) return;
  try {
    const guard: NavigationState = { id: ++serial, ...(state?.parent ? { parent: state.parent } : {}), backGuard: true };
    history.pushState({ ...(history.state ?? {}), [HISTORY_KEY]: guard }, '', window.location.href);
    rememberEntry();
  } catch { /* Search and normal links remain usable if history is restricted. */ }
}
function updateBrowserGuard(change: (state: NavigationState) => void): void {
  if (native) return;
  const state = history.state?.[HISTORY_KEY] as NavigationState | undefined;
  if (!state?.backGuard) return;
  try {
    const next = { ...state }; change(next);
    history.replaceState({ ...history.state, [HISTORY_KEY]: next }, '', window.location.href);
    rememberEntry();
  } catch { /* The UI still closes if history is restricted. */ }
}
function recordGlobalSearch(query: string, active: boolean): void {
  if (native || lastRequested?.kind !== 'library') return;
  if (active) ensureBrowserGuard();
  updateBrowserGuard(state => {
    if (active) { state.globalSearch = true; state.globalQuery = query; }
    else { delete state.globalSearch; delete state.globalQuery; }
  });
}
function navigate(hash: string): void {
  if (hash === window.location.hash) return;
  if (lastRequested?.kind === 'library' && searchSession.libraryQuery.trim()) searchSession.libraryScroll = window.scrollY;
  const parent = window.location.hash || '#/';
  history.pushState(navigationState(parent), '', hash);
  routeChanged();
}
function back(fallback: string): void {
  const state = history.state?.[HISTORY_KEY] as NavigationState | undefined;
  if (state?.parent) history.back();
  else {
    history.replaceState(navigationState(), '', fallback);
    routeChanged();
  }
}
function closeReaderSearch(): void {
  if (!inTextSearch?.isOpen()) return;
  inTextSearch.close();
  // Closing the bar is a UI action, not a second Back navigation. Keep the
  // guard itself in place so the next Back follows the underlying route.
  updateBrowserGuard(state => { delete state.readerSearch; });
}
function toggleReaderSearch(id: string): void {
  if (!reader || reader.dataset.itemId !== id || !inTextSearch) return;
  if (inTextSearch.isOpen()) { closeReaderSearch(); return; }
  ensureBrowserGuard();
  updateBrowserGuard(state => { state.readerSearch = true; });
  inTextSearch.open(true);
}
const actions: RenderActions = {
  back,
  toggleReaderSearch,
  openSettings: id => {
    if (reader && reader.dataset.itemId === id) {
      saved = { id, position: captureVisibleReaderPosition(reader), scroll: window.scrollY };
    }
    navigate(settingsHref(id));
  },
};

let cancelLoadingNotice: (() => void) | undefined;

/** Keep the current screen interactive while a slower destination prepares. */
function loadingNotice(): () => void {
  let notice: HTMLElement | undefined;
  const timer = window.setTimeout(() => {
    notice = document.createElement('div');
    notice.className = 'navigation-loading';
    notice.setAttribute('role', 'status');
    notice.textContent = 'در حال آماده‌سازی…';
    app.append(notice);
  }, 350);
  return () => { window.clearTimeout(timer); notice?.remove(); };
}
function replaceView(content: HTMLElement): void {
  globalSearch?.dispose(); globalSearch = undefined;
  disposeReader?.(); disposeReader = undefined; reader = undefined; inTextSearch = undefined;
  app.replaceChildren(content);
}

async function renderRoute(route: Route, from: Route | undefined): Promise<void> {
  const id = ++renderId;
  cancelLoadingNotice?.(); cancelLoadingNotice = undefined;
  if (route.kind !== 'contents') data.cancelCatalogWarmup();
  if (route.kind === 'not-found') { replaceView(renderMessage('این صفحه پیدا نشد.', true)); return; }
  // Home, the topic chooser and bookmarks have static chrome and appear
  // immediately. The TOC catalog can begin while the user chooses a topic.
  if (route.kind === 'library' || route.kind === 'bookmarks' || (route.kind === 'contents' && !route.topic)) {
    saved = undefined;
    const content = route.kind === 'library'
      ? (prebuiltHome.parentElement === app ? prebuiltHome : homeTemplate.cloneNode(true) as HTMLElement)
      : renderLibrary({ items: [], toc: [] }, route, actions);
    const sameHome = route.kind === 'library' && content === app.firstElementChild && Boolean(globalSearch);
    if (content !== app.firstElementChild) replaceView(content);
    // A slow route can be cancelled before the home was replaced. Keep its
    // existing scroll/DOM instead of resetting it on that history return.
    if (!sameHome) window.scrollTo({ top: 0, behavior: 'auto' });
    if (route.kind === 'contents') void data.warmCatalog().catch(() => { /* A topic can retry. */ });
    if (route.kind === 'library') {
      if (!globalSearch) globalSearch = attachGlobalSearch(content, () => data.catalog(), searchClient, searchSession,
        navigate, recordGlobalSearch, from !== undefined);
    }
    return;
  }
  const stopLoading = loadingNotice(); cancelLoadingNotice = stopLoading;
  try {
    const needsItem = route.kind === 'item' || route.kind === 'settings';
    const [catalog, item, example, instruction] = await Promise.all([
      route.kind === 'contents' ? data.catalog() : Promise.resolve(undefined),
      needsItem ? data.item(route.id) : Promise.resolve(undefined),
      route.kind === 'settings' ? data.item('dua-kumayl').catch(() => undefined) : Promise.resolve(undefined),
      route.kind === 'settings' ? data.item('amal-aamal-asr-jmah').catch(() => undefined) : Promise.resolve(undefined),
      // Start the selected reader font at the same time as the item, not after it.
      route.kind === 'item' ? prepareReaderFont(preferences.get().font) : Promise.resolve(),
    ]);
    if (id !== renderId) { stopLoading(); return; }
    stopLoading(); cancelLoadingNotice = undefined;
    if (route.kind === 'settings' && item) {
      replaceView(renderReaderSettings(item, example, instruction, preferences, theme, actions));
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else if (route.kind === 'item' && item) {
      const content = renderItem(item, actions);
      applyReaderPreferences(content, preferences.get());
      replaceView(content); reader = content;
      if (saved && saved.id === item.id && from?.kind === 'settings') {
        window.scrollTo({ top: saved.scroll, behavior: 'auto' });
        restoreVisibleReaderPosition(content, saved.position);
        saved = undefined;
      } else if (route.anchor) {
        requestAnimationFrame(() => { if (id === renderId) scrollToReadingAnchor(content, route.anchor!); });
      } else window.scrollTo({ top: 0, behavior: 'auto' });
      const keeper = keepReaderPositionOnResize(content);
      inTextSearch = attachInTextSearch(content, item, searchClient, searchSession, closeReaderSearch);
      const attachedSearch = inTextSearch;
      disposeReader = () => { attachedSearch.dispose(); keeper.dispose(); };
    } else if (route.kind === 'contents' && catalog) {
      saved = undefined;
      replaceView(renderLibrary(catalog, route, actions));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  } catch (error: unknown) {
    console.error('Unable to load the requested data', error);
    stopLoading();
    if (id === renderId) { cancelLoadingNotice = undefined; replaceView(renderMessage('داده بارگذاری نشد.', true)); }
  }
}

function routeChanged(): void {
  // A hash history traversal can emit both popstate and hashchange; avoid
  // rebuilding twice for the same history entry.
  const state = history.state?.[HISTORY_KEY] as NavigationState | undefined;
  const key = `${window.location.hash}|${state?.id ?? 'external'}`;
  if (key === lastKey) return;
  lastKey = key;
  const route = parseRoute(window.location.hash);
  const from = lastRequested, previousHash = lastRouteHash, previousState = lastState;
  lastRequested = route; lastRouteHash = window.location.hash; lastState = state;
  if (previousHash === window.location.hash && previousState?.backGuard && !state?.backGuard) {
    // The guard was popped. Like Satr, close the topmost UI layer first;
    // only step through to the previous route when there was none to close.
    if (inTextSearch?.isOpen()) { inTextSearch.close(); return; }
    if (globalSearch?.close()) return;
    history.back(); return;
  }
  if (previousHash === window.location.hash && state?.backGuard) {
    // Forward can restore a search without remounting the reader.
    if (from?.kind === 'item' && route.kind === 'item' && from.id === route.id &&
        reader?.dataset.itemId === route.id && inTextSearch) {
      if (state.readerSearch) inTextSearch.open(false); else inTextSearch.close();
      return;
    }
    if (from?.kind === 'library' && route.kind === 'library' && globalSearch) {
      if (state.globalSearch) globalSearch.restore(state.globalQuery ?? '');
      return;
    }
  }
  if (route.kind === 'library' && state?.globalSearch) searchSession.libraryQuery = state.globalQuery ?? '';
  void renderRoute(route, from);
}

// Standard links still work as links; use history state for reliable in-app Back.
app.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#/"]');
  const href = link?.getAttribute('href');
  if (!href) return;
  event.preventDefault(); navigate(href);
});

try {
  history.scrollRestoration = 'manual';
  // Opening an item directly should leave a home entry underneath the reader,
  // so browser Back has a useful fallback even without a previous app screen.
  const initial = window.location.hash;
  if (parseRoute(initial).kind === 'item') {
    history.replaceState(navigationState(), '', '#/');
    history.pushState(navigationState('#/'), '', initial);
  }
} catch { /* history may be restricted in unusual embeds */ }
if (!native) {
  // Chrome can skip entries made before interaction. Install the guard from
  // a real tap/key, as Satr does; repeat when a route has no guard yet.
  window.addEventListener('pointerdown', ensureBrowserGuard, { capture: true });
  window.addEventListener('keydown', ensureBrowserGuard, { capture: true });
}
window.addEventListener('popstate', routeChanged);
window.addEventListener('hashchange', routeChanged);
// The native callback closes one app layer. In particular, closing find does
// not also traverse WebView history. Focus alone does not establish IME state.
if (native) {
  let exitArmedAt = 0, exitTimer = 0;
  let exitNotice: HTMLElement | undefined;
  const clearExit = (): void => {
    exitArmedAt = 0; window.clearTimeout(exitTimer); exitNotice?.remove(); exitNotice = undefined;
  };
  const atRoot = (): void => {
    if (exitArmedAt && Date.now() - exitArmedAt < 5000) {
      clearExit(); void CapacitorApp.minimizeApp(); return;
    }
    clearExit(); exitArmedAt = Date.now();
    exitNotice = document.createElement('div'); exitNotice.className = 'navigation-loading';
    exitNotice.setAttribute('role', 'status'); exitNotice.textContent = 'برای خروج دوباره بازگشت را فشار دهید.';
    app.append(exitNotice); exitTimer = window.setTimeout(clearExit, 5000);
  };
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (inTextSearch?.isOpen()) { clearExit(); closeReaderSearch(); return; }
    if (globalSearch?.close()) { clearExit(); return; }
    const parent = (history.state?.[HISTORY_KEY] as NavigationState | undefined)?.parent;
    const action = nativeBackAction(parseRoute(window.location.hash), canGoBack, Boolean(parent));
    if (action.kind === 'minimize') { atRoot(); return; }
    clearExit();
    if (action.kind === 'history') history.back();
    else { history.replaceState(navigationState(), '', action.href); routeChanged(); }
  }).catch(error => console.error('Unable to register Android Back', error));
}
document.addEventListener('selectstart', event => {
  if (!(event.target instanceof Element && event.target.closest('input, textarea'))) event.preventDefault();
});
document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
document.addEventListener('gesturechange', event => event.preventDefault(), { passive: false });
routeChanged();
