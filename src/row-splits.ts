import type { Corpus } from './corpus.js';
import { validMergeInsertionReason } from './schema.js';
import { codePoints, slicePoints } from './text-ids.js';

/** A proposed space may not split a grapheme or a protected Quran marker. */
export function spacingBoundaryIssue(left:string,right:string):string|undefined {
  if (!left || !right || /[\s\u0085]$/u.test(left) || /^[\s\u0085]/u.test(right))
    return 'a proposed boundary space requires two nonempty fields without existing boundary whitespace';
  const combined=left+right, boundary=left.length; // Segmenter and regex indices are UTF-16.
  if (![...new Intl.Segmenter('und',{granularity:'grapheme'}).segment(combined)].some(part=>part.index===boundary))
    return 'a proposed boundary space would split a Unicode grapheme';
  if ([...combined.matchAll(/﴿[^﴿﴾]*﴾/gu)].some(match=>match.index<boundary&&match.index+match[0].length>boundary))
    return 'a proposed boundary space would split a protected Quran marker';
  return undefined;
}

/** Old row occurrences remain identities even when their physical row is retired. */
export function hasHistoricalRow(c: Corpus, item: string, row: string): boolean {
  const record = c.rowSplits.get(item);
  return Boolean(c.items.get(item)?.rows.some(r => r.id === row) ||
    record?.rows.some(r => r.original.id === row) || record?.aliases?.some(r => r.original.id === row));
}

