// agent-6: compare the coordinator's provisional register
// (docs/split-assignments/row-version-findings.json) with my own lineage map of
// reused row IDs (agent-work/agent-6/proposals/reused-row-ids.json). Reads only.
//
//   node --import tsx agent-work/agent-6/proposals/scripts/check-version-register.mjs
//
// My map was built from frozen source offsets (recompute-row-links.cjs), not by
// text search, so agreement here is agreement on source-occurrence lineage.
// 1. The register entries for agent-6 items and my map list the same IDs.
// 2. For each ID the register's old meaning (ar, fa, kind) is one of my versions
//    and its ar/fa segments equal my lineage mapping exactly.
// 3. Every snapshot the register names, when the commit is readable here, really
//    carried that old meaning under that ID; unreadable commits are listed.
// 4. The binding hash matches the current item and mapping (not refreshed here).
// 5. No register entry for my items is one of the 142 migrated retired IDs.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:1<<29,stdio:['ignore','pipe','ignore']});
const tryGit=(...a)=>{try{return git(...a);}catch{return null;}};
const root=git('rev-parse','--show-toplevel').trim();
const {loadCorpus}=await import(pathToFileURL(path.join(root,'src/corpus.ts')).href);
const {itemVersionBinding}=await import(pathToFileURL(path.join(root,'src/row-version-safety.ts')).href);
const json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const reg=json('docs/split-assignments/row-version-findings.json');
const mine=json('agent-work/agent-6/proposals/reused-row-ids.json');
const migrated=json('agent-work/agent-6/proposals/historical-row-links.json');
const own=new Set(json('docs/split-assignments/assignments.json').groups.find(g=>g.agent==='agent-6').items.map(i=>i.item));
const c=loadCorpus(path.join(root,'data'));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const norm=s=>s.map(x=>({row:x.row,language:x.language,start:x.start,end:x.end,target_start:x.target_start??0}));
const regItems=Object.entries(reg.items).filter(([id])=>own.has(id));
const out={head:git('rev-parse','HEAD').trim(),register_target_snapshot:reg.target_snapshot,
  register_items_of_agent_6:regItems.length,register_ids:0,my_map_items:mine.items.length,my_map_ids:mine.totals.ids,
  ids_only_in_register:[],ids_only_in_my_map:[],old_meaning_not_in_my_map:[],mapping_differs:[],ids_with_more_old_meanings_in_my_map:[],
  mapping_equal:0,bindings_current:0,bindings_stale:[],migrated_ids_listed_in_register:[],
  snapshots:{distinct:0,readable:0,unreadable:[],observations_checked:0,observations_wrong:[]}};
const snapSeen=new Map();const itemAt=new Map();
const rowAt=(commit,item,id)=>{const k=commit+':'+item;if(!itemAt.has(k)){const raw=tryGit('show',`${commit}:data/items/${item}.json`);itemAt.set(k,raw?JSON.parse(raw):null);}
  return itemAt.get(k)?.rows.find(r=>r.id===id);};
for(const [id,g] of regItems){
  const item=c.items.get(id),split=c.rowSplits.get(id);
  itemVersionBinding(item,split)===g.target_sha256?out.bindings_current++:out.bindings_stale.push(id);
  const my=mine.items.find(i=>i.item===id);const myIds=new Map((my?.entries??[]).map(e=>[e.id,e]));
  const mig=new Set((migrated.items.find(i=>i.item===id)?.entries??[]).map(e=>e.old_id));
  for(const r of g.rows){out.register_ids++;
    if(mig.has(r.id))out.migrated_ids_listed_in_register.push(`${id}/${r.id}`);
    const e=myIds.get(r.id);if(!e){out.ids_only_in_register.push(`${id}/${r.id}`);continue;}
    myIds.delete(r.id);
    if(e.versions.length>1)out.ids_with_more_old_meanings_in_my_map.push(`${id}/${r.id}:${e.versions.length}`);
    const v=e.versions.find(v=>v.old.ar===r.original.ar&&v.old.fa===r.original.fa&&(v.old.kind??null)===(r.original.kind??null));
    if(!v){out.old_meaning_not_in_my_map.push(`${id}/${r.id}`);continue;}
    same(norm(v.mapping.ar),norm(r.ar))&&same(norm(v.mapping.fa),norm(r.fa))?out.mapping_equal++:out.mapping_differs.push(`${id}/${r.id}`);
    for(const s of r.snapshots){
      if(!snapSeen.has(s))snapSeen.set(s,tryGit('cat-file','-t',s)?.trim()==='commit');
      if(!snapSeen.get(s))continue;
      out.snapshots.observations_checked++;const row=rowAt(s,id,r.id);
      if(!row||row.ar!==r.original.ar||row.fa!==r.original.fa||(row.kind??null)!==(r.original.kind??null))out.snapshots.observations_wrong.push(`${id}/${r.id}@${s.slice(0,8)}`);}
  }
  for(const k of myIds.keys())out.ids_only_in_my_map.push(`${id}/${k}`);
}
for(const i of mine.items)if(!reg.items[i.item])for(const e of i.entries)out.ids_only_in_my_map.push(`${i.item}/${e.id}`);
out.snapshots.distinct=snapSeen.size;out.snapshots.readable=[...snapSeen.values()].filter(Boolean).length;
out.snapshots.unreadable=[...snapSeen].filter(([,ok])=>!ok).map(([s])=>s);
console.log(JSON.stringify(out,null,1));
if(out.ids_only_in_register.length||out.ids_only_in_my_map.length||out.old_meaning_not_in_my_map.length||out.mapping_differs.length||out.bindings_stale.length||out.migrated_ids_listed_in_register.length||out.snapshots.observations_wrong.length)process.exitCode=1;
