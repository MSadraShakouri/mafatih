import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadCorpus} from '../src/corpus.js';
import {intern} from '../src/editor.js';
import {EnglishDocumentSchema,ItemSchema} from '../src/schema.js';
import {compileSplitPlan,exportSplitInput} from '../src/split-plans.js';
import {sha256} from '../src/text-ids.js';

function fixture(){
  const c=loadCorpus(),item='test-split-tool',doc='test-split-tool-en';
  const a='AR a\u0301 first. AR second.',f='FA first. FA second.',e='EN first 😀. EN second.';
  c.items.set(item,ItemSchema.parse({legacy_id:null,title:{fa:c.items.get('dua-kumayl')!.title.fa,ar:null,en:null},
    category:'other',tags:[],legacy_alignment:null,rows:[{id:'row-a',ar:intern(c,a),fa:intern(c,f)}]}));
  c.english.set(doc,EnglishDocumentSchema.parse({source_metadata:{title:null,title_ar:null,section:null,chapter:null,translator_claim:null,origin_claim:null,method_claim:null,note_claim:null},coverage:'unknown',paragraphs:[{id:'p-a',text:intern(c,e)}]}));
  c.relations.english_links.push({item,document:doc,kind:'proposed'});
  const sources=[
    {language:'ar' as const,row:'row-a',source_sha256:sha256(a),cut_after:['first. ']},
    {language:'fa' as const,row:'row-a',source_sha256:sha256(f),cut_after:['FA first. ']},
    {language:'en' as const,document:doc,paragraph:'p-a',source_sha256:sha256(e),cut_after:['EN first 😀. ']}
  ];
  const groups=[
    {id:'g-one',ar:[{row:'row-a',part:0}],fa:[{row:'row-a',part:0}],en:[{document:doc,paragraph:'p-a',part:0}]},
    {id:'g-two',ar:[{row:'row-a',part:1}],fa:[{row:'row-a',part:1}],en:[{document:doc,paragraph:'p-a',part:1}]}
  ];
  return {c,item,doc,a,f,e,sources,groups};
}

test('AI split plan preserves exact text, supports uneven segments and marks groups unreviewed',()=>{
  const {c,item,a,f,e,sources,groups}=fixture();const before=JSON.stringify(c.items.get(item)),alignmentCount=c.alignments.size;
  const exported=exportSplitInput(c,item);assert.equal(exported.rows[0]!.ar!.text,a);assert.equal(exported.rows[0]!.ar!.source_sha256,sha256(a));
  const result=compileSplitPlan(c,{format_version:1,item,sources,groups});
  for(const [lang,original] of [['ar',a],['fa',f],['en',e]] as const)
    assert.equal(result.segments.filter(s=>s.language===lang).map(s=>s.text).join(''),original);
  assert.equal(result.groups.length,2);assert.ok(result.groups.every(g=>g.status==='proposed-unreviewed'));
  assert.equal(result.groups[1]!.en[0]!.start,Array.from('EN first 😀. ').length);
  assert.equal(JSON.stringify(c.items.get(item)),before);assert.equal(c.alignments.size,alignmentCount);
  // English can remain one whole paragraph while the other languages have two pieces.
  const noEnglishCut=sources.map(s=>s.language==='en'?{language:s.language,document:s.document,paragraph:s.paragraph,source_sha256:s.source_sha256}:s);
  const many=[{id:'g-many',ar:[{row:'row-a',part:0},{row:'row-a',part:1}],fa:[{row:'row-a',part:0},{row:'row-a',part:1}],en:[{document:'test-split-tool-en',paragraph:'p-a',part:0}]}];
  const manyResult=compileSplitPlan(c,{format_version:1,item,sources:noEnglishCut,groups:many});
  assert.equal(manyResult.segments.filter(s=>s.language==='en').length,1);assert.equal(manyResult.groups[0]!.ar.length,2);
});

test('AI split plans reject stale text, ambiguous anchors, grapheme cuts and invalid groups',()=>{
  const {c,item,sources,groups}=fixture();const plan={format_version:1,item,sources,groups};
  const badHash=structuredClone(plan);badHash.sources[0]!.source_sha256='0'.repeat(64);
  assert.throws(()=>compileSplitPlan(c,badHash),/source hash changed/);
  const badAnchor=structuredClone(plan);badAnchor.sources[0]!.cut_after=['AR'];
  assert.throws(()=>compileSplitPlan(c,badAnchor),/ambiguous/);
  const badMark=structuredClone(plan) as {format_version:number;item:string;sources:Array<Record<string,unknown>>;groups:unknown[]};
  delete badMark.sources[0]!.cut_after;badMark.sources[0]!.cuts=[4]; // after a, before combining acute
  assert.throws(()=>compileSplitPlan(c,badMark),/splits a Unicode grapheme/);
  const badGroup=structuredClone(plan);badGroup.groups[0]!.en[0]!.part=99;
  assert.throws(()=>compileSplitPlan(c,badGroup),/missing English source or part/);
  const notLinked=structuredClone(plan);(notLinked.sources[2] as {document:string}).document='another-document';
  assert.throws(()=>compileSplitPlan(c,notLinked),/not linked to the item/);
  const duplicate=structuredClone(plan);duplicate.sources.push({...duplicate.sources[0]!});
  assert.throws(()=>compileSplitPlan(c,duplicate),/Duplicate source/);
});

test('text-only split CLI exports and validates without changing canonical data',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-split-test-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const input=path.join(temp,'input.json'),planFile=path.join(temp,'plan.json'),out=path.join(temp,'result.json');
  const run=(...args:string[])=>spawnSync(process.execPath,['--import','tsx','scripts/split-plan.ts',...args],{cwd:process.cwd(),encoding:'utf8'});
  const before=fs.readFileSync('data/items/dua-kumayl.json','utf8');
  const exportRun=run('export','dua-kumayl','--output',input);assert.equal(exportRun.status,0,exportRun.stderr);
  const data=JSON.parse(fs.readFileSync(input,'utf8')) as {rows:Array<{id:string;ar:{source_sha256:string}|null}>};
  const row=data.rows.find(r=>r.ar)!;
  fs.writeFileSync(planFile,JSON.stringify({format_version:1,item:'dua-kumayl',sources:[{language:'ar',row:row.id,source_sha256:row.ar!.source_sha256}],groups:[]}));
  const validation=run('validate',planFile,'--output',out);assert.equal(validation.status,0,validation.stderr);
  const result=JSON.parse(fs.readFileSync(out,'utf8')) as {status:string;segment_count:number};assert.equal(result.status,'proposed-unreviewed');assert.equal(result.segment_count,1);
  assert.equal(fs.readFileSync('data/items/dua-kumayl.json','utf8'),before);
  const forbidden=run('validate',planFile,'--output','data/should-not-write.json');assert.notEqual(forbidden.status,0);assert.ok(!fs.existsSync('data/should-not-write.json'));
});
