import test from 'node:test';import assert from 'node:assert/strict';
import {loadCorpus,text,validateCorpus} from '../src/corpus.js';
import {codePoints,sha256} from '../src/text-ids.js';
import {AlignmentFileSchema} from '../src/schema.js';

test('canonical corpus satisfies structural and reference invariants',()=>{
  const c=loadCorpus();const r=validateCorpus(c);assert.deepEqual(r.errors,[]);assert.ok(c.items.size>0);assert.ok(c.english.size>0);
  assert.ok(r.warnings.some(x=>x.includes('does NOT verify')));
});
test('detects a modified pooled string without updated content ID',()=>{
  const c=loadCorpus();const first=c.texts.entries().next().value;if(!first)throw new Error('empty pool');
  c.texts.set(first[0],first[1]+'x');assert.ok(validateCorpus(c).errors.some(x=>x.includes('content hash mismatch')));
});
test('detects invalid links and duplicate row identifiers',()=>{
  const c=loadCorpus();const link=c.relations.english_links[0]!;link.item='nonexistent-test-item';
  const item=c.items.values().next().value;if(!item||item.rows.length<1)throw new Error('missing fixture');
  item.rows.push({...item.rows[0]!});const errors=validateCorpus(c).errors;
  assert.ok(errors.some(x=>x.includes('link: missing item')));assert.ok(errors.some(x=>x.includes('duplicate row')));
});
test('reviewed span references are checked and stale hashes fail',()=>{
  const c=loadCorpus();let fixture:undefined|{item:string;doc:string;rowId:string;ar:string;fa:string;paraId:string;en:string};
  for(const l of c.relations.english_links){const it=c.items.get(l.item)!,doc=c.english.get(l.document)!;const row=it.rows.find(r=>r.ar&&r.fa);const p=doc.paragraphs[0];
    if(row&&p){fixture={item:l.item,doc:l.document,rowId:row.id,ar:text(c,row.ar),fa:text(c,row.fa),paraId:p.id,en:text(c,p.text)};break;}}
  assert.ok(fixture);const f=fixture;
  const af=AlignmentFileSchema.parse({item:f.item,groups:[{id:'g-test',review:{reviewer:'test-only',date:'2026-11-01'},method:'manual',evidence:{},
    ar:[{row:f.rowId,start:0,end:codePoints(f.ar).length,sha256:sha256(f.ar)}],
    fa:[{row:f.rowId,start:0,end:codePoints(f.fa).length,sha256:sha256(f.fa)}],
    en:[{document:f.doc,paragraph:f.paraId,start:0,end:codePoints(f.en).length,sha256:sha256(f.en)}]}]});
  c.alignments.set(f.item,af);assert.deepEqual(validateCorpus(c).errors,[]);
  af.groups[0]!.ar[0]!.sha256='0'.repeat(64);assert.ok(validateCorpus(c).errors.some(x=>x.includes('stale ar span')));
});

test('editorial display titles preserve imported titles and round-trip as separate references',async t=>{
  const {documentTitle}=await import('../src/corpus.js');const {readableEnglish,internEnglish}=await import('../src/editable.js');
  const c=loadCorpus();const id='self-fadail-yasin',doc=c.english.get(id);if(!doc){t.skip('Example document was intentionally removed');return;}
  assert.ok(doc.display_title);assert.equal(documentTitle(c,id),'Virtue of Surah Ya-Sin');
  assert.equal(text(c,doc.source_metadata.title),'Surah Al Nas');assert.notEqual(doc.display_title.en,doc.source_metadata.title);
  assert.deepEqual(internEnglish(c,readableEnglish(c,id)),doc);
  doc.display_title.evidence='missing-evidence';assert.ok(validateCorpus(c).errors.some(x=>x.includes('display-title evidence is missing')));
});
