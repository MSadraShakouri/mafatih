import { itemHref, topicHref, type Route } from './routes.js';

export type NativeBackAction = { kind: 'history' } | { kind: 'replace'; href: string } | { kind: 'minimize' };

/**
 * Capacitor's App plugin provides the Android event and WebView canGoBack.
 * Only traverse an app-owned history entry. A direct link or lost WebView
 * history gets a deterministic in-app fallback instead of a blank page.
 */
export function nativeBackAction(route: Route, canGoBack: boolean, hasAppParent: boolean): NativeBackAction {
  if (route.kind === 'library') return { kind: 'minimize' };
  if (canGoBack && hasAppParent) return { kind: 'history' };
  if (route.kind === 'settings') return { kind: 'replace', href: itemHref(route.id) };
  if (route.kind === 'contents' && route.topic && route.sourcePath) return { kind: 'replace', href: topicHref(route.topic) };
  if (route.kind === 'contents' && route.topic) return { kind: 'replace', href: '#/contents' };
  return { kind: 'replace', href: '#/' };
}
