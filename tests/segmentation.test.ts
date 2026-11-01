import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCorpus,text,validateCorpus} from '../src/corpus.js';
import {intern} from '../src/editor.js';
import {AlignmentFileSchema,EnglishDocumentSchema,ItemSchema} from '../src/schema.js';
import {codePoints,sha256} from '../src/text-ids.js';

/** Synthetic labels only: this test never translates or adds devotional text. */
function fixture(){
  const c=loadCorpus();const item='test-segmentation',doc='test-segmentation-en';
  const title=c.items.get('dua-kumayl')!.title.fa;
  c.items.set(item,ItemSchema.parse({legacy_id:null,title:{fa:title,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,rows:[
    {id:'row-a',ar:intern(c,'AR sample one'),fa:intern(c,'FA sample one')},
    {id:'row-b',ar:intern(c,'AR sample two'),fa:null},
    {id:'row-c',ar:null,fa:intern(c,'FA sample two')}
  ]}));
  c.nav.default_order.push(item);
  const english='First example 🟦. Second example.';
  c.english.set(doc,EnglishDocumentSchema.parse({source_metadata:{title:null,title_ar:null,section:null,chapter:null,translator_claim:null,origin_claim:null,method_claim:null,note_claim:null},coverage:'unknown',paragraphs:[{id:'paragraph-a',text:intern(c,english)}]}));
  c.relations.english_links.push({item,document:doc,kind:'proposed'});
  const rows=c.items.get(item)!.rows;
  const rowSpan=(id:string,language:'ar'|'fa')=>{
    const value=text(c,rows.find(r=>r.id===id)![language]);
    return {row:id,start:0,end:codePoints(value).length,sha256:sha256(value)};
  };
  const enSpan=(quote:string)=>{
    const index=english.indexOf(quote);assert.ok(index>=0);
    return {document:doc,paragraph:'paragraph-a',start:codePoints(english.slice(0,index)).length,end:codePoints(english.slice(0,index)).length+codePoints(quote).length,sha256:sha256(quote)};
  };
  const common={method:'manual',review:{reviewer:'TEST ONLY',date:'2026-11-01'},evidence:{note:'Synthetic placeholders only'}};
  return {c,item,doc,english,rowSpan,enSpan,common};
}

test('one English paragraph can align by separate spans to differently split AR/FA rows',()=>{
  const {c,item,doc,english,rowSpan,enSpan,common}=fixture();
  const af=AlignmentFileSchema.parse({item,groups:[
    {...common,id:'g-one',ar:[rowSpan('row-a','ar')],fa:[rowSpan('row-a','fa')],en:[enSpan('First example 🟦.')]},
    {...common,id:'g-two',ar:[rowSpan('row-b','ar')],fa:[rowSpan('row-c','fa')],en:[enSpan('Second example.')]}
  ]});
  c.alignments.set(item,af);assert.deepEqual(validateCorpus(c).errors,[]);
  assert.equal(c.english.get(doc)!.paragraphs.length,1);assert.equal(text(c,c.english.get(doc)!.paragraphs[0]!.text),english);
  assert.equal(af.groups[0]!.en[0]!.paragraph,af.groups[1]!.en[0]!.paragraph);
  assert.notEqual(af.groups[0]!.en[0]!.start,af.groups[1]!.en[0]!.start);
  c.english.get(doc)!.paragraphs[0]!.text=intern(c,'Changed '+english);
  assert.ok(validateCorpus(c).errors.some(e=>e.includes('stale EN span')));
});

test('one English paragraph can align to several AR/FA rows as a many-to-one group',()=>{
  const {c,item,english,rowSpan,enSpan,common}=fixture();
  const af=AlignmentFileSchema.parse({item,groups:[{...common,id:'g-many',
    ar:[rowSpan('row-a','ar'),rowSpan('row-b','ar')],
    fa:[rowSpan('row-a','fa'),rowSpan('row-c','fa')],en:[enSpan(english)]
  }]});
  c.alignments.set(item,af);assert.deepEqual(validateCorpus(c).errors,[]);
  assert.equal(af.groups[0]!.ar.length,2);assert.equal(af.groups[0]!.fa.length,2);assert.equal(af.groups[0]!.en.length,1);
});
