import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import type { Corpus } from './corpus.js';
import { ItemSchema, Key, RowSplitAliasSchema, RowSplitRecordSchema, type Item, type Row, type RowSplitAlias, type RowSplitRecord } from './schema.js';
import { codePoints, slicePoints } from './text-ids.js';

const Commit=z.string().regex(/^[a-f0-9]{40}$/);
const ItemAliases=z.object({item:Key,aliases:z.array(RowSplitAliasSchema).min(1)}).strict();
const ExplicitBundle=z.object({format_version:z.literal(1),protocol:z.literal('ar-fa-retired-row-aliases-v1'),
  author:Key,base:Commit,target_snapshot:Commit,items:z.array(ItemAliases).min(1)}).strict();
// Read agent-6's published proposal without trusting its audit conclusions or
// importing the text-bearing reports which accompany some other proposals.
const ProposedBundle=z.object({format_version:z.literal(2),kind:z.literal('historical-row-link-proposal'),
  author:Key,base:Commit,target_snapshot:Commit,items:z.array(z.object({item:Key,ids:z.number().int().nonnegative(),
    entries:z.array(z.object({old_id:Key,proposed_alias:RowSplitAliasSchema}).passthrough())}).passthrough()).min(1)}).passthrough();
export type AliasMigrationBundle=z.infer<typeof ExplicitBundle>;

/** Normalize only non-text-bearing IDs, pooled references and code-point spans. */
export function parseAliasMigrationBundle(value:unknown):AliasMigrationBundle {
  const candidate=ExplicitBundle.safeParse(value);
  let bundle:AliasMigrationBundle;
  if(candidate.success)bundle=candidate.data;
  else {
    const proposed=ProposedBundle.parse(value);
    bundle=ExplicitBundle.parse({format_version:1,protocol:'ar-fa-retired-row-aliases-v1',
      author:proposed.author,base:proposed.base,target_snapshot:proposed.target_snapshot,
      items:proposed.items.map(item=>{
        if(item.ids!==item.entries.length || item.entries.some(entry=>entry.old_id!==entry.proposed_alias.original.id))
          throw new Error(`${item.item}: proposed IDs do not match the alias entries`);
        return {item:item.item,aliases:item.entries.map(entry=>entry.proposed_alias)};
      })});
  }
  const seenItems=new Set<string>();
  for(const item of bundle.items){
    if(seenItems.has(item.item))throw new Error(`${item.item}: duplicate migration item`);seenItems.add(item.item);
    const ids=new Set<string>();for(const alias of item.aliases){
      if(ids.has(alias.original.id))throw new Error(`${item.item}/${alias.original.id}: duplicate proposed alias`);
      ids.add(alias.original.id);
    }
  }
  return bundle;
}

function git(args:string[],input?:string,maxBuffer=128*1024*1024):string {
  const p=spawnSync('git',args,{encoding:'utf8',input,maxBuffer});
  if(p.status!==0)throw new Error(`git ${args[0]} failed: ${p.stderr.trim()}`);
  return p.stdout;
}
function sameMeaning(a:Row,b:Row):boolean {
  return a.ar===b.ar && a.fa===b.fa && JSON.stringify(a.sources?.ar ?? [])===JSON.stringify(b.sources?.ar ?? []) &&
    JSON.stringify(a.sources?.fa ?? [])===JSON.stringify(b.sources?.fa ?? []);
}

type Language='ar'|'fa';
type LineageRun={start:number;end:number;origin:string;originStart:number};
/** Map a physical field back to its precise frozen occurrences. A source slice
 * is identified by original row, source language and code-point offset, not
 * by its (possibly repeated) text. Editorial spaces are identified by their
 * neighboring source offsets and may never masquerade as source characters. */
