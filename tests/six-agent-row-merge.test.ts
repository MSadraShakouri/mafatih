import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, text, type Corpus } from '../src/corpus.js';
import { intern } from '../src/editor.js';
import { ItemSchema, RowMergeInsertionSchema, RowSplitRecordSchema } from '../src/schema.js';
import { createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { compileCanonicalSplit, createCanonicalLayoutTemplate, restoreCanonicalItem, verifyCanonicalResult } from '../src/split-canonical.js';
import { spacingBoundaryIssue, validateRowSplitRecords } from '../src/row-splits.js';
import { codePoints } from '../src/text-ids.js';
import { resolveLegacyRowAnchor } from '../web/row-split-anchor.js';
import { createCanonicalReviewTemplate, verifyCanonicalReview } from '../src/six-agent-review.js';
import { corpusBeforeRowSplits } from './helpers/row-split-history.js';

function withResult(c:Corpus, result:ReturnType<typeof compileCanonicalSplit>):Corpus {
  const next:Corpus={...c,items:new Map(c.items),texts:new Map(c.texts),textShards:new Map(c.textShards),rowSplits:new Map(c.rowSplits)};
  next.items.set(result.itemId,result.item);next.rowSplits.set(result.itemId,result.record);
  for(const [id,value] of result.texts){next.texts.set(id,value);next.textShards.set(id,id.slice(1,3));}
  return next;
}

function faraj() {
  // The fixture describes the frozen original rows, not whichever already
  // migrated rows happen to be in the branch running this test.
  const c=corpusBeforeRowSplits(loadCorpus()), item='dua-frj-zman-ajl', plan=createAgentTemplate(c,item,'agent-5');
  for(const source of plan.sources){
    source.checked=true;
    source.cuts=source.row==='r00003'?[source.language==='ar'?745:659]:
      source.row==='r00004'?[source.language==='ar'?11:9]:[];
    const kind=source.row==='r00001'?'audio-reciter':source.row==='r00002'?'note':'recitation';
    source.kinds=Array(source.cuts.length+1).fill(kind);
  }
  const layout=createCanonicalLayoutTemplate(c,splitAgentPlan(c,plan));
  for(const row of layout.rows)row.checked=true;
  for(const id of ['r00003','r00004']) {
    layout.rows.find(row=>row.row===id)!.output=[0,1].map(part=>({
      ar:{source:'ar' as const,part},fa:{source:'fa' as const,part},kind:'recitation' as const,
    }));
  }
  const separate=compileCanonicalSplit(c,plan,layout);
  const left=separate.record.rows.find(row=>row.original.id==='r00003')!.results.at(-1)!;
  const right=separate.record.rows.find(row=>row.original.id==='r00004')!.results[0]!;
  return {c,item,plan,layout,separate,left,right};
}

function synthetic() {
  const c=loadCorpus(), item='test-merged-rows', source=Object.keys(c.sources.sources)[0]!;
  const ar=['a😀e\u0301','ب','tail'], fa=['یک','دو','سه'];
  c.items.set(item,ItemSchema.parse({legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
    rows:ar.map((value,i)=>({id:`old-${i+1}`,ar:intern(c,value),fa:intern(c,fa[i]!),kind:'recitation',
      sources:{ar:[source],fa:[source]}}))}));
  const plan=createAgentTemplate(c,item,'agent-1');
  for(const s of plan.sources){s.checked=true;s.kinds=['recitation'];}
  const layout=createCanonicalLayoutTemplate(c,splitAgentPlan(c,plan));for(const row of layout.rows)row.checked=true;
  return {c,item,plan,layout,ar,fa};
}

test('actual Faraj repetition crosses original rows without inventing Arabic or Persian whitespace', () => {
  const f=faraj(), before=withResult(f.c,f.separate), previous=before.items.get(f.item)!;
  const left=previous.rows.find(r=>r.id===f.left)!, right=previous.rows.find(r=>r.id===f.right)!;
  assert.equal(previous.rows.indexOf(right),previous.rows.indexOf(left)+1);
  for(const lang of ['ar','fa'] as const){
    assert.ok(!/\s$/u.test(text(before,left[lang]))&&!/^\s/u.test(text(before,right[lang])),`${lang}: this boundary has no source whitespace`);
  }
  const oldReview=createCanonicalReviewTemplate(f.c,before,f.plan,f.layout,'agent-6','a'.repeat(40));
  const layout={...f.layout,merges:[{left:f.left,right:f.right,checked:true as const}]};
  const result=compileCanonicalSplit(f.c,f.plan,layout), after=withResult(f.c,result);
  assert.equal(result.record.format_version,2);assert.deepEqual(validateRowSplitRecords(after),[]);
  assert.deepEqual(restoreCanonicalItem(after,f.item),f.c.items.get(f.item));
  assert.doesNotThrow(()=>verifyCanonicalResult(f.c,after,f.plan,layout));
  const merged=result.item.rows[previous.rows.indexOf(left)]!;
  assert.equal(result.item.rows.length,previous.rows.length-1);
  for(const lang of ['ar','fa'] as const){
    const a=text(before,left[lang]),b=text(before,right[lang]),boundary=codePoints(a).length;
    assert.equal(text(after,merged[lang]),a+b,'exact literal concatenation, no separator or lost characters');
    const redirects=[...result.record.rows,...(result.record.aliases??[])];
    assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'r00004',language:lang,offset:0}),
      {row:merged.id,language:lang,offset:boundary});
    assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:f.right,language:lang,offset:2}),
      {row:merged.id,language:lang,offset:boundary+2});
    assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:f.left,language:lang,offset:1}),
      {row:merged.id,language:lang,offset:1});
  }
  assert.throws(()=>verifyCanonicalReview(f.c,after,f.plan,layout,oldReview),/stale|mismatch/i);
});

