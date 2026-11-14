import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { validateCorpus } from '../src/corpus.js';
import { gitCommit, gitFile, loadCorpusAtCommit } from '../src/git-corpus.js';
import { AgentPartitionsSchema, AgentPlanSchema, verifyAgentPartitions } from '../src/split-agent.js';
import { verifyCanonicalResult } from '../src/split-canonical.js';
import { requireAgentBranch } from '../src/six-agent-branch.js';

const usage='Usage: node --import tsx scripts/six-agent-snapshot.ts --base FULL_COMMIT --agent agent-N';
function run(args:string[],options:SpawnSyncOptions={}):string {
  const p=spawnSync('git',args,{...options,encoding:'utf8',maxBuffer:128*1024*1024});
  if(p.status!==0)throw new Error(`git ${args.join(' ')}: ${p.stderr.trim()} ${p.stdout.trim()}`);return p.stdout.trim();
}
function existsAt(commit:string,file:string):boolean{return spawnSync('git',['cat-file','-e',`${commit}:${file}`]).status===0;}
function main():void {
  const args=process.argv.slice(2),flags:Record<string,string>={};
  for(let i=0;i<args.length;i++){const key=args[i]!;if(!['--base','--agent'].includes(key)||flags[key]||!args[i+1])throw new Error(usage);flags[key]=args[++i]!;}
  const baseSha=gitCommit(flags['--base']??''),who=flags['--agent'];
  if(!who||!/^agent-[1-6]$/.test(who))throw new Error(usage);
  const root=path.resolve(run(['rev-parse','--show-toplevel']));process.chdir(root);
  requireAgentBranch(root,who,baseSha);
  if(spawnSync('git',['diff','--quiet']).status!==0||spawnSync('git',['diff','--cached','--quiet']).status!==0)throw new Error('Commit your tracked changes before creating a snapshot; do not discard them');
  const head=run(['rev-parse','HEAD']);
  if(spawnSync('git',['merge-base','--is-ancestor',baseSha,head]).status!==0)throw new Error('The common preparation base is not an ancestor of your branch');
  const attr=run(['check-attr','merge','--','data/texts/00.json','coordination/agent-1-agent-2.jsonl']);
  if(!attr.includes('mafatih-texts')||!attr.includes('mafatih-messages') ||
     !run(['config','--local','--get','merge.mafatih-texts.driver']).includes('merge-agent-files.mjs') ||
     !run(['config','--local','--get','merge.mafatih-messages.driver']).includes('merge-agent-files.mjs')) {
    throw new Error('Install both safe merge drivers before making a snapshot');
  }
  const manifestPath='docs/split-assignments/assignments.json', manifestRaw=gitFile(baseSha,manifestPath);
  if(gitFile(head,manifestPath)!==manifestRaw)throw new Error('Assignment manifest differs from the frozen base');
  const manifest=AgentPartitionsSchema.parse(JSON.parse(manifestRaw) as unknown),base=loadCorpusAtCommit(baseSha),current=loadCorpusAtCommit(head);
  const prior=run(['log','--topo-order','-1','--format=%H',`--grep=^Isolated ${who} authored snapshot$`,head]);
  const parent=prior||baseSha;
  if(spawnSync('git',['merge-base','--is-ancestor',baseSha,parent]).status!==0)throw new Error('Prior author snapshot does not descend from the common base');
  const parentCorpus=prior?loadCorpusAtCommit(prior):base;
  verifyAgentPartitions(base,manifest);
  const errors=validateCorpus(current).errors;if(errors.length)throw new Error(`Current committed corpus is invalid: ${errors.join('; ')}`);
  let missingPrior=0;
  for(const [id,value] of parentCorpus.texts){
    const now=current.texts.get(id);
    if(now===undefined)missingPrior++;
    else if(now!==value)throw new Error(`Prior snapshot conflicts with current pooled text ${id}`);
  }
  if(missingPrior)throw new Error(`Previous authored snapshot contains ${missingPrior} immutable pooled value(s) missing from this branch. No snapshot or merge was attempted. Run node --import tsx scripts/six-agent.ts restore-snapshot-texts --base ${baseSha} --agent ${who}, review and commit its listed shards, then retry.`);
  const group=manifest.groups.find(g=>g.agent===who);if(!group)throw new Error('Missing agent assignment');
  const completed:Array<{item:string;paths:string[]}>=[],missing:string[]=[],needed=new Set<string>();
  const collect=(value:unknown):void=>{if(typeof value==='string'&&/^t[0-9a-f]{24}$/.test(value))needed.add(value);
    else if(Array.isArray(value))for(const x of value)collect(x);
    else if(value&&typeof value==='object')for(const x of Object.values(value))collect(x);};
  for(const entry of group.items){
    const item=entry.item,planPath=`agent-work/${who}/plans/${item}.json`,layoutPath=`agent-work/${who}/layouts/${item}.json`;
    const record=current.rowSplits.get(item);
    if(!record){
      if(parentCorpus.rowSplits.has(item))throw new Error(`${item}: a previously published authored result disappeared; preserve it and report`);
      if(JSON.stringify(current.items.get(item))!==JSON.stringify(base.items.get(item)))throw new Error(`${item}: existing canonical changes are not covered by a reversible split record`);
      missing.push(item);continue;
    }
    if(record.author!==who||!existsAt(head,planPath)||!existsAt(head,layoutPath))throw new Error(`${item}: missing committed plan/layout or wrong author`);
    const plan=JSON.parse(gitFile(head,planPath)) as unknown,layout=JSON.parse(gitFile(head,layoutPath)) as unknown,parsed=AgentPlanSchema.parse(plan);
    if(parsed.author!==who||parsed.item!==item||parsed.sources.some(s=>s.cut_after!==undefined)||parsed.punctuation_suggestions.length)throw new Error(`${item}: unsafe or misassigned plan`);
    verifyCanonicalResult(base,current,plan,layout);
    collect(current.items.get(item));collect(record);
    completed.push({item,paths:[`data/items/${item}.json`,`data/row-splits/${item}.json`,planPath,layoutPath]});
  }
  if(!completed.length)throw new Error('No completed canonical items are available for a snapshot yet');
  const gitDir=path.resolve(root,run(['rev-parse','--git-dir']));
  const index=path.join(gitDir,`six-agent-index-${process.pid}-${crypto.randomBytes(8).toString('hex')}`);
  const env={...process.env,GIT_INDEX_FILE:index};let snapshot='';
  try {
    // Revisions descend only from the previous isolated snapshot, never from a
    // peer-merged branch tip. This keeps later merges incremental, not cyclic.
    run(['read-tree',parent],{env});
    const stageBlob=(file:string,oid:string):void=>{run(['update-index','--add','--cacheinfo','100644',oid,file],{env});};
    for(const entry of completed)for(const file of entry.paths){
      const oid=run(['rev-parse',`${head}:${file}`]);stageBlob(file,oid);
    }
    const additions=new Map<string,Array<[string,string]>>();
    for(const id of needed){
      if(parentCorpus.texts.has(id))continue;
      const value=current.texts.get(id);if(value===undefined)throw new Error(`Missing authored text ${id}`);
      const shard=id.slice(1,3),values=additions.get(shard)??[];values.push([id,value]);additions.set(shard,values);
    }
    for(const [shard,values] of additions){
      const file=`data/texts/${shard}.json`,pool:Record<string,string>=existsAt(parent,file)?JSON.parse(gitFile(parent,file)) as Record<string,string>:{};
      for(const [id,value] of values.sort(([a],[b])=>a<b?-1:a>b?1:0)){
        if(Object.hasOwn(pool,id)&&pool[id]!==value)throw new Error(`Text collision in ${file}`);pool[id]=value;
      }
      const body=JSON.stringify(pool,null,2)+'\n';
      const oid=run(['hash-object','-w','--stdin'],{input:body,env});stageBlob(file,oid);
    }
    const tree=run(['write-tree'],{env});
    const identity={...process.env,GIT_AUTHOR_NAME:'Arena Agent',GIT_AUTHOR_EMAIL:'agent@arena.ai',GIT_COMMITTER_NAME:'Arena Agent',GIT_COMMITTER_EMAIL:'agent@arena.ai'};
    const message=`Isolated ${who} authored snapshot\n\nCo-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>`;
    snapshot=run(['commit-tree',tree,'-p',parent,'-m',message],{env:identity});
  } finally {
    for(const name of [index,`${index}.lock`])if(fs.existsSync(name))fs.unlinkSync(name);
  }
  const identity={...process.env,GIT_AUTHOR_NAME:'Arena Agent',GIT_AUTHOR_EMAIL:'agent@arena.ai',GIT_COMMITTER_NAME:'Arena Agent',GIT_COMMITTER_EMAIL:'agent@arena.ai'};
  const message=`Attach ${who} authored snapshot\n\nCo-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>`;
  const merge=spawnSync('git',['merge','--no-ff','-m',message,snapshot],{encoding:'utf8',env:identity,maxBuffer:16*1024*1024});
  if(merge.status!==0)throw new Error(`Snapshot ${snapshot} was created but could not be attached cleanly. Resolve your own merge or preserve/report it; do not push another agent's branch.\n${merge.stdout}\n${merge.stderr}`);
  console.log(JSON.stringify({status:missing.length?'partial-authored-snapshot':'author-ready',agent:who,base:baseSha,snapshot,
    own_branch_tip:run(['rev-parse','HEAD']),completed_items:completed.length,total_items:group.items.length,missing_items:missing,
    note:'The snapshot contains only this agent’s completed authored items, even after neighbor merges. Push only your own branch and tell your successor the exact snapshot SHA.'},null,2));
}
try{main();}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