function fieldLineage(base:Corpus,current:Corpus,itemId:string,item:Item,record:RowSplitRecord|undefined,
    rowId:string,language:Language):LineageRun[] {
  const frozen=base.items.get(itemId),row=item.rows.find(entry=>entry.id===rowId);
  if(!frozen||!row||row[language]===null)throw new Error(`${itemId}/${rowId}/${language}: lineage field is absent`);
  const value=current.texts.get(row[language]!);
  if(value===undefined)throw new Error(`${itemId}/${rowId}/${language}: historical pooled value is missing`);
  const length=codePoints(value).length, originals=new Map(frozen.rows.map(entry=>[entry.id,entry]));
  const runs:LineageRun[]=[],inserts:number[]=[];
  if(record){
    if(record.item!==itemId || record.baseline_item_sha256!==current.rowSplits.get(itemId)?.baseline_item_sha256)
      throw new Error(`${itemId}/${rowId}: historical lineage has a different frozen baseline`);
    for(const entry of record.rows)for(const source of ['ar','fa'] as const)for(const segment of entry[source]){
      if(segment.row!==rowId||segment.language!==language)continue;
      const original=originals.get(entry.original.id),targetStart=segment.target_start ?? 0;
      if(!original || JSON.stringify(original)!==JSON.stringify(entry.original) || original[source]===null ||
         (record.format_version===1 ? segment.target_start!==undefined : segment.target_start===undefined) ||
         !Number.isSafeInteger(targetStart) || targetStart<0 || !Number.isSafeInteger(segment.start) ||
         !Number.isSafeInteger(segment.end) || segment.start<0 || segment.end<=segment.start)
        throw new Error(`${itemId}/${rowId}: invalid historical source lineage`);
      const originalText=base.texts.get(original[source]!),end=targetStart+segment.end-segment.start;
      if(originalText===undefined || segment.end>codePoints(originalText).length || end>length ||
         slicePoints(originalText,segment.start,segment.end)!==slicePoints(value,targetStart,end) ||
         JSON.stringify(original.sources?.[source] ?? [])!==JSON.stringify(row.sources?.[language] ?? []))
        throw new Error(`${itemId}/${rowId}: historical source lineage does not reconstruct its field`);
      runs.push({start:targetStart,end,origin:`source:${original.id}:${source}`,originStart:segment.start});
    }
    const origins=new Map([...record.rows,...(record.aliases ?? [])].map(entry=>[entry.original.id,entry]));
    for(const insertion of record.insertions ?? []){
      if(insertion.row!==rowId||insertion.language!==language)continue;
      const start=insertion.target_start,left=origins.get(insertion.left),right=origins.get(insertion.right);
      const touchesLeft=left?.[language].some(s=>s.row===rowId&&s.language===language&&
        s.target_start!==undefined&&s.target_start+s.end-s.start===start);
      const touchesRight=right?.[language].some(s=>s.row===rowId&&s.language===language&&s.target_start===start+1);
      if(insertion.value!==' ' || !Number.isSafeInteger(start) || start<=0 || start>=length-1 ||
         codePoints(value)[start]!==' ' || !touchesLeft || !touchesRight)
        throw new Error(`${itemId}/${rowId}: invalid editorial-insertion lineage`);
      inserts.push(start);
    }
  }
  // Rows omitted from a split record are unchanged frozen originals.
  const explicitlyMapped=record?.rows.some(entry=>entry.results.includes(rowId)) ?? false;
  if(!explicitlyMapped){
    const original=originals.get(rowId);
    if(!original || original[language]!==row[language] ||
       JSON.stringify(original.sources?.[language] ?? [])!==JSON.stringify(row.sources?.[language] ?? []))
      throw new Error(`${itemId}/${rowId}: no frozen source lineage for this historical field`);
    runs.push({start:0,end:length,origin:`source:${rowId}:${language}`,originStart:0});
  }
  const containing=(offset:number)=>runs.find(run=>run.start<=offset&&offset<run.end);
  for(const start of inserts){
    const left=containing(start-1),right=containing(start+1);
    if(!left||!right)throw new Error(`${itemId}/${rowId}: cannot establish insertion lineage`);
    const leftAt=left.originStart+start-1-left.start,rightAt=right.originStart+start+1-right.start;
    runs.push({start,end:start+1,origin:`insertion:${left.origin}:${leftAt}:${right.origin}:${rightAt}`,originStart:0});
  }
  runs.sort((a,b)=>a.start-b.start);let end=0;
  for(const run of runs){if(run.start!==end||run.end<=run.start)throw new Error(`${itemId}/${rowId}: incomplete or overlapping source lineage`);end=run.end;}
  if(end!==length)throw new Error(`${itemId}/${rowId}: incomplete source lineage`);
  return runs;
}
function assertSameLineage(old:LineageRun[],target:LineageRun[],start:number,targetStart:number,length:number,label:string):void {
  let offset=0;
  while(offset<length){
    const a=old.find(run=>run.start<=start+offset&&start+offset<run.end);
    const b=target.find(run=>run.start<=targetStart+offset&&targetStart+offset<run.end);
    if(!a||!b||a.origin!==b.origin||a.originStart+start+offset-a.start!==b.originStart+targetStart+offset-b.start)
      throw new Error(`${label}: destination has different source lineage, even if the text repeats`);
    offset+=Math.min(a.end-start-offset,b.end-targetStart-offset,length-offset);
  }
}

/** Compare exact source provenance, including tracked editorial insertions, for
 * one independently identified historical occurrence and a proposed alias. */
export function assertHistoricalAliasLineage(base:Corpus,current:Corpus,itemId:string,historicalItem:Item,
    historicalRecord:RowSplitRecord|undefined,alias:RowSplitAlias,cache=new Map<string,LineageRun[]>()):void {
  const targetItem=current.items.get(itemId),targetRecord=current.rowSplits.get(itemId),id=alias.original.id;
  if(!targetItem||!targetRecord)throw new Error(`${itemId}: target item and mapping are required`);
  for(const language of ['ar','fa'] as const){
    if(alias.original[language]===null)continue;
    const old=fieldLineage(base,current,itemId,historicalItem,historicalRecord,id,language);
    for(const segment of alias[language]){
      const key=`${segment.row}\0${segment.language}`;
      let target=cache.get(key);
      if(!target){target=fieldLineage(base,current,itemId,targetItem,targetRecord,segment.row,segment.language);cache.set(key,target);}
      if(segment.target_start===undefined || segment.end<=segment.start)
        throw new Error(`${itemId}/${id}: invalid historical alias lineage segment`);
      assertSameLineage(old,target,segment.start,segment.target_start,segment.end-segment.start,`${itemId}/${id}`);
    }
  }
}

