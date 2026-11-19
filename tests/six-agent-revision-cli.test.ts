import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { createAgentPartitions, createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { createCanonicalLayoutTemplate, verifyCanonicalResult } from '../src/split-canonical.js';
import { codePoints, sha256, textId } from '../src/text-ids.js';
import { resolveLegacyRowAnchor } from '../web/row-split-anchor.js';
import { createCanonicalReviewTemplate, verifyCanonicalReview } from '../src/six-agent-review.js';

const project=process.cwd(), cli=path.join(project,'scripts/six-agent.ts');
const tsx=path.join(project,'node_modules/tsx/dist/loader.mjs');
function run(cwd:string,bin:string,args:string[]) {
  const p=spawnSync(bin,args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024});
  assert.equal(p.status,0,`${bin} ${args.join(' ')}\n${p.stderr}\n${p.stdout}`);return p.stdout.trim();
}
const git=(cwd:string,...args:string[])=>run(cwd,'git',args);
const agent=(cwd:string,...args:string[])=>run(cwd,process.execPath,['--import',tsx,cli,...args]);
const rawAgent=(cwd:string,...args:string[])=>spawnSync(process.execPath,['--import',tsx,cli,...args],{cwd,encoding:'utf8'});
function put(root:string,name:string,value:unknown) {
  const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
}
function fingerprint(root:string,name:string):string {
  const files:Array<[string,string]>=[];
  const visit=(relative:string):void=>{
    for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(relative,entry.name);
      if(entry.isDirectory())visit(file);else files.push([file,sha256(fs.readFileSync(path.join(root,file),'utf8'))]);
    }
  };
  visit(name);return sha256(JSON.stringify(files));
}

