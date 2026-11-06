import type { Corpus } from './corpus.js';
import { text } from './corpus.js';
import { intern } from './editor.js';
import { normalizeSearch } from './normalize.js';
import { normalizePunctuationSpacing } from './punctuation.js';
import { punctuationLocationKey } from './punctuation-history.js';
import { PunctuationEditSchema, type NavNode, type PunctuationEdit, type PunctuationLocation } from './schema.js';
import { textId } from './text-ids.js';

interface Target {
  location: PunctuationLocation;
  file: string;
  get(): string | null;
  set(id: string): void;
}

/** Content occurrences only. Never rewrite claims, source records or historical references. */
function targets(c: Corpus): Target[] {
  const result: Target[] = [];
  for (const [id, item] of c.items) {
    const file = `items/${id}.json`;
    for (const language of ['ar', 'fa', 'en'] as const) {
      result.push({ location: { kind: 'item-title', item: id, language }, file,
        get: () => item.title[language], set: value => { item.title[language] = value; } });
    }
    item.tags.forEach((_, index) => result.push({ location: { kind: 'item-tag', item: id, index }, file,
      get: () => item.tags[index] ?? null, set: value => { item.tags[index] = value; } }));
    for (const row of item.rows) for (const language of ['ar', 'fa'] as const) {
      result.push({ location: { kind: 'item-row', item: id, row: row.id, language }, file,
        get: () => row[language], set: value => { row[language] = value; } });
    }
  }
  for (const [id, doc] of c.english) {
    const file = `english/${id}.json`;
    if (doc.display_title) {
      const title = doc.display_title;
      for (const language of ['ar', 'en'] as const) result.push({ location: { kind: 'english-display', document: id, language }, file,
        get: () => title[language], set: value => { title[language] = value; } });
    }
    const metadata = doc.source_metadata;
    for (const field of ['title', 'title_ar', 'section', 'chapter'] as const) {
      result.push({ location: { kind: 'english-metadata', document: id, field }, file,
        get: () => metadata[field], set: value => { metadata[field] = value; } });
    }
    for (const para of doc.paragraphs) result.push({ location: { kind: 'english-paragraph', document: id, paragraph: para.id }, file,
      get: () => para.text, set: value => { para.text = value; } });
  }
  function visit(nodes: NavNode[], parent: number[]): void {
    nodes.forEach((node, index) => {
      const path = [...parent, index];
      result.push({ location: { kind: 'navigation', path }, file: 'navigation.json',
        get: () => node.title, set: value => { node.title = value; } });
      visit(node.children, path);
    });
  }
  visit(c.nav.toc, []);
  return result;
}

/** A dry run: no corpus values or references are changed. */
export function planPunctuationNormalization(c: Corpus): PunctuationEdit[] {
  const changes: PunctuationEdit[] = [];
  for (const target of targets(c)) {
    const previous = target.get();
    if (previous === null) continue;
    const value = text(c, previous);
    const normalized = normalizePunctuationSpacing(value);
    if (normalized !== value) changes.push({ location: target.location, previous, replacement: textId(normalized) });
  }
  return changes;
}

function assertUnreviewed(c: Corpus, loc: PunctuationLocation): void {
  if (loc.kind === 'item-row') {
    const item = c.items.get(loc.item)!;
    if (item.review?.text || item.review?.ar_fa) throw new Error(`Cannot change reviewed item text: ${loc.item}/${loc.row}`);
    for (const group of c.alignments.get(loc.item)?.groups ?? []) {
      if (group[loc.language].some(span => span.row === loc.row)) {
        throw new Error(`Cannot change reviewed alignment: ${loc.item}/${loc.row}/${loc.language}`);
      }
    }
  } else if (loc.kind === 'item-title' || loc.kind === 'item-tag') {
    if (c.items.get(loc.item)?.review?.titles) throw new Error(`Cannot change reviewed item title: ${loc.item}`);
  } else if (loc.kind === 'english-display' || loc.kind === 'english-metadata' || loc.kind === 'english-paragraph') {
    if (c.english.get(loc.document)?.review) throw new Error(`Cannot change reviewed English document: ${loc.document}`);
    if (loc.kind === 'english-paragraph') {
      for (const [item, alignment] of c.alignments) for (const group of alignment.groups) {
        if (group.en.some(span => span.document === loc.document && span.paragraph === loc.paragraph)) {
          throw new Error(`Cannot change reviewed alignment: ${item}/${loc.document}/${loc.paragraph}`);
        }
      }
    }
  }
}

/**
 * Apply only a preflighted, still-current plan in memory. Callers must validate
 * and atomically commit the returned files and pooled IDs. No reviewed text or
 * alignment is silently invalidated. Historical originals remain referenced.
 */
export function applyPunctuationNormalization(c: Corpus, plan: PunctuationEdit[], date: string): {
  files: Set<string>; previous: string[]; replacement: string[];
} {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('Punctuation normalization requires a valid ISO date');
  }
  if (!plan.length) return { files: new Set(), previous: [], replacement: [] };
  const byKey = new Map(targets(c).map(target => [punctuationLocationKey(target.location), target]));
  const prepared: Array<{ target: Target; edit: PunctuationEdit; value: string }> = [];
  const visited = new Set<string>();
  const plannedValues = new Map<string, string>();
  for (const candidate of plan) {
    const edit = PunctuationEditSchema.parse(candidate);
    const key = punctuationLocationKey(edit.location);
    const label = key.replaceAll('\0', '/');
    if (visited.has(key)) throw new Error(`Duplicate punctuation target: ${label}`);
    visited.add(key);
    const target = byKey.get(key);
    if (!target || target.get() !== edit.previous) throw new Error(`Stale punctuation plan: ${label}`);
    const oldValue = text(c, edit.previous);
    const value = normalizePunctuationSpacing(oldValue);
    if (value === oldValue || textId(value) !== edit.replacement || normalizeSearch(value) !== normalizeSearch(oldValue)) {
      throw new Error(`Invalid punctuation-only edit: ${label}`);
    }
    const existing = c.texts.get(edit.replacement);
    const planned = plannedValues.get(edit.replacement);
    if ((existing !== undefined && existing !== value) || (planned !== undefined && planned !== value)) {
      throw new Error(`Text hash collision: ${edit.replacement}`);
    }
    plannedValues.set(edit.replacement, value);
    assertUnreviewed(c, edit.location);
    prepared.push({ target, edit, value });
  }
  const files = new Set<string>(['editorial-history.json']);
  for (const { target, edit, value } of prepared) {
    if (intern(c, value) !== edit.replacement) throw new Error('Unexpected text ID during punctuation normalization');
    target.set(edit.replacement);
    files.add(target.file);
  }
  (c.editorial.punctuation_normalizations ??= []).push({ rule: 'closing-punctuation-v1', date,
    changes: prepared.map(({ edit }) => edit) });
  return { files, previous: prepared.map(({ edit }) => edit.previous), replacement: prepared.map(({ edit }) => edit.replacement) };
}