/** Audit all reachable versions of one item from the frozen base to HEAD.
 * A single-key alias is never emitted for an ID with distinct historical text
 * or source attributions. This deliberately does not claim coverage of commits
 * absent from the local reachable history. */
export function verifyHistoricalAliasEvidence(item:string,aliases:RowSplitAlias[],baseSha:string,head:string,
    base:Corpus,current:Corpus):void {
  Key.parse(item);Commit.parse(baseSha);Commit.parse(head);
  if(git(['rev-parse','--is-shallow-repository']).trim()!=='false')
    throw new Error('Historical alias migration requires complete local Git history; a shallow history cannot establish ambiguity');
  const itemPath=`data/items/${item}.json`,recordPath=`data/row-splits/${item}.json`;
  const changed=git(['log','--full-history','--format=%H',`${baseSha}..${head}`,'--',itemPath,recordPath]).split('\n').filter(Boolean);
  const commits=[...new Set([...changed,baseSha])];
  if(commits.length>10000)throw new Error(`${item}: history exceeds the safe audit limit`);
  for(const sha of commits)Commit.parse(sha);
  // Missing records are acceptable only for unmodified frozen rows. No absent
  // item is treated as proof of a row's identity.
  const readBatch=(requests:string[]):Array<string|undefined>=>{
    if(!requests.length)return [];
    const response=spawnSync('git',['cat-file','--batch'],{encoding:'buffer',input:Buffer.from(requests.join('\n')+'\n'),maxBuffer:128*1024*1024});
    if(response.status!==0)throw new Error(`${item}: could not inspect historical item or mapping versions`);
    const data=response.stdout,out:Array<string|undefined>=[];let cursor=0;
    for(const request of requests){
      const eol=data.indexOf(10,cursor);if(eol<0)throw new Error(`${item}: truncated history`);
      const header=data.subarray(cursor,eol).toString('ascii'),match=/^[a-f0-9]{40} blob (\d+)$/.exec(header);
      if(!match){
        if(header===`${request} missing`){out.push(undefined);cursor=eol+1;continue;}
        throw new Error(`${item}: invalid historical Git object`);
      }
      const n=Number(match[1]),start=eol+1,end=start+n;
      if(!Number.isSafeInteger(n)||data[end]!==10)throw new Error(`${item}: truncated historical blob`);
      out.push(data.subarray(start,end).toString('utf8'));cursor=end+1;
    }
    if(cursor!==data.length)throw new Error(`${item}: trailing historical data`);return out;
  };
  const itemBodies=readBatch(commits.map(sha=>`${sha}:${itemPath}`));
  const history=commits.map((sha,index)=>{
    const body=itemBodies[index];if(body===undefined)throw new Error(`${item}: ${sha} lacks a readable historical item`);
    return {sha,item:ItemSchema.parse(JSON.parse(body) as unknown)};
  });
  const ids=new Set(aliases.map(alias=>alias.original.id));
  const relevant=history.filter(snapshot=>snapshot.item.rows.some(row=>ids.has(row.id)));
  const bodies=readBatch(relevant.map(snapshot=>`${snapshot.sha}:${recordPath}`));
  const records=new Map(relevant.map((snapshot,index)=>[snapshot.sha,bodies[index]===undefined ? undefined :
    RowSplitRecordSchema.parse(JSON.parse(bodies[index]!) as unknown)]));
  const targetCache=new Map<string,LineageRun[]>();
  for(const alias of aliases){
    const id=alias.original.id,occurrences:Array<{row:Row;snapshot:typeof relevant[number]}>=[];
    for(const snapshot of relevant){
      const found=snapshot.item.rows.filter(row=>row.id===id);
      if(found.length>1)throw new Error(`${item}/${id}: duplicate ID in historical item`);
      for(const row of found)occurrences.push({row,snapshot});
    }
    if(!occurrences.length)throw new Error(`${item}/${id}: not found in reachable history`);
    if(occurrences.some(entry=>!sameMeaning(entry.row,occurrences[0]!.row)))
      throw new Error(`${item}/${id}: different historical meanings require version-aware handling, not an ordinary alias`);
    if(!occurrences.some(entry=>JSON.stringify(entry.row)===JSON.stringify(alias.original)))
      throw new Error(`${item}/${id}: alias original does not match a historical row and kind`);
    for(const {snapshot} of occurrences)
      assertHistoricalAliasLineage(base,current,item,snapshot.item,records.get(snapshot.sha),alias,targetCache);
  }
}
