import type { Corpus } from './corpus.js';

interface Field {
  item: string; row: string; language: 'ar' | 'fa'; previous: string; replacement: string; evidence: string;
  outgoing: string[]; incoming: string[];
}
const fieldKey = (f: Omit<Field, 'outgoing' | 'incoming'>): string =>
  [f.item, f.row, f.language, f.previous, f.replacement, f.evidence].join('\0');
const compact = (value: string): string => value.replace(/\s+/gu, '');

/**
 * Ensure each recorded marker movement is backed by both occurrence edits,
 * references existing history, and moves only the marker plus whitespace.
 * This checks transcription conservation, not whether placement is correct.
 */
export function validateLineBreakMarkerHistory(c: Corpus): string[] {
  const errors: string[] = [];
  const groups = new Map<string, Field>();
  const seen = new Set<string>();
  const field = (f: Omit<Field, 'outgoing' | 'incoming'>): Field => {
    const key = fieldKey(f); let value = groups.get(key);
    if (!value) { value = { ...f, outgoing: [], incoming: [] }; groups.set(key, value); }
    return value;
  };
  for (const move of c.editorial.line_break_marker_moves ?? []) {
    const label = `${move.item}/${move.source_row}->${move.destination_row}/${move.language}`;
    const key = [move.item, move.language, move.source_row, move.destination_row, move.marker, move.evidence].join('\0');
    if (seen.has(key)) errors.push(`line-break marker history: duplicate ${label}`);
    seen.add(key);
    if (move.source_row === move.destination_row) errors.push(`line-break marker history: same source and destination ${label}`);
    const item = c.items.get(move.item);
    if (!item || !item.rows.some(row => row.id === move.source_row) || !item.rows.some(row => row.id === move.destination_row)) {
      errors.push(`line-break marker history: missing row ${label}`);
    }
    if (!(move.evidence in c.editorial.evidence)) errors.push(`line-break marker history: missing evidence ${label}`);
    const makeField = (row: string, previous: string, replacement: string): Omit<Field, 'outgoing' | 'incoming'> =>
      ({ item: move.item, row, language: move.language, previous, replacement, evidence: move.evidence });
    const source = makeField(move.source_row, move.source_previous, move.source_replacement);
    const destination = makeField(move.destination_row, move.destination_previous, move.destination_replacement);
    for (const f of [source, destination]) {
      if (!(c.editorial.row_corrections ?? []).some(edit => edit.item === f.item && edit.row === f.row &&
        edit.language === f.language && edit.previous === f.previous && edit.replacement === f.replacement && edit.evidence === f.evidence)) {
        errors.push(`line-break marker history: missing matching row correction ${f.item}/${f.row}/${f.language}`);
      }
      if (f.previous === f.replacement || !c.texts.has(f.previous) || !c.texts.has(f.replacement)) {
        errors.push(`line-break marker history: invalid old/new values ${f.item}/${f.row}/${f.language}`);
      }
    }
    field(source).outgoing.push(move.marker);
    field(destination).incoming.push(move.marker);
  }
  for (const f of groups.values()) {
    const label = `${f.item}/${f.row}/${f.language}`;
    const old = c.texts.get(f.previous), replacement = c.texts.get(f.replacement);
    if (old === undefined || replacement === undefined) continue;
    // This migration supports one incoming and one outgoing marker per field.
    // If a future migration needs more, its order must be specified explicitly.
    if (f.outgoing.length > 1 || f.incoming.length > 1) {
      errors.push(`line-break marker history: ambiguous marker order ${label}`); continue;
    }
    let expected = compact(old);
    const marker = f.outgoing[0];
    if (marker) {
      const at = expected.lastIndexOf(marker);
      if (at < 0) { errors.push(`line-break marker history: source lacks marker ${label}`); continue; }
      expected = expected.slice(0, at) + expected.slice(at + marker.length);
    }
    if (f.incoming[0]) expected = f.incoming[0] + expected;
    if (expected !== compact(replacement)) errors.push(`line-break marker history: non-marker text changed ${label}`);
  }
  return errors;
}
