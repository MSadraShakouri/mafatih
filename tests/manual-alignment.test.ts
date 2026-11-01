import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {loadCorpus,text,validateCorpus} from '../src/corpus.js';import {AlignmentFileSchema} from '../src/schema.js';

test('manual exact-quote builder requires affirmation, checks dates, and emits valid spans without importing',t=>{
 const c=loadCorpus();let fixture:undefined|{item:string;row:string;ar:string;fa:string;document:string;paragraph:string;en:string};
 for(const l of c.relations.english_links){const it=c.items.get(l.item),doc=c.english.get(l.document);const row=it?.rows.find(r=>r.ar&&r.fa);const p=doc?.paragraphs[0];
  if(row&&p){fixture={item:l.item,row:row.id,ar:text(c,row.ar),fa:text(c,row.fa),document:l.document,paragraph:p.id,en:text(c,p.text)};break;}}
 if(!fixture){t.skip('No bilingual item with a linked English paragraph');return;}
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-manual-test-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const input=path.join(temp,'input.json'),output=path.join(temp,'output.json');const draft={item:fixture.item,id:'g-test-only',reviewer:'TEST ONLY',date:'2026-11-01',evidence:{note:'Synthetic structural test; not a content review'},
  ar:[{row:fixture.row,quote:fixture.ar}],fa:[{row:fixture.row,quote:fixture.fa}],en:[{document:fixture.document,paragraph:fixture.paragraph,quote:fixture.en}]};
 const run=(...args:string[])=>spawnSync(process.execPath,['--import','tsx','scripts/manual-alignment.ts',...args],{cwd:process.cwd(),encoding:'utf8'});
 fs.writeFileSync(input,JSON.stringify(draft));assert.notEqual(run(input,'--output',output).status,0);assert.ok(!fs.existsSync(output));
 fs.writeFileSync(input,JSON.stringify({...draft,date:'2026-02-30'}));assert.notEqual(run(input,'--confirm-reviewed','--output',output).status,0);
 fs.writeFileSync(input,JSON.stringify(draft));const result=run(input,'--confirm-reviewed','--output',output);assert.equal(result.status,0,result.stderr);
 const file=AlignmentFileSchema.parse(JSON.parse(fs.readFileSync(output,'utf8')));const original=c.alignments.get(file.item);c.alignments.set(file.item,{item:file.item,groups:[...(original?.groups??[]),...file.groups]});
 assert.deepEqual(validateCorpus(c).errors,[]);assert.equal(fs.existsSync(path.join(c.root,'alignments',file.item+'.json')),Boolean(original));
});
