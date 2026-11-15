import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadCorpus, text } from '../src/corpus.js';
import { createAgentPartitions, createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { compileCanonicalSplit, createCanonicalLayoutTemplate } from '../src/split-canonical.js';
import { codePoints, sha256, textId } from '../src/text-ids.js';
import { resolveLegacyRowAnchor } from '../web/row-split-anchor.js';

const project=process.cwd(), cli=path.join(project,'scripts/six-agent.ts'), snapshot=path.join(project,'scripts/six-agent-snapshot.ts');
const tsx=path.join(project,'node_modules/tsx/dist/loader.mjs'),driver=path.join(project,'scripts/merge-agent-files.mjs');
function run(cwd:string,bin:string,args:string[]) {
  const p=spawnSync(bin,args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024});
  assert.equal(p.status,0,`${bin} ${args.join(' ')}\n${p.stderr}\n${p.stdout}`);return p.stdout.trim();
}
const git=(cwd:string,...args:string[])=>run(cwd,'git',args);
const agent=(cwd:string,...args:string[])=>run(cwd,process.execPath,['--import',tsx,cli,...args]);
const snap=(cwd:string,...args:string[])=>run(cwd,process.execPath,['--import',tsx,snapshot,...args]);
function put(root:string,name:string,value:unknown){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');}
/** Include untracked files and their contents, not just Git's status names. */
function workFingerprint(root:string):string {
  const files:Array<[string,string]>=[];
  const visit=(relative:string):void=>{
    const absolute=path.join(root,relative);
    for(const entry of fs.readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name=path.join(relative,entry.name);
      if(entry.isDirectory())visit(name);else files.push([name,sha256(fs.readFileSync(path.join(root,name),'utf8'))]);
    }
  };
  visit('data');visit('agent-work');return sha256(JSON.stringify(files));
}

test('real merge CLI previews, applies, preserves links and safely restores prior-snapshot pool values', {timeout:120_000}, () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-merge-rows-cli-'));
  try {
    git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
    put(dir,'.gitattributes','/data/texts/*.json merge=mafatih-texts\n/coordination/*.jsonl merge=mafatih-messages\n');
    put(dir,'scripts/merge-agent-files.mjs',`import ${JSON.stringify(pathToFileURL(driver).href)};\n`);
    put(dir,'coordination/agent-1-agent-2.jsonl','');
    put(dir,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
    put(dir,'data/corpus.json',{format_version:1,legacy_import:{repository:'https://example.test/repo',commit:'a'.repeat(40),original_build_date:'2026-01-01'},review_policy:'synthetic'});
    put(dir,'data/claims.json',{});put(dir,'data/sources.json',{sources:{}});put(dir,'data/relations.json',{english_links:[]});
    put(dir,'data/editorial-history.json',{evidence:{},metadata_corrections:[]});
    put(dir,'data/navigation.json',{default_order:['merge-item'],featured:[],toc:[]});
    for(const folder of ['alignments','english','row-splits'])put(dir,`data/${folder}/.gitkeep`,'');
    const values=['a😀bcdef','qxyz','یک','دو','third','سه','fourth',' چهار','unreferenced historical pool value','a😀'];
    const pool=new Map<string,Record<string,string>>();
    for(let n=0;n<256;n++)pool.set(n.toString(16).padStart(2,'0'),{});
    for(const v of values){const id=textId(v);pool.get(id.slice(1,3))![id]=v;}
    for(const [shard,body] of pool)put(dir,`data/texts/${shard}.json`,body);
    put(dir,'data/items/merge-item.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'old-1',ar:textId(values[0]!),fa:textId(values[2]!),kind:'recitation'},
        {id:'old-2',ar:textId(values[1]!),fa:textId(values[3]!),kind:'recitation'},
        {id:'old-3',ar:textId(values[4]!),fa:textId(values[5]!),kind:'recitation'},
        {id:'old-4',ar:textId(values[6]!),fa:textId(values[7]!),kind:'recitation'},
        {id:'old-5',ar:textId(values[9]!),fa:null,kind:'recitation'}]});
    const baseline=loadCorpus(path.join(dir,'data')),manifest=createAgentPartitions(baseline);
    assert.equal(manifest.groups[0]!.items[0]!.item,'merge-item');
    put(dir,'docs/split-assignments/assignments.json',manifest);
    git(dir,'add','.');git(dir,'commit','-qm','synthetic frozen launch');const base=git(dir,'rev-parse','HEAD');
    git(dir,'switch','-q','-c','split-agent-1');agent(dir,'register','--agent','agent-1','--base',base);agent(dir,'configure','--agent','agent-1');
    git(dir,'add','agent-work/agent-1/registration.json');git(dir,'commit','-qm','register');
    // Synthetic reachable history is compiled from the same frozen baseline:
    // one retired child has a distinct kind-based ID; another child ID was
    // reused across different cuts. A repeated identical text at old-5 is a
    // trap for matching by text alone instead of its source occurrence.
    const historicalPlan=createAgentTemplate(baseline,'merge-item','agent-1');
    for(const s of historicalPlan.sources){s.checked=true;s.kinds=['recitation'];}
    const firstHistoryAr=historicalPlan.sources.find(s=>s.row==='old-1'&&s.language==='ar')!;
    firstHistoryAr.cuts=[2];firstHistoryAr.kinds=['heading','recitation'];
    const secondHistoryAr=historicalPlan.sources.find(s=>s.row==='old-2'&&s.language==='ar')!;
    secondHistoryAr.kinds=['recitation','recitation'];
    const historicalResult=(cut:number)=>{
      secondHistoryAr.cuts=[cut];
      const historicalLayout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,historicalPlan));
      for(const row of historicalLayout.rows)row.checked=true;
      historicalLayout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:null,kind:'heading'},
        {ar:{source:'ar',part:1},fa:{source:'fa',part:0},kind:'recitation'}];
      const result=compileCanonicalSplit(baseline,historicalPlan,historicalLayout);
      put(dir,'data/items/merge-item.json',result.item);put(dir,'data/row-splits/merge-item.json',result.record);
      for(const [id,value] of result.texts){
        const shard=`data/texts/${id.slice(1,3)}.json`,body=JSON.parse(fs.readFileSync(path.join(dir,shard),'utf8')) as Record<string,string>;
        body[id]=value;put(dir,shard,body);
      }
      git(dir,'add','data');git(dir,'commit','-qm',`synthetic history cut ${cut}`);return result;
    };
    const history1=historicalResult(2);
    const historicId=history1.record.rows.find(row=>row.original.id==='old-1')!.results[0]!;
    const ambiguousId=history1.record.rows.find(row=>row.original.id==='old-2')!.results[0]!;
    const historicRow=structuredClone(history1.item.rows.find(row=>row.id===historicId)!);
    const ambiguousRow=structuredClone(history1.item.rows.find(row=>row.id===ambiguousId)!);
    const history2=historicalResult(3),ambiguousAgain=history2.item.rows.find(row=>row.id===ambiguousId)!;
    assert.ok(ambiguousAgain);assert.notEqual(ambiguousAgain.ar,ambiguousRow.ar);
    put(dir,'data/items/merge-item.json',baseline.items.get('merge-item'));fs.unlinkSync(path.join(dir,'data/row-splits/merge-item.json'));
    git(dir,'add','data');git(dir,'commit','-qm','restore synthetic baseline');
    const planPath='agent-work/agent-1/plans/merge-item.json',layoutPath='agent-work/agent-1/layouts/merge-item.json';
    const plan=createAgentTemplate(baseline,'merge-item','agent-1');
    for(const s of plan.sources){s.checked=true;s.kinds=['recitation'];}
    const firstAr=plan.sources.find(s=>s.row==='old-1'&&s.language==='ar')!;
    firstAr.cuts=[2];firstAr.kinds=['recitation','recitation'];
    let layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    layout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:null,kind:'recitation'},
      {ar:{source:'ar',part:1},fa:{source:'fa',part:0},kind:'recitation'}];
    put(dir,planPath,plan);put(dir,layoutPath,layout);
    agent(dir,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1');
    git(dir,'add','.');git(dir,'commit','-qm','initial split');
    const initialSnapshot=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    assert.ok(initialSnapshot.snapshot);
    // A changed V1 cut reuses the positional child IDs but changes their text.
    // That ambiguity must be rejected before any canonical file is written.
    const itemBeforeV1Revision=fs.readFileSync(path.join(dir,'data/items/merge-item.json'),'utf8');
    const recordBeforeV1Revision=fs.readFileSync(path.join(dir,'data/row-splits/merge-item.json'),'utf8');
    firstAr.cuts=[3];
    layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    layout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:null,kind:'recitation'},
      {ar:{source:'ar',part:1},fa:{source:'fa',part:0},kind:'recitation'}];
    put(dir,planPath,plan);put(dir,layoutPath,layout);
    const reusedV1=spawnSync(process.execPath,['--import',tsx,cli,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(reusedV1.status,0,'re-splitting a V1 row must not silently reuse child IDs for changed text');
    assert.match(reusedV1.stderr,/orphan|reus|mapping migration/i);
    assert.equal(fs.readFileSync(path.join(dir,'data/items/merge-item.json'),'utf8'),itemBeforeV1Revision);
    assert.equal(fs.readFileSync(path.join(dir,'data/row-splits/merge-item.json'),'utf8'),recordBeforeV1Revision);
    firstAr.cuts=[];firstAr.kinds=['recitation'];
    layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    put(dir,planPath,plan);put(dir,layoutPath,layout);
    const orphanV1=spawnSync(process.execPath,['--import',tsx,cli,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(orphanV1.status,0,'a V1 re-split must not orphan a published child');assert.match(orphanV1.stderr,/orphan|mapping migration/i);
    assert.equal(fs.readFileSync(path.join(dir,'data/items/merge-item.json'),'utf8'),itemBeforeV1Revision);
    assert.equal(fs.readFileSync(path.join(dir,'data/row-splits/merge-item.json'),'utf8'),recordBeforeV1Revision);
    git(dir,'restore','--source=HEAD','--',planPath,layoutPath);

    // Recover a truly published historical occurrence, while rejecting the
    // different meanings of another retired ID. Preview and bad confirmations
    // must not change canonical data or the agent's work files.
    const current=loadCorpus(path.join(dir,'data')), v1=current.rowSplits.get('merge-item')!;
    assert.equal(v1.format_version,1);
    const history=v1.rows.find(row=>row.original.id==='old-1')!;
    const alias={original:historicRow,
      ar:[{row:history.results[0]!,language:'ar' as const,start:0,end:2,target_start:0}],fa:[]};
    const proposalPath='agent-work/agent-1/proposals/retired-ids.json';
    const proposal={format_version:1,protocol:'ar-fa-retired-row-aliases-v1',author:'agent-1',base,
      target_snapshot:initialSnapshot.snapshot,items:[{item:'merge-item',aliases:[alias]}]};
    const argsForAliases=[proposalPath,'--base',base,'--agent','agent-1'];
    const ambiguousAlias={original:ambiguousRow,
      ar:[{row:'old-2',language:'ar',start:0,end:2,target_start:0}],fa:[]};
    put(dir,proposalPath,{...proposal,items:[{item:'merge-item',aliases:[ambiguousAlias]}]});
    const ambiguous=spawnSync(process.execPath,['--import',tsx,cli,'alias-preview',...argsForAliases],{cwd:dir,encoding:'utf8'});
    assert.notEqual(ambiguous.status,0);assert.match(ambiguous.stderr,/different historical|ambiguous|version/i);
    put(dir,proposalPath,{...proposal,items:[{item:'merge-item',aliases:[{...alias,original:{...historicRow,id:'never-published'}}]}]});
    const fabricated=spawnSync(process.execPath,['--import',tsx,cli,'alias-preview',...argsForAliases],{cwd:dir,encoding:'utf8'});
    assert.notEqual(fabricated.status,0);assert.match(fabricated.stderr,/not.*history|evidence|published/i);
    // old-5 contains the same bytes and attribution as the real destination,
    // but belongs to another source occurrence and must never receive the link.
    const wrongLineage={...alias,ar:[{...alias.ar[0]!,row:'old-5'}]};
    put(dir,proposalPath,{...proposal,items:[{item:'merge-item',aliases:[wrongLineage]}]});
    const repeated=spawnSync(process.execPath,['--import',tsx,cli,'alias-preview',...argsForAliases],{cwd:dir,encoding:'utf8'});
    assert.notEqual(repeated.status,0,'identical repeated text does not establish the same occurrence');
    assert.match(repeated.stderr,/lineage|provenance/i);
    const live=current.items.get('merge-item')!.rows.find(row=>row.id===history.results[0])!;
    put(dir,proposalPath,{...proposal,items:[{item:'merge-item',aliases:[{...alias,original:live}]}]});
    const liveRefused=spawnSync(process.execPath,['--import',tsx,cli,'alias-preview',...argsForAliases],{cwd:dir,encoding:'utf8'});
    assert.notEqual(liveRefused.status,0);assert.match(liveRefused.stderr,/live|reused/i);
    put(dir,proposalPath,proposal);const fingerprint=workFingerprint(dir);
    fs.writeFileSync(path.join(dir,'.git/shallow'),base+'\n');
    const shallow=spawnSync(process.execPath,['--import',tsx,cli,'alias-preview',...argsForAliases],{cwd:dir,encoding:'utf8'});
    fs.unlinkSync(path.join(dir,'.git/shallow'));
    assert.notEqual(shallow.status,0);assert.match(shallow.stderr,/shallow/i);
    const previewBody=agent(dir,'alias-preview',...argsForAliases);
    const previewAlias=JSON.parse(previewBody) as {review_sha256:string;alias_count:number;items:Array<{aliases:unknown[]}>};
    assert.equal(previewAlias.alias_count,1);assert.match(previewAlias.review_sha256,/^[a-f0-9]{64}$/);
    assert.deepEqual(previewAlias.items[0]!.aliases,[alias],'preview exposes the exact metadata being confirmed');
    assert.ok(!previewBody.includes(values[9]!), 'preview must not include the pooled source passage');
    assert.equal(workFingerprint(dir),fingerprint,'migration preview is read-only');
    const agentSixStyle={format_version:2,kind:'historical-row-link-proposal',author:'agent-1',base,
      target_snapshot:initialSnapshot.snapshot,items:[{item:'merge-item',ids:1,entries:[{old_id:historicId,proposed_alias:alias}]}]};
    put(dir,proposalPath,agentSixStyle);
    const nativePreview=JSON.parse(agent(dir,'alias-preview',...argsForAliases)) as {review_sha256:string};
    assert.equal(nativePreview.review_sha256,previewAlias.review_sha256,'native and minimal metadata proposals have the same binding');
    put(dir,proposalPath,proposal);assert.equal(workFingerprint(dir),fingerprint);
    put(dir,proposalPath,{...proposal,target_snapshot:base});
    const staleTarget=spawnSync(process.execPath,['--import',tsx,cli,'alias-preview',...argsForAliases],{cwd:dir,encoding:'utf8'});
    assert.notEqual(staleTarget.status,0);assert.match(staleTarget.stderr,/snapshot|target|stale/i);
    put(dir,proposalPath,proposal);
    const wrongConfirm=spawnSync(process.execPath,['--import',tsx,cli,'alias-migrate',...argsForAliases,'--confirm','0'.repeat(64)],{cwd:dir,encoding:'utf8'});
    assert.notEqual(wrongConfirm.status,0);assert.match(wrongConfirm.stderr,/confirm|stale|hash/i);
    assert.equal(workFingerprint(dir),fingerprint,'failed confirmation must not write any files');
    // Confirmation binds the exact reachable history, not merely the proposed IDs.
    git(dir,'add',proposalPath);git(dir,'commit','-qm','record synthetic proposal');
    const staleConfirm=spawnSync(process.execPath,['--import',tsx,cli,'alias-migrate',...argsForAliases,'--confirm',previewAlias.review_sha256],{cwd:dir,encoding:'utf8'});
    assert.notEqual(staleConfirm.status,0);assert.match(staleConfirm.stderr,/confirm|stale|hash/i);
    assert.equal(workFingerprint(dir),fingerprint,'a stale confirmation must not change work files');
    const refreshed=JSON.parse(agent(dir,'alias-preview',...argsForAliases)) as {review_sha256:string};
    assert.notEqual(refreshed.review_sha256,previewAlias.review_sha256);
    agent(dir,'alias-migrate',...argsForAliases,'--confirm',refreshed.review_sha256);
    assert.equal(git(dir,'diff','--name-only','--','data/'),'data/row-splits/merge-item.json',
      'migration must not alter physical rows or text-pool shards');
    let migrated=loadCorpus(path.join(dir,'data')).rowSplits.get('merge-item')!;
    assert.equal(migrated.format_version,2);assert.ok(migrated.aliases!.some(a=>a.original.id===historicId));
    git(dir,'add','data/row-splits/merge-item.json');git(dir,'commit','-qm','recover synthetic historical link');
    const aliasSnapshot=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    assert.equal(git(dir,'rev-parse',`${aliasSnapshot.snapshot}^`),initialSnapshot.snapshot);
    const snapshotRecord=JSON.parse(git(dir,'show',`${aliasSnapshot.snapshot}:data/row-splits/merge-item.json`)) as {aliases:Array<{original:{id:string}}>};
    assert.ok(snapshotRecord.aliases.some(entry=>entry.original.id===historicId),'author snapshot must contain the migrated alias');
    assert.equal(git(dir,'show',`${aliasSnapshot.snapshot}:data/items/merge-item.json`),
      git(dir,'show',`${initialSnapshot.snapshot}:data/items/merge-item.json`),'metadata migration must not change the authored item');
    // The assigned reviewer can inspect a new snapshot, but the previous
    // record hash cannot accidentally stand in for the migrated record.
    git(dir,'switch','-q','-c','arena/synthetic-alias-review-mafatih');agent(dir,'register','--agent','agent-2','--base',base);
    const oldReview='agent-work/agent-2/reviews/old-merge-item.json',newReview='agent-work/agent-2/reviews/new-merge-item.json';
    for(const [result,file] of [[initialSnapshot.snapshot,oldReview],[aliasSnapshot.snapshot,newReview]] as const)
      agent(dir,'review-template','merge-item','--base',base,'--result',result,'--author','agent-1','--reviewer','agent-2','--output',file);
    const oldBinding=JSON.parse(fs.readFileSync(path.join(dir,oldReview),'utf8')) as {result_record_sha256:string;result_item_sha256:string};
    const newBinding=JSON.parse(fs.readFileSync(path.join(dir,newReview),'utf8')) as typeof oldBinding;
    assert.equal(oldBinding.result_item_sha256,newBinding.result_item_sha256);
    assert.notEqual(oldBinding.result_record_sha256,newBinding.result_record_sha256);
    git(dir,'add','agent-work/agent-2');git(dir,'commit','-qm','prepare independent synthetic reviews');git(dir,'switch','-q','split-agent-1');
    agent(dir,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1');
    migrated=loadCorpus(path.join(dir,'data')).rowSplits.get('merge-item')!;
    assert.ok(migrated.aliases!.some(a=>a.original.id===historicId),'ordinary reapply must retain historical aliases');
    const leftId=history.results[0]!,rightId=history.results[1]!;
    agent(dir,'merge-rows',planPath,layoutPath,'--base',base,'--agent','agent-1','--left',leftId,'--right',rightId,'--join','exact');
    const mergedWithHistory=loadCorpus(path.join(dir,'data')),recordWithHistory=mergedWithHistory.rowSplits.get('merge-item')!;
    const joinedWithHistory=mergedWithHistory.items.get('merge-item')!.rows[0]!;
    assert.deepEqual(resolveLegacyRowAnchor([...recordWithHistory.rows,...recordWithHistory.aliases!],
      {row:historicId,language:'ar',offset:1}),{row:joinedWithHistory.id,language:'ar',offset:1});
    git(dir,'add','.');git(dir,'commit','-qm','exercise durable alias migration');
    const composedSnapshot=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    assert.equal(git(dir,'rev-parse',`${composedSnapshot.snapshot}^`),aliasSnapshot.snapshot);
    const composedRecord=JSON.parse(git(dir,'show',`${composedSnapshot.snapshot}:data/row-splits/merge-item.json`)) as {aliases:Array<{original:{id:string}}>};
    assert.ok(composedRecord.aliases.some(entry=>entry.original.id===historicId),'recomposed alias must survive the next author snapshot');

    // Continue the separate snapshot-pool/merge scenario from a fresh branch
    // in this synthetic repository, rather than performing a now-forbidden
    // re-split that would orphan the two just-published child IDs.
    git(dir,'restore','--source=HEAD','--',planPath,layoutPath);
    git(dir,'branch','-m','split-agent-1-v1-guard-tested');
    git(dir,'switch','-q','-c','split-agent-1',base);
    agent(dir,'register','--agent','agent-1','--base',base);agent(dir,'configure','--agent','agent-1');
    git(dir,'add','agent-work/agent-1/registration.json');git(dir,'commit','-qm','register pool scenario');
    firstAr.cuts=[];firstAr.kinds=['recitation'];
    layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    put(dir,planPath,plan);put(dir,layoutPath,layout);
    agent(dir,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1');
    git(dir,'add','.');git(dir,'commit','-qm','initial unsplit layout');
    const firstSnapshot=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    // Simulate pruning a value from a previous snapshot while it is unreferenced
    // by current rows; restoration must not depend on unsafe row revisions.
    const obsolete=textId(values[8]!),shard=`data/texts/${obsolete.slice(1,3)}.json`,shardFile=path.join(dir,shard);
    const valuesOnBranch=JSON.parse(fs.readFileSync(shardFile,'utf8')) as Record<string,string>;
    assert.equal(valuesOnBranch[obsolete],values[8]);delete valuesOnBranch[obsolete];put(dir,shard,valuesOnBranch);
    git(dir,'add','.');git(dir,'commit','-qm','revise and simulate pruned pool');
    const refused=spawnSync(process.execPath,['--import',tsx,snapshot,'--base',base,'--agent','agent-1'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(refused.status,0);assert.match(refused.stderr,/No snapshot or merge was attempted.*restore-snapshot-texts/i);
    assert.notEqual(spawnSync('git',['rev-parse','-q','--verify','MERGE_HEAD'],{cwd:dir}).status,0);
    const repaired=JSON.parse(agent(dir,'restore-snapshot-texts','--base',base,'--agent','agent-1')) as {restored_ids:string[];prior_snapshot:string};
    assert.equal(repaired.prior_snapshot,firstSnapshot.snapshot);assert.ok(repaired.restored_ids.includes(obsolete));
    assert.equal((JSON.parse(fs.readFileSync(shardFile,'utf8')) as Record<string,string>)[obsolete],values[8]);
    git(dir,'add',shard);git(dir,'commit','-qm','explicitly retain prior snapshot values');
    const revised=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    assert.equal(git(dir,'rev-parse',`${revised.snapshot}^`),firstSnapshot.snapshot);
    const args=[planPath,layoutPath,'--base',base,'--agent','agent-1','--left','old-1','--right','old-2'];
    const clean=git(dir,'status','--porcelain');
    const preview=JSON.parse(agent(dir,'merge-preview',...args)) as {merged_row:string;fields:{ar:{merged:string;no_whitespace_boundary:boolean};fa:{merged:string;no_whitespace_boundary:boolean}}};
    assert.equal(git(dir,'status','--porcelain'),clean,'preview must not write files');
    assert.equal(preview.fields.ar.merged,values[0]!+values[1]!);assert.equal(preview.fields.fa.merged,values[2]!+values[3]!);
    assert.equal(preview.fields.ar.no_whitespace_boundary,true);assert.equal(preview.fields.fa.no_whitespace_boundary,true);
    const noAck=spawnSync(process.execPath,['--import',tsx,cli,'merge-rows',...args],{cwd:dir,encoding:'utf8'});
    assert.notEqual(noAck.status,0);assert.match(noAck.stderr,/--join exact/);
    const merged=JSON.parse(agent(dir,'merge-rows',...args,'--join','exact')) as {merged_row:string;separator:string;proposed_editorial_insertions:number;total_editorial_insertions:number};
    assert.equal(merged.merged_row,preview.merged_row);assert.equal(merged.separator,'none');
    assert.equal(merged.proposed_editorial_insertions,0);assert.equal(merged.total_editorial_insertions,0);
    const exact=loadCorpus(path.join(dir,'data')), exactRow=exact.items.get('merge-item')!.rows[0]!, exactRecord=exact.rowSplits.get('merge-item')!;
    assert.equal(text(exact,exactRow.ar),values[0]!+values[1]!);assert.equal(exactRecord.format_version,2);
    assert.deepEqual(resolveLegacyRowAnchor([...exactRecord.rows,...exactRecord.aliases!],{row:'old-2',language:'ar',offset:1}),
      {row:exactRow.id,language:'ar',offset:codePoints(values[0]!).length+1});
    const boundaryArgs=[planPath,layoutPath,'--base',base,'--agent','agent-1','--left',exactRow.id,'--right','old-3'];
    const spaceArgs=[...boundaryArgs,'--join','both-space'], beforeSpace=workFingerprint(dir);
    for(const command of ['merge-preview','merge-rows']) {
      const noReason=spawnSync(process.execPath,['--import',tsx,cli,command,...spaceArgs],{cwd:dir,encoding:'utf8'});
      assert.notEqual(noReason.status,0);assert.match(noReason.stderr,/--reason/i);
    }
    for(const [args,expected] of [
      [[...boundaryArgs,'--join','automatic'],/--join exact/i],
      [[...spaceArgs,'--reason','first\u2028second'],/single nonempty line/i],
      [[...boundaryArgs,'--join','exact','--reason','not applicable'],/reason.*spacing/i],
    ] as const){
      const refused=spawnSync(process.execPath,['--import',tsx,cli,'merge-rows',...args],{cwd:dir,encoding:'utf8'});
      assert.notEqual(refused.status,0);assert.match(refused.stderr,expected);
    }
    assert.equal(workFingerprint(dir),beforeSpace,'invalid options must not write tracked or untracked work files');
    for(const [mode,arSep,faSep] of [['ar-space',' ',''],['fa-space','',' ']] as const){
      const one=JSON.parse(agent(dir,'merge-preview',...boundaryArgs,'--join',mode,'--reason','Propose boundary spacing')) as {
        fields:{ar:{merged:string;inserted_separator:string|null};fa:{merged:string;inserted_separator:string|null}}};
      assert.equal(one.fields.ar.merged,values[0]!+values[1]!+arSep+values[4]!);
      assert.equal(one.fields.fa.merged,values[2]!+values[3]!+faSep+values[5]!);
      assert.equal(one.fields.ar.inserted_separator,arSep?'U+0020':null);
      assert.equal(one.fields.fa.inserted_separator,faSep?'U+0020':null);
    }
    const spacedPreview=JSON.parse(agent(dir,'merge-preview',...spaceArgs,'--reason','Propose boundary spacing')) as {
      merged_row:string;fields:{ar:{merged:string;inserted_separator:string};fa:{merged:string;inserted_separator:string}}};
    assert.equal(spacedPreview.fields.ar.merged,values[0]!+values[1]!+' '+values[4]!);
    assert.equal(spacedPreview.fields.fa.merged,values[2]!+values[3]!+' '+values[5]!);
    assert.equal(spacedPreview.fields.ar.inserted_separator,'U+0020');assert.equal(spacedPreview.fields.fa.inserted_separator,'U+0020');
    assert.equal(workFingerprint(dir),beforeSpace,'all spacing previews must leave tracked and untracked work files unchanged');
    const spaced=JSON.parse(agent(dir,'merge-rows',...spaceArgs,'--reason','Propose boundary spacing')) as {merged_row:string;separator:string;proposed_editorial_insertions:number;total_editorial_insertions:number};
    assert.equal(spaced.merged_row,spacedPreview.merged_row);assert.equal(spaced.separator,'both-space');
    assert.equal(spaced.proposed_editorial_insertions,2);assert.equal(spaced.total_editorial_insertions,2);
    const spacedCorpus=loadCorpus(path.join(dir,'data')),spacedRow=spacedCorpus.items.get('merge-item')!.rows[0]!;
    const spacedRecord=spacedCorpus.rowSplits.get('merge-item')!;
    assert.equal(spacedRecord.format_version,3);assert.equal(text(spacedCorpus,spacedRow.ar),values[0]!+values[1]!+' '+values[4]!);
    const nextArgs=[planPath,layoutPath,'--base',base,'--agent','agent-1','--left',spacedRow.id,'--right','old-4'];
    const beforeInvalidBoundary=workFingerprint(dir);
    // Arabic would be eligible, but Persian begins with existing whitespace.
    // Neither the preview nor a partial failed apply may write the Arabic half.
    for(const command of ['merge-preview','merge-rows']) {
      const refused=spawnSync(process.execPath,['--import',tsx,cli,command,...nextArgs,'--join','both-space','--reason','Propose another boundary'],{cwd:dir,encoding:'utf8'});
      assert.notEqual(refused.status,0);assert.match(refused.stderr,/existing boundary whitespace/i);
    }
    assert.equal(workFingerprint(dir),beforeInvalidBoundary,'a partially valid spacing proposal must not write any files');
    const chained=JSON.parse(agent(dir,'merge-rows',...nextArgs,'--join','exact')) as {separator:string;proposed_editorial_insertions:number;total_editorial_insertions:number};
    assert.equal(chained.separator,'none');assert.equal(chained.proposed_editorial_insertions,0);assert.equal(chained.total_editorial_insertions,2);
    const after=loadCorpus(path.join(dir,'data')),row=after.items.get('merge-item')!.rows[0]!,record=after.rowSplits.get('merge-item')!;
    assert.equal(record.format_version,3);assert.equal(text(after,row.ar),values[0]!+values[1]!+' '+values[4]!+values[6]!);
    assert.deepEqual(resolveLegacyRowAnchor([...record.rows,...record.aliases!],{row:'old-3',language:'ar',offset:0}),
      {row:row.id,language:'ar',offset:codePoints(values[0]!+values[1]!).length+1});
    assert.deepEqual(resolveLegacyRowAnchor([...record.rows,...record.aliases!],{row:exactRow.id,language:'ar',offset:2}),
      {row:row.id,language:'ar',offset:2});
    assert.deepEqual(resolveLegacyRowAnchor([...record.rows,...record.aliases!],{row:spacedRow.id,language:'ar',offset:3}),
      {row:row.id,language:'ar',offset:3});
    // A later ordinary apply may not silently delete the new merged row URL.
    const savedLayout=fs.readFileSync(path.join(dir,layoutPath),'utf8'), savedItem=fs.readFileSync(path.join(dir,'data/items/merge-item.json'),'utf8');
    const withoutMerge=JSON.parse(savedLayout) as {merges?:unknown};delete withoutMerge.merges;put(dir,layoutPath,withoutMerge);
    const orphan=spawnSync(process.execPath,['--import',tsx,cli,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(orphan.status,0);assert.match(orphan.stderr,/orphan|mapping migration/i);
    assert.equal(fs.readFileSync(path.join(dir,'data/items/merge-item.json'),'utf8'),savedItem);put(dir,layoutPath,savedLayout);
    git(dir,'add','.');git(dir,'commit','-qm','merge reviewed adjacent rows');
    const final=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    assert.equal(git(dir,'rev-parse',`${final.snapshot}^`),revised.snapshot);
    const inspected=JSON.parse(agent(dir,'inspect','merge-item','--base',base,'--result',final.snapshot,'--author','agent-1')) as {current_rows:Array<{id:string}>};
    assert.equal(inspected.current_rows[0]!.id,row.id);
    git(dir,'switch','-q','-c','split-agent-2');agent(dir,'register','--agent','agent-2','--base',base);
    const review='agent-work/agent-2/reviews/merge-item.json';
    agent(dir,'review-template','merge-item','--base',base,'--result',final.snapshot,'--author','agent-1','--reviewer','agent-2','--output',review);
    const reviewData=JSON.parse(fs.readFileSync(path.join(dir,review),'utf8')) as {
      layout:{decision:string};layout_sha256:string;spacing_review:Array<{decision:string;note:string}>;
      semantic_review:{sources:Array<{split:string;kind:string}>;issues:Array<{decision:string;note:string}>}};
    assert.equal(reviewData.layout.decision,'pending');assert.equal(reviewData.layout_sha256,record.layout_sha256);
    assert.equal(reviewData.spacing_review.length,2);assert.ok(reviewData.spacing_review.every(entry=>entry.decision==='pending'));
    reviewData.layout.decision='accept';for(const s of reviewData.semantic_review.sources){s.split='accept';s.kind='accept';}
    for(const issue of reviewData.semantic_review.issues){issue.decision='addressed';issue.note='Inspected';}
    put(dir,review,reviewData);
    const pending=spawnSync(process.execPath,['--import',tsx,cli,'verify-review','merge-item',review,'--base',base,'--result',final.snapshot,'--author','agent-1'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(pending.status,0);assert.match(pending.stdout,/needs-work/);
    for(const entry of reviewData.spacing_review){entry.decision='accept';entry.note='Checked this boundary';}put(dir,review,reviewData);
    const accepted=JSON.parse(agent(dir,'verify-review','merge-item',review,'--base',base,'--result',final.snapshot,'--author','agent-1')) as {status:string};
    assert.equal(accepted.status,'agent-review-records-complete');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
