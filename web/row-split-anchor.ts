import type { ReadingAnchor } from './routes.js';

export interface RowSplitRedirect {
  original: { id: string };
  /** Content version of the original row, for newly generated versioned URLs. */
  version?: string;
  ar: Array<{ row: string; language: 'ar' | 'fa'; start: number; end: number; target_start?: number }>;
  fa: Array<{ row: string; language: 'ar' | 'fa'; start: number; end: number; target_start?: number }>;
}

/** Follow old row/language/code-point URLs, including a change of language field. */
export function resolveLegacyRowAnchor(rows: readonly RowSplitRedirect[], anchor: ReadingAnchor): ReadingAnchor {
  const redirect = rows.find(entry => entry.original.id === anchor.row);
  const segments = redirect?.[anchor.language];
  if (!segments?.length) return anchor;
  // A boundary belongs to the following piece; the very end belongs to the
  // end of the last piece, matching the previous clamping behavior.
  const segment = segments.find(entry => anchor.offset < entry.end) ?? segments[segments.length - 1]!;
  return { row: segment.row, language: segment.language,
    offset: (segment.target_start ?? 0) + Math.max(0, Math.min(anchor.offset, segment.end) - segment.start) };
}

/** An item-scoped meaning of a guarded reused or retired identity. Maps address
 * physical current rows, not another ambiguous URL. Offsets count Unicode code points. */
export interface RowVersionMeaning {
  snapshots: string[];
  ar: RowSplitRedirect['ar'];
  fa: RowSplitRedirect['fa'];
  /** A mechanically checked proposal, not an author/reviewer decision. */
  provisional?: boolean;
}
export interface RowVersionEntry {
  id: string;
  current?: RowVersionMeaning;
  historical: RowVersionMeaning[];
}
export interface RowVersionChoice {
  meaning: 'current' | 'historical';
  /** The first full identifier is a reproducible link to this meaning. */
  version: string;
  snapshots: string[];
  provisional?: boolean;
  /** An absent language, stale map, or out-of-range offset is not a link. */
  target?: ReadingAnchor;
}
export type VersionedAnchorResult =
  | { status: 'resolved'; anchor: ReadingAnchor; meaning: 'legacy' | 'current' | 'historical' }
  | { status: 'provisional'; anchor: ReadingAnchor; choices: RowVersionChoice[] }
  | { status: 'ambiguous' | 'unknown-version' | 'unavailable' | 'invalid-data'; choices: RowVersionChoice[] };

export interface VersionedLiveRow { id: string; ar: string; fa: string; version?: string }
const versionId = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const rowId = /^[a-z0-9][a-z0-9-]*$/;

/** Resolve an explicitly selected meaning without clamping an invalid old
 * offset into unrelated text. A boundary belongs to the next segment. */
function versionTarget(meaning: RowVersionMeaning, anchor: ReadingAnchor): ReadingAnchor | undefined {
  const segments = meaning[anchor.language];
  if (!Array.isArray(segments) || !segments.length) return undefined;
  let end = 0;
  for (const part of segments) {
    if (!part || typeof part.row !== 'string' || !rowId.test(part.row) ||
        (part.language !== 'ar' && part.language !== 'fa') ||
        !Number.isSafeInteger(part.start) || !Number.isSafeInteger(part.end) ||
        part.start !== end || part.end <= part.start || !Number.isSafeInteger(part.target_start) || part.target_start! < 0)
      return undefined;
    end = part.end;
  }
  if (anchor.offset > end) return undefined;
  const part = segments.find(segment => anchor.offset < segment.end) ?? segments[segments.length - 1]!;
  const offset = part.target_start! + anchor.offset - part.start;
  return Number.isSafeInteger(offset) ? { row: part.row, language: part.language, offset } : undefined;
}

function physicalTarget(target: ReadingAnchor | undefined, rows: readonly VersionedLiveRow[] | undefined): ReadingAnchor | undefined {
  if (!target || !rows) return target;
  const row = rows.find(entry => entry.id === target.row);
  const value = row?.[target.language];
  return typeof value === 'string' && value.length > 0 && target.offset <= Array.from(value).length ? target : undefined;
}

