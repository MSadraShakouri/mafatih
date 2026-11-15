import type { Corpus } from './corpus.js';
import { RowSplitAliasSchema, RowSplitRecordSchema, type Item, type Row, type RowSplitAlias, type RowSplitRecord } from './schema.js';
import { promoteRowSplitRecord, validateRowSplitRecords } from './row-splits.js';

type Segment=RowSplitAlias['ar'][number];
const same=(a:unknown,b:unknown):boolean=>JSON.stringify(a)===JSON.stringify(b);
const sameFields=(a:Row|undefined,b:Row|undefined):boolean=>Boolean(a&&b&&a.ar===b.ar&&a.fa===b.fa &&
  same(a.sources?.ar ?? [],b.sources?.ar ?? []) && same(a.sources?.fa ?? [],b.sources?.fa ?? []));

/** Add previously published, independently evidenced aliases without changing
 * physical rows, frozen-original mappings, editorial insertions or pooled text.
 * The caller must separately verify their history; this function verifies their
 * exact destinations, uniqueness, attribution and reconstruction in the corpus. */
export function installHistoricalAliases(c:Corpus,itemId:string,input:unknown[]):RowSplitRecord {
  const previous=c.rowSplits.get(itemId);
  if(!previous || !c.items.has(itemId))throw new Error(`${itemId}: a current row-split record is required`);
  const existingErrors=validateRowSplitRecords(c,itemId);
  if(existingErrors.length)throw new Error('Invalid existing row mapping: '+existingErrors.join('; '));
  const record=promoteRowSplitRecord(previous),aliases=record.aliases!;
  const byId=new Map(aliases.map(alias=>[alias.original.id,alias]));
  for(const value of input){
    const alias=RowSplitAliasSchema.parse(value),id=alias.original.id,prior=byId.get(id);
    if(prior){
      if(!same(prior,alias))throw new Error(`${itemId}/${id}: conflicting existing historical alias; version ambiguity needs separate handling`);
      continue;
    }
    if(c.items.get(itemId)!.rows.some(row=>row.id===id) || record.rows.some(row=>row.original.id===id))
      throw new Error(`${itemId}/${id}: historical alias identity is already live or is an original; a reused ID cannot be redirected`);
    aliases.push(alias);byId.set(id,alias);
  }
  const parsed=RowSplitRecordSchema.parse(record),trial:Corpus={...c,rowSplits:new Map(c.rowSplits)};
  trial.rowSplits.set(itemId,parsed);
  const errors=validateRowSplitRecords(trial,itemId);
  if(errors.length)throw new Error('Invalid historical alias mapping: '+errors.join('; '));
  return parsed;
}

/** Collapse identical adjacent coordinate runs solely for equality checking. */
function coalesce(segments:Segment[]):Segment[] {
  const out:Segment[]=[];
  for(const s of segments){
    const last=out.at(-1);
    if(last && last.row===s.row && last.language===s.language && last.end===s.start &&
       last.target_start!==undefined && s.target_start===last.target_start+last.end-last.start) last.end=s.end;
    else out.push({...s});
  }
  return out;
}

/** Preserve pre-existing historical aliases while a layout is recompiled. Only
 * a direct unchanged row or an exact compiler-generated redirect may carry an
 * old destination forward; unresolved or reused rows fail closed. */
export function carryHistoricalAliases(before:Item,previous:RowSplitRecord,next:Item,compiled:RowSplitRecord):RowSplitRecord {
  const result=previous.format_version!==1 && compiled.format_version===1 ? promoteRowSplitRecord(compiled) : structuredClone(compiled);
  const prior=previous.aliases ?? [];
  if(!prior.length)return result;
  const record=result.format_version===1?promoteRowSplitRecord(result):result;
  const oldRows=new Map(before.rows.map(row=>[row.id,row]));
  const newRows=new Map(next.rows.map(row=>[row.id,row]));
  const redirects=new Map([...record.rows,...(record.aliases ?? [])].map(entry=>[entry.original.id,entry]));
  const currentAliases=new Map((record.aliases ?? []).map(alias=>[alias.original.id,alias]));
  const remap=(segment:Segment):Segment[]=>{
    const old=oldRows.get(segment.row),direct=newRows.get(segment.row),offset=segment.target_start;
    if(!old || offset===undefined)throw new Error(`${segment.row}: historical alias has no prior destination`);
    if(direct){
      if(!sameFields(old,direct))throw new Error(`${segment.row}: revision reuses a published row ID for different text or attribution`);
      return [{...segment}];
    }
    const redirect=redirects.get(segment.row);
    if(!redirect || !sameFields(old,redirect.original))
      throw new Error(`${segment.row}: revision would orphan a historical alias; request a mapping migration`);
    const finish=offset+segment.end-segment.start,parts:Segment[]=[];let cursor=offset;
    for(const target of redirect[segment.language]){
      const lo=Math.max(offset,target.start),hi=Math.min(finish,target.end);
      if(lo>=hi)continue;
      if(lo!==cursor || target.target_start===undefined)
        throw new Error(`${segment.row}: redirect cannot reconstruct the full historical alias`);
      parts.push({row:target.row,language:target.language,start:segment.start+lo-offset,end:segment.start+hi-offset,
        target_start:target.target_start+lo-target.start});cursor=hi;
    }
    if(cursor!==finish)throw new Error(`${segment.row}: redirect cannot reconstruct the full historical alias`);
    return parts;
  };
  for(const old of prior){
    const carried:RowSplitAlias={original:structuredClone(old.original),
      ar:old.ar.flatMap(remap),fa:old.fa.flatMap(remap)};
    const duplicate=currentAliases.get(old.original.id);
    if(duplicate){
      if(!same(duplicate.original,carried.original) || !same(coalesce(duplicate.ar),coalesce(carried.ar)) ||
         !same(coalesce(duplicate.fa),coalesce(carried.fa)))
        throw new Error(`${old.original.id}: compiled alias conflicts with an earlier historical alias`);
    } else {
      record.aliases!.push(carried);currentAliases.set(old.original.id,carried);
    }
  }
  return RowSplitRecordSchema.parse(record);
}
