import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

/** Enumerate recognized published snapshot subjects and select only by ancestry.
 * Never rely on dates, log order, or a manually selected incomparable candidate. */
export function maximalAuthorSnapshots(base:string,head:string,who:string):string[] {
  gitCommit(base);gitCommit(head);
  if(!/^agent-[1-6]$/.test(who))throw new Error('Invalid snapshot author');
  if(git(['rev-parse','--is-shallow-repository'])!=='false')throw new Error('Full history is required to select an author snapshot');
  if(!ancestor(base,head))throw new Error('Frozen base is not an ancestor of HEAD');
  const output=git(['log','--format=%H%x09%s',`${base}..${head}`]);
  const guarded=`Isolated ${who} guarded bridge snapshot`;
  const titles=new Set([`Isolated ${who} authored snapshot`,`Isolated ${who} consolidated author snapshot`,guarded]);
  const entries=output?output.split('\n').map(line=>line.split('\t')).filter(parts=>titles.has(parts.slice(1).join('\t'))):[];
  for(const entry of entries.filter(parts=>parts.slice(1).join('\t')===guarded)){
    const bridge=entry[0]!,parents=git(['show','-s','--format=%P',bridge]).split(' ').filter(Boolean);
    if(parents.length!==2||parents[0]===parents[1]||parents.some(p=>!ancestor(base,p))||
       parents.some(p=>!titles.has(git(['show','-s','--format=%s',p])))||ancestor(parents[0]!,parents[1]!)||ancestor(parents[1]!,parents[0]!)||
       !parents.some(p=>git(['rev-parse',`${p}^{tree}`])===git(['rev-parse',`${bridge}^{tree}`])))
      throw new Error(`${bridge}: malformed guarded bridge; preserve and report`);
  }
  const candidates=entries.map(parts=>parts[0]!);
  if(candidates.length>10000)throw new Error('Too many snapshot candidates; preserve and report');
  const maximal=candidates.filter(a=>!candidates.some(b=>a!==b&&ancestor(a,b))).sort();
  return maximal;
}
export function selectAuthorSnapshot(base:string,head:string,who:string):string {
  const maximal=maximalAuthorSnapshots(base,head,who);
  if(maximal.length>1)throw new Error(`Incomparable author snapshots: ${maximal.join(', ')}; use an explicitly reviewed snapshot bridge`);
  return maximal[0] ?? base;
}

export type BridgeMetadata={path:string;primary:string|null;secondary:string|null};
/** Validate a proposed tree-preserving two-parent bridge. The selected tree is
 * explicit, never inferred. All old live rows and existing aliases from the
 * other parent must still resolve with the same frozen occurrence lineage. */
export function verifyAuthorSnapshotBridge(base:string,head:string,who:string,primary:string,secondary:string,metadata:BridgeMetadata[]=[]):void {
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
  // Extra metadata is allowed only with an explicit, hash-bound decision per path.
  if(!Array.isArray(metadata))throw new Error('Bridge metadata must be an array');
  const approved=new Map<string,BridgeMetadata>();
  for(const entry of metadata){
    if(!entry||typeof entry!=='object'||Object.keys(entry).sort().join(',')!=='path,primary,secondary'||
       typeof entry.path!=='string'||!entry.path.startsWith(`agent-work/${who}/`)||
       !/^[a-zA-Z0-9._/-]+$/.test(entry.path)||entry.path.split('/').includes('..')||
       entry.path===`agent-work/${who}/registration.json`||entry.path.startsWith(`agent-work/${who}/plans/`)||
       entry.path.startsWith(`agent-work/${who}/layouts/`)||entry.path.split('/').some(part=>part===''||part==='.')||
       ![entry.primary,entry.secondary].every(id=>id===null||typeof id==='string'&&/^[a-f0-9]{40}$/.test(id))||approved.has(entry.path))
      throw new Error('Invalid or duplicate bridge metadata declaration');
    approved.set(entry.path,entry);
  }
  const blob=(commit:string,file:string):string|null=>{
    const output=gitRaw(['ls-tree','-z','--full-tree',commit,'--',file]);
    if(!output)return null;
    const match=/^100644 blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(output);
    if(!match||match[2]!==file)throw new Error(`${file}: metadata must be a regular 100644 blob`);
    return match[1]!;
  };
  const used=new Set<string>();
  for(const snapshot of [primary,secondary]){
    const paths=gitRaw(['diff','--name-only','-z',base,snapshot]).split('\0').filter(Boolean);
    for(const file of paths){
      const data=/^data\/(?:items|row-splits)\/([a-z0-9-]+)\.json$/.exec(file);
      const work=new RegExp(`^agent-work/${who}/(?:plans|layouts)/([a-z0-9-]+)\\.json$`).exec(file);
      if(/^data\/texts\/[0-9a-f]{2}\.json$/.test(file)||(data&&assigned.has(data[1]!))||(work&&assigned.has(work[1]!)))continue;
      const decision=approved.get(file);
      if(!decision)throw new Error(`${snapshot}: non-isolated path ${file}; explicit metadata decision required`);
      used.add(file);
      if(blob(primary,file)!==decision.primary||blob(secondary,file)!==decision.secondary)
        throw new Error(`${file}: metadata decision does not match both published blobs`);
      if(decision.secondary!==null&&decision.primary===null)throw new Error(`${file}: selected snapshot lost published author metadata`);
    }
  }
  if(used.size!==approved.size)throw new Error('Bridge metadata contains unused decisions');
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

/** Verify Git's actual merge result; conflicts and all tree changes are holds. */
export function verifyExistingBridgeAttachment(head:string,snapshot:string,env:NodeJS.ProcessEnv=process.env):void {
  const merged=spawnSync('git',['merge-tree','--write-tree',head,snapshot],{encoding:'utf8',env,maxBuffer:128*1024*1024});
  if(merged.status!==0)throw new Error(`Bridge attachment has merge conflicts; preserve and resolve independently: ${merged.stderr.trim()} ${merged.stdout.trim()}`);
  const mergedTree=merged.stdout.trim().split('\n')[0],headTree=git(['rev-parse',`${head}^{tree}`]);
  if(mergedTree!==headTree){
    const diff=spawnSync('git',['diff-tree','--no-commit-id','--name-status','-r',headTree,mergedTree!],{encoding:'utf8',env,maxBuffer:128*1024*1024});
    if(diff.status!==0)throw new Error('Cannot inspect proposed bridge attachment');
    throw new Error(`Bridge attachment would change the branch tree; preserve and review: ${diff.stdout.trim()}`);
  }
}

/** Rehearse a candidate bridge in a disposable object database, without
 * creating a commit in the project repository or modifying the worktree. */
export function verifyBridgeAttachment(head:string,tree:string,first:string,second:string,identity:NodeJS.ProcessEnv=process.env):void {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-bridge-merge-'));
  try {
    const objects=path.join(temp,'objects');fs.mkdirSync(objects);
    const existing=path.resolve(git(['rev-parse','--git-path','objects']));
    const env={...identity,GIT_OBJECT_DIRECTORY:objects,
      GIT_ALTERNATE_OBJECT_DIRECTORIES:[existing,process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES].filter(Boolean).join(path.delimiter)};
    const probe=spawnSync('git',['commit-tree',tree,'-p',first,'-p',second,'-m','Temporary bridge merge probe'],{encoding:'utf8',env,maxBuffer:128*1024*1024});
    if(probe.status!==0)throw new Error(`Cannot construct temporary bridge probe: ${probe.stderr.trim()}`);
    verifyExistingBridgeAttachment(head,probe.stdout.trim(),env);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
