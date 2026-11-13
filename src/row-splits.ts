import type { Corpus } from './corpus.js';
import { codePoints, slicePoints } from './text-ids.js';

/** Old row occurrences remain identities even when their physical row is retired. */
export function hasHistoricalRow(c: Corpus, item: string, row: string): boolean {
  return Boolean(c.items.get(item)?.rows.some(r => r.id === row) ||
    c.rowSplits.get(item)?.rows.some(r => r.original.id === row));
}

/** Check the reversible map against actual current rows and both exact old values. */
export function validateRowSplitRecords(c: Corpus, onlyItem?: string): string[] {
  const errors: string[] = [];
  for (const [itemId, record] of c.rowSplits) {
    if (onlyItem !== undefined && itemId !== onlyItem) continue;
    const item = c.items.get(itemId);
    if (!item || record.item !== itemId) { errors.push(`row split ${itemId}: missing item or item/file mismatch`); continue; }
    const current = new Map(item.rows.map((r, i) => [r.id, { row: r, position: i }]));
    const originals = new Set<string>(), destinations = new Set<string>();
    let preceding = -1;
    for (const entry of record.rows) {
      const old = entry.original, label = `${itemId}/${old.id}`;
      if (originals.has(old.id)) errors.push(`row split ${label}: duplicate original row`);
      originals.add(old.id);
      const positions = entry.results.map(id => current.get(id)?.position ?? -1);
      if (new Set(entry.results).size !== entry.results.length || positions.some((n, i) => n < 0 || (i > 0 && n !== positions[i - 1]! + 1)) || positions[0]! <= preceding) {
        errors.push(`row split ${label}: missing, duplicate, out-of-order or noncontiguous output rows`);
      }
      preceding = positions.at(-1) ?? preceding;
      for (const id of entry.results) {
        if (destinations.has(id)) errors.push(`row split ${label}: output row used by another original`);
        destinations.add(id);
      }
      // A retained ID is allowed only for an unsplit row whose fields remain
      // in the same languages. Otherwise old and newly generated URLs would
      // have indistinguishable meanings.
      if (current.has(old.id) && (entry.results.length !== 1 || entry.results[0] !== old.id ||
          (['ar','fa'] as const).some(lang => entry[lang].some(s => s.row !== old.id || s.language !== lang)))) {
        errors.push(`row split ${label}: retired original ID was reused`);
      }
      const occupied = new Set<string>();
      for (const lang of ['ar','fa'] as const) {
        const ref = old[lang], value = ref === null ? undefined : c.texts.get(ref), segments = entry[lang];
        if (ref === null) { if (segments.length) errors.push(`row split ${label}/${lang}: segment for absent source`); continue; }
        if (value === undefined) { errors.push(`row split ${label}/${lang}: original text is missing`); continue; }
        const total = codePoints(value).length; let offset = 0, lastPosition = -1;
        if (!segments.length) errors.push(`row split ${label}/${lang}: source not covered`);
        for (const segment of segments) {
          const target = current.get(segment.row), key = `${segment.row}\0${segment.language}`;
          if (!entry.results.includes(segment.row) || !target || segment.start !== offset ||
              segment.end <= segment.start || segment.end > total || target.position <= lastPosition || occupied.has(key)) {
            errors.push(`row split ${label}/${lang}: invalid segment coverage, order or destination`);
          }
          offset = segment.end; lastPosition = target?.position ?? lastPosition; occupied.add(key);
          if (!target) continue;
          const targetRef = target.row[segment.language], actual = targetRef === null ? undefined : c.texts.get(targetRef);
          if (actual !== slicePoints(value, segment.start, segment.end)) errors.push(`row split ${label}/${lang}: destination text differs from original slice`);
          const oldSources = old.sources?.[lang], newSources = target.row.sources?.[segment.language];
          if (JSON.stringify(oldSources ?? []) !== JSON.stringify(newSources ?? [])) errors.push(`row split ${label}/${lang}: source attribution was not preserved`);
        }
        if (offset !== total) errors.push(`row split ${label}/${lang}: original text is not fully reconstructible`);
      }
      for (const id of entry.results) {
        const target = current.get(id)?.row; if (!target) continue;
        for (const lang of ['ar','fa'] as const) {
          if ((target[lang] !== null) !== occupied.has(`${id}\0${lang}`)) errors.push(`row split ${label}: unmapped or missing output field ${id}/${lang}`);
        }
      }
    }
    for (const entry of record.rows) {
      for (const id of entry.results) {
        if (originals.has(id) && id !== entry.original.id) errors.push(`row split ${itemId}/${entry.original.id}: another original ID was reused`);
      }
      if (!current.has(entry.original.id) && destinations.has(entry.original.id)) errors.push(`row split ${itemId}/${entry.original.id}: retired ID reused`);
    }
  }
  return errors;
}
