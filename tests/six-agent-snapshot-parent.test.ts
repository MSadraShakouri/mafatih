import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadCorpus } from '../src/corpus.js';
import { createAgentPartitions, createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { createCanonicalLayoutTemplate } from '../src/split-canonical.js';
import { textId } from '../src/text-ids.js';
import { promoteRowSplitRecord } from '../src/row-splits.js';
import { RowSplitRecordSchema } from '../src/schema.js';

const root=process.cwd(),tsx=path.join(root,'node_modules/tsx/dist/loader.mjs');
const cli=path.join(root,'scripts/six-agent.ts'),snap=path.join(root,'scripts/six-agent-snapshot.ts');
const driver=path.join(root,'scripts/merge-agent-files.mjs');
function run(dir:string,bin:string,args:string[],opts:{env?:NodeJS.ProcessEnv;input?:string;fail?:RegExp}={}):string {
  const p=spawnSync(bin,args,{cwd:dir,encoding:'utf8',env:opts.env ?? process.env,input:opts.input,maxBuffer:64*1024*1024});
  if(opts.fail){assert.notEqual(p.status,0,`${bin} unexpectedly succeeded`);assert.match(p.stderr,opts.fail);return p.stderr;}
  assert.equal(p.status,0,`${bin} ${args.join(' ')}: ${p.stderr}\n${p.stdout}`);return p.stdout.trim();
}
const git=(d:string,...a:string[])=>run(d,'git',a);
const agent=(d:string,...a:string[])=>run(d,process.execPath,['--import',tsx,cli,...a]);
const snapshot=(d:string,...a:string[])=>run(d,process.execPath,['--import',tsx,snap,...a]);
function put(d:string,file:string,body:unknown){const f=path.join(d,file);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof body==='string'?body:JSON.stringify(body,null,2)+'\n');}

