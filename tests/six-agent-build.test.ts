import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildData } from '../scripts/build-data.js';
import { loadCorpus, validateCorpus } from '../src/corpus.js';
import { textId } from '../src/text-ids.js';

test('runtime build emits row redirects and validates historical references to a retired row', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-split-build-'));
  const put=(name:string,value:unknown)=>{const f=path.join(temp,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof value==='string'?value:JSON.stringify(value));};
  try {
    for(const dir of ['items','texts','english','alignments','row-splits'])fs.mkdirSync(path.join(temp,dir),{recursive:true});
    const values=['abc def','abc ','def'],ids=values.map(textId),pools=new Map<string,Record<string,string>>();
    ids.forEach((id,i)=>{const shard=id.slice(1,3),pool=pools.get(shard)??{};pool[id]=values[i]!;pools.set(shard,pool);});
    for(const [shard,pool] of pools)put(`texts/${shard}.json`,pool);
    put('corpus.json',{format_version:1,legacy_import:{repository:'https://example.test/repo',commit:'a'.repeat(40),original_build_date:'2026-01-01'},review_policy:'synthetic'});
    put('claims.json',{});put('sources.json',{sources:{}});put('relations.json',{english_links:[]});
    put('navigation.json',{default_order:['example'],featured:[],toc:[]});put('legacy-attribution.md','Synthetic fixture.');
    put('items/example.json',{legacy_id:null,title:{fa:null,ar:null,en:null},category:'other',tags:[],legacy_alignment:null,
      rows:[{id:'old-s1',ar:ids[1],fa:null,kind:'recitation'},{id:'old-s2',ar:ids[2],fa:null,kind:'recitation'}]});
    const h='a'.repeat(64);
    put('row-splits/example.json',{format_version:1,item:'example',author:'agent-1',baseline_item_sha256:h,plan_sha256:h,layout_sha256:h,
      rows:[{original:{id:'old',ar:ids[0],fa:null},results:['old-s1','old-s2'],
        ar:[{row:'old-s1',language:'ar',start:0,end:4},{row:'old-s2',language:'ar',start:4,end:7}],fa:[]}]});
    put('editorial-history.json',{evidence:{e:{url:'https://example.test',description:'Synthetic history'}},metadata_corrections:[],
      row_corrections:[{item:'example',row:'old',language:'ar',previous:ids[0],replacement:ids[0],evidence:'e',reason:'synthetic'}]});
    assert.deepEqual(validateCorpus(loadCorpus(temp)).errors,[]);
    const files=new Map<string,string>();
    buildData({root:temp,includeSearch:false,quiet:true,write:(name,body)=>files.set(name,body)});
    const item=JSON.parse(files.get('items/example.json')!) as {rows:Array<{id:string;ar:string}>;row_split_redirects:unknown[]};
    assert.deepEqual(item.rows.map(r=>[r.id,r.ar]),[['old-s1','abc '],['old-s2','def']]);
    assert.deepEqual(item.row_split_redirects,[{original:{id:'old'},
      ar:[{row:'old-s1',language:'ar',start:0,end:4},{row:'old-s2',language:'ar',start:4,end:7}],fa:[]}]);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