test('chained merges preserve original and intermediate row links, code-point offsets and source attribution', () => {
  const f=synthetic(), one=compileCanonicalSplit(f.c,f.plan,{...f.layout,merges:[{left:'old-1',right:'old-2',checked:true}]});
  const first=one.item.rows[0]!.id;
  const layout={...f.layout,merges:[{left:'old-1',right:'old-2',checked:true as const},{left:first,right:'old-3',checked:true as const}]};
  const result=compileCanonicalSplit(f.c,f.plan,layout), after=withResult(f.c,result), joined=result.item.rows[0]!;
  assert.deepEqual(validateRowSplitRecords(after),[]);
  assert.deepEqual(restoreCanonicalItem(after,f.item),f.c.items.get(f.item));
  assert.equal(text(after,joined.ar),f.ar.join(''));assert.equal(text(after,joined.fa),f.fa.join(''));
  assert.deepEqual(joined.sources,f.c.items.get(f.item)!.rows[0]!.sources);
  assert.ok(result.record.aliases!.some(a=>a.original.id===first),'the intermediate published physical row has a redirect');
  const redirects=[...result.record.rows,...result.record.aliases!];
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'old-2',language:'ar',offset:0}),
    {row:joined.id,language:'ar',offset:codePoints(f.ar[0]!).length});
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'old-3',language:'fa',offset:1}),
    {row:joined.id,language:'fa',offset:codePoints(f.fa[0]!+f.fa[1]!).length+1});
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:first,language:'ar',offset:3}),
    {row:joined.id,language:'ar',offset:3});
  const broken=structuredClone(after.rowSplits.get(f.item)!);
  broken.rows.find(e=>e.original.id==='old-2')!.ar[0]!.target_start=0;
  after.rowSplits.set(f.item,broken);
  assert.ok(validateRowSplitRecords(after).some(e=>/slice|overlap|missing/i.test(e)));
  assert.throws(()=>restoreCanonicalItem(after,f.item),/invalid/i);
});

