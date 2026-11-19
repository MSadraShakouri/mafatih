import assert from 'node:assert/strict';
import test from 'node:test';
import type { Corpus } from '../src/corpus.js';
import { textId } from '../src/text-ids.js';
import { compileRowVersionFindings, itemVersionBinding, rowVersion } from '../src/row-version-safety.js';
import { resolveVersionedRowAnchor } from '../web/row-split-anchor.js';

const oldSnapshot='b'.repeat(40), targetSnapshot='c'.repeat(40);
const values=['new😀','a😀bc','a😀','00bc'];
const ids=values.map(textId);
const live={id:'reused',ar:ids[0]!,fa:null,kind:'recitation' as const};
const original={id:'reused',ar:ids[1]!,fa:null,kind:'recitation' as const};
const doc={rows:[live,{id:'first',ar:ids[2]!,fa:null},{id:'last',ar:null,fa:ids[3]!}]};
const corpus={items:new Map([['example',doc]]),rowSplits:new Map(),texts:new Map(ids.map((id,i)=>[id,values[i]!]))} as unknown as Corpus;
const findings=()=>({format_version:1 as const,status:'provisional-unreviewed' as const,target_snapshot:targetSnapshot,
  frozen_base:'d'.repeat(40),items:{example:{target_sha256:itemVersionBinding(doc as never,undefined),rows:[{
    id:'reused',original,snapshots:[oldSnapshot],ar:[
      {row:'first',language:'ar' as const,start:0,end:2,target_start:0},
      {row:'last',language:'fa' as const,start:2,end:4,target_start:2},
    ],fa:[],
  }]}}});

test('current content versions are stable and distinguish changed fields or source attributions',()=>{
  const id=rowVersion('example',live);
  assert.match(id,/^[a-f0-9]{64}$/);
  assert.equal(id,rowVersion('example',{...live}));
  assert.notEqual(id,rowVersion('example',{...live,ar:ids[1]!}));
  assert.notEqual(id,rowVersion('example',{...live,sources:{ar:['other']}}));
  assert.notEqual(id,rowVersion('other',live));
});

test('a provisional snapshot map is validated, remains opt-in, and follows Unicode code points across languages',()=>{
  const versions=compileRowVersionFindings(corpus,findings()).get('example')!;
  const unversioned=resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:2});
  assert.equal(unversioned.status,'ambiguous');
  if(unversioned.status!=='ambiguous')throw new Error('expected ambiguity');
  assert.deepEqual(unversioned.choices[1]!.target,{row:'last',language:'fa',offset:2});
  const old=resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:2,version:oldSnapshot});
  assert.equal(old.status,'provisional');
  if(old.status!=='provisional')throw new Error('expected provisional candidate');
  assert.deepEqual(old.anchor,{row:'last',language:'fa',offset:2});
  assert.deepEqual(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:4,version:oldSnapshot}),{
    status:'provisional',anchor:{row:'last',language:'fa',offset:4},choices:old.choices.map(choice=>
      choice.meaning==='current'?{...choice,target:{row:'reused',language:'ar',offset:4}}:{...choice,target:{row:'last',language:'fa',offset:4}}),
  });
  assert.equal(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:5,version:oldSnapshot}).status,'unavailable');
  assert.deepEqual(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:1,version:rowVersion('example',live)}),{
    status:'resolved',anchor:{row:'reused',language:'ar',offset:1},meaning:'current',
  });
});

test('a saved content-version link becomes a consent-gated historical candidate after ID reuse',()=>{
  // A link produced while the old row was live contains a 64-character content
  // identity, not a Git commit. Recognizing it must not imply review approval.
  const versions=compileRowVersionFindings(corpus,findings()).get('example')!;
  const saved=rowVersion('example',original);
  const result=resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:2,version:saved});
  assert.equal(result.status,'provisional');
  if(result.status!=='provisional')throw new Error('expected provisional candidate');
  assert.deepEqual(result.anchor,{row:'last',language:'fa',offset:2});
  assert.equal(result.choices.find(choice=>choice.meaning==='historical')?.provisional,true);
});

