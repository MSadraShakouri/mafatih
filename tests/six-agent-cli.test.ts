import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadCorpus } from '../src/corpus.js';
import { createAgentPartitions, splitAgentPlan } from '../src/split-agent.js';
import { createCanonicalLayoutTemplate } from '../src/split-canonical.js';
import { textId } from '../src/text-ids.js';

const project=process.cwd(), cli=path.join(project,'scripts/six-agent.ts'), snapshotCli=path.join(project,'scripts/six-agent-snapshot.ts');
const planner=path.join(project,'scripts/split-agent.ts'),tsx=path.join(project,'node_modules/tsx/dist/loader.mjs');
const driver=path.join(project,'scripts/merge-agent-files.mjs');
const branch=(number:number)=>`arena/synthetic-session-${number}-mafatih`;
function command(cwd:string,bin:string,args:string[]):string{
  const r=spawnSync(bin,args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024});
  if(r.status!==0)throw new Error(`${bin} ${args.join(' ')}\n${r.stderr}\n${r.stdout}`);return r.stdout.trim();
}
function git(cwd:string,...args:string[]){return command(cwd,'git',args);}
function pushOwn(cwd:string,branchName:string){
  const r=spawnSync('git',['push','-q','origin',branchName],{cwd,encoding:'utf8',env:{...process.env,TEST_ALLOWED_REF:`refs/heads/${branchName}`}});
  if(r.status!==0)throw new Error(`Synthetic own-branch push failed: ${r.stderr}`);
}
function node(cwd:string,script:string,...args:string[]){return command(cwd,process.execPath,['--import',tsx,script,...args]);}
function put(root:string,file:string,data:unknown){const name=path.join(root,file);fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');}

test('real CLI runs six registered Arena branches, remote handoffs, revision, independent reviews and final audit', {timeout:180_000}, () => {
  const container=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-six-agent-e2e-'));
  const dir=path.join(container,'work'),remote=path.join(container,'remote.git');fs.mkdirSync(dir);
  try {
    git(container,'init','--bare','-q',remote);
    put(remote,'hooks/pre-receive','#!/bin/sh\nwhile read old new ref; do\n  test "$ref" = "$TEST_ALLOWED_REF" || { echo "not own session ref" >&2; exit 1; }\ndone\n');
    fs.chmodSync(path.join(remote,'hooks/pre-receive'),0o755);
    git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
    git(dir,'remote','add','origin',remote);
    put(dir,'.gitattributes','/data/texts/*.json merge=mafatih-texts\n/coordination/*.jsonl merge=mafatih-messages\n');
    // A tiny synthetic repo, not a copy or second checkout of the project.
    put(dir,'scripts/merge-agent-files.mjs',`import ${JSON.stringify(pathToFileURL(driver).href)};\n`);
    for(const pair of ['1-2','2-3','3-4','4-5','5-6','1-6'])put(dir,`coordination/agent-${pair.replace('-','-agent-')}.jsonl`,'');
    put(dir,'data/corpus.json',{format_version:1,legacy_import:{repository:'https://example.test/repo',commit:'a'.repeat(40),original_build_date:'2026-01-01'},review_policy:'synthetic'});
    put(dir,'data/claims.json',{});put(dir,'data/sources.json',{sources:{}});put(dir,'data/relations.json',{english_links:[]});
    put(dir,'data/editorial-history.json',{evidence:{},metadata_corrections:[]});
    const ids=Array.from({length:6},(_,i)=>`item-${i+1}`);
    put(dir,'data/navigation.json',{default_order:ids,featured:[],toc:[]});
    put(dir,'data/alignments/.gitkeep','');put(dir,'data/english/.gitkeep','');put(dir,'data/row-splits/.gitkeep','');
    const pools=new Map<string,Record<string,string>>();
    for(let n=0;n<256;n++)pools.set(n.toString(16).padStart(2,'0'),{});
    for(let i=1;i<=6;i++){
      const ar=`AR${i} first second`,fa=`FA${i} translation`,a=textId(ar),f=textId(fa);
      pools.get(a.slice(1,3))![a]=ar;pools.get(f.slice(1,3))![f]=fa;
      put(dir,`data/items/item-${i}.json`,{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,rows:[{id:'old-row',ar:a,fa:f}]});
    }
    for(const [shard,values] of pools)put(dir,`data/texts/${shard}.json`,values);
    const baseline=loadCorpus(path.join(dir,'data')),manifest=createAgentPartitions(baseline);
    put(dir,'docs/split-assignments/assignments.json',manifest);
    put(dir,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
    git(dir,'add','.');git(dir,'commit','-qm','synthetic common base');
    const base=git(dir,'rev-parse','HEAD');git(dir,'branch','-M','main');pushOwn(dir,'main');
    const snapshots:string[]=[],authorItems:string[]=[];
    for(let i=1;i<=6;i++){
      const who=`agent-${i}`,group=manifest.groups.find(g=>g.agent===who)!,item=group.items[0]!.item;
      authorItems[i-1]=item;git(dir,'switch','-q','-c',branch(i),base);
      node(dir,cli,'register','--agent',who,'--base',base);
      node(dir,cli,'configure','--agent',who);
      git(dir,'add',`agent-work/${who}/registration.json`);git(dir,'commit','-qm',`register ${who}`);pushOwn(dir,branch(i));
      const planPath=`agent-work/${who}/plans/${item}.json`,layoutPath=`agent-work/${who}/layouts/${item}.json`;
      node(dir,planner,'template',item,'--author',who,'--manifest','docs/split-assignments/assignments.json','--base',base,'--output',planPath);
      const plan=JSON.parse(fs.readFileSync(path.join(dir,planPath),'utf8')) as ReturnType<typeof import('../src/split-agent.js').createAgentTemplate>;
      for(const source of plan.sources){source.checked=true;source.kinds=['recitation'];if(source.language==='ar'){source.cuts=[4];source.kinds=['recitation','recitation'];}}
      put(dir,planPath,plan);
      node(dir,cli,'layout',planPath,'--base',base,'--output',layoutPath);
      const layout=JSON.parse(fs.readFileSync(path.join(dir,layoutPath),'utf8')) as ReturnType<typeof createCanonicalLayoutTemplate>;
      layout.rows[0]!.checked=true;layout.rows[0]!.output=[
        {ar:{source:'ar',part:0},fa:{source:'fa',part:0},kind:'recitation'},
        {ar:{source:'ar',part:1},fa:null,kind:'recitation'},
      ];put(dir,layoutPath,layout);
      if(i===1){
        const otherAuthor=spawnSync(process.execPath,['--import',tsx,cli,'apply',planPath,layoutPath,'--base',base,'--agent','agent-2'],{cwd:dir,encoding:'utf8'});
        assert.notEqual(otherAuthor.status,0);assert.match(otherAuthor.stderr,/register|branch/i);
        const otherSnapshot=spawnSync(process.execPath,['--import',tsx,snapshotCli,'--base',base,'--agent','agent-2'],{cwd:dir,encoding:'utf8'});
        assert.notEqual(otherSnapshot.status,0);assert.match(otherSnapshot.stderr,/register|branch/i);
        const metaFile=path.join(dir,'data/corpus.json'),saved=fs.readFileSync(metaFile,'utf8');
        const changed=JSON.parse(saved) as {review_policy:string};changed.review_policy='unexpected';fs.writeFileSync(metaFile,JSON.stringify(changed));
        const refused=spawnSync(process.execPath,['--import',tsx,cli,'apply',planPath,layoutPath,'--base',base,'--agent',who],{cwd:dir,encoding:'utf8'});
        assert.notEqual(refused.status,0);assert.match(refused.stderr,/Out-of-scope canonical change/);fs.writeFileSync(metaFile,saved);
      }
      node(dir,cli,'apply',planPath,layoutPath,'--base',base,'--agent',who);
      git(dir,'add','.');git(dir,'commit','-qm',`authored ${who}`);
      const snap=JSON.parse(node(dir,snapshotCli,'--base',base,'--agent',who)) as {status:string;snapshot:string};
      assert.equal(snap.status,'author-ready');snapshots[i-1]=snap.snapshot;
      const next=`agent-${i%6+1}`,pair=[who,next].sort().join('-');
      node(dir,cli,'message','--from',who,'--to',next,'--kind','ready','--commit',snap.snapshot,'--text',`${snap.status}; base ${base}`);
      git(dir,'add',`coordination/${pair}.jsonl`);git(dir,'commit','-qm',`publish ${who} snapshot`);pushOwn(dir,branch(i));
    }
    // Each discovers the predecessor's real remote branch, reads its notice,
    // checks reachability and merges only the independently pinned snapshot.
    for(let i=1;i<=6;i++){
      git(dir,'switch','-q',branch(i));
      const who=`agent-${i}`,previous=i===1?6:i-1,peer=`agent-${previous}`;
      const discovered=JSON.parse(node(dir,cli,'discover','--agent',who,'--peer',peer)) as {status:string;branch:string;tip:string};
      assert.equal(discovered.status,'peer-found');assert.equal(discovered.branch,branch(previous));
      const pair=[who,peer].sort().join('-'),body=git(dir,'show',`${discovered.tip}:coordination/${pair}.jsonl`);
      const messages=body.split('\n').filter(Boolean).map(line=>JSON.parse(line) as {sender:string;recipient:string;kind:string;commit:string;text:string});
      const notice=messages.find(m=>m.sender===peer&&m.recipient===who&&m.kind==='ready')!;
      assert.equal(notice.commit,snapshots[previous-1]);assert.equal(notice.text,`author-ready; base ${base}`);
      assert.equal(spawnSync('git',['merge-base','--is-ancestor',notice.commit,discovered.tip],{cwd:dir}).status,0);
      git(dir,'merge','-q','--no-ff','-m','peer snapshot',notice.commit);
    }
    // Agent 2 revises its own item after it has already merged agent 1.
    git(dir,'switch','-q',branch(2));const item=authorItems[1]!,planPath=`agent-work/agent-2/plans/${item}.json`,layoutPath=`agent-work/agent-2/layouts/${item}.json`;
    const revised=JSON.parse(fs.readFileSync(path.join(dir,planPath),'utf8')) as ReturnType<typeof import('../src/split-agent.js').createAgentTemplate>;
    revised.sources.find(s=>s.language==='ar')!.cuts=[10];put(dir,planPath,revised);
    const layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,revised));layout.rows[0]!.checked=true;
    layout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:{source:'fa',part:0},kind:'recitation'},
      {ar:{source:'ar',part:1},fa:null,kind:'recitation'}];put(dir,layoutPath,layout);
    node(dir,cli,'apply',planPath,layoutPath,'--base',base,'--agent','agent-2');git(dir,'add','.');git(dir,'commit','-qm','revise agent 2');
    const second=JSON.parse(node(dir,snapshotCli,'--base',base,'--agent','agent-2')) as {snapshot:string;status:string};
    assert.equal(second.status,'author-ready');
    assert.equal(git(dir,'rev-parse',`${second.snapshot}^`),snapshots[1], 'revision descends from author-only prior snapshot');
    assert.equal(spawnSync('git',['merge-base','--is-ancestor',snapshots[0]!,second.snapshot],{cwd:dir}).status,1,'predecessor must not leak into authored snapshot ancestry');
    assert.equal(git(dir,'show',`${second.snapshot}:data/items/${authorItems[0]}.json`),git(dir,'show',`${base}:data/items/${authorItems[0]}.json`));
    snapshots[1]=second.snapshot;
    node(dir,cli,'message','--from','agent-2','--to','agent-3','--kind','ready','--commit',second.snapshot,'--text',`${second.status}; base ${base}`);
    git(dir,'add','coordination/agent-2-agent-3.jsonl');git(dir,'commit','-qm','publish agent 2 revision');pushOwn(dir,branch(2));
    git(dir,'switch','-q',branch(3));
    const revisedPeer=JSON.parse(node(dir,cli,'discover','--agent','agent-3','--peer','agent-2')) as {tip:string;branch:string};
    assert.equal(revisedPeer.branch,branch(2));
    const notices=git(dir,'show',`${revisedPeer.tip}:coordination/agent-2-agent-3.jsonl`).split('\n').filter(Boolean)
      .map(line=>JSON.parse(line) as {kind:string;commit:string}).filter(m=>m.kind==='ready');
    assert.equal(notices.length,2);assert.ok(notices.some(m=>m.commit===second.snapshot));
    assert.equal(spawnSync('git',['merge-base','--is-ancestor',second.snapshot,revisedPeer.tip],{cwd:dir}).status,0);
    git(dir,'merge','-q','--no-ff','-m','revised predecessor',second.snapshot);
    // The next agent independently reviews each exact authored result.
    for(let i=1;i<=6;i++){
      const reviewer=`agent-${i}`,previous=i===1?6:i-1,author=`agent-${previous}`,source=authorItems[previous-1]!;
      git(dir,'switch','-q',branch(i));
      const file=`agent-work/${reviewer}/reviews/${source}.json`,sourceCommit=snapshots[previous-1]!;
      node(dir,cli,'review-template',source,'--base',base,'--result',sourceCommit,'--author',author,'--reviewer',reviewer,'--output',file);
      const review=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')) as {semantic_review:{sources:Array<{split:string;kind:string}>;issues:Array<{decision:string;note:string}>};layout:{decision:string}};
      for(const s of review.semantic_review.sources){s.split='accept';s.kind='accept';}
      for(const issue of review.semantic_review.issues){issue.decision='addressed';issue.note='Synthetic test inspection';}
      review.layout.decision='accept';put(dir,file,review);
      node(dir,cli,'verify-review',source,file,'--base',base,'--result',sourceCommit,'--author',author);
      git(dir,'add','.');git(dir,'commit','-qm',`review ${author}`);pushOwn(dir,branch(i));
    }
    // One final integration from base; verify every included branch tip was
    // really published rather than assuming one branch contains the round.
    git(dir,'switch','-q','-c','integration',base);
    for(let i=1;i<=6;i++){
      assert.equal(git(dir,'ls-remote','--heads','origin',`refs/heads/${branch(i)}`).split('\t')[0],git(dir,'rev-parse',branch(i)));
      git(dir,'merge','-q','--no-ff','-m',`integrate ${i}`,branch(i));
    }
    const audit=JSON.parse(node(dir,cli,'audit-round','--base',base)) as {status:string;total_items:number;complete_items:number};
    assert.equal(audit.status,'complete');assert.equal(audit.total_items,6);assert.equal(audit.complete_items,6);
    // Global metadata and other canonical files must remain within the round's scope.
    const metaFile=path.join(dir,'data/corpus.json'),metaBody=fs.readFileSync(metaFile,'utf8');
    const badMeta=JSON.parse(metaBody) as {review_policy:string};badMeta.review_policy='unexpected';fs.writeFileSync(metaFile,JSON.stringify(badMeta));
    const outOfScope=spawnSync(process.execPath,['--import',tsx,cli,'audit-round','--base',base],{cwd:dir,encoding:'utf8'});
    assert.notEqual(outOfScope.status,0);assert.match(outOfScope.stderr,/Out-of-scope canonical change/);fs.writeFileSync(metaFile,metaBody);
    // A review cannot claim an unrelated, reachable commit as its author result.
    const reviewFile=path.join(dir,`agent-work/agent-2/reviews/${authorItems[0]}.json`),reviewBody=fs.readFileSync(reviewFile,'utf8');
    const forged=JSON.parse(reviewBody) as {author_commit:string};forged.author_commit=base;fs.writeFileSync(reviewFile,JSON.stringify(forged));
    const badCommit=spawnSync(process.execPath,['--import',tsx,cli,'audit-round','--base',base],{cwd:dir,encoding:'utf8'});
    assert.notEqual(badCommit.status,0);assert.match(badCommit.stdout,/invalid-or-incomplete/);fs.writeFileSync(reviewFile,reviewBody);
    // A filename for one item must not conceal a different item's plan/layout.
    const ownPlan=path.join(dir,`agent-work/agent-1/plans/${authorItems[0]}.json`),ownLayout=path.join(dir,`agent-work/agent-1/layouts/${authorItems[0]}.json`);
    const savedPlan=fs.readFileSync(ownPlan,'utf8'),savedLayout=fs.readFileSync(ownLayout,'utf8');
    const otherPlan=JSON.parse(fs.readFileSync(path.join(dir,`agent-work/agent-2/plans/${authorItems[1]}.json`),'utf8')) as {author:string};otherPlan.author='agent-1';
    const otherLayout=JSON.parse(fs.readFileSync(path.join(dir,`agent-work/agent-2/layouts/${authorItems[1]}.json`),'utf8')) as {author:string};otherLayout.author='agent-1';
    fs.writeFileSync(ownPlan,JSON.stringify(otherPlan));fs.writeFileSync(ownLayout,JSON.stringify(otherLayout));
    const wrongItem=spawnSync(process.execPath,['--import',tsx,cli,'audit-round','--base',base],{cwd:dir,encoding:'utf8'});
    assert.notEqual(wrongItem.status,0);assert.match(wrongItem.stdout,/wrong item or author/);
    fs.writeFileSync(ownPlan,savedPlan);fs.writeFileSync(ownLayout,savedLayout);

    // Final delivery deliberately has one parent (the base), not the six
    // author branches. A fresh clone contains none of their commit objects.
    const integratedTree=git(dir,'write-tree');
    git(dir,'switch','-q','-c','squashed',base);
    git(dir,'read-tree','--reset','-u',integratedTree);
    git(dir,'commit','-qm','one synthetic squashed result');
    assert.equal(git(dir,'rev-parse','HEAD^'),base);
    const fresh=path.join(container,'fresh-synthetic-clone');
    git(dir,'clone','-q','--no-local','--single-branch','--branch','squashed',dir,fresh);
    assert.notEqual(spawnSync('git',['cat-file','-e',snapshots[0]!],{cwd:fresh}).status,0,'author commit must be absent in a fresh squashed clone');
    const strict=spawnSync(process.execPath,['--import',tsx,cli,'audit-round','--base',base],{cwd:fresh,encoding:'utf8'});
    assert.notEqual(strict.status,0);assert.match(strict.stdout,/invalid-or-incomplete/);
    const post=JSON.parse(node(fresh,cli,'audit-squashed','--base',base)) as {status:string;complete_items:number;author_commit_provenance:string};
    assert.equal(post.status,'complete');assert.equal(post.complete_items,6);
    assert.equal(post.author_commit_provenance,'not-verified-after-squash');
    const freshReview=path.join(fresh,`agent-work/agent-2/reviews/${authorItems[0]}.json`);
    const rejected=JSON.parse(fs.readFileSync(freshReview,'utf8')) as {layout:{decision:string}};
    rejected.layout.decision='pending';fs.writeFileSync(freshReview,JSON.stringify(rejected));
    const inconsistent=spawnSync(process.execPath,['--import',tsx,cli,'audit-squashed','--base',base],{cwd:fresh,encoding:'utf8'});
    assert.notEqual(inconsistent.status,0);assert.match(inconsistent.stdout,/invalid-or-incomplete/);
  } finally {fs.rmSync(container,{recursive:true,force:true});}
});
