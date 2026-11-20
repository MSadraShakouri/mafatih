import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus, text, type Corpus } from '../src/corpus.js';
import { intern } from '../src/editor.js';
import { ItemSchema } from '../src/schema.js';
import { createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { compileCanonicalSplit, createCanonicalLayoutTemplate, verifyCanonicalResult } from '../src/split-canonical.js';
import { installHistoricalAliases } from '../src/row-alias-history.js';
import { prepareLiveRevision, verifyLiveRevisionHistory } from '../src/row-revision.js';
import { validateRowSplitRecords } from '../src/row-splits.js';
import { codePoints, sha256 } from '../src/text-ids.js';
import { resolveLegacyRowAnchor } from '../web/row-split-anchor.js';

function withResult(c:Corpus,result:ReturnType<typeof compileCanonicalSplit>):Corpus {
  const next:Corpus={...c,items:new Map(c.items),texts:new Map(c.texts),textShards:new Map(c.textShards),rowSplits:new Map(c.rowSplits)};
  next.items.set(result.itemId,result.item);next.rowSplits.set(result.itemId,result.record);
  for(const [id,value] of result.texts){next.texts.set(id,value);next.textShards.set(id,id.slice(1,3));}
  return next;
}
function fixture(fields:Array<{ar:string|null;fa:string|null}>) {
  const c=loadCorpus(),item='test-live-revision',source=Object.keys(c.sources.sources)[0]!;
  c.items.set(item,ItemSchema.parse({legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
    rows:fields.map((field,index)=>({id:`old-${index+1}`,ar:field.ar===null?null:intern(c,field.ar),fa:field.fa===null?null:intern(c,field.fa),
      kind:'recitation',sources:{...(field.ar===null?{}:{ar:[source]}),...(field.fa===null?{}:{fa:[source]})}}))}));
  const plan=createAgentTemplate(c,item,'agent-1');for(const entry of plan.sources){entry.checked=true;entry.kinds=['recitation'];}
  const layout=createCanonicalLayoutTemplate(c,splitAgentPlan(c,plan));for(const row of layout.rows)row.checked=true;
  return {c,item,source,plan,layout};
}

test('live role and language-slot correction preserves the old field link', () => {
  const f=fixture([{ar:null,fa:'synthetic explanatory text'}]);
  f.layout.rows[0]!.output=[{ar:{source:'fa',part:0},fa:null,kind:'recitation'}];
  const initial=compileCanonicalSplit(f.c,f.plan,f.layout),current=withResult(f.c,initial),old=initial.item.rows[0]!;
  const nextPlan=structuredClone(f.plan);nextPlan.sources[0]!.kinds=['note'];
  const nextLayout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,nextPlan));for(const row of nextLayout.rows)row.checked=true;
  const candidate=compileCanonicalSplit(f.c,nextPlan,nextLayout),prepared=prepareLiveRevision(f.c,current,f.item,candidate);
  assert.equal(prepared.retired.length,1);assert.equal(prepared.retired[0]!.original.id,old.id);
  assert.deepEqual(validateRowSplitRecords(prepared.corpus,f.item),[]);
  assert.doesNotThrow(()=>verifyCanonicalResult(f.c,prepared.corpus,nextPlan,nextLayout));
  const entries=[...prepared.record.rows,...prepared.record.aliases!];
  assert.deepEqual(resolveLegacyRowAnchor(entries,{row:old.id,language:'ar',offset:4}),
    {row:candidate.item.rows[0]!.id,language:'fa',offset:4});
  assert.equal(text(prepared.corpus,candidate.item.rows[0]!.fa),'synthetic explanatory text');
});

