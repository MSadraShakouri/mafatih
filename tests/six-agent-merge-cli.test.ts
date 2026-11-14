import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadCorpus, text } from '../src/corpus.js';
import { createAgentPartitions, createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { createCanonicalLayoutTemplate } from '../src/split-canonical.js';
import { codePoints, textId } from '../src/text-ids.js';
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
    const values=['a😀bcdef','qxyz','یک','دو'];
    const pool=new Map<string,Record<string,string>>();
    for(let n=0;n<256;n++)pool.set(n.toString(16).padStart(2,'0'),{});
    for(const v of values){const id=textId(v);pool.get(id.slice(1,3))![id]=v;}
    for(const [shard,body] of pool)put(dir,`data/texts/${shard}.json`,body);
    put(dir,'data/items/merge-item.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'old-1',ar:textId(values[0]!),fa:textId(values[2]!),kind:'recitation'},
        {id:'old-2',ar:textId(values[1]!),fa:textId(values[3]!),kind:'recitation'}]});
    const baseline=loadCorpus(path.join(dir,'data')),manifest=createAgentPartitions(baseline);
    assert.equal(manifest.groups[0]!.items[0]!.item,'merge-item');
    put(dir,'docs/split-assignments/assignments.json',manifest);
    git(dir,'add','.');git(dir,'commit','-qm','synthetic frozen launch');const base=git(dir,'rev-parse','HEAD');
    git(dir,'switch','-q','-c','split-agent-1');agent(dir,'register','--agent','agent-1','--base',base);agent(dir,'configure','--agent','agent-1');
    git(dir,'add','agent-work/agent-1/registration.json');git(dir,'commit','-qm','register');
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
    const firstSnapshot=JSON.parse(snap(dir,'--base',base,'--agent','agent-1')) as {snapshot:string};
    // Revise V1, then simulate an earlier unreferenced value being pruned on
    // the branch while still present in the parent snapshot (Agent 5's case).
    firstAr.cuts=[];firstAr.kinds=['recitation'];
    layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    put(dir,planPath,plan);put(dir,layoutPath,layout);
    agent(dir,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1');
    const obsolete=textId('a😀'),shard=`data/texts/${obsolete.slice(1,3)}.json`,shardFile=path.join(dir,shard);
    const valuesOnBranch=JSON.parse(fs.readFileSync(shardFile,'utf8')) as Record<string,string>;
    assert.equal(valuesOnBranch[obsolete],'a😀');delete valuesOnBranch[obsolete];put(dir,shard,valuesOnBranch);
    git(dir,'add','.');git(dir,'commit','-qm','revise and simulate pruned pool');
    const refused=spawnSync(process.execPath,['--import',tsx,snapshot,'--base',base,'--agent','agent-1'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(refused.status,0);assert.match(refused.stderr,/No snapshot or merge was attempted.*restore-snapshot-texts/i);
    assert.notEqual(spawnSync('git',['rev-parse','-q','--verify','MERGE_HEAD'],{cwd:dir}).status,0);
    const repaired=JSON.parse(agent(dir,'restore-snapshot-texts','--base',base,'--agent','agent-1')) as {restored_ids:string[];prior_snapshot:string};
    assert.equal(repaired.prior_snapshot,firstSnapshot.snapshot);assert.ok(repaired.restored_ids.includes(obsolete));
    assert.equal((JSON.parse(fs.readFileSync(shardFile,'utf8')) as Record<string,string>)[obsolete],'a😀');
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
    const merged=JSON.parse(agent(dir,'merge-rows',...args,'--join','exact')) as {merged_row:string;separator:string};
    assert.equal(merged.merged_row,preview.merged_row);assert.equal(merged.separator,'none');
    const after=loadCorpus(path.join(dir,'data')), row=after.items.get('merge-item')!.rows[0]!, record=after.rowSplits.get('merge-item')!;
    assert.equal(text(after,row.ar),values[0]!+values[1]!);assert.equal(record.format_version,2);
    assert.deepEqual(resolveLegacyRowAnchor([...record.rows,...record.aliases!],{row:'old-2',language:'ar',offset:1}),
      {row:row.id,language:'ar',offset:codePoints(values[0]!).length+1});
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
    const reviewData=JSON.parse(fs.readFileSync(path.join(dir,review),'utf8')) as {layout:{decision:string};layout_sha256:string};
    assert.equal(reviewData.layout.decision,'pending');assert.equal(reviewData.layout_sha256,record.layout_sha256);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