test('live re-cut is explicitly previewed, history-checked, confirmed, and preserves every old anchor', {timeout:120_000}, () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-live-revision-'));
  try {
    git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
    put(dir,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
    put(dir,'data/corpus.json',{format_version:1,legacy_import:{repository:'https://example.test/repo',commit:'a'.repeat(40),original_build_date:'2026-01-01'},review_policy:'synthetic'});
    put(dir,'data/claims.json',{});put(dir,'data/sources.json',{sources:{}});put(dir,'data/relations.json',{english_links:[]});
    put(dir,'data/editorial-history.json',{evidence:{},metadata_corrections:[]});
    put(dir,'data/navigation.json',{default_order:['revision-item'],featured:[],toc:[]});
    for(const folder of ['alignments','english','row-splits'])put(dir,`data/${folder}/.gitkeep`,'');
    const ar='ABCD😀XYZ',fa='one two',pool=new Map<string,Record<string,string>>();
    for(let n=0;n<256;n++)pool.set(n.toString(16).padStart(2,'0'),{});
    for(const value of [ar,fa]){const id=textId(value);pool.get(id.slice(1,3))![id]=value;}
    for(const [shard,body] of pool)put(dir,`data/texts/${shard}.json`,body);
    put(dir,'data/items/revision-item.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'old-1',ar:textId(ar),fa:textId(fa),kind:'recitation'}]});
    const baseline=loadCorpus(path.join(dir,'data')),manifest=createAgentPartitions(baseline);
    put(dir,'docs/split-assignments/assignments.json',manifest);git(dir,'add','.');git(dir,'commit','-qm','synthetic frozen launch');
    const base=git(dir,'rev-parse','HEAD');git(dir,'switch','-q','-c','split-agent-1');
    agent(dir,'register','--agent','agent-1','--base',base);git(dir,'add','agent-work/agent-1/registration.json');git(dir,'commit','-qm','register');
    const planPath='agent-work/agent-1/plans/revision-item.json',layoutPath='agent-work/agent-1/layouts/revision-item.json';
    const plan=createAgentTemplate(baseline,'revision-item','agent-1');
    for(const source of plan.sources){source.checked=true;source.kinds=['recitation'];}
    const arabic=plan.sources.find(s=>s.row==='old-1'&&s.language==='ar')!;
    arabic.cuts=[2];arabic.kinds=['recitation','recitation'];
    const originalPlan=structuredClone(plan);
    let layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    layout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:null,kind:'recitation'},
      {ar:{source:'ar',part:1},fa:{source:'fa',part:0},kind:'recitation'}];
    const originalLayout=structuredClone(layout);put(dir,planPath,plan);put(dir,layoutPath,layout);
    agent(dir,'apply',planPath,layoutPath,'--base',base,'--agent','agent-1');
    git(dir,'add','.');git(dir,'commit','-qm','publish original split');
    const initial=git(dir,'rev-parse','HEAD'),before=loadCorpus(path.join(dir,'data'));
    const oldRows=structuredClone(before.items.get('revision-item')!.rows);
    const oldReview=createCanonicalReviewTemplate(baseline,before,originalPlan,originalLayout,'agent-2',initial);
    arabic.cuts=[4];
    layout=createCanonicalLayoutTemplate(baseline,splitAgentPlan(baseline,plan));for(const row of layout.rows)row.checked=true;
    layout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:null,kind:'recitation'},
      {ar:{source:'ar',part:1},fa:{source:'fa',part:0},kind:'recitation'}];
    put(dir,planPath,plan);put(dir,layoutPath,layout);
    const args=[planPath,layoutPath,'--base',base,'--agent','agent-1'],beforeData=fingerprint(dir,'data');
    const ordinary=rawAgent(dir,'apply',...args);
    assert.notEqual(ordinary.status,0,'ordinary apply must continue to reject reused IDs');
    assert.match(ordinary.stderr,/orphan|reus|mapping migration/i);
    assert.equal(fingerprint(dir,'data'),beforeData);
    const reused=rawAgent(dir,'revise-preview',...args);
    assert.notEqual(reused.status,0,'a re-cut may not reuse old IDs for changed text');
    assert.equal(fingerprint(dir,'data'),beforeData);
    layout.rows[0]!.output=[{ar:{source:'ar',part:0},fa:null,kind:'recitation',id_scheme:'lineage-v2'},
      {ar:{source:'ar',part:1},fa:{source:'fa',part:0},kind:'recitation',id_scheme:'lineage-v2'}];
    put(dir,layoutPath,layout);
    const wrongOwner=rawAgent(dir,'revise-preview',planPath,layoutPath,'--base',base,'--agent','agent-2');
    assert.notEqual(wrongOwner.status,0);assert.equal(fingerprint(dir,'data'),beforeData,'another agent cannot write or preview this assignment');
    fs.writeFileSync(path.join(dir,'.git/shallow'),base+'\n');
    const shallow=rawAgent(dir,'revise-preview',...args);fs.unlinkSync(path.join(dir,'.git/shallow'));
    assert.notEqual(shallow.status,0);assert.match(shallow.stderr,/shallow/i);assert.equal(fingerprint(dir,'data'),beforeData);
    const beforeWork=fingerprint(dir,'agent-work');
    const previewText=agent(dir,'revise-preview',...args);
    const preview=JSON.parse(previewText) as {status:string;review_sha256:string;retired_rows:Array<{original:{id:string}}>};
    assert.equal(preview.status,'live-revision-preview');assert.match(preview.review_sha256,/^[a-f0-9]{64}$/);
    assert.equal(preview.retired_rows.length,2);assert.ok(!previewText.includes(ar)&&!previewText.includes(fa),'preview does not expose text');
    assert.equal(fingerprint(dir,'data'),beforeData,'preview is read-only');
    assert.equal(fingerprint(dir,'agent-work'),beforeWork,'preview does not change drafts or reviews');
    const bad=rawAgent(dir,'revise',...args,'--confirm','0'.repeat(64));
    assert.notEqual(bad.status,0);assert.match(bad.stderr,/stale|confirm/i);assert.equal(fingerprint(dir,'data'),beforeData);
    plan.issues.push({row:'old-1',language:'ar',kind:'other',note:'Synthetic context changed after preview'});
    layout.plan_sha256=splitAgentPlan(baseline,plan).plan_sha256;put(dir,planPath,plan);put(dir,layoutPath,layout);
    const changedDraft=rawAgent(dir,'revise',...args,'--confirm',preview.review_sha256);
    assert.notEqual(changedDraft.status,0);assert.match(changedDraft.stderr,/stale|confirm/i);assert.equal(fingerprint(dir,'data'),beforeData);
    plan.issues.pop();layout.plan_sha256=splitAgentPlan(baseline,plan).plan_sha256;put(dir,planPath,plan);put(dir,layoutPath,layout);
    assert.equal(fingerprint(dir,'agent-work'),beforeWork,'restoring the drafts restores their exact fingerprint');
    git(dir,'commit','--allow-empty','-qm','advance history');
    const stale=rawAgent(dir,'revise',...args,'--confirm',preview.review_sha256);
    assert.notEqual(stale.status,0);assert.match(stale.stderr,/stale|confirm/i);assert.equal(fingerprint(dir,'data'),beforeData);
    const fresh=JSON.parse(agent(dir,'revise-preview',...args)) as {review_sha256:string};
    assert.notEqual(fresh.review_sha256,preview.review_sha256);
    const result=JSON.parse(agent(dir,'revise',...args,'--confirm',fresh.review_sha256)) as {status:string};
    assert.equal(result.status,'live-revision-applied');
    const after=loadCorpus(path.join(dir,'data')),mapping=after.rowSplits.get('revision-item')!;
    assert.equal(mapping.format_version,2);assert.deepEqual(validateCorpus(after).errors,[]);
    assert.doesNotThrow(()=>verifyCanonicalResult(baseline,after,plan,layout));
    assert.throws(()=>verifyCanonicalReview(baseline,after,plan,layout,oldReview),/stale|mismatch/i,'prior independent review must not be silently reused');
    const all=[...mapping.rows,...mapping.aliases!];
    for(const old of oldRows)for(const lang of ['ar','fa'] as const){
      if(old[lang]===null)continue;
      const expected=codePoints(text(before,old[lang]));
      for(let offset=0;offset<expected.length;offset++){
        const target=resolveLegacyRowAnchor(all,{row:old.id,language:lang,offset});
        assert.ok(target,`old ${old.id}/${lang}/${offset} must resolve`);
        const row=after.items.get('revision-item')!.rows.find(r=>r.id===target.row)!;
        assert.equal(codePoints(text(after,row[target.language]))[target.offset],expected[offset]);
      }
    }
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