test('a spaced joined row and an earlier alias survive a role revision, but its space cannot disappear', () => {
  const f=fixture([{ar:'a😀',fa:'One'},{ar:'b',fa:'Two'}]);
  const layout={...f.layout,merges:[{left:'old-1',right:'old-2',checked:true as const,
    spacing:{mode:'both-space' as const,reason:'Synthetic reviewed word boundary'}}]};
  const initial=compileCanonicalSplit(f.c,f.plan,layout),current=withResult(f.c,initial),old=initial.item.rows[0]!;
  const historic={original:{id:'historic-piece',ar:f.c.items.get(f.item)!.rows[0]!.ar,fa:null,kind:'recitation' as const,sources:{ar:[f.source]}},
    ar:[{row:old.id,language:'ar' as const,start:0,end:2,target_start:0}],fa:[]};
  current.rowSplits.set(f.item,installHistoricalAliases(current,f.item,[historic]));
  const nextPlan=structuredClone(f.plan);for(const source of nextPlan.sources)source.kinds=['quotation'];
  const baseLayout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,nextPlan));for(const row of baseLayout.rows)row.checked=true;
  const nextLayout={...baseLayout,merges:layout.merges},candidate=compileCanonicalSplit(f.c,nextPlan,nextLayout);
  const prepared=prepareLiveRevision(f.c,current,f.item,candidate),target=candidate.item.rows[0]!;
  assert.notEqual(target.id,old.id);assert.equal(prepared.record.format_version,3);
  assert.deepEqual(validateRowSplitRecords(prepared.corpus,f.item),[]);
  assert.doesNotThrow(()=>verifyCanonicalResult(f.c,prepared.corpus,nextPlan,nextLayout));
  const entries=[...prepared.record.rows,...prepared.record.aliases!];
  assert.deepEqual(resolveLegacyRowAnchor(entries,{row:old.id,language:'ar',offset:2}),{row:target.id,language:'ar',offset:2});
  assert.deepEqual(resolveLegacyRowAnchor(entries,{row:'historic-piece',language:'ar',offset:1}),{row:target.id,language:'ar',offset:1});
  assert.equal(text(prepared.corpus,target.ar),'a😀 b');
  const exactLayout={...baseLayout,merges:[{left:'old-1',right:'old-2',checked:true as const}]};
  const dropping=compileCanonicalSplit(f.c,nextPlan,exactLayout);
  assert.throws(()=>prepareLiveRevision(f.c,current,f.item,dropping),/lineage|destinations/i,'an already-published editorial space must not silently disappear');
});

test('equal repeated text at a different source offset is not the same old link', () => {
  const f=fixture([{ar:'AAAAA',fa:null}]);
  f.plan.sources[0]!.cuts=[1,3];f.plan.sources[0]!.kinds=['recitation','recitation','recitation'];
  let oldLayout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,f.plan));for(const row of oldLayout.rows)row.checked=true;
  const old=compileCanonicalSplit(f.c,f.plan,oldLayout),current=withResult(f.c,old),oldMiddle=old.item.rows[1]!;
  const nextPlan=structuredClone(f.plan);nextPlan.sources[0]!.cuts=[2,4];
  const layout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,nextPlan));for(const row of layout.rows)row.checked=true;
  layout.rows[0]!.output[0]!.id_scheme='lineage-v2';layout.rows[0]!.output[2]!.id_scheme='lineage-v2';
  const reused=compileCanonicalSplit(f.c,nextPlan,layout);
  assert.equal(reused.item.rows[1]!.id,oldMiddle.id);assert.equal(reused.item.rows[1]!.ar,oldMiddle.ar,'the repeated text happens to be equal');
  assert.throws(()=>prepareLiveRevision(f.c,current,f.item,reused),/lineage/i,'identical text from a different frozen source offset is rejected');
  layout.rows[0]!.output[1]!.id_scheme='lineage-v2';
  const candidate=compileCanonicalSplit(f.c,nextPlan,layout),prepared=prepareLiveRevision(f.c,current,f.item,candidate);
  assert.deepEqual(validateRowSplitRecords(prepared.corpus,f.item),[]);
  const entries=[...prepared.record.rows,...prepared.record.aliases!];
  assert.deepEqual(resolveLegacyRowAnchor(entries,{row:oldMiddle.id,language:'ar',offset:0}),
    {row:candidate.item.rows[0]!.id,language:'ar',offset:1});
  assert.deepEqual(resolveLegacyRowAnchor(entries,{row:oldMiddle.id,language:'ar',offset:1}),
    {row:candidate.item.rows[1]!.id,language:'ar',offset:0});
  assert.equal(codePoints(text(prepared.corpus,candidate.item.rows[1]!.ar)).length,2);
});

test('rejects overlapping source destinations that start inside a previously selected run', () => {
  const f=fixture([{ar:'AAAA',fa:null}]);
  f.plan.sources[0]!.cuts=[2];f.plan.sources[0]!.kinds=['recitation','recitation'];
  const prior=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,f.plan));for(const row of prior.rows)row.checked=true;
  const current=withResult(f.c,compileCanonicalSplit(f.c,f.plan,prior));
  const nextPlan=structuredClone(f.plan);nextPlan.sources[0]!.cuts=[3];
  const next=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,nextPlan));for(const row of next.rows)row.checked=true;
  for(const output of next.rows[0]!.output)output.id_scheme='lineage-v2';
  const malformed=compileCanonicalSplit(f.c,nextPlan,next);
  // Simulate a corrupted candidate: the second identical-text destination
  // starts midway through the first source span, rather than after it.
  malformed.record.rows[0]!.ar[1]!.start=1;malformed.record.rows[0]!.ar[1]!.end=2;
  assert.throws(()=>prepareLiveRevision(f.c,current,f.item,malformed),/overlapping source lineage destinations/);
});

