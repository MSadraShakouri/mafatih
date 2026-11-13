import { z } from 'zod';
import type { Corpus } from './corpus.js';
import { ItemSchema, Key, RowFieldsSchema, RowSplitRecordSchema, type Row, type RowSplitRecord } from './schema.js';
import { AgentPreviewSchema, splitAgentPlan, verifyAgentPreview, type AgentPreview } from './split-agent.js';
import { validateRowSplitRecords } from './row-splits.js';
import { codePoints, sha256, slicePoints, textId } from './text-ids.js';

const Language = z.enum(['ar','fa']);
const Kind = RowFieldsSchema.shape.kind.unwrap();
const Part = z.object({ source: Language, part: z.number().int().nonnegative() }).strict();
const OutputRow = z.object({ ar: Part.nullable(), fa: Part.nullable(), kind: Kind }).strict()
  .refine(row => row.ar !== null || row.fa !== null, 'an output row needs a source piece');
export const CanonicalLayoutSchema = z.object({
  format_version: z.literal(1), protocol: z.literal('ar-fa-canonical-v1'), item: Key, author: Key,
  plan_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rows: z.array(z.object({ row: Key, checked: z.boolean(), output: z.array(OutputRow).min(1) }).strict()),
}).strict();
export type CanonicalLayout = z.infer<typeof CanonicalLayoutSchema>;

type Lang = 'ar' | 'fa';
type Piece = { part:number; start:number; end:number; text:string; kind:z.infer<typeof Kind> };
const serialHash = (input:unknown):string => sha256(JSON.stringify(input));

/** Attach physical separators to the preceding piece (or the first piece for a prefix). */
function sourcePieces(source: AgentPreview['sources'][number]): Piece[] {
  const textParts = source.parts.filter(p => p.type === 'text');
  if (!textParts.length) throw new Error(`${source.row}/${source.language}: source has no text piece; flag for individual handling`);
  const end = source.parts.at(-1)?.end ?? 0;
  return textParts.map((part, index) => {
    const start = index === 0 ? 0 : part.start, stop = textParts[index + 1]?.start ?? end;
    const full = source.parts.map(p=>p.text).join('');
    return { part:part.part, start, end:stop, text:slicePoints(full,start,stop), kind:part.kind };
  });
}

/** Draft only: the agent must explicitly check each row and correct any pairing. */
export function createCanonicalLayoutTemplate(c: Corpus, input: unknown): CanonicalLayout {
  const preview = AgentPreviewSchema.parse(input);
  verifyAgentPreview(c, input);
  const item = c.items.get(preview.item); if (!item) throw new Error(`Unknown item ${preview.item}`);
  return {
    format_version:1, protocol:'ar-fa-canonical-v1', item:preview.item, author:preview.author,
    plan_sha256:preview.plan_sha256,
    rows:item.rows.map(row => {
      const ar = preview.sources.find(s=>s.row===row.id && s.language==='ar');
      const fa = preview.sources.find(s=>s.row===row.id && s.language==='fa');
      const aa = ar ? sourcePieces(ar) : [], ff = fa ? sourcePieces(fa) : [];
      const output: CanonicalLayout['rows'][number]['output'] = [];
      if (aa.length===1 && ff.length===1 && aa[0]!.kind===ff[0]!.kind) {
        output.push({ar:{source:'ar',part:0},fa:{source:'fa',part:0},kind:aa[0]!.kind});
      } else {
        for (const p of aa) output.push({ar:{source:'ar',part:p.part},fa:null,kind:p.kind});
        for (const p of ff) output.push({ar:null,fa:{source:'fa',part:p.part},kind:p.kind});
      }
      return {row:row.id,checked:false,output};
    }),
  };
}