test('merge decisions require adjacency, checked layout, matching kinds and matching attribution', () => {
  const f=synthetic();
  assert.throws(()=>compileCanonicalSplit(f.c,f.plan,{...f.layout,merges:[{left:'old-1',right:'old-3',checked:true}]}),/adjacent/i);
  assert.throws(()=>compileCanonicalSplit(f.c,f.plan,{...f.layout,merges:[{left:'old-1',right:'old-2',checked:false}]}),/checked|true/i);
  const other=Object.keys(f.c.sources.sources)[1]!;
  f.c.items.get(f.item)!.rows[1]!.sources!.ar=[other];
  const p=createAgentTemplate(f.c,f.item,'agent-1');for(const s of p.sources){s.checked=true;s.kinds=['recitation'];}
  const l=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,p));for(const row of l.rows)row.checked=true;
  assert.throws(()=>compileCanonicalSplit(f.c,p,{...l,merges:[{left:'old-1',right:'old-2',checked:true}]}),/attribution/i);
  p.sources.filter(s=>s.row==='old-2').forEach(s=>s.kinds=['note']);
  const unequal=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,p));for(const row of unequal.rows)row.checked=true;
  assert.throws(()=>compileCanonicalSplit(f.c,p,{...unequal,merges:[{left:'old-1',right:'old-2',checked:true}]}),/kind/i);
});

test('V1 mapping remains strict; V2 offsets and aliases cannot be silently interpreted as V1', () => {
  const f=faraj(), old=f.separate.record;
  assert.equal(old.format_version,1);assert.equal(old.aliases,undefined);
  assert.deepEqual(RowSplitRecordSchema.parse(old),old);
  const forged=structuredClone(old);forged.rows[0]!.fa[0]!.target_start=0;
  assert.throws(()=>RowSplitRecordSchema.parse(forged),/V1|target_start/i);
  const bad={...old,format_version:2};assert.throws(()=>RowSplitRecordSchema.parse(bad),/V2|aliases/i);
});

test('mixed-language source pieces retain their original language redirects when merged into one destination field', () => {
  const f=synthetic(), layout=structuredClone(f.layout);
  layout.rows[0]!.output=[
    {ar:null,fa:{source:'ar',part:0},kind:'recitation'},
    {ar:null,fa:{source:'fa',part:0},kind:'recitation'},
  ];
  const separate=compileCanonicalSplit(f.c,f.plan,layout), first=separate.item.rows[0]!,second=separate.item.rows[1]!;
  const mergedLayout={...layout,merges:[{left:first.id,right:second.id,checked:true as const}]};
  const result=compileCanonicalSplit(f.c,f.plan,mergedLayout),after=withResult(f.c,result),joined=result.item.rows[0]!;
  assert.deepEqual(validateRowSplitRecords(after),[]);assert.deepEqual(restoreCanonicalItem(after,f.item),f.c.items.get(f.item));
  assert.equal(joined.ar,null);assert.equal(text(after,joined.fa),f.ar[0]!+f.fa[0]!);
  const redirects=[...result.record.rows,...result.record.aliases!];
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'old-1',language:'ar',offset:2}),
    {row:joined.id,language:'fa',offset:2});
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'old-1',language:'fa',offset:1}),
    {row:joined.id,language:'fa',offset:codePoints(f.ar[0]!).length+1});
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:second.id,language:'fa',offset:1}),
    {row:joined.id,language:'fa',offset:codePoints(f.ar[0]!).length+1});
});

