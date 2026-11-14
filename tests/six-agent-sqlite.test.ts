import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { textId } from '../src/text-ids.js';

test('SQLite preserves retired row identity, its historical correction and exact split redirects', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-split-sqlite-'));
  const root=path.join(temp,'data'), db=path.join(temp,'out.sqlite');
  const put=(name:string,value:unknown) => {const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value));};
  try {
    for(const dir of ['items','texts','english','alignments','row-splits'])fs.mkdirSync(path.join(root,dir),{recursive:true});
    const values=['abc def','abc ','def'], ids=values.map(textId), shards=new Map<string,Record<string,string>>();
    ids.forEach((id,i)=>{const shard=id.slice(1,3), pool=shards.get(shard)??{};pool[id]=values[i]!;shards.set(shard,pool);});
    for(const [shard,pool] of shards)put(`texts/${shard}.json`,pool);
    put('corpus.json',{format_version:1});put('claims.json',{});put('sources.json',{sources:{}});
    put('relations.json',{english_links:[]});put('navigation.json',{default_order:['example'],featured:[],toc:[]});
    fs.writeFileSync(path.join(root,'legacy-attribution.md'),'Synthetic fixture.');
    put('items/example.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'old-s1',ar:ids[1],fa:null,kind:'recitation'},{id:'old-s2',ar:ids[2],fa:null,kind:'recitation'}]});
    const H='a'.repeat(64);
    put('row-splits/example.json',{format_version:1,item:'example',author:'agent-1',baseline_item_sha256:H,plan_sha256:H,layout_sha256:H,
      rows:[{original:{id:'old',ar:ids[0],fa:null},results:['old-s1','old-s2'],
        ar:[{row:'old-s1',language:'ar',start:0,end:4},{row:'old-s2',language:'ar',start:4,end:7}],fa:[]}]});
    put('editorial-history.json',{evidence:{e:{url:'https://example.test',description:'synthetic'}},metadata_corrections:[],
      row_corrections:[{item:'example',row:'old',language:'ar',previous:ids[0],replacement:ids[0],evidence:'e',reason:'synthetic history'}]});
    const result=spawnSync('python3',['tools/export_sqlite.py'],{cwd:process.cwd(),env:{...process.env,MAFATIH_DATA_ROOT:root,MAFATIH_SQLITE_OUT:db},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const probe=spawnSync('python3',['-c',`
import json,sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.execute('PRAGMA foreign_keys=ON')
print(json.dumps({'version':c.execute('PRAGMA user_version').fetchone()[0],
 'identities':c.execute('SELECT row_id FROM row_identity ORDER BY row_id').fetchall(),
 'history':c.execute('SELECT row_id FROM row_correction').fetchall(),
 'mapping':c.execute('SELECT source_row_id,source_language,target_row_id,target_language,start_cp,end_cp FROM row_split_segment ORDER BY position').fetchall(),
 'violations':c.execute('PRAGMA foreign_key_check').fetchall()}))
`,db],{encoding:'utf8'});
    assert.equal(probe.status,0,probe.stderr);
    const got=JSON.parse(probe.stdout) as {version:number;identities:string[][];history:string[][];mapping:unknown[][];violations:unknown[]};
    assert.equal(got.version,5);assert.deepEqual(got.identities,[['old'],['old-s1'],['old-s2']]);
    assert.deepEqual(got.history,[['old']]);assert.deepEqual(got.mapping,[['old','ar','old-s1','ar',0,4],['old','ar','old-s2','ar',4,7]]);
    assert.deepEqual(got.violations,[]);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('SQLite exports V2 original and prior-output alias destinations with code-point offsets', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-merge-sqlite-'));
  const root=path.join(temp,'data'),db=path.join(temp,'out.sqlite');
  const put=(name:string,value:unknown)=>{const f=path.join(root,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(value));};
  try {
    for(const dir of ['items','texts','english','alignments','row-splits'])fs.mkdirSync(path.join(root,dir),{recursive:true});
    const values=['a😀','bc','a😀bc'],ids=values.map(textId),shards=new Map<string,Record<string,string>>();
    ids.forEach((id,i)=>{const pool=shards.get(id.slice(1,3))??{};pool[id]=values[i]!;shards.set(id.slice(1,3),pool);});
    for(const [shard,pool] of shards)put(`texts/${shard}.json`,pool);
    put('corpus.json',{format_version:1});put('claims.json',{});put('sources.json',{sources:{}});
    put('relations.json',{english_links:[]});put('navigation.json',{default_order:['example'],featured:[],toc:[]});
    put('editorial-history.json',{evidence:{},metadata_corrections:[]});fs.writeFileSync(path.join(root,'legacy-attribution.md'),'Synthetic.');
    put('items/example.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'joined',ar:ids[2],fa:null,kind:'recitation'}]});
    const h='a'.repeat(64), seg=(start:number)=>({row:'joined',language:'ar',start:0,end:2,target_start:start});
    put('row-splits/example.json',{format_version:2,item:'example',author:'agent-1',baseline_item_sha256:h,plan_sha256:h,layout_sha256:h,
      rows:[{original:{id:'first',ar:ids[0],fa:null},results:['joined'],ar:[seg(0)],fa:[]},
        {original:{id:'second',ar:ids[1],fa:null},results:['joined'],ar:[seg(2)],fa:[]}],
      aliases:[{original:{id:'second-output',ar:ids[1],fa:null},ar:[seg(2)],fa:[]}]});
    const p=spawnSync('python3',['tools/export_sqlite.py'],{cwd:process.cwd(),env:{...process.env,MAFATIH_DATA_ROOT:root,MAFATIH_SQLITE_OUT:db},encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
    const q=spawnSync('python3',['-c',`
import json,sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.execute('PRAGMA foreign_keys=ON')
print(json.dumps({'version':c.execute('PRAGMA user_version').fetchone()[0],
 'record':c.execute('SELECT format_version FROM item_split_record').fetchall(),
 'origins':c.execute('SELECT source_row_id,origin_kind FROM row_split_original ORDER BY source_row_id').fetchall(),
 'mapping':c.execute('SELECT source_row_id,target_row_id,start_cp,end_cp,target_start_cp FROM row_split_segment ORDER BY source_row_id').fetchall(),
 'violations':c.execute('PRAGMA foreign_key_check').fetchall()}))
`,db],{encoding:'utf8'});
    assert.equal(q.status,0,q.stderr);const got=JSON.parse(q.stdout) as {version:number;record:unknown[];origins:unknown[];mapping:unknown[];violations:unknown[]};
    assert.equal(got.version,5);assert.deepEqual(got.record,[[2]]);
    assert.deepEqual(got.origins,[['first','original'],['second','original'],['second-output','alias']]);
    assert.deepEqual(got.mapping,[['first','joined',0,2,0],['second','joined',0,2,2],['second-output','joined',0,2,2]]);
    assert.deepEqual(got.violations,[]);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('SQLite stores proposed spacing insertions separately from exact source slices', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-spacing-sqlite-'));
  const root=path.join(temp,'data'),db=path.join(temp,'out.sqlite');
  const put=(name:string,value:unknown)=>{const f=path.join(root,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(value));};
  try {
    for(const dir of ['items','texts','english','alignments','row-splits'])fs.mkdirSync(path.join(root,dir),{recursive:true});
    const values=['a😀','bc','a😀 bc'],ids=values.map(textId),shards=new Map<string,Record<string,string>>();
    ids.forEach((id,i)=>{const pool=shards.get(id.slice(1,3))??{};pool[id]=values[i]!;shards.set(id.slice(1,3),pool);});
    for(const [shard,pool] of shards)put(`texts/${shard}.json`,pool);
    put('corpus.json',{format_version:1});put('claims.json',{});put('sources.json',{sources:{}});
    put('relations.json',{english_links:[]});put('navigation.json',{default_order:['example'],featured:[],toc:[]});
    put('editorial-history.json',{evidence:{},metadata_corrections:[]});fs.writeFileSync(path.join(root,'legacy-attribution.md'),'Synthetic.');
    put('items/example.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'joined',ar:ids[2],fa:null,kind:'recitation'}]});
    const h='a'.repeat(64),seg=(target_start:number)=>({row:'joined',language:'ar',start:0,end:2,target_start});
    put('row-splits/example.json',{format_version:3,item:'example',author:'agent-1',baseline_item_sha256:h,plan_sha256:h,layout_sha256:h,
      rows:[{original:{id:'first',ar:ids[0],fa:null},results:['joined'],ar:[seg(0)],fa:[]},
        {original:{id:'second',ar:ids[1],fa:null},results:['joined'],ar:[seg(3)],fa:[]}],aliases:[],
      insertions:[{row:'joined',language:'ar',target_start:2,value:' ',left:'first',right:'second',reason:'Propose boundary spacing'}]});
    const p=spawnSync('python3',['tools/export_sqlite.py'],{cwd:process.cwd(),env:{...process.env,MAFATIH_DATA_ROOT:root,MAFATIH_SQLITE_OUT:db},encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
    const q=spawnSync('python3',['-c',`
import json,sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.execute('PRAGMA foreign_keys=ON')
print(json.dumps({'version':c.execute('PRAGMA user_version').fetchone()[0],
 'record':c.execute('SELECT format_version FROM item_split_record').fetchall(),
 'insertion':c.execute('SELECT target_row_id,language,target_start_cp,inserted_text,left_row_id,right_row_id,reason FROM row_split_insertion').fetchall(),
 'mapping':c.execute('SELECT source_row_id,start_cp,end_cp,target_start_cp FROM row_split_segment ORDER BY source_row_id').fetchall(),
 'violations':c.execute('PRAGMA foreign_key_check').fetchall()}))
`,db],{encoding:'utf8'});
    assert.equal(q.status,0,q.stderr);const got=JSON.parse(q.stdout) as {version:number;record:unknown[];insertion:unknown[];mapping:unknown[];violations:unknown[]};
    assert.equal(got.version,5);assert.deepEqual(got.record,[[3]]);
    assert.deepEqual(got.insertion,[['joined','ar',2,' ','first','second','Propose boundary spacing']]);
    assert.deepEqual(got.mapping,[['first',0,2,0],['second',0,2,3]]);assert.deepEqual(got.violations,[]);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
