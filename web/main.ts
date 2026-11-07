import './style.css';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { DataClient } from './data.js';
import { attachLegalNotices } from './legal-notices.js';
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
// Relative base works at a Pages subdirectory and in Capacitor's local origin.
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const data = new DataClient(base);
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* in-memory fallback */ }
const preferences = createReaderPreferencesStore(storage);
const theme = createThemeStore(storage);
attachLegalNotices();

let renderId = 0;
let reader: HTMLElement | undefined;
let disposeReader: (() => void) | undefined;
let saved: { id: string; position: VisibleReaderPosition | undefined; scroll: number } | undefined;
let lastRequested: Route | undefined;
let lastKey = '';
let serial = 0;
const HISTORY_KEY = '__mafatihNavigation';
type NavigationState = { id: number; parent?: string };

function navigationState(parent?: string): Record<string, unknown> {
  const old = history.state && typeof history.state === 'object' ? history.state as Record<string, unknown> : {};
  return { ...old, [HISTORY_KEY]: { id: ++serial, ...(parent === undefined ? {} : { parent }) } satisfies NavigationState };
}
function navigate(hash: string): void {
  if (hash === window.location.hash) return;
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
const actions: RenderActions = {
  back,
  openSettings: id => {
    if (reader && reader.dataset.itemId === id) {
      saved = { id, position: captureVisibleReaderPosition(reader), scroll: window.scrollY };
    }
    navigate(settingsHref(id));
  },
};

async function renderRoute(route: Route, from: Route | undefined): Promise<void> {
  const id = ++renderId;
  disposeReader?.(); disposeReader = undefined; reader = undefined;
  if (route.kind === 'not-found') { app.replaceChildren(renderMessage('این صفحه پیدا نشد.', true)); return; }
  app.replaceChildren(renderMessage('در حال بارگذاری…'));
  try {
    const needsItem = route.kind === 'item' || route.kind === 'settings';
    const [catalog, item, example, instruction] = await Promise.all([
      data.catalog(),
      needsItem ? data.item(route.id) : Promise.resolve(undefined),
      route.kind === 'settings' ? data.item('dua-kumayl').catch(() => undefined) : Promise.resolve(undefined),
      route.kind === 'settings' ? data.item('amal-aamal-asr-jmah').catch(() => undefined) : Promise.resolve(undefined),
    ]);
    if (item && route.kind === 'item') await prepareReaderFont(preferences.get().font);
    if (id !== renderId) return;
    if (route.kind === 'settings' && item) {
      app.replaceChildren(renderReaderSettings(item, example, instruction, preferences, theme, actions));
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else if (route.kind === 'item' && item) {
      const content = renderItem(item, actions);
      applyReaderPreferences(content, preferences.get());
      app.replaceChildren(content); reader = content;
      if (saved && saved.id === item.id && from?.kind === 'settings') {
        window.scrollTo({ top: saved.scroll, behavior: 'auto' });
        restoreVisibleReaderPosition(content, saved.position);
        saved = undefined;
      } else if (route.anchor) {
        requestAnimationFrame(() => { if (id === renderId) scrollToReadingAnchor(content, route.anchor!); });
      } else window.scrollTo({ top: 0, behavior: 'auto' });
      const keeper = keepReaderPositionOnResize(content);
      disposeReader = () => keeper.dispose();
    } else if (route.kind === 'library' || route.kind === 'contents' || route.kind === 'bookmarks') {
      saved = undefined;
      app.replaceChildren(renderLibrary(catalog, route, actions));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  } catch (error: unknown) {
    console.error('Unable to load the requested data', error);
    if (id === renderId) app.replaceChildren(renderMessage('داده بارگذاری نشد.', true));
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
  const from = lastRequested; lastRequested = route;
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
window.addEventListener('popstate', routeChanged);
window.addEventListener('hashchange', routeChanged);
// Satr uses the same Capacitor App backButton event. The decision is kept
// separate from the UI so direct links still have an explicit fallback.
if (Capacitor.isNativePlatform()) {
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    const parent = (history.state?.[HISTORY_KEY] as NavigationState | undefined)?.parent;
    const action = nativeBackAction(parseRoute(window.location.hash), canGoBack, Boolean(parent));
    if (action.kind === 'history') history.back();
    else if (action.kind === 'replace') {
      history.replaceState(navigationState(), '', action.href); routeChanged();
    } else void CapacitorApp.minimizeApp();
  }).catch(error => console.error('Unable to register Android Back', error));
}
document.addEventListener('selectstart', event => event.preventDefault());
document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
document.addEventListener('gesturechange', event => event.preventDefault(), { passive: false });
routeChanged();
