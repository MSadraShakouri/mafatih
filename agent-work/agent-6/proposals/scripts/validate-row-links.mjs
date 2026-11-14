// Validate the proposed aliases of historical-row-links.json with the project's
// own validator, in a throw-away copy of the target snapshot. Nothing in the
// repository is changed.
//
//   node --import tsx agent-work/agent-6/proposals/scripts/validate-row-links.mjs
//
// Steps: export data/ of the target snapshot to a temporary directory; run
// validateCorpus (must be clean); add every proposed alias to its row-split
// record (a V1 record is raised to V2 first, because V1 may not carry aliases:
// its segments get target_start 0); run validateCorpus again; ask
// hasHistoricalRow for every retired id; delete the directory.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const {loadCorpus,validateCorpus}=await import(pathToFileURL(path.join(root,'src/corpus.ts')).href);
const {hasHistoricalRow}=await import(pathToFileURL(path.join(root,'src/row-splits.ts')).href);
const proposal=JSON.parse(fs.readFileSync(path.join(root,'agent-work/agent-6/proposals/historical-row-links.json'),'utf8'));
const versioned=JSON.parse(fs.readFileSync(path.join(root,'agent-work/agent-6/proposals/reused-row-ids.json'),'utf8'));
const target=proposal.target_snapshot,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'row-links-'));
try{
  execFileSync('sh',['-c',`git -C "${root}" archive ${target} data | tar -x -C "${tmp}"`]);
  const data=path.join(tmp,'data');
  const before=validateCorpus(loadCorpus(data));
  let aliases=0,raised=[];
  for(const group of proposal.items){
    const file=path.join(data,'row-splits',`${group.item}.json`),record=JSON.parse(fs.readFileSync(file,'utf8'));
    if(record.format_version===1){record.format_version=2;raised.push(group.item);
      for(const entry of record.rows)for(const lang of ['ar','fa'])for(const segment of entry[lang])segment.target_start=0;
      record.aliases=[];}
    for(const entry of group.entries){record.aliases.push(entry.proposed_alias);aliases++;}
    fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');
  }
  const corpus=loadCorpus(data),after=validateCorpus(corpus);
  let reachable=0,unreachable=[];
  for(const group of proposal.items)for(const entry of group.entries)
    (hasHistoricalRow(corpus,group.item,entry.old_id)?reachable++:unreachable.push(`${group.item}/${entry.old_id}`));
  // The versioned ids must keep their current meaning: adding aliases may not touch them.
  let versionedKept=0,versionedChanged=[];
  for(const group of versioned.items){const item=corpus.items.get(group.item),record=corpus.rowSplits.get(group.item);
    for(const entry of group.entries){
      const now=item.rows.find(r=>r.id===entry.id)??[...(record.aliases??[]),...record.rows].find(e=>e.original.id===entry.id)?.original;
      (now&&now.ar===entry.current.ar&&now.fa===entry.current.fa&&(now.kind??null)===entry.current.kind?versionedKept++:versionedChanged.push(`${group.item}/${entry.id}`));}}
  const result={target,validator_errors_before:before.errors.length,aliases_added:aliases,records_raised_from_v1_to_v2:raised,
    validator_errors_after:after.errors.length,first_errors:after.errors.slice(0,10),retired_ids_reachable_after:reachable,retired_ids_still_unreachable:unreachable,
    versioned_ids_with_unchanged_current_meaning:versionedKept,versioned_ids_changed:versionedChanged};
  console.log(JSON.stringify(result,null,1));
  if(before.errors.length||after.errors.length||unreachable.length||versionedChanged.length)process.exitCode=1;
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
