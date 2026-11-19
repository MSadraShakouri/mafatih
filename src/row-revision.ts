import { spawnSync } from 'node:child_process';
import type { Corpus } from './corpus.js';
import { carryHistoricalAliases } from './row-alias-history.js';
import { assertHistoricalAliasLineage, fieldLineage, verifyHistoricalAliasEvidence, type LineageRun } from './row-alias-migration.js';
import { promoteRowSplitRecord, validateRowSplitRecords } from './row-splits.js';
import { ItemSchema, RowSplitAliasSchema, RowSplitRecordSchema, type Row, type RowSplitAlias, type RowSplitRecord } from './schema.js';
import type { compileCanonicalSplit } from './split-canonical.js';
import { codePoints } from './text-ids.js';

type Language='ar'|'fa';
type Segment=RowSplitAlias['ar'][number];
type Candidate=ReturnType<typeof compileCanonicalSplit>;
type TargetRun=LineageRun & {row:string;language:Language};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sameFields=(a:Row|undefined,b:Row|undefined):boolean=>Boolean(a&&b&&a.ar===b.ar&&a.fa===b.fa&&
  same(a.sources?.ar ?? [],b.sources?.ar ?? [])&&same(a.sources?.fa ?? [],b.sources?.fa ?? []));

/** Compose a checked re-split from frozen source-occurrence coordinates. This
 * is only the local candidate: the caller must additionally verify reachable
 * history, confirmation, ownership, canonical validity and independent review.
 * No matching by text alone is allowed, even when the text repeats. */
