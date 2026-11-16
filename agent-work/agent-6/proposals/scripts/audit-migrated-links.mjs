// agent-6: audit the links of the CURRENT worktree after the alias migration,
// with the project's own loader, validator and resolver. Reads only.
//
//   node --import tsx agent-work/agent-6/proposals/scripts/audit-migrated-links.mjs
//
// 1. validateCorpus on data/ must report no error.
// 2. Every retired ID of historical-row-links.json must resolve (hasHistoricalRow)
//    and must resolve to an alias whose original equals the proposal's.
// 3. Every reused ID of reused-row-ids.json must still be live with its current
//    meaning, and must NOT have been given an alias (it is not redirected).
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const {loadCorpus,validateCorpus}=await import(pathToFileURL(path.join(root,'src/corpus.ts')).href);
const {hasHistoricalRow}=await import(pathToFileURL(path.join(root,'src/row-splits.ts')).href);
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'agent-work/agent-6/proposals',f),'utf8'));
const retired=read('historical-row-links.json'),reused=read('reused-row-ids.json');
const corpus=loadCorpus(path.join(root,'data')),v=validateCorpus(corpus);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let resolve=0,exact=0;const unresolved=[],inexact=[];
for(const g of retired.items){const rec=corpus.rowSplits.get(g.item);
  for(const e of g.entries){
    hasHistoricalRow(corpus,g.item,e.old_id)?resolve++:unresolved.push(`${g.item}/${e.old_id}`);
    const a=(rec.aliases??[]).find(x=>x.original.id===e.old_id);
    a&&same(a,e.proposed_alias)?exact++:inexact.push(`${g.item}/${e.old_id}`);}}
let live=0,redirected=[];const changed=[];
for(const g of reused.items){const item=corpus.items.get(g.item),rec=corpus.rowSplits.get(g.item);
  for(const e of g.entries){
    const now=item.rows.find(r=>r.id===e.id)??[...(rec.aliases??[]),...rec.rows].find(x=>x.original.id===e.id)?.original;
    now&&now.ar===e.current.ar&&now.fa===e.current.fa&&(now.kind??null)===e.current.kind?live++:changed.push(`${g.item}/${e.id}`);
    // not redirected by this migration: no alias of the proposal carries this ID
    if(retired.items.some(x=>x.item===g.item&&x.entries.some(y=>y.old_id===e.id)))redirected.push(`${g.item}/${e.id}`);}}
const heldItems=new Set([...retired.items.map(i=>i.item),...reused.items.map(i=>i.item)]);
const out={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),validator_errors:v.errors.length,first_errors:v.errors.slice(0,5),
  retired_ids:{proposed:retired.totals.ids,resolve_now:resolve,alias_equals_proposal:exact,unresolved,inexact},
  reused_ids:{listed:reused.items.reduce((n,i)=>n+i.entries.length,0),current_meaning_unchanged:live,changed,given_an_alias_by_this_migration:redirected},
  items_with_any_link_issue:heldItems.size};
console.log(JSON.stringify(out,null,1));
if(v.errors.length||unresolved.length||inexact.length||changed.length||redirected.length)process.exitCode=1;
