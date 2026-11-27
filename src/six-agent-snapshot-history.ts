import { spawnSync } from 'node:child_process';
import { validateCorpus } from './corpus.js';
import { gitCommit, gitFile, loadCorpusAtCommit } from './git-corpus.js';
import { carryHistoricalAliases } from './row-alias-history.js';
import { assertHistoricalAliasLineage } from './row-alias-migration.js';
import { AgentPartitionsSchema, AgentPlanSchema, verifyAgentPartitions } from './split-agent.js';
import { verifyCanonicalResult } from './split-canonical.js';
import { codePoints } from './text-ids.js';
import type { Row, RowSplitAlias } from './schema.js';

function gitRaw(args:string[]):string {
  const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
  if(result.status!==0)throw new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout;
}
function git(args:string[]):string {return gitRaw(args).trim();}
function ancestor(a:string,b:string):boolean {
  const result=spawnSync('git',['merge-base','--is-ancestor',a,b]);
  if(result.status!==0&&result.status!==1)throw new Error(`Cannot compare snapshot ancestry: ${a} ${b}`);
  return result.status===0;
}
function exists(commit:string,file:string):boolean {return spawnSync('git',['cat-file','-e',`${commit}:${file}`]).status===0;}
const sameFields=(a:Row,b:Row):boolean=>a.ar===b.ar&&a.fa===b.fa&&
  JSON.stringify(a.sources?.ar ?? [])===JSON.stringify(b.sources?.ar ?? [])&&JSON.stringify(a.sources?.fa ?? [])===JSON.stringify(b.sources?.fa ?? []);

/** Enumerate both published snapshot subject forms and select only by ancestry.
 * Never rely on dates, log order, or a manually selected incomparable candidate. */
export function maximalAuthorSnapshots(base:string,head:string,who:string):string[] {
  gitCommit(base);gitCommit(head);
  if(!/^agent-[1-6]$/.test(who))throw new Error('Invalid snapshot author');
  if(git(['rev-parse','--is-shallow-repository'])!=='false')throw new Error('Full history is required to select an author snapshot');
  if(!ancestor(base,head))throw new Error('Frozen base is not an ancestor of HEAD');
  const output=git(['log','--format=%H%x09%s',`${base}..${head}`]);
  const titles=new Set([`Isolated ${who} authored snapshot`,`Isolated ${who} consolidated author snapshot`]);
  const candidates=output?output.split('\n').map(line=>line.split('\t')).filter(parts=>titles.has(parts.slice(1).join('\t'))).map(parts=>parts[0]!):[];
  if(candidates.length>10000)throw new Error('Too many snapshot candidates; preserve and report');
  const maximal=candidates.filter(a=>!candidates.some(b=>a!==b&&ancestor(a,b))).sort();
  return maximal;
}
export function selectAuthorSnapshot(base:string,head:string,who:string):string {
  const maximal=maximalAuthorSnapshots(base,head,who);
  if(maximal.length>1)throw new Error(`Incomparable author snapshots: ${maximal.join(', ')}; use an explicitly reviewed snapshot bridge`);
  return maximal[0] ?? base;
}

/** Validate a proposed tree-preserving two-parent bridge. The first parent is
 * explicit, never inferred. All old live rows and existing aliases from the
 * other parent must still resolve with the same frozen occurrence lineage. */