export function prepareLiveRevision(base:Corpus,current:Corpus,itemId:string,candidate:Candidate):{
    corpus:Corpus;record:RowSplitRecord;retired:RowSplitAlias[];newLive:Row[] } {
  const before=current.items.get(itemId),previous=current.rowSplits.get(itemId);
  if(!before||!previous||candidate.itemId!==itemId)throw new Error(`${itemId}: current published item and mapping are required`);
  const trial:Corpus={...current,items:new Map(current.items),texts:new Map(current.texts),
    textShards:new Map(current.textShards),rowSplits:new Map(current.rowSplits)};
  trial.items.set(itemId,candidate.item);
  for(const [id,value] of candidate.texts){
    const existing=trial.texts.get(id);if(existing!==undefined&&existing!==value)throw new Error(`Text hash collision: ${id}`);
    trial.texts.set(id,value);trial.textShards.set(id,id.slice(1,3));
  }
  let record=promoteRowSplitRecord(candidate.record);trial.rowSplits.set(itemId,record);
  const nextRows=new Map(candidate.item.rows.map(row=>[row.id,row]));
  const oldRows=new Map(before.rows.map(row=>[row.id,row]));
  const targetRuns=new Map<string,TargetRun[]>();
  for(const row of candidate.item.rows)for(const language of ['ar','fa'] as const){
    if(row[language]===null)continue;
    for(const run of fieldLineage(base,trial,itemId,candidate.item,record,row.id,language)){
      const list=targetRuns.get(run.origin) ?? [];list.push({...run,row:row.id,language});targetRuns.set(run.origin,list);
    }
  }
  const field=(old:Row,language:Language):Segment[]=>{
    if(old[language]===null)return [];
    const oldRuns=fieldLineage(base,trial,itemId,before,previous,old.id,language),out:Segment[]=[];
    for(const run of oldRuns){
      let consumed=0;
      while(consumed<run.end-run.start){
        const at=run.originStart+consumed,list=targetRuns.get(run.origin) ?? [];
        const candidates=list.filter(t=>t.originStart<=at&&at<t.originStart+t.end-t.start);
        if(candidates.length!==1)throw new Error(`${itemId}/${old.id}/${language}: source lineage has ${candidates.length} destinations; preserve and report`);
        const target=candidates[0]!,length=Math.min(run.end-run.start-consumed,target.originStart+target.end-target.start-at);
        if(length<=0)throw new Error(`${itemId}/${old.id}/${language}: empty source-lineage composition`);
        if(list.some(other=>other!==target&&other.originStart<at+length&&other.originStart+other.end-other.start>at))
          throw new Error(`${itemId}/${old.id}/${language}: overlapping source lineage destinations`);
        const part:Segment={row:target.row,language:target.language,start:run.start+consumed,
          end:run.start+consumed+length,target_start:target.start+at-target.originStart};
        const last=out.at(-1);
        if(last&&last.row===part.row&&last.language===part.language&&last.end===part.start&&
           last.target_start!==undefined&&part.target_start===last.target_start+last.end-last.start)last.end=part.end;
        else out.push(part);
        consumed+=length;
      }
    }
    return out;
  };
  const origins=()=>new Map([...record.rows,...(record.aliases ?? [])].map(entry=>[entry.original.id,entry]));
  const retiredIds:string[]=[];
  for(const old of before.rows){
    const direct=nextRows.get(old.id);
    if(direct){
      if(!sameFields(old,direct))throw new Error(`${itemId}/${old.id}: revision would reuse a published ID for different text or attribution`);
      // Equal text is insufficient: an unchanged ID must still denote the
      // identical source occurrence, including any editorial insertion.
      const passthrough:RowSplitAlias={original:old,
        ar:old.ar===null?[]:[{row:old.id,language:'ar',start:0,end:codePoints(trial.texts.get(old.ar)!).length,target_start:0}],
        fa:old.fa===null?[]:[{row:old.id,language:'fa',start:0,end:codePoints(trial.texts.get(old.fa)!).length,target_start:0}]};
      assertHistoricalAliasLineage(base,trial,itemId,before,previous,passthrough);
      continue;
    }
    let redirect=origins().get(old.id);
    if(redirect){
      if(!sameFields(old,redirect.original))throw new Error(`${itemId}/${old.id}: revision would repurpose an existing identity`);
    } else {
      const alias=RowSplitAliasSchema.parse({original:structuredClone(old),ar:field(old,'ar'),fa:field(old,'fa')});
      record.aliases!.push(alias);redirect=alias;
    }
    retiredIds.push(old.id);
  }
  record=carryHistoricalAliases(before,previous,candidate.item,record);trial.rowSplits.set(itemId,record);
  const entries=origins(),retired=retiredIds.map(id=>{
    const entry=entries.get(id),old=oldRows.get(id);
    if(!entry||!sameFields(old,entry.original))throw new Error(`${itemId}/${id}: revision would orphan a published row`);
    const alias=RowSplitAliasSchema.parse({original:entry.original,ar:entry.ar,fa:entry.fa});
    assertHistoricalAliasLineage(base,trial,itemId,before,previous,alias);
    return alias;
  });
  const errors=validateRowSplitRecords(trial,itemId);
  if(errors.length)throw new Error(`Invalid composed live revision: ${errors.join('; ')}`);
  return {corpus:trial,record,retired,newLive:candidate.item.rows.filter(row=>!oldRows.has(row.id))};
}

/** A revision must not introduce an ID that ever meant something else in the
 * reachable history. Historical aliases are deliberately conservative: if an
 * affected identity appeared as an alias, stop for a version-aware decision. */