/** Compile one complete, explicitly laid-out item without mutating the baseline. */
export function compileCanonicalSplit(c: Corpus, planInput: unknown, layoutInput: unknown) {
  const layout = CanonicalLayoutSchema.parse(layoutInput), item = c.items.get(layout.item);
  if (!item) throw new Error(`Unknown item ${layout.item}`);
  if (c.rowSplits.has(layout.item)) throw new Error('A previously migrated item requires a separate mapping-composition migration');
  if (c.alignments.has(layout.item) || item.review?.text || item.review?.ar_fa) {
    throw new Error(`${layout.item}: existing human text review or alignment requires a separate migration`);
  }
  const preview = splitAgentPlan(c, planInput), report = verifyAgentPreview(c, preview);
  if (layout.item !== preview.item || layout.author !== preview.author || layout.plan_sha256 !== preview.plan_sha256) {
    throw new Error('Layout is stale or refers to a different plan, item or author');
  }
  if (report.unchecked_source_count || report.unknown_part_count || report.empty_source_count || report.whitespace_only_part_count) {
    throw new Error('Check and classify every nonempty source piece before canonical application');
  }
  if (report.separator_count) throw new Error('Physical line separators require a separate retained-break migration; do not discard them');
  if (preview.punctuation_suggestions.length) throw new Error('Punctuation suggestions need a separate reviewed migration; a split cannot apply them');
  if (layout.rows.length !== item.rows.length) throw new Error('Layout must cover every original row exactly once');
  const allIds = new Set(item.rows.map(row=>row.id)), usedIds = new Set<string>();
  const outputRows: Row[] = [], history: RowSplitRecord['rows'] = [], newTexts = new Map<string,string>();
  for (const [position, old] of item.rows.entries()) {
    const rowLayout = layout.rows[position]!;
    if (rowLayout.row !== old.id) throw new Error(`${old.id}: layout row order or coverage differs from the source`);
    if (!rowLayout.checked) throw new Error(`${old.id}: layout is not checked`);
    const sources = Object.fromEntries((['ar','fa'] as const).map(lang => {
      const source = preview.sources.find(s=>s.row===old.id && s.language===lang);
      return [lang,source ? sourcePieces(source) : []];
    })) as Record<Lang, Piece[]>;
    const next:Record<Lang,number> = {ar:0,fa:0};
    const segments:Record<Lang,RowSplitRecord['rows'][number]['ar']> = {ar:[],fa:[]};
    const made:Row[] = [];
    const unchangedAddress = rowLayout.output.length===1 && (['ar','fa'] as const).every(lang => {
      const ref = rowLayout.output[0]![lang];
      return old[lang] === null ? ref === null : ref?.source === lang && ref.part === 0 && sources[lang].length === 1;
    });
    for (const out of rowLayout.output) {
      if (out.kind === 'unknown') throw new Error(`${old.id}: output kind must be classified`);
      const rowId = unchangedAddress ? old.id : `${old.id}-s${serialHash({row:old.id,ar:out.ar,fa:out.fa,kind:out.kind}).slice(0,16)}`;
      if (usedIds.has(rowId) || (!unchangedAddress && allIds.has(rowId))) throw new Error(`${old.id}: duplicate or reused row identity ${rowId}`);
      usedIds.add(rowId);
      const row:Row = {id:rowId,ar:null,fa:null,kind:out.kind};
      const rowSources:Partial<Record<Lang,string[]>> = {};
      for (const target of ['ar','fa'] as const) {
        const ref = out[target]; if (!ref) continue;
        const pieces = sources[ref.source], piece = pieces[ref.part];
        if (!piece || ref.part !== next[ref.source]) throw new Error(`${old.id}/${ref.source}: duplicate, missing or reordered piece`);
        next[ref.source]++;
        if (piece.kind !== out.kind) throw new Error(`${old.id}: output kind differs from the source piece kind`);
        const id = textId(piece.text), present = c.texts.get(id), added = newTexts.get(id);
        if ((present !== undefined && present !== piece.text) || (added !== undefined && added !== piece.text)) throw new Error(`Text hash collision: ${id}`);
        if (present === undefined) newTexts.set(id,piece.text);
        row[target] = id;
        const attribution = old.sources?.[ref.source]; if (attribution !== undefined) rowSources[target] = [...attribution];
        segments[ref.source].push({row:rowId,language:target,start:piece.start,end:piece.end});
      }
      if (Object.keys(rowSources).length) row.sources = rowSources;
      made.push(row);
    }
    for (const lang of ['ar','fa'] as const) {
      if (next[lang] !== sources[lang].length) throw new Error(`${old.id}/${lang}: missing source piece coverage`);
    }
    outputRows.push(...made);
    if (made.length !== 1 || JSON.stringify(made[0]) !== JSON.stringify(old)) {
      history.push({original:structuredClone(old),results:made.map(r=>r.id),ar:segments.ar,fa:segments.fa});
    }
  }
  const result = ItemSchema.parse({...structuredClone(item),rows:outputRows});
  const record = RowSplitRecordSchema.parse({format_version:1,item:preview.item,author:preview.author,
    baseline_item_sha256:preview.item_sha256,plan_sha256:preview.plan_sha256,layout_sha256:serialHash(layoutInput),rows:history});
  return {itemId:preview.item,item:result,record,texts:newTexts};
}

/** Restore the exact old row structures in memory; retained old text IDs live in the record. */
export function restoreCanonicalItem(c: Corpus, itemId: string) {
  const item = c.items.get(itemId); if (!item) throw new Error(`Unknown item ${itemId}`);
  const record = c.rowSplits.get(itemId); if (!record) return structuredClone(item);
  const errors = validateRowSplitRecords(c,itemId);
  if (errors.length) throw new Error('Invalid row mapping: '+errors.join('; '));
  const starts = new Map(record.rows.map(entry=>[entry.results[0]!,entry]));
  const removed = new Set(record.rows.flatMap(entry=>entry.results.slice(1)));
  const rows:Row[] = [];
  for (const row of item.rows) {
    const entry = starts.get(row.id);
    if (entry) rows.push(structuredClone(entry.original));
    else if (!removed.has(row.id)) rows.push(structuredClone(row));
  }
  return ItemSchema.parse({...structuredClone(item),rows});
}

/** Verify the actual result, not just a proposed plan or a reviewer's claim. */
export function verifyCanonicalResult(base: Corpus, current: Corpus, plan: unknown, layout: unknown): void {
  const expected = compileCanonicalSplit(base,plan,layout);
  if (JSON.stringify(current.items.get(expected.itemId)) !== JSON.stringify(expected.item) ||
      JSON.stringify(current.rowSplits.get(expected.itemId)) !== JSON.stringify(expected.record)) {
    throw new Error(`${expected.itemId}: actual canonical result or mapping mismatches the compiled plan`);
  }
  for (const [id,value] of expected.texts) if (current.texts.get(id) !== value) throw new Error(`${expected.itemId}: result text mismatch ${id}`);
  if (JSON.stringify(restoreCanonicalItem(current,expected.itemId)) !== JSON.stringify(base.items.get(expected.itemId))) {
    throw new Error(`${expected.itemId}: mapping does not reconstruct the original item`);
  }
}
