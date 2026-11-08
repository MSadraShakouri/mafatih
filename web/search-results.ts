import type { SearchHit } from '../src/search.js';

/** A retained hit is visibly labelled as belonging to the previous search. */
export interface DisplayHit {
  hit: SearchHit;
  multi: boolean;
  previous: boolean;
}

/**
 * Stream new matches without dropping the old page on an empty/partial
 * response. A finished response is authoritative, including a finished zero.
 */
export function mergeSearchHits(current: readonly SearchHit[], previous: readonly DisplayHit[],
  complete: boolean, multi: boolean, maxPrevious: number, labelPrevious = true): DisplayHit[] {
  const next = current.map(hit => ({ hit, multi, previous: false }));
  if (complete) return next;
  const seen = new Set(current.map(hit => hit.record.key));
  let retained = 0;
  for (const entry of previous) {
    if (seen.has(entry.hit.record.key)) continue;
    if (retained >= maxPrevious) break;
    seen.add(entry.hit.record.key);
    next.push({ ...entry, previous: labelPrevious || entry.previous });
    retained++;
  }
  return next;
}

export interface KeyedNode {
  key: string;
  signature: string;
  create(): HTMLElement;
  update?(node: HTMLElement): void;
}
const signatures = new WeakMap<HTMLElement, string>();

/** Reuse unchanged rows and only insert/move/remove the rows that changed. */
export function reconcileRows(parent: HTMLElement, entries: readonly KeyedNode[]): void {
  const old = new Map<string, HTMLElement>();
  for (const node of parent.children) {
    if (node instanceof HTMLElement && node.dataset.renderKey) old.set(node.dataset.renderKey, node);
  }
  let cursor = parent.firstElementChild;
  for (const entry of entries) {
    let node = old.get(entry.key);
    if (node && signatures.get(node) !== entry.signature) {
      const replacement = entry.create();
      if (cursor === node) cursor = replacement;
      node.replaceWith(replacement);
      node = replacement;
    }
    if (!node) node = entry.create();
    node.dataset.renderKey = entry.key;
    signatures.set(node, entry.signature);
    entry.update?.(node);
    if (node !== cursor) parent.insertBefore(node, cursor);
    cursor = node.nextElementSibling;
    old.delete(entry.key);
  }
  for (const node of old.values()) node.remove();
}

/** Fields that affect a row's visible snippet or click target, not its changing score. */
export function hitSignature(hit: SearchHit): string {
  return JSON.stringify([hit.record.key, hit.matchedWords, hit.continuation]);
}

export function markPrevious(node: HTMLElement, previous: boolean): void {
  node.dataset.previous = String(previous);
  const button = node.querySelector('button');
  if (previous) button?.setAttribute('aria-description', 'نتیجهٔ جست‌وجوی قبلی');
  else button?.removeAttribute('aria-description');
}