export function verifyLiveRevisionHistory(baseSha:string,head:string,base:Corpus,current:Corpus,itemId:string,
    before:RowSplitRecord,retired:RowSplitAlias[],newLive:Row[]):void {
  if(!/^[a-f0-9]{40}$/.test(baseSha)||!/^[a-f0-9]{40}$/.test(head))throw new Error('A full base and history commit are required');
  const git=(args:string[])=>{
    const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
    if(result.status!==0)throw new Error(`Cannot inspect revision history: git ${args[0]} failed`);
    return result.stdout;
  };
  if(git(['rev-parse','--is-shallow-repository']).trim()!=='false')throw new Error('Live revision requires complete local Git history; a shallow history is unsafe');
  const previousItem=current.items.get(itemId);
  const nextRecord=current.rowSplits.get(itemId);
  if(!previousItem||!nextRecord)throw new Error(`${itemId}: revised item or mapping is missing`);
  const targets=new Map<string,RowSplitAlias>();
  for(const alias of retired)targets.set(alias.original.id,alias);
  for(const row of newLive){
    const segment=(language:Language):Segment[]=>row[language]===null?[]:[{row:row.id,language,start:0,
      end:codePoints(current.texts.get(row[language]!)!).length,target_start:0}];
    targets.set(row.id,{original:row,ar:segment('ar'),fa:segment('fa')});
  }
  const known=new Set([...before.rows.map(entry=>entry.original.id),...(before.aliases ?? []).map(entry=>entry.original.id)]);
  for(const alias of nextRecord.aliases ?? [])if(!known.has(alias.original.id)&&!targets.has(alias.original.id))targets.set(alias.original.id,alias);
  if(!targets.size)return;
  const itemPath=`data/items/${itemId}.json`,recordPath=`data/row-splits/${itemId}.json`;
  const commits=[...new Set([...git(['log','--full-history','--format=%H',`${baseSha}..${head}`,'--',itemPath,recordPath]).split('\n').filter(Boolean),baseSha])];
  if(commits.length>10000||commits.some(sha=>!/^[a-f0-9]{40}$/.test(sha)))throw new Error(`${itemId}: history exceeds the safe revision audit limit`);
  const requests=commits.flatMap(sha=>[`${sha}:${itemPath}`,`${sha}:${recordPath}`]);
  const response=spawnSync('git',['cat-file','--batch'],{encoding:'buffer',input:Buffer.from(requests.join('\n')+'\n'),maxBuffer:128*1024*1024});
  if(response.status!==0)throw new Error(`${itemId}: cannot inspect revision history`);
  const data=response.stdout,bodies:Array<string|undefined>=[];let cursor=0;
  for(const request of requests){
    const eol=data.indexOf(10,cursor);if(eol<0)throw new Error(`${itemId}: truncated revision history`);
    const header=data.subarray(cursor,eol).toString('ascii'),match=/^[a-f0-9]{40} blob (\d+)$/.exec(header);
    if(!match){
      if(header===`${request} missing`){bodies.push(undefined);cursor=eol+1;continue;}
      throw new Error(`${itemId}: invalid revision history object`);
    }
    const length=Number(match[1]),start=eol+1,end=start+length;
    if(!Number.isSafeInteger(length)||data[end]!==10)throw new Error(`${itemId}: truncated revision history blob`);
    bodies.push(data.subarray(start,end).toString('utf8'));cursor=end+1;
  }
  if(cursor!==data.length)throw new Error(`${itemId}: trailing revision history data`);
  const published=new Set<string>();
  for(const [index,sha] of commits.entries()){
    const itemBody=bodies[index*2],recordBody=bodies[index*2+1];
    if(itemBody===undefined)throw new Error(`${itemId}: ${sha} lacks a historical item`);
    const item=ItemSchema.parse(JSON.parse(itemBody) as unknown);
    for(const row of item.rows)if(targets.has(row.id))published.add(row.id);
    if(recordBody===undefined)continue;
    const record=RowSplitRecordSchema.parse(JSON.parse(recordBody) as unknown);
    for(const alias of record.aliases ?? [])if(targets.has(alias.original.id))
      throw new Error(`${itemId}/${alias.original.id}: this affected ID previously existed as an alias; version-aware handling is required`);
    for(const entry of record.rows){
      const target=targets.get(entry.original.id);
      if(target&&!sameFields(target.original,entry.original))
        throw new Error(`${itemId}/${entry.original.id}: historical original has a different meaning`);
    }
  }
  for(const alias of retired)if(!published.has(alias.original.id))throw new Error(`${itemId}/${alias.original.id}: retiring row was not published in reachable history`);
  const toCheck=[...targets.values()].filter(alias=>published.has(alias.original.id));
  const liveIds=new Set(newLive.map(row=>row.id));
  const redirects=toCheck.filter(alias=>!liveIds.has(alias.original.id)),live=toCheck.filter(alias=>liveIds.has(alias.original.id));
  if(redirects.length)verifyHistoricalAliasEvidence(itemId,redirects,baseSha,head,base,current);
  // A still-live original may change only its role while retaining the exact
  // fields, attribution and source lineage. A redirect's historical original
  // remains strictly required to match a published kind.
  if(live.length)verifyHistoricalAliasEvidence(itemId,live,baseSha,head,base,current,{allowRoleOnly:true});
}
