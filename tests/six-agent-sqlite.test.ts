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
    assert.equal(got.version,3);assert.deepEqual(got.identities,[['old'],['old-s1'],['old-s2']]);
    assert.deepEqual(got.history,[['old']]);assert.deepEqual(got.mapping,[['old','ar','old-s1','ar',0,4],['old','ar','old-s2','ar',4,7]]);
    assert.deepEqual(got.violations,[]);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