export function verifyAuthorSnapshotBridge(base:string,head:string,who:string,primary:string,secondary:string):void {
  gitCommit(primary);gitCommit(secondary);
  const candidates=maximalAuthorSnapshots(base,head,who);
  if(primary===secondary||candidates.length!==2||!candidates.includes(primary)||!candidates.includes(secondary))
    throw new Error(`Bridge requires both distinct incomparable maximal snapshots reachable from HEAD: ${candidates.join(', ')||'(none)'}`);
  const manifestPath='docs/split-assignments/assignments.json',manifestRaw=gitFile(base,manifestPath);
  if([head,primary,secondary].some(c=>gitFile(c,manifestPath)!==manifestRaw))throw new Error('Assignment manifest differs from frozen base');
  const manifest=AgentPartitionsSchema.parse(JSON.parse(manifestRaw) as unknown),frozen=loadCorpusAtCommit(base);
  verifyAgentPartitions(frozen,manifest);
  const group=manifest.groups.find(g=>g.agent===who);if(!group)throw new Error('Missing author assignment');
  const assigned=new Set(group.items.map(i=>i.item));
  // Both parents must be isolated to this author's items, pool additions and own metadata.
  for(const snapshot of [primary,secondary]){
    const paths=gitRaw(['diff','--name-only','-z',base,snapshot]).split('\0').filter(Boolean);
    for(const file of paths){
      const item=/^data\/(?:items|row-splits)\/([a-z0-9-]+)\.json$/.exec(file);
      if(file.startsWith(`agent-work/${who}/`)||/^data\/texts\/[0-9a-f]{2}\.json$/.test(file)||(item&&assigned.has(item[1]!)))continue;
      throw new Error(`${snapshot}: non-isolated path ${file}`);
    }
  }
  // A bridge must not silently drop the other snapshot's own metadata files.
  for(const file of gitRaw(['ls-tree','-r','--name-only','-z',secondary,'--',`agent-work/${who}/`]).split('\0').filter(Boolean))
    if(!exists(primary,file))throw new Error(`${file}: selected snapshot lost published author metadata`);
  const selected=loadCorpusAtCommit(primary),other=loadCorpusAtCommit(secondary),branch=loadCorpusAtCommit(head);
  for(const [name,corpus] of [['primary',selected],['secondary',other],['branch',branch]] as const){
    const errors=validateCorpus(corpus).errors;if(errors.length)throw new Error(`${name} corpus invalid: ${errors.join('; ')}`);
  }
  for(const [id,value] of frozen.texts)if(other.texts.get(id)!==value)throw new Error(`Secondary snapshot lost frozen pooled value ${id}`);
  for(const [name,corpus] of [['base',frozen],['secondary',other]] as const)for(const [id,value] of corpus.texts)
    if(selected.texts.get(id)!==value)throw new Error(`${name} pooled value ${id} missing or changed in selected snapshot`);
  for(const [id,value] of selected.texts)if(branch.texts.get(id)!==value)throw new Error(`Selected pooled value ${id} missing or changed on branch`);
  for(const {item} of group.items){
    const paths=[`data/items/${item}.json`,`data/row-splits/${item}.json`,`agent-work/${who}/plans/${item}.json`,`agent-work/${who}/layouts/${item}.json`];
    for(const file of paths){
      const a=exists(primary,file),b=exists(head,file);
      if(a!==b||(a&&gitFile(primary,file)!==gitFile(head,file)))throw new Error(`${item}: selected snapshot does not match the committed branch at ${file}`);
    }
    for(const [label,commit,corpus] of [['primary',primary,selected],['secondary',secondary,other]] as const){
      const record=corpus.rowSplits.get(item);
      if(record){
        if(record.author!==who)throw new Error(`${label}/${item}: wrong author`);
        const plan=JSON.parse(gitFile(commit,paths[2]!)) as unknown,layout=JSON.parse(gitFile(commit,paths[3]!)) as unknown;
        const parsed=AgentPlanSchema.parse(plan);
        if(parsed.author!==who||parsed.item!==item||parsed.sources.some(source=>source.cut_after!==undefined)||parsed.punctuation_suggestions.length)
          throw new Error(`${label}/${item}: unsafe or misassigned plan`);
        verifyCanonicalResult(frozen,corpus,plan,layout);
      } else if(JSON.stringify(corpus.items.get(item))!==JSON.stringify(frozen.items.get(item)))
        throw new Error(`${label}/${item}: changes lack a reversible mapping`);
    }
    const oldItem=other.items.get(item),newItem=selected.items.get(item),oldRecord=other.rowSplits.get(item),newRecord=selected.rowSplits.get(item);
    if(!oldItem||!newItem)throw new Error(`${item}: missing item`);
    if(oldRecord&&!newRecord)throw new Error(`${item}: selected snapshot lost a published mapping`);
    if(oldRecord&&newRecord){
      const newAliases=new Map((newRecord.aliases ?? []).map(a=>[a.original.id,a]));
      for(const alias of oldRecord.aliases ?? [])if(!newAliases.has(alias.original.id))throw new Error(`${item}/${alias.original.id}: selected snapshot lost a published alias`);
      carryHistoricalAliases(oldItem,oldRecord,newItem,newRecord);
    }
    const newRows=new Map(newItem.rows.map(row=>[row.id,row]));
    const mappings=new Map([...(newRecord?.rows ?? []),...(newRecord?.aliases ?? [])].map(e=>[e.original.id,e]));
    for(const old of oldItem.rows){
      const live=newRows.get(old.id),entry=mappings.get(old.id);
      let alias:RowSplitAlias;
      if(live){
        if(!sameFields(old,live))throw new Error(`${item}/${old.id}: selected snapshot reuses a live ID`);
        const segments=(lang:'ar'|'fa')=>old[lang]===null?[]:[{row:old.id,language:lang,start:0,end:codePoints(other.texts.get(old[lang]!)!).length,target_start:0}];
        alias={original:old,ar:segments('ar'),fa:segments('fa')};
      }else{
        if(!entry||!sameFields(old,entry.original))throw new Error(`${item}/${old.id}: selected snapshot loses or repurposes a published row`);
        alias={original:entry.original,ar:entry.ar,fa:entry.fa};
      }
      if(newRecord)assertHistoricalAliasLineage(frozen,selected,item,oldItem,oldRecord,alias);
      else if(!live||oldRecord)throw new Error(`${item}/${old.id}: missing lineage`);
    }
  }
}