test('Faraj spaces are explicit editorial insertions, reversible and separately reviewable', () => {
  const f=faraj(), before=withResult(f.c,f.separate), old=before.items.get(f.item)!;
  const left=old.rows.find(r=>r.id===f.left)!, right=old.rows.find(r=>r.id===f.right)!;
  const reason='Proposed separation across original row boundary';
  const layout={...f.layout,merges:[{left:f.left,right:f.right,checked:true as const,
    spacing:{mode:'both-space' as const,reason}}]};
  const result=compileCanonicalSplit(f.c,f.plan,layout),after=withResult(f.c,result);
  const joined=result.item.rows[old.rows.indexOf(left)]!, redirects=[...result.record.rows,...result.record.aliases!];
  assert.equal(result.record.format_version,3);assert.equal(result.record.insertions!.length,2);
  assert.throws(()=>RowSplitRecordSchema.parse({...result.record,format_version:2}),/V3|insertions/i);
  assert.throws(()=>RowSplitRecordSchema.parse({...result.record,insertions:[]}),/V3|insertions/i);
  assert.deepEqual(validateRowSplitRecords(after),[]);assert.deepEqual(restoreCanonicalItem(after,f.item),f.c.items.get(f.item));
  for(const lang of ['ar','fa'] as const){
    const a=text(before,left[lang]),b=text(before,right[lang]),at=codePoints(a).length;
    assert.equal(text(after,joined[lang]),a+' '+b,'exactly one explicit, tracked space; neither original is altered');
    assert.deepEqual(result.record.insertions!.find(x=>x.language===lang),
      {row:joined.id,language:lang,target_start:at,value:' ',left:f.left,right:f.right,reason});
    assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'r00004',language:lang,offset:0}),
      {row:joined.id,language:lang,offset:at+1});
    assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:f.right,language:lang,offset:2}),
      {row:joined.id,language:lang,offset:at+3});
    assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:f.left,language:lang,offset:at}),
      {row:joined.id,language:lang,offset:at},'the left end remains immediately before the inserted space');
  }
  assert.doesNotThrow(()=>verifyCanonicalResult(f.c,after,f.plan,layout));
  const review=createCanonicalReviewTemplate(f.c,after,f.plan,layout,'agent-6','a'.repeat(40));
  for(const source of review.semantic_review.sources){source.split='accept';source.kind='accept';}
  for(const issue of review.semantic_review.issues){issue.decision='addressed';issue.note='Inspected';}
  review.layout.decision='accept';
  assert.equal(review.spacing_review!.length,2);
  assert.equal(verifyCanonicalReview(f.c,after,f.plan,layout,review).status,'needs-work','layout approval alone must not approve spaces');
  review.spacing_review![0]!.decision='accept';
  assert.throws(()=>verifyCanonicalReview(f.c,after,f.plan,layout,review),/spacing decision needs a review note/i);
  review.spacing_review![0]!.note='Boundary and source context checked';
  assert.equal(verifyCanonicalReview(f.c,after,f.plan,layout,review).status,'needs-work','both language spaces need separate decisions');
  review.spacing_review![1]!.decision='accept';review.spacing_review![1]!.note='Boundary and source context checked';
  assert.equal(verifyCanonicalReview(f.c,after,f.plan,layout,review).status,'agent-review-records-complete');
  for(const decision of ['revise','uncertain'] as const){
    const finding=structuredClone(review);finding.spacing_review![1]!.decision=decision;
    assert.equal(verifyCanonicalReview(f.c,after,f.plan,layout,finding).status,'needs-work');
  }
  const forged=structuredClone(review);forged.spacing_review![0]!.target_start++;
  assert.throws(()=>verifyCanonicalReview(f.c,after,f.plan,layout,forged),/spacing review.*stale/i);
  const noSeparate=structuredClone(review);delete noSeparate.spacing_review;
  assert.throws(()=>verifyCanonicalReview(f.c,after,f.plan,layout,noSeparate),/separate spacing review/i);
  const broken=structuredClone(result.record);broken.insertions![0]!.left='unrelated';after.rowSplits.set(f.item,broken);
  assert.ok(validateRowSplitRecords(after).some(e=>/untraceable.*insertion/i.test(e)));
  assert.throws(()=>restoreCanonicalItem(after,f.item),/invalid/i);
});

test('chained corrections remap source anchors, prior-output aliases and earlier insertion offsets', () => {
  const f=synthetic(), firstLayout={...f.layout,merges:[{left:'old-2',right:'old-3',checked:true as const,
    spacing:{mode:'ar-space' as const,reason:'Separate the Arabic boundary'}}]};
  const first=compileCanonicalSplit(f.c,f.plan,firstLayout),mid=first.item.rows[1]!.id;
  const layout={...firstLayout,merges:[...firstLayout.merges,{left:'old-1',right:mid,checked:true as const,
    spacing:{mode:'fa-space' as const,reason:'Separate the Persian boundary'}}]};
  const result=compileCanonicalSplit(f.c,f.plan,layout),after=withResult(f.c,result),joined=result.item.rows[0]!;
  assert.deepEqual(validateRowSplitRecords(after),[]);assert.deepEqual(restoreCanonicalItem(after,f.item),f.c.items.get(f.item));
  assert.equal(text(after,joined.ar),f.ar[0]!+f.ar[1]!+' '+f.ar[2]!);
  assert.equal(text(after,joined.fa),f.fa[0]!+' '+f.fa[1]!+f.fa[2]!);
  assert.equal(result.record.insertions!.find(x=>x.language==='ar')!.target_start,codePoints(f.ar[0]!+f.ar[1]!).length);
  assert.equal(result.record.insertions!.find(x=>x.language==='fa')!.target_start,codePoints(f.fa[0]!).length);
  const redirects=[...result.record.rows,...result.record.aliases!];
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:mid,language:'fa',offset:0}),
    {row:joined.id,language:'fa',offset:codePoints(f.fa[0]!).length+1});
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:mid,language:'ar',offset:codePoints(f.ar[1]!).length}),
    {row:joined.id,language:'ar',offset:codePoints(f.ar[0]!+f.ar[1]!).length},'the prior output link to its own inserted space remains valid');
  assert.deepEqual(resolveLegacyRowAnchor(redirects,{row:'old-3',language:'ar',offset:0}),
    {row:joined.id,language:'ar',offset:codePoints(f.ar[0]!+f.ar[1]!).length+1});
});