test('legacy positional IDs stay stable; opted-in IDs change when source spans change again', () => {
  const f=fixture([{ar:'ABCDEFG',fa:null}]);
  f.plan.sources[0]!.cuts=[2];f.plan.sources[0]!.kinds=['recitation','recitation'];
  const legacy=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,f.plan));for(const row of legacy.rows)row.checked=true;
  const first=legacy.rows[0]!.output[0]!,expected=`old-1-s${sha256(JSON.stringify({row:'old-1',ar:first.ar,fa:first.fa,kind:first.kind})).slice(0,16)}`;
  assert.equal(compileCanonicalSplit(f.c,f.plan,legacy).item.rows[0]!.id,expected);
  const v2=structuredClone(legacy);for(const output of v2.rows[0]!.output)output.id_scheme='lineage-v2';
  const published=compileCanonicalSplit(f.c,f.plan,v2),current=withResult(f.c,published);
  assert.notEqual(published.item.rows[0]!.id,expected);
  const laterPlan=structuredClone(f.plan);laterPlan.sources[0]!.cuts=[3];
  const later=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,laterPlan));for(const row of later.rows)row.checked=true;
  for(const output of later.rows[0]!.output)output.id_scheme='lineage-v2';
  const candidate=compileCanonicalSplit(f.c,laterPlan,later);
  assert.notEqual(candidate.item.rows[0]!.id,published.item.rows[0]!.id);
  assert.notEqual(candidate.item.rows[1]!.id,published.item.rows[1]!.id);
  const prepared=prepareLiveRevision(f.c,current,f.item,candidate);
  assert.deepEqual(validateRowSplitRecords(prepared.corpus,f.item),[]);
  assert.equal(prepared.retired.length,2);
});

function git(dir:string,...args:string[]):string {
  const p=spawnSync('git',args,{cwd:dir,encoding:'utf8'});assert.equal(p.status,0,p.stderr);return p.stdout.trim();
}
function write(dir:string,file:string,value:unknown):void {
  const dest=path.join(dir,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(value,null,2)+'\n');
}
function makeRevisionHistoryFixture(){
  const f=fixture([{ar:'ABCDE',fa:null}]);
  f.plan.sources[0]!.cuts=[2];f.plan.sources[0]!.kinds=['recitation','recitation'];
  const layout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,f.plan));for(const row of layout.rows)row.checked=true;
  const old=compileCanonicalSplit(f.c,f.plan,layout),current=withResult(f.c,old);
  const nextPlan=structuredClone(f.plan);nextPlan.sources[0]!.kinds=['quotation','quotation'];
  const nextLayout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,nextPlan));for(const row of nextLayout.rows)row.checked=true;
  const candidate=compileCanonicalSplit(f.c,nextPlan,nextLayout);
  return {...f,old,current,nextPlan,nextLayout,candidate};
}
function historyRepo(f:ReturnType<typeof makeRevisionHistoryFixture>){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-revision-history-'));
  git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
  write(dir,`data/items/${f.item}.json`,f.c.items.get(f.item));git(dir,'add','.');git(dir,'commit','-qm','base');
  return {dir,base:git(dir,'rev-parse','HEAD')};
}
function publishHistory(dir:string,item:string,result:ReturnType<typeof compileCanonicalSplit>,message:string):void {
  write(dir,`data/items/${item}.json`,result.item);write(dir,`data/row-splits/${item}.json`,result.record);
  git(dir,'add','.');git(dir,'commit','-qm',message);
}