/** Never guess which published meaning an unversioned guarded row ID intended.
 * Unknown explicit versions also fail closed instead of falling through to a
 * current row. Ordinary, unversioned legacy links retain their behavior. */
export function resolveVersionedRowAnchor(redirects: readonly RowSplitRedirect[], versions: readonly RowVersionEntry[],
    anchor: ReadingAnchor, rows?: readonly VersionedLiveRow[], knownReused = false): VersionedAnchorResult {
  if (!rowId.test(anchor.row) || !['ar', 'fa'].includes(anchor.language) || !Number.isSafeInteger(anchor.offset) ||
      anchor.offset < 0 || (anchor.version !== undefined && !versionId.test(anchor.version)) || !Array.isArray(versions))
    return { status: 'invalid-data', choices: [] };
  const matching = versions.filter(entry => entry.id === anchor.row);
  if (matching.length > 1) return { status: 'invalid-data', choices: [] };
  const entry = matching[0];
  // The app bundle carries a compact independent guard index. A cached older
  // item lacking its per-item safety metadata must not silently bypass it.
  if (!entry && knownReused) return { status: 'invalid-data', choices: [] };
  if (!entry) {
    if (anchor.version === undefined)
      return { status: 'resolved', anchor: resolveLegacyRowAnchor(redirects, anchor), meaning: 'legacy' };
    const live = rows?.find(row => row.id === anchor.row);
    const liveTarget = physicalTarget({ row: anchor.row, language: anchor.language, offset: anchor.offset }, rows);
    if (live?.version === anchor.version)
      return liveTarget ? { status: 'resolved', anchor: liveTarget, meaning: 'current' } : { status: 'unavailable', choices: [] };
    const redirect = redirects.find(value => value.original.id === anchor.row && value.version === anchor.version);
    if (redirect) {
      const mapped = physicalTarget(versionTarget({ snapshots: [anchor.version],
        ar: redirect.ar.map(part => ({ ...part, target_start: part.target_start ?? 0 })),
        fa: redirect.fa.map(part => ({ ...part, target_start: part.target_start ?? 0 })) }, anchor), rows);
      return mapped ? { status: 'resolved', anchor: mapped, meaning: 'historical' } : { status: 'unavailable', choices: [] };
    }
    const choices: RowVersionChoice[] = live?.version && versionId.test(live.version)
      ? [{ meaning: 'current', version: live.version, snapshots: [live.version], ...(liveTarget ? { target: liveTarget } : {}) }] : [];
    return { status: 'unknown-version', choices };
  }
  if (!Array.isArray(entry.historical) || !entry.historical.length)
    return { status: 'invalid-data', choices: [] };
  const meanings: Array<{ value: RowVersionMeaning; meaning: 'current' | 'historical' }> = [
    ...(entry.current ? [{ value: entry.current, meaning: 'current' as const }] : []),
    ...entry.historical.map((value: RowVersionMeaning) => ({ value, meaning: 'historical' as const })),
  ];
  const seen = new Set<string>();
  for (const { value } of meanings) {
    if (!value || !Array.isArray(value.snapshots) || !value.snapshots.length ||
        !Array.isArray(value.ar) || !Array.isArray(value.fa)) return { status: 'invalid-data', choices: [] };
    for (const snapshot of value.snapshots) {
      if (typeof snapshot !== 'string' || !versionId.test(snapshot) || seen.has(snapshot))
        return { status: 'invalid-data', choices: [] };
      seen.add(snapshot);
    }
  }
  const choices: RowVersionChoice[] = meanings.map(({ value, meaning }) => {
    const target = physicalTarget(versionTarget(value, anchor), rows);
    return { meaning, version: value.snapshots[0]!, snapshots: value.snapshots,
      ...(value.provisional ? { provisional: true } : {}), ...(target ? { target } : {}) };
  });
  if (anchor.version === undefined) return { status: 'ambiguous', choices };
  const index = meanings.findIndex(({ value }) => value.snapshots.includes(anchor.version!));
  if (index < 0) return { status: 'unknown-version', choices };
  const choice = choices[index]!;
  if (!choice.target) return { status: 'unavailable', choices };
  if (choice.provisional) return { status: 'provisional', anchor: choice.target, choices };
  return { status: 'resolved', anchor: choice.target, meaning: choice.meaning };
}