test('spacing proposals reject an absent side, existing whitespace or missing explanation', () => {
  const f=synthetic();
  const withSpace={...f.layout,merges:[{left:'old-1',right:'old-2',checked:true,
    spacing:{mode:'ar-space',reason:'Separate the boundary'}}]};
  const existing=f.c.items.get(f.item)!.rows[0]!;existing.ar=intern(f.c,'ends in space ');
  const plan=createAgentTemplate(f.c,f.item,'agent-1');for(const s of plan.sources){s.checked=true;s.kinds=['recitation'];}
  const layout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,plan));for(const r of layout.rows)r.checked=true;
  assert.throws(()=>compileCanonicalSplit(f.c,plan,{...layout,merges:withSpace.merges}),/existing boundary whitespace/i);
  const noReason={...layout,merges:[{left:'old-1',right:'old-2',checked:true,spacing:{mode:'ar-space',reason:''}}]};
  assert.throws(()=>compileCanonicalSplit(f.c,plan,noReason),/reason|too small/i);
  const absent=f.c.items.get(f.item)!.rows[0]!;absent.fa=null;
  const p=createAgentTemplate(f.c,f.item,'agent-1');for(const s of p.sources){s.checked=true;s.kinds=['recitation'];}
  const l=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,p));for(const r of l.rows)r.checked=true;
  assert.throws(()=>compileCanonicalSplit(f.c,p,{...l,merges:[{left:'old-1',right:'old-2',checked:true,
    spacing:{mode:'fa-space',reason:'Separate Persian'}}]}),/two nonempty fields/i);
});

test('editorial spaces cannot divide a cross-row grapheme or protected Quran marker', () => {
  for(const [a,b,expected] of [['a','\u0301b',/grapheme/i],['﴿12','3﴾',/protected Quran marker/i]] as const){
    const f=synthetic(),rows=f.c.items.get(f.item)!.rows;
    rows[0]!.ar=intern(f.c,a);rows[1]!.ar=intern(f.c,b);
    const plan=createAgentTemplate(f.c,f.item,'agent-1');for(const source of plan.sources){source.checked=true;source.kinds=['recitation'];}
    const layout=createCanonicalLayoutTemplate(f.c,splitAgentPlan(f.c,plan));for(const row of layout.rows)row.checked=true;
    assert.throws(()=>compileCanonicalSplit(f.c,plan,{...layout,merges:[{left:'old-1',right:'old-2',checked:true,
      spacing:{mode:'ar-space',reason:'Propose boundary space'}}]}),expected);
  }
});

test('spacing reasons use Unicode code points and reject control characters and ill-formed text', () => {
  const insertion={row:'joined',language:'ar',target_start:1,value:' ',left:'left',right:'right'};
  assert.doesNotThrow(()=>RowMergeInsertionSchema.parse({...insertion,reason:'😀😀😀'}));
  for(const reason of ['😀😀','a\u0000b','a\u2028b','a\ud800b','a'.repeat(241)])
    assert.throws(()=>RowMergeInsertionSchema.parse({...insertion,reason}),/reason/i);
  assert.match(spacingBoundaryIssue('left\u0085','right')!,/existing boundary whitespace/i);
});
