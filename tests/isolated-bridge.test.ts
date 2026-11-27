import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyIsolatedBridgeMappings } from '../src/isolated-bridge.js';
import type { Corpus } from '../src/corpus.js';

function fixture(){
  const text='tabcd',value='abcd';
  const frozenRows=[{id:'r1',ar:text,fa:null,kind:'recitation'},{id:'r2',ar:text,fa:null,kind:'recitation'}];
  const oldRows=[{id:'old1',ar:text,fa:null,kind:'recitation'},{id:'old2',ar:text,fa:null,kind:'recitation'}];
  const newRows=[{id:'new1',ar:text,fa:null,kind:'recitation'},{id:'new2',ar:text,fa:null,kind:'recitation'}];
  const seg=(row:string)=>({row,language:'ar',start:0,end:4,target_start:0});
  const entry=(original:unknown,row:string)=>({original,results:[row],ar:[seg(row)],fa:[]});
  const base={items:new Map([['item',{rows:frozenRows}]]),texts:new Map([[text,value]])} as unknown as Corpus;
  const oldRecord={format_version:2,item:'item',author:'agent-4',baseline_item_sha256:'base',rows:frozenRows.map((r,i)=>entry(r,oldRows[i]!.id)),aliases:[]};
  const newRecord={format_version:2,item:'item',author:'agent-4',baseline_item_sha256:'base',rows:frozenRows.map((r,i)=>entry(r,newRows[i]!.id)),aliases:oldRows.map((r,i)=>({original:r,ar:[seg(newRows[i]!.id)],fa:[]}))};
  const old={items:new Map([['item',{rows:oldRows}]]),texts:new Map([[text,value]]),rowSplits:new Map([['item',oldRecord]])} as unknown as Corpus;
  const next={items:new Map([['item',{rows:newRows}]]),texts:new Map([[text,value]]),rowSplits:new Map([['item',newRecord]])} as unknown as Corpus;
  return {base,old,next,newRecord};
}
test('bridge checks published live rows and frozen mapping provenance',()=>{
  const f=fixture();assert.deepEqual(verifyIsolatedBridgeMappings(f.base,f.old,f.next,'agent-4'),{items:1,live:2,mappings:2,fields:4});
});
test('bridge rejects missing old identity and missing pooled field',()=>{
  const f=fixture();f.newRecord.aliases.pop();assert.throws(()=>verifyIsolatedBridgeMappings(f.base,f.old,f.next,'agent-4'),/identity is missing/);
  const g=fixture();g.next.texts.delete('tabcd');assert.throws(()=>verifyIsolatedBridgeMappings(g.base,g.old,g.next,'agent-4'),/missing text|pooled field missing/);
});
test('bridge rejects repeated identical text mapped to a different source occurrence',()=>{
  const f=fixture();f.newRecord.aliases[0]!.ar[0]!.row='new2';assert.throws(()=>verifyIsolatedBridgeMappings(f.base,f.old,f.next,'agent-4'),/source or insertion lineage differs/);
});
test('bridge rejects incomplete mappings even when text is present',()=>{
  const f=fixture();f.newRecord.aliases[0]!.ar[0]!.end=3;assert.throws(()=>verifyIsolatedBridgeMappings(f.base,f.old,f.next,'agent-4'),/incomplete old or new mapping/);
});

test('bridge scope excludes peer data, registers, and unrelated paths',async()=>{
  const {verifyBridgeScope}=await import('../src/isolated-bridge.js');
  const assigned=new Set(['item']);const metadata=new Set(['agent-work/agent-4/report.md']);
  verifyBridgeScope(['data/items/item.json','data/row-splits/item.json','data/texts/01.json','agent-work/agent-4/plans/item.json','agent-work/agent-4/report.md'],'agent-4',assigned,metadata);
  for(const path of ['data/items/peer.json','agent-work/agent-3/plans/item.json','docs/split-assignments/row-version-findings.json','data/texts/not-a-shard.json'])
    assert.throws(()=>verifyBridgeScope([path],'agent-4',assigned,metadata),/Unapproved bridge scope/);
});
test('bridge refuses an absent or changed prior immutable pooled value',async()=>{
  const {verifyBridgePool}=await import('../src/isolated-bridge.js');let f=fixture();assert.equal(verifyBridgePool(f.old,f.next),1);
  f.next.texts.set('tabcd','changed');assert.throws(()=>verifyBridgePool(f.old,f.next),/missing or changed/);
  f.next.texts.delete('tabcd');assert.throws(()=>verifyBridgePool(f.old,f.next),/missing or changed/);
});
