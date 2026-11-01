import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {loadCorpus,validateCorpus} from '../src/corpus.js';

test('editable exports apply copy-on-write without changing shared source documents',t=>{
  if(!fs.existsSync('data/items/dua-kumayl.json')){t.skip('Example item was intentionally removed');return;}
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-editor-test-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const data=path.join(temp,'data');fs.cpSync('data',data,{recursive:true});const env={...process.env,MAFATIH_DATA_ROOT:data};
  const run=(...args:string[])=>{const r=spawnSync(process.execPath,['--import','tsx',...args],{cwd:process.cwd(),env,encoding:'utf8'});if(r.status!==0)throw new Error(`${r.stdout}\n${r.stderr}`);};
  const draft=path.join(temp,'item.json');run('scripts/edit-item.ts','export','dua-kumayl',draft);
  const obj=JSON.parse(fs.readFileSync(draft,'utf8'));obj.title.en='Copy-on-write test title';fs.writeFileSync(draft,JSON.stringify(obj));
  const before=loadCorpus(data);const sourceTitle=before.english.get('dua-kumayl')?.source_metadata.title;
  run('scripts/edit-item.ts','apply',draft);const after=loadCorpus(data);
  assert.equal(after.english.get('dua-kumayl')?.source_metadata.title,sourceTitle);
  assert.notEqual(after.items.get('dua-kumayl')?.title.en,sourceTitle);assert.deepEqual(validateCorpus(after).errors,[]);
});

test('editing an English display title preserves historical metadata and clears old evidence',t=>{
  const id='self-fadail-yasin';if(!fs.existsSync(`data/english/${id}.json`)){t.skip('Example document was intentionally removed');return;}
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-english-editor-test-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const data=path.join(temp,'data');fs.cpSync('data',data,{recursive:true});const env={...process.env,MAFATIH_DATA_ROOT:data};
  const run=(...args:string[])=>{const r=spawnSync(process.execPath,['--import','tsx',...args],{cwd:process.cwd(),env,encoding:'utf8'});if(r.status!==0)throw new Error(`${r.stdout}\n${r.stderr}`);};
  const draft=path.join(temp,'english.json');run('scripts/edit-english.ts','export',id,draft);
  const before=loadCorpus(data),oldDoc=before.english.get(id)!,oldItem=before.items.get('fazilat-svrhmbarkys')!;
  const obj=JSON.parse(fs.readFileSync(draft,'utf8'));obj.display_title.en='An edited display title';fs.writeFileSync(draft,JSON.stringify(obj));run('scripts/edit-english.ts','apply',draft);
  const after=loadCorpus(data),newDoc=after.english.get(id)!;assert.equal(newDoc.source_metadata.title,oldDoc.source_metadata.title);
  assert.notEqual(newDoc.display_title?.en,oldDoc.display_title?.en);assert.equal(newDoc.display_title?.evidence,undefined);
  assert.equal(after.items.get('fazilat-svrhmbarkys')?.title.en,oldItem.title.en);assert.deepEqual(validateCorpus(after).errors,[]);
});
