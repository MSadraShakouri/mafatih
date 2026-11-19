import { z } from 'zod';
import type { Corpus } from './corpus.js';
import { Key, RowSchema, RowSplitSegmentSchema, type Item, type Row, type RowSplitRecord } from './schema.js';
import { sha256 } from './text-ids.js';
import type { RowSplitRedirect, RowVersionEntry, RowVersionMeaning } from '../web/row-split-anchor.js';

const Commit = z.string().regex(/^[0-9a-f]{40}$/);
const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const Segment = RowSplitSegmentSchema.extend({ target_start: z.number().int().nonnegative() }).strict();
const Candidate = z.object({ id: Key, original: RowSchema, snapshots: z.array(Commit).min(1),
  ar: z.array(Segment), fa: z.array(Segment) }).strict();
export const RowVersionFindingsSchema = z.object({
  format_version: z.literal(1), status: z.literal('provisional-unreviewed'),
  target_snapshot: Commit, frozen_base: Commit,
  items: z.record(Key, z.object({ target_sha256: Hash, rows: z.array(Candidate).min(1) }).strict()),
}).strict();

/** The exact item and split record a tentative physical mapping was checked
 * against. Any later corpus change disables that mapping until it is rechecked. */
export function itemVersionBinding(item: Item, split: RowSplitRecord | undefined): string {
  return sha256(JSON.stringify([item, split ?? null]));
}

/** Deterministic current row identity, including the item and attribution.
 * This is not a proof about unobserved historical source occurrences. */
export function rowVersion(item: string, row: Row): string {
  return sha256('mafatih-row-version-v1\0' + JSON.stringify([
    item, row.id, row.ar, row.fa, row.sources?.ar ?? [], row.sources?.fa ?? [],
  ]));
}

function selfSegments(c: Corpus, row: Row, language: 'ar' | 'fa'): RowSplitRedirect['ar'] {
  const id = row[language];
  if (id === null) return [];
  const value = c.texts.get(id);
  if (value === undefined) throw new Error(`current row ${row.id}: missing pooled text ${id}`);
  const length = Array.from(value).length;
  return length ? [{ row: row.id, language, start: 0, end: length, target_start: 0 }] : [];
}
function checkProposal(c: Corpus, item: Item, candidate: z.infer<typeof Candidate>): void {
  const live = new Map(item.rows.filter(row => row.kind !== 'audio-reciter').map(row => [row.id, row]));
  for (const language of ['ar', 'fa'] as const) {
    const id = candidate.original[language];
    const source = id === null ? '' : c.texts.get(id);
    if (source === undefined) throw new Error(`${candidate.id}/${language}: proposal text unavailable`);
    const points = Array.from(source), segments = candidate[language];
    let end = 0;
    for (const part of segments) {
      if (![part.start, part.end, part.target_start].every(Number.isSafeInteger) || part.start !== end || part.end <= part.start)
        throw new Error(`${candidate.id}/${language}: proposal mapping is not contiguous`);
      const target = live.get(part.row), targetId = target?.[part.language];
      const targetText = targetId ? c.texts.get(targetId) : undefined;
      if (targetText === undefined) throw new Error(`${candidate.id}/${language}: proposal target is unavailable`);
      const slice = Array.from(targetText).slice(part.target_start, part.target_start + part.end - part.start).join('');
      if (slice !== points.slice(part.start, part.end).join(''))
        throw new Error(`${candidate.id}/${language}: proposal target text slice differs`);
      end = part.end;
    }
    if (end !== points.length) throw new Error(`${candidate.id}/${language}: proposal mapping does not cover the original`);
  }
}

/** Compile metadata-only, explicitly unreviewed findings into reader data.
 * Entries can guard a reused ID or offer a candidate for an unroutable retired
 * ID. Text reconstruction is rechecked when the item/record binding matches; if
 * it has changed, the finding still blocks guessing but its targets are withheld.
 * Source-lineage checks and independent review are separate requirements. */
export function compileRowVersionFindings(c: Corpus, input: unknown): Map<string, RowVersionEntry[]> {
  const findings = RowVersionFindingsSchema.parse(input), output = new Map<string, RowVersionEntry[]>();
  for (const [id, group] of Object.entries(findings.items)) {
    const item = c.items.get(id);
    // An alternate/synthetic corpus may not contain an item at all. Apply the
    // safety finding whenever that item does exist; never resolve a missing item.
    if (!item) continue;
    const split = c.rowSplits.get(id), bound = itemVersionBinding(item, split) === group.target_sha256;
    const records: RowVersionEntry[] = [], seen = new Set<string>();
    for (const candidate of group.rows) {
      if (candidate.original.id !== candidate.id) throw new Error(`${id}/${candidate.id}: original ID differs`);
      if (seen.has(candidate.id)) throw new Error(`${id}/${candidate.id}: duplicate row-version finding`);
      seen.add(candidate.id);
      if (new Set(candidate.snapshots).size !== candidate.snapshots.length ||
          (bound && candidate.snapshots.includes(findings.target_snapshot)))
        throw new Error(`${id}/${candidate.id}: duplicate or conflicting snapshot`);
      if (bound) checkProposal(c, item, candidate);
      const live = item.rows.find(row => row.id === candidate.id && row.kind !== 'audio-reciter');
      const redirect = [...(split?.rows ?? []), ...(split?.aliases ?? [])].find(row => row.original.id === candidate.id);
      let current: RowVersionMeaning | undefined;
      if (live) current = { snapshots: [rowVersion(id, live)], ar: selfSegments(c, live, 'ar'), fa: selfSegments(c, live, 'fa') };
      else if (redirect) current = { snapshots: [rowVersion(id, redirect.original)],
        ar: redirect.ar.map(part => ({ ...part, target_start: part.target_start ?? 0 })),
        fa: redirect.fa.map(part => ({ ...part, target_start: part.target_start ?? 0 })) };
      if (current && bound) current.snapshots.push(findings.target_snapshot);
      // A link generated when the recorded old row was live carries its content
      // identity, not necessarily a Git SHA. Keep that identity provisional too.
      // If it collides with the current meaning, the resolver rejects the
      // duplicate label rather than silently choosing either occurrence.
      const old: RowVersionMeaning = { snapshots: [...candidate.snapshots, rowVersion(id, candidate.original)], provisional: true,
        ar: bound ? candidate.ar : [], fa: bound ? candidate.fa : [] };
      records.push({ id: candidate.id, ...(current ? { current } : {}), historical: [old] });
    }
    output.set(id, records);
  }
  return output;
}
