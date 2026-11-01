import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('generated review page has valid embedded JSON and syntactically valid offline JavaScript',t=>{
  const file='generated/review/review.html';if(!fs.existsSync(file)){t.skip('Optional generated review page not present');return;}
  const html=fs.readFileSync(file,'utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);
  const payload=JSON.parse(scripts[0]![1]!);assert.ok(Array.isArray(payload.candidates));assert.doesNotThrow(()=>new vm.Script(scripts[1]![1]!));
});

test('all generated candidate references and Unicode spans are structurally valid',async t=>{
  const file='generated/review/alignment-candidates.json';if(!fs.existsSync(file)){t.skip('Optional alignment candidates not present');return;}
  const {loadCorpus,validateCorpus}=await import('../src/corpus.js');const {AlignmentFileSchema}=await import('../src/schema.js');
  const c=loadCorpus();const data=JSON.parse(fs.readFileSync(file,'utf8')) as {candidates:Array<{item:string;id:string;method:string;evidence:unknown;ar:unknown[];fa:unknown[];en:unknown[]}>};
  const byItem=new Map<string,unknown[]>();for(const x of data.candidates){const list=byItem.get(x.item)??[];list.push({id:x.id,review:{reviewer:'TEST ONLY',date:'2026-11-01'},method:x.method,evidence:x.evidence,ar:x.ar,fa:x.fa,en:x.en});byItem.set(x.item,list);}
  c.alignments.clear();for(const [item,groups] of byItem)c.alignments.set(item,AlignmentFileSchema.parse({item,groups}));
  assert.deepEqual(validateCorpus(c).errors,[]); // In-memory schema test; no candidate is being approved.
});