test('a content identity shared by current and historical meanings is not silently selected',()=>{
  // Equal text/content identity does not prove equal source-occurrence lineage.
  const changedDoc={...doc,rows:[original,...doc.rows.slice(1)]};
  const changed={...corpus,items:new Map([['example',changedDoc]])} as unknown as Corpus;
  const data=findings();data.items.example.target_sha256=itemVersionBinding(changedDoc as never,undefined);
  const versions=compileRowVersionFindings(changed,data).get('example')!;
  const shared=rowVersion('example',original);
  assert.equal(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:1,version:shared}).status,'invalid-data');
  assert.equal(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:1}).status,'invalid-data');
});

test('changed target snapshots disable provisional mappings instead of redirecting into stale rows',()=>{
  const changed={...corpus,items:new Map([['example',{...doc,rows:doc.rows.slice(0,1)}]])} as unknown as Corpus;
  const versions=compileRowVersionFindings(changed,findings()).get('example')!;
  const old=resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:1,version:oldSnapshot});
  assert.equal(old.status,'unavailable');
  if(old.status==='unavailable')assert.equal(old.choices.find(c=>c.meaning==='historical')?.target,undefined);
  assert.equal(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:1,version:rowVersion('example',original)}).status,'unavailable');
  assert.equal(resolveVersionedRowAnchor([],versions,{row:'reused',language:'ar',offset:1,version:targetSnapshot}).status,'unknown-version');
});

test('an unroutable old ID exposes only a consent-gated candidate, and stale bindings withhold it',()=>{
  const retired={...original,id:'retired'},retiredDoc={rows:doc.rows.slice(1)};
  const retiredCorpus={...corpus,items:new Map([['example',retiredDoc]])} as unknown as Corpus;
  const data=findings();data.items.example.target_sha256=itemVersionBinding(retiredDoc as never,undefined);
  data.items.example.rows[0]!.id='retired';data.items.example.rows[0]!.original=retired;
  const versions=compileRowVersionFindings(retiredCorpus,data).get('example')!;
  assert.equal(versions[0]!.current,undefined);
  const rows=[{id:'first',ar:'a😀',fa:''},{id:'last',ar:'',fa:'00bc'}];
  const old={row:'retired',language:'ar' as const,offset:2};
  const unversioned=resolveVersionedRowAnchor([],versions,old,rows);
  assert.equal(unversioned.status,'ambiguous');
  if(unversioned.status!=='ambiguous')throw new Error('expected explicit choice');
  assert.equal(unversioned.choices.length,1);
  assert.equal(unversioned.choices[0]!.provisional,true);
  assert.deepEqual(unversioned.choices[0]!.target,{row:'last',language:'fa',offset:2});
  for(const version of [oldSnapshot,rowVersion('example',retired)]){
    const result=resolveVersionedRowAnchor([],versions,{...old,version},rows);
    assert.equal(result.status,'provisional');
    if(result.status==='provisional')assert.deepEqual(result.anchor,{row:'last',language:'fa',offset:2});
  }
  assert.equal(resolveVersionedRowAnchor([],versions,{...old,version:targetSnapshot},rows).status,'unknown-version');
  const changedDoc={rows:[...retiredDoc.rows].reverse()};
  const changed={...retiredCorpus,items:new Map([['example',changedDoc]])} as unknown as Corpus;
  const stale=compileRowVersionFindings(changed,data).get('example')!;
  assert.equal(resolveVersionedRowAnchor([],stale,{...old,version:oldSnapshot},rows).status,'unavailable');
  const reintroduced={...retiredCorpus,items:new Map([['example',{rows:[retired,...retiredDoc.rows]}]])} as unknown as Corpus;
  const conflict=compileRowVersionFindings(reintroduced,data).get('example')!;
  assert.equal(resolveVersionedRowAnchor([],conflict,{...old,version:rowVersion('example',retired)}).status,'invalid-data');
  assert.equal(resolveVersionedRowAnchor([],[],old,rows,true).status,'invalid-data');
});

test('a matching binding still rejects forged, overlapping, or wrong-text maps',()=>{
  const bad=findings();bad.items.example.rows[0]!.ar[1]!.target_start=0;
  assert.throws(()=>compileRowVersionFindings(corpus,bad),/text|slice|mapping/i);
  const gap=findings();gap.items.example.rows[0]!.ar[1]!.start=1;
  assert.throws(()=>compileRowVersionFindings(corpus,gap),/contiguous|mapping/i);
  const duplicate=findings();duplicate.items.example.rows.push(structuredClone(duplicate.items.example.rows[0]!));
  assert.throws(()=>compileRowVersionFindings(corpus,duplicate),/duplicate/i);
});