/** Check the reversible map against actual current rows and both exact old values. */
export function validateRowSplitRecords(c: Corpus, onlyItem?: string): string[] {
  const errors: string[] = [];
  for (const [itemId, record] of c.rowSplits) {
    if (onlyItem !== undefined && itemId !== onlyItem) continue;
    const item = c.items.get(itemId);
    if (!item || record.item !== itemId) { errors.push(`row split ${itemId}: missing item or item/file mismatch`); continue; }
    if (record.format_version !== 1) { errors.push(...validateMergedRecord(c, itemId)); continue; }
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

/** V2/V3 permit adjacent originals to share a target row. Source slices plus
 * explicit V3 insertions tile every field exactly once. Aliases intentionally
 * overlap the original mappings and are checked separately. */
function validateMergedRecord(c: Corpus, itemId: string): string[] {
  const record = c.rowSplits.get(itemId)!, item = c.items.get(itemId)!;
  const errors:string[] = [], fail = (message:string) => errors.push(`row split ${itemId}: ${message}`);
  if (!Array.isArray(record.aliases)) fail('V2/V3 mapping must include an aliases array');
  if (record.format_version===3 ? !record.insertions?.length : record.insertions!==undefined)
    fail('V3 requires explicit insertions; V2 must omit them');
  const current = new Map(item.rows.map((row, position) => [row.id, {row,position}]));
  const originals = new Set<string>(), destinations = new Set<string>();
  const tiles = new Map<string,Array<{start:number;end:number}>>();
  let preceding = -1;
  for (const entry of record.rows) {
    const id = entry.original.id;
    if (originals.has(id)) fail(`${id}: duplicate original row`);
    originals.add(id);
    const positions = entry.results.map(row => current.get(row)?.position ?? -1);
    if (new Set(entry.results).size !== entry.results.length || positions.some((n,i)=>n < 0 || (i > 0 && n !== positions[i-1]!+1)) || positions[0]! < preceding)
      fail(`${id}: missing, duplicate, out-of-order or noncontiguous output rows`);
    preceding = positions.at(-1) ?? preceding;
    for (const row of entry.results) destinations.add(row);
  }
  type Entry = {original:typeof record.rows[number]['original']; ar:typeof record.rows[number]['ar']; fa:typeof record.rows[number]['fa']};
  const check = (entry:Entry, alias:boolean, results?:string[]) => {
    const old = entry.original, label = `${old.id}${alias ? ' alias' : ''}`, mappedRows = new Set<string>();
    for (const lang of ['ar','fa'] as const) {
      const ref = old[lang], segments = entry[lang], value = ref === null ? undefined : c.texts.get(ref);
      if (ref === null) { if (segments.length) fail(`${label}/${lang}: segment for absent source`); continue; }
      if (value === undefined) { fail(`${label}/${lang}: original text is missing`); continue; }
      const total = codePoints(value).length;
      let offset = 0, lastPosition = -1;
      const lastEnd = new Map<string,number>();
      if (!segments.length) fail(`${label}/${lang}: source not covered`);
      for (const segment of segments) {
        const target = current.get(segment.row), start = segment.target_start, length = segment.end-segment.start;
        const key = `${segment.row}\0${segment.language}`;
        if (!target || (results && !results.includes(segment.row)) || !destinations.has(segment.row) ||
            segment.start !== offset || segment.end <= segment.start || segment.end > total ||
            start === undefined || !Number.isSafeInteger(start) || start < 0 ||
            (target && target.position < lastPosition) || (start !== undefined && start < (lastEnd.get(key) ?? 0))) {
          fail(`${label}/${lang}: invalid segment coverage, order or destination`);
        }
        offset = segment.end; lastPosition = target?.position ?? lastPosition;
        if (start !== undefined) lastEnd.set(key,start+length);
        mappedRows.add(segment.row);
        if (!target || start === undefined) continue;
        const targetRef = target.row[segment.language], actual = targetRef === null ? undefined : c.texts.get(targetRef);
        if (actual === undefined || start+length > codePoints(actual).length ||
            slicePoints(actual,start,start+length) !== slicePoints(value,segment.start,segment.end))
          fail(`${label}/${lang}: destination text differs from original slice`);
        if (JSON.stringify(old.sources?.[lang] ?? []) !== JSON.stringify(target.row.sources?.[segment.language] ?? []))
          fail(`${label}/${lang}: source attribution was not preserved`);
        if (!alias) {
          const ranges = tiles.get(key) ?? []; ranges.push({start,end:start+length}); tiles.set(key,ranges);
        }
      }
      if (offset !== total) fail(`${label}/${lang}: original text is not fully reconstructible`);
    }
    if (results && (mappedRows.size !== results.length || results.some(row=>!mappedRows.has(row))))
      fail(`${label}: output rows do not match mapped fields`);
  };
  for (const entry of record.rows) {
    const old = entry.original;
    if (current.has(old.id)) {
      const target = current.get(old.id)!.row;
      if (entry.results.length !== 1 || entry.results[0] !== old.id ||
          (['ar','fa'] as const).some(lang => target[lang] !== old[lang] ||
            entry[lang].some(s => s.row !== old.id || s.language !== lang || s.target_start !== s.start)))
        fail(`${old.id}: retired original ID was reused`);
    }
    check(entry,false,entry.results);
  }
  for (const entry of record.rows) for (const id of entry.results)
    if (originals.has(id) && id !== entry.original.id) fail(`${entry.original.id}: another original ID was reused`);
  const aliasIds = new Set<string>();
  for (const alias of record.aliases ?? []) {
    const id = alias.original.id;
    if (aliasIds.has(id) || originals.has(id) || current.has(id)) fail(`${id}: duplicate or reused alias identity`);
    aliasIds.add(id); check(alias,true);
  }
  const origins = new Map([...record.rows,...(record.aliases ?? [])].map(entry=>[entry.original.id,entry]));
  for (const insertion of record.insertions ?? []) {
    const {row,language,target_start:start,left,right,reason,value:inserted} = insertion;
    const target=current.get(row)?.row, ref=target?.[language], actual=ref==null?undefined:c.texts.get(ref);
    const points=actual===undefined?[]:codePoints(actual), leftOrigin=origins.get(left),rightOrigin=origins.get(right);
    const leftTouches=leftOrigin?.[language].some(s=>s.row===row&&s.language===language&&
      s.target_start!==undefined&&s.target_start+s.end-s.start===start);
    const rightTouches=rightOrigin?.[language].some(s=>s.row===row&&s.language===language&&s.target_start===start+1);
    const boundaryIssue=Number.isSafeInteger(start)&&start>0&&start<points.length-1 ?
      spacingBoundaryIssue(points.slice(0,start).join(''),points.slice(start+1).join('')) : 'invalid offset';
    if (record.format_version!==3 || inserted!==' ' || !reason || !validMergeInsertionReason(reason) ||
        !Number.isSafeInteger(start) || start<=0 || start>=points.length-1 ||
        !destinations.has(row) || points[start]!==' ' || boundaryIssue!==undefined ||
        left===right || !leftTouches || !rightTouches) {
      fail(`${row}/${language}: invalid or untraceable editorial boundary insertion`);
    }
    const key=`${row}\0${language}`,ranges=tiles.get(key) ?? [];
    ranges.push({start,end:start+1});tiles.set(key,ranges);
  }
  for (const rowId of destinations) {
    const row = current.get(rowId)?.row; if (!row) continue;
    for (const lang of ['ar','fa'] as const) {
      const ref = row[lang], ranges = (tiles.get(`${rowId}\0${lang}`) ?? []).sort((a,b)=>a.start-b.start);
      if (ref === null) { if (ranges.length) fail(`${rowId}/${lang}: mapped absent output field`); continue; }
      const value = c.texts.get(ref);
      if (value === undefined) { fail(`${rowId}/${lang}: output text is missing`); continue; }
      let end = 0;
      for (const range of ranges) { if (range.start !== end || range.end <= range.start) fail(`${rowId}/${lang}: overlapping or missing output slices`); end = range.end; }
      if (end !== codePoints(value).length) fail(`${rowId}/${lang}: output field is not fully mapped`);
    }
  }
  return errors;
}