test('a live ID reused with different historical text remains held; shallow history is refused', () => {
  const f=makeRevisionHistoryFixture(),olderPlan=structuredClone(f.plan);olderPlan.sources[0]!.cuts=[3];
  const olderLayout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,olderPlan));for(const row of olderLayout.rows)row.checked=true;
  const older=compileCanonicalSplit(f.c,olderPlan,olderLayout);
  assert.equal(older.item.rows[0]!.id,f.old.item.rows[0]!.id);assert.notEqual(older.item.rows[0]!.ar,f.old.item.rows[0]!.ar);
  for(const [id,value] of older.texts){f.current.texts.set(id,value);f.current.textShards.set(id,id.slice(1,3));}
  const prepared=prepareLiveRevision(f.c,f.current,f.item,f.candidate),{dir,base}=historyRepo(f),cwd=process.cwd();
  try {
    publishHistory(dir,f.item,older,'older meaning');publishHistory(dir,f.item,f.old,'current meaning');const head=git(dir,'rev-parse','HEAD');
    process.chdir(dir);
    assert.throws(()=>verifyLiveRevisionHistory(base,head,f.c,prepared.corpus,f.item,f.old.record,prepared.retired,prepared.newLive),/different historical meanings|version-aware/i);
    fs.writeFileSync(path.join(dir,'.git/shallow'),base+'\n');
    assert.throws(()=>verifyLiveRevisionHistory(base,head,f.c,prepared.corpus,f.item,f.old.record,prepared.retired,prepared.newLive),/shallow/i);
  } finally { process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true}); }
});

test('a corrected live original may keep its text and lineage while its role changes', () => {
  const f=fixture([{ar:null,fa:'synthetic explanatory text'}]);
  f.layout.rows[0]!.output=[{ar:{source:'fa',part:0},fa:null,kind:'recitation'}];
  const old=compileCanonicalSplit(f.c,f.plan,f.layout),current=withResult(f.c,old);
  const plan=structuredClone(f.plan);plan.sources[0]!.kinds=['note'];
  const layout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,plan));for(const row of layout.rows)row.checked=true;
  const candidate=compileCanonicalSplit(f.c,plan,layout),prepared=prepareLiveRevision(f.c,current,f.item,candidate);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-revision-kind-')),cwd=process.cwd();
  try {
    git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
    write(dir,`data/items/${f.item}.json`,f.c.items.get(f.item));git(dir,'add','.');git(dir,'commit','-qm','base');const base=git(dir,'rev-parse','HEAD');
    publishHistory(dir,f.item,old,'published wrong slot');const head=git(dir,'rev-parse','HEAD');process.chdir(dir);
    assert.doesNotThrow(()=>verifyLiveRevisionHistory(base,head,f.c,prepared.corpus,f.item,old.record,prepared.retired,prepared.newLive));
  } finally {process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true});}
});

test('a newly generated live ID cannot steal a different historical identity', () => {
  const f=makeRevisionHistoryFixture(),prepared=prepareLiveRevision(f.c,f.current,f.item,f.candidate),{dir,base}=historyRepo(f),cwd=process.cwd();
  try {
    const fake=structuredClone(f.old);
    fake.item.rows[0]!.id=f.candidate.item.rows[0]!.id;
    fake.item.rows[0]!.ar=f.c.items.get(f.item)!.rows[0]!.ar;
    publishHistory(dir,f.item,fake,'older conflicting live ID');publishHistory(dir,f.item,f.old,'current valid state');
    const head=git(dir,'rev-parse','HEAD');process.chdir(dir);
    assert.throws(()=>verifyLiveRevisionHistory(base,head,f.c,prepared.corpus,f.item,f.old.record,prepared.retired,prepared.newLive),/historical|lineage|match/i);
  } finally { process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true}); }
});

test('an affected identity that existed as an older alias is held, not silently reclaimed', () => {
  const f=makeRevisionHistoryFixture(),prepared=prepareLiveRevision(f.c,f.current,f.item,f.candidate),{dir,base}=historyRepo(f),cwd=process.cwd();
  try {
    const row=f.old.item.rows[0]!,newId=f.candidate.item.rows[0]!.id;
    const previousAlias={original:{...row,id:newId},ar:[{row:row.id,language:'ar' as const,start:0,end:2,target_start:0}],fa:[]};
    const withAlias=structuredClone(f.old);withAlias.record=installHistoricalAliases(f.current,f.item,[previousAlias]);
    publishHistory(dir,f.item,withAlias,'previous historical alias');publishHistory(dir,f.item,f.old,'current valid state');
    const head=git(dir,'rev-parse','HEAD');process.chdir(dir);
    assert.throws(()=>verifyLiveRevisionHistory(base,head,f.c,prepared.corpus,f.item,f.old.record,prepared.retired,prepared.newLive),/previously existed as an alias|version-aware/i);
  } finally { process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true}); }
});
