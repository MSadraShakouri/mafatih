import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { validateCorpus } from '../src/corpus.js';
import { gitCommit, gitFile, loadCorpusAtCommit } from '../src/git-corpus.js';
import { verifyBridgePool, verifyBridgeScope, verifyIsolatedBridgeMappings } from '../src/isolated-bridge.js';
import { requireAgentBranch } from '../src/six-agent-branch.js';
import { AgentPartitionsSchema, AgentPlanSchema, verifyAgentPartitions } from '../src/split-agent.js';
import { verifyCanonicalResult } from '../src/split-canonical.js';

const usage='Usage: node --import tsx scripts/six-agent-bridge.ts --base FULL_COMMIT --agent agent-N --first FULL_SNAPSHOT --second FULL_SNAPSHOT [--confirm DIGEST]';
function git(args:string[],input?:string):string {
  const p=spawnSync('git',args,{encoding:'utf8',input,maxBuffer:128*1024*1024});
  if(p.status!==0)throw new Error(`git ${args[0]} failed: ${p.stderr.trim()}`);return p.stdout.trim();
}
function ancestor(a:string,b:string):boolean{return spawnSync('git',['merge-base','--is-ancestor',a,b]).status===0;}
function main():void {
  const args=process.argv.slice(2),flags:Record<string,string>={};
  for(let i=0;i<args.length;i++){const k=args[i]!;if(!['--base','--agent','--first','--second','--confirm'].includes(k)||flags[k]||!args[i+1])throw new Error(usage);flags[k]=args[++i]!;}
  const baseSha=gitCommit(flags['--base']??''),first=gitCommit(flags['--first']??''),second=gitCommit(flags['--second']??''),who=flags['--agent'];
  if(!who||!/^agent-[1-6]$/.test(who)||first===second)throw new Error(usage);
  const root=git(['rev-parse','--show-toplevel']);process.chdir(root);requireAgentBranch(root,who,baseSha);
  if(git(['rev-parse','--is-shallow-repository'])!=='false')throw new Error('Bridge requires complete local Git history');
  if(spawnSync('git',['diff','--quiet']).status!==0||spawnSync('git',['diff','--cached','--quiet']).status!==0||git(['ls-files','--others','--exclude-standard']))throw new Error('Commit and preserve all work before bridge construction');
  const head=git(['rev-parse','HEAD']);
  if(!ancestor(baseSha,head)||!ancestor(first,head)||!ancestor(second,head))throw new Error('Base and both snapshots must already be reachable from the author branch');
  const parents=(sha:string)=>git(['show','-s','--format=%P',sha]).split(' ').filter(Boolean);
  const parent1=parents(first),parent2=parents(second),subject=(sha:string)=>git(['show','-s','--format=%s',sha]);
  const allowed=new Set([`Isolated ${who} authored snapshot`,`Isolated ${who} consolidated author snapshot`]);
  if(parent1.length!==1||parent2.length!==1||parent1[0]!==parent2[0]||!allowed.has(subject(first))||!allowed.has(subject(second))||!allowed.has(subject(parent1[0]!))||!ancestor(baseSha,parent1[0]!))
    throw new Error('Both parents must be isolated single-parent author snapshots with the same isolated author parent');
  const manifestPath='docs/split-assignments/assignments.json',manifestRaw=gitFile(baseSha,manifestPath);
  if([first,second,head].some(c=>gitFile(c,manifestPath)!==manifestRaw))throw new Error('Assignment manifest differs from the frozen base');
  const base=loadCorpusAtCommit(baseSha),old=loadCorpusAtCommit(first),next=loadCorpusAtCommit(second);
  const manifest=AgentPartitionsSchema.parse(JSON.parse(manifestRaw) as unknown);verifyAgentPartitions(base,manifest);
  const group=manifest.groups.find(g=>g.agent===who);if(!group)throw new Error('Missing author assignment');
  const assigned=new Set(group.items.map(x=>x.item));
  const metadata=new Set([`agent-work/${who}/CONSOLIDATED-FINDINGS-PASS.md`,`agent-work/${who}/DUA-YAMN-PROVISIONAL-LINEAGE-RECHECK.md`,`agent-work/${who}/proposals/dua-yamn-provisional-lineage-recheck.json`]);
  for(const snap of [first,second]){
    const diff=git(['diff','--name-only',parent1[0]!,snap]).split('\n').filter(Boolean);verifyBridgeScope(diff,who,assigned,metadata);
    for(const file of diff){
      const entry=git(['ls-tree',snap,'--',file]);if(!entry.startsWith('100644 blob '))throw new Error(`Bridge does not allow deleted, non-regular or executable file: ${file}`);
    }
  }
  const oldValidation=validateCorpus(old),newValidation=validateCorpus(next);
  if(oldValidation.errors.length||newValidation.errors.length)throw new Error(`Invalid snapshot corpus: ${[...oldValidation.errors,...newValidation.errors].join('; ')}`);
  verifyBridgePool(loadCorpusAtCommit(parent1[0]!),old);verifyBridgePool(loadCorpusAtCommit(parent1[0]!),next);
  const pooled=verifyBridgePool(old,next);
  for(const [sha,corpus] of [[first,old],[second,next]] as const){
    for(const {item} of group.items){
      const record=corpus.rowSplits.get(item),planPath=`agent-work/${who}/plans/${item}.json`,layoutPath=`agent-work/${who}/layouts/${item}.json`;
      if(!record){if(JSON.stringify(corpus.items.get(item))!==JSON.stringify(base.items.get(item)))throw new Error(`${item}: unrecorded authored change`);continue;}
      const plan=JSON.parse(gitFile(sha,planPath)) as unknown,layout=JSON.parse(gitFile(sha,layoutPath)) as unknown,parsed=AgentPlanSchema.parse(plan);
      if(record.author!==who||parsed.author!==who||parsed.item!==item||parsed.sources.some(s=>s.cut_after!==undefined)||parsed.punctuation_suggestions.length)throw new Error(`${item}: unsafe authored plan`);
      verifyCanonicalResult(base,corpus,plan,layout);
    }
  }
  const lineage=verifyIsolatedBridgeMappings(base,old,next,who),tree=git(['rev-parse',`${second}^{tree}`]);
  const review={base:baseSha,agent:who,first,second,common_parent:parent1[0],tree,pooled,lineage,old_warnings:oldValidation.warnings.length,new_warnings:newValidation.warnings.length};
  const digest=crypto.createHash('sha256').update(JSON.stringify(review)).digest('hex');
  if(flags['--confirm']){
    if(flags['--confirm']!==digest)throw new Error('Stale bridge confirmation: run the guarded preview again');
    const message=`Isolated ${who} guarded bridge snapshot\n\nExact second-parent tree; old IDs and lineage were checked. Provisional candidates remain unapproved.\n\nCo-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>`;
    const snapshot=git(['commit-tree',tree,'-p',first,'-p',second],message+'\n');
    console.log(JSON.stringify({status:'guarded-bridge-created',snapshot,review,review_sha256:digest},null,2));
  }else console.log(JSON.stringify({status:'guarded-bridge-preview',review,review_sha256:digest,note:'No snapshot created; inspect these guards before confirming.'},null,2));
}
try{main();}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