test('both snapshot tools detect consolidated titles, refuse incomparable parents, and bridge explicitly without losing data', {timeout:120_000},()=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-snapshot-bridge-'));
  try {
    git(d,'init','-q');git(d,'config','user.name','Synthetic Test');git(d,'config','user.email','test@example.test');
    put(d,'.gitattributes','/data/texts/*.json merge=mafatih-texts\n/coordination/*.jsonl merge=mafatih-messages\n');
    put(d,'scripts/merge-agent-files.mjs',`import ${JSON.stringify(pathToFileURL(driver).href)};\n`);
    put(d,'coordination/agent-1-agent-2.jsonl','');
    put(d,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
    put(d,'data/corpus.json',{format_version:1,legacy_import:{repository:'https://example.test/repo',commit:'a'.repeat(40),original_build_date:'2026-01-01'},review_policy:'synthetic'});
    put(d,'data/claims.json',{});put(d,'data/sources.json',{sources:{}});put(d,'data/relations.json',{english_links:[]});
    put(d,'data/editorial-history.json',{evidence:{},metadata_corrections:[]});put(d,'data/navigation.json',{default_order:['sample'],featured:[],toc:[]});
    for(const folder of ['alignments','english','row-splits'])put(d,`data/${folder}/.gitkeep`,'');
    const original=textId('prayer');for(let n=0;n<256;n++){const shard=n.toString(16).padStart(2,'0');put(d,`data/texts/${shard}.json`,shard===original.slice(1,3)?{[original]:'prayer'}:{});}
    put(d,'data/items/sample.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,rows:[{id:'r1',ar:original,fa:null,kind:'recitation'}]});
    const corpus=loadCorpus(path.join(d,'data'));put(d,'docs/split-assignments/assignments.json',createAgentPartitions(corpus));
    git(d,'add','.');git(d,'commit','-qm','frozen launch');const base=git(d,'rev-parse','HEAD');
    git(d,'switch','-qc','split-agent-1');agent(d,'register','--agent','agent-1','--base',base);agent(d,'configure','--agent','agent-1');
    const plan=createAgentTemplate(corpus,'sample','agent-1');for(const s of plan.sources){s.checked=true;s.kinds=['recitation'];}
    const layout=createCanonicalLayoutTemplate(corpus,splitAgentPlan(corpus,plan));for(const row of layout.rows)row.checked=true;
    put(d,'agent-work/agent-1/plans/sample.json',plan);put(d,'agent-work/agent-1/layouts/sample.json',layout);
    agent(d,'apply','agent-work/agent-1/plans/sample.json','agent-work/agent-1/layouts/sample.json','--base',base,'--agent','agent-1');
    git(d,'add','agent-work','data');git(d,'commit','-qm','author result');
    const first=JSON.parse(snapshot(d,'--base',base,'--agent','agent-1')) as {snapshot:string};
    // Create sibling isolated snapshots through a temporary index, not by changing the checkout.
    const extraA='historical secondary-only value',extraB='newer additional value',idA=textId(extraA),idB=textId(extraB);
    function sibling(values:string[],subject:string,foreign=false,withAlias=false):string {
      const index=path.join(d,`.temporary-index-${Math.random()}`),env={...process.env,GIT_INDEX_FILE:index};
      run(d,'git',['read-tree',first.snapshot],{env});
      const shards=new Map<string,Record<string,string>>();
      for(const value of values){const id=textId(value),file=`data/texts/${id.slice(1,3)}.json`;let shard=shards.get(file);
        if(!shard){shard=JSON.parse(git(d,'show',`${first.snapshot}:${file}`)) as Record<string,string>;shards.set(file,shard);}shard[id]=value;}
      for(const [file,body] of shards){const oid=run(d,'git',['hash-object','-w','--stdin'],{input:JSON.stringify(body,null,2)+'\n'});run(d,'git',['update-index','--cacheinfo',`100644,${oid},${file}`],{env});}
      if(withAlias){
        const record=promoteRowSplitRecord(RowSplitRecordSchema.parse(JSON.parse(git(d,'show',`${first.snapshot}:data/row-splits/sample.json`))));
        record.aliases!.push({original:{id:'retired-child',ar:original,fa:null,kind:'recitation'},ar:[{row:'r1',language:'ar',start:0,end:6,target_start:0}],fa:[]});
        const oid=run(d,'git',['hash-object','-w','--stdin'],{input:JSON.stringify(record,null,2)+'\n'});
        run(d,'git',['update-index','--cacheinfo',`100644,${oid},data/row-splits/sample.json`],{env});
      }
      if(foreign){const oid=run(d,'git',['hash-object','-w','--stdin'],{input:'unauthorized'});run(d,'git',['update-index','--add','--cacheinfo',`100644,${oid},data/foreign.json`],{env});}
      const tree=run(d,'git',['write-tree'],{env});fs.unlinkSync(index);
      return git(d,'commit-tree',tree,'-p',first.snapshot,'-m',subject);
    }
    const primary=sibling([extraA,extraB],'Isolated agent-1 consolidated author snapshot');
    const secondary=sibling([extraA],'Isolated agent-1 authored snapshot');
    git(d,'merge','-q','--no-ff','-m','attach consolidated',primary);
    // Restore must use the consolidated parent even if an older standard title is present.
    const file=`data/texts/${idB.slice(1,3)}.json`,shard=JSON.parse(fs.readFileSync(path.join(d,file),'utf8')) as Record<string,string>;
    delete shard[idB];put(d,file,shard);git(d,'add',file);git(d,'commit','-qm','remove synthetic unreferenced value');
    const repaired=JSON.parse(agent(d,'restore-snapshot-texts','--base',base,'--agent','agent-1')) as {prior_snapshot:string;restored_ids:string[]};
    assert.equal(repaired.prior_snapshot,primary);assert.ok(repaired.restored_ids.includes(idB));
    git(d,'add',file);git(d,'commit','-qm','retain snapshot value');
    const newer=JSON.parse(snapshot(d,'--base',base,'--agent','agent-1')) as {snapshot:string};
    assert.equal(git(d,'rev-parse',`${newer.snapshot}^`),primary,'generator must use the consolidated snapshot, not the older standard title');
    const preferred=newer.snapshot;
    git(d,'merge','-q','--no-ff','--strategy=ours','-m','attach sibling',secondary);
    const head=git(d,'rev-parse','HEAD'),tree=git(d,'rev-parse','HEAD^{tree}');
    for(const script of [snap,cli]){
      const args=script===snap?['--base',base,'--agent','agent-1']:['restore-snapshot-texts','--base',base,'--agent','agent-1'];
      const error=run(d,process.execPath,['--import',tsx,script,...args],{fail:/Incomparable author snapshots/});assert.ok(error.includes(preferred)&&error.includes(secondary));
      assert.equal(git(d,'rev-parse','HEAD'),head);assert.equal(git(d,'status','--porcelain'),'');
    }
    const args=['--base',base,'--agent','agent-1','--bridge-primary',preferred,'--bridge-secondary',secondary];
    run(d,process.execPath,['--import',tsx,snap,'--base',base,'--agent','agent-1','--bridge-primary',secondary,'--bridge-secondary',preferred],{fail:/pooled value .* missing or changed/});
    run(d,process.execPath,['--import',tsx,snap,'--base',base,'--agent','agent-1','--bridge-primary',preferred,'--bridge-secondary',first.snapshot],{fail:/both distinct incomparable maximal snapshots/});
    run(d,process.execPath,['--import',tsx,snap,...args,'--confirm','0'.repeat(64)],{fail:/Stale or invalid/});
    put(d,'unrelated.txt','keep');run(d,process.execPath,['--import',tsx,snap,...args],{fail:/untracked work/});assert.equal(fs.readFileSync(path.join(d,'unrelated.txt'),'utf8'),'keep');fs.unlinkSync(path.join(d,'unrelated.txt'));
    const preview=JSON.parse(snapshot(d,...args)) as {review_sha256:string;tree:string};assert.equal(preview.tree,git(d,'rev-parse',`${preferred}^{tree}`));
    const applied=JSON.parse(snapshot(d,...args,'--confirm',preview.review_sha256)) as {snapshot:string;status:string};assert.equal(applied.status,'snapshot-bridge-attached');
    assert.equal(git(d,'rev-parse',`${applied.snapshot}^{tree}`),preview.tree);assert.equal(git(d,'rev-parse','HEAD^{tree}'),tree);
    assert.equal(git(d,'rev-parse',`${applied.snapshot}^1`),preferred);assert.equal(git(d,'rev-parse',`${applied.snapshot}^2`),secondary);
    const next=JSON.parse(snapshot(d,'--base',base,'--agent','agent-1')) as {snapshot:string};assert.equal(git(d,'rev-parse',`${next.snapshot}^`),applied.snapshot);
    assert.equal(git(d,'status','--porcelain'),'');assert.ok(idA);
    // The selected tree must not lose a published alias, even if both snapshots are individually valid.
    const withAlias=sibling([extraA],'Isolated agent-1 consolidated author snapshot',false,true);
    const virtualHead=git(d,'commit-tree',git(d,'rev-parse','HEAD^{tree}'),'-p',git(d,'rev-parse','HEAD'),'-p',withAlias,'-m','synthetic history');
    const helper=pathToFileURL(path.join(root,'src/six-agent-snapshot-history.ts')).href;
    run(d,process.execPath,['--import',tsx,'--input-type=module','-e',`import {verifyAuthorSnapshotBridge} from ${JSON.stringify(helper)}; verifyAuthorSnapshotBridge(${JSON.stringify(base)},${JSON.stringify(virtualHead)},'agent-1',${JSON.stringify(next.snapshot)},${JSON.stringify(withAlias)});`],{fail:/selected snapshot lost a published alias/});
    const foreign=sibling([extraA],'Isolated agent-1 consolidated author snapshot',true);
    git(d,'merge','-q','--no-ff','--strategy=ours','-m','attach non-isolated snapshot',foreign);
    const foreignHead=git(d,'rev-parse','HEAD');
    run(d,process.execPath,['--import',tsx,snap,'--base',base,'--agent','agent-1','--bridge-primary',next.snapshot,'--bridge-secondary',foreign],{fail:/non-isolated path data\/foreign.json/});
    assert.equal(git(d,'rev-parse','HEAD'),foreignHead);assert.equal(git(d,'status','--porcelain'),'');
  } finally {fs.rmSync(d,{recursive:true,force:true});}
});
