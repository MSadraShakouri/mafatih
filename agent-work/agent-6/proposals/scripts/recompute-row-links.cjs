#!/usr/bin/env node
// Recompute agent-6's historical row-link proposals against one target commit.
// Read-only: reads Git objects, writes the two proposal files, never touches data/.
//
//   node agent-work/agent-6/proposals/scripts/recompute-row-links.cjs TARGET_COMMIT
//
// Method. A cut piece is a slice of one source field of one original row. Every
// version of data/row-splits/<item>.json records that slice as code-point
// offsets. So an old row ID is located in the target by offsets, not by text
// search: take the slice it stood for in its own version, intersect it with the
// target's segments of the same source field, and the result is the mapping.
// Each mapping is then checked by text: the mapped slices of the target rows,
// joined, must equal the old field exactly.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const TARGET_ARG=process.argv[2];if(!TARGET_ARG){console.error('usage: recompute-row-links.cjs TARGET_COMMIT');process.exit(2);}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:1<<29,stdio:['ignore','pipe','ignore']});
const tryGit=(...a)=>{try{return git(...a);}catch{return null;}};
const root=git('rev-parse','--show-toplevel').trim();process.chdir(root);
const AGENT='agent-6',OUT=`agent-work/${AGENT}/proposals`;
const BASE=JSON.parse(fs.readFileSync(`agent-work/${AGENT}/registration.json`,'utf8')).base;
const TARGET=git('rev-parse',TARGET_ARG+'^{commit}').trim();
const items=JSON.parse(git('show',`${BASE}:docs/split-assignments/assignments.json`)).groups.find(g=>g.agent===AGENT).items.map(i=>i.item);
const cp=s=>Array.from(s);
const shardCache=new Map();
function textAt(commit,id){ if(id==null)return '';
  const key=commit+':'+id.slice(1,3);let shard=shardCache.get(key);
  if(shard===undefined){const raw=tryGit('show',`${commit}:data/texts/${id.slice(1,3)}.json`);shard=raw?JSON.parse(raw):{};shardCache.set(key,shard);}
  return shard[id];}
const verCache=new Map();
function version(commit,item){const key=commit+':'+item;if(verCache.has(key))return verCache.get(key);
  const i=tryGit('show',`${commit}:data/items/${item}.json`),r=tryGit('show',`${commit}:data/row-splits/${item}.json`);
  const v=i?{commit,item:JSON.parse(i),record:r?JSON.parse(r):null}:null;verCache.set(key,v);return v;}
const reach=v=>new Set([...v.item.rows.map(r=>r.id),...(v.record?v.record.rows.map(r=>r.original.id):[]),...((v.record&&v.record.aliases)||[]).map(a=>a.original.id)]);
const snapshots=git('log',TARGET,'--format=%H',`--grep=^Isolated ${AGENT} authored snapshot$`).trim().split('\n').filter(Boolean).reverse(); // oldest first, includes TARGET if it is one
const isSnapshot=new Set(snapshots);
const short=c=>c.slice(0,8);

// Where one field of a row in version v comes from: list of {orig,lang,start,end,tstart} ordered by tstart.
function provenance(v,rowId,slot){
  if(!v.record){return null;} const out=[];
  for(const e of v.record.rows)for(const lang of ['ar','fa'])for(const s of e[lang])
    if(s.row===rowId&&s.language===slot)out.push({orig:e.original.id,lang,start:s.start,end:s.end,tstart:s.target_start??0});
  return out.sort((a,b)=>a.tstart-b.tstart);
}
// Map a field of an old row into the target. Returns {segments,problems}.
function mapField(v,row,slot,target){
  const problems=[],segments=[];const ref=row[slot];if(ref==null)return {segments,problems};
  const oldText=textAt(v.commit,ref);if(oldText===undefined){problems.push(`${slot}: old text ${ref} not readable at ${short(v.commit)}`);return {segments,problems};}
  let prov=provenance(v,row.id,slot);
  if(prov===null||!prov.length){ // unsplit original row in that version: the field is the whole source field
    prov=[{orig:row.id,lang:slot,start:0,end:cp(oldText).length,tstart:0}];
  }
  let expect=0;
  for(const p of prov){
    if(p.tstart!==expect)problems.push(`${slot}: old field has a gap or an inserted character at ${expect}`);
    const entry=target.record.rows.find(e=>e.original.id===p.orig);
    if(!entry){problems.push(`${slot}: original ${p.orig} not in target mapping`);continue;}
    for(const cs of entry[p.lang]){const a=Math.max(p.start,cs.start),b=Math.min(p.end,cs.end);if(a>=b)continue;
      segments.push({row:cs.row,language:cs.language,start:p.tstart+(a-p.start),end:p.tstart+(b-p.start),target_start:(cs.target_start??0)+(a-cs.start)});}
    expect=p.tstart+(p.end-p.start);
  }
  if(expect!==cp(oldText).length)problems.push(`${slot}: provenance covers ${expect} of ${cp(oldText).length} code points`);
  // text check and alias rules of src/row-splits.ts
  const pos=new Map(target.item.rows.map((r,i)=>[r.id,i]));const rows=new Map(target.item.rows.map(r=>[r.id,r]));
  const old=cp(oldText);let offset=0,lastPos=-1;const lastEnd=new Map();
  for(const s of segments){const t=rows.get(s.row);const k=s.row+'\0'+s.language;
    if(!t||s.start!==offset||s.end<=s.start||pos.get(s.row)<lastPos||s.target_start<(lastEnd.get(k)??0))problems.push(`${slot}: invalid coverage or order at ${s.row}`);
    offset=s.end;lastPos=pos.get(s.row)??lastPos;lastEnd.set(k,s.target_start+s.end-s.start);
    if(!t)continue;const actual=textAt(TARGET,t[s.language]);
    if(actual===undefined||cp(actual).slice(s.target_start,s.target_start+s.end-s.start).join('')!==old.slice(s.start,s.end).join(''))problems.push(`${slot}: target text differs from old slice at ${s.row}`);
    if(JSON.stringify((row.sources&&row.sources[slot])||[])!==JSON.stringify((t.sources&&t.sources[s.language])||[]))problems.push(`${slot}: source attribution differs at ${s.row}`);
  }
  if(offset!==old.length)problems.push(`${slot}: old text not fully reconstructible (${offset} of ${old.length})`);
  return {segments,problems,provenance:prov.map(p=>({original_row:p.orig,source_language:p.lang,start:p.start,end:p.end}))};
}
function classify(row,mapping,target){
  const rows=new Map(target.item.rows.map(r=>[r.id,r]));const used=[...new Set([...mapping.ar,...mapping.fa].map(s=>s.row))];
  if(used.length>1)return 'spread-over-several-rows';
  const t=rows.get(used[0]);if(!t)return 'unresolved';
  const whole=['ar','fa'].every(l=>{const segs=mapping[l];if(row[l]==null)return true;return segs.length===1&&segs[0].target_start===0&&t[segs[0].language]===row[l];});
  const sameFields=['ar','fa'].every(l=>(row[l]==null)===(t[l]==null))&&['ar','fa'].every(l=>row[l]==null||t[l]===row[l]);
  if(whole&&sameFields)return t.kind===row.kind?'same-row-new-id':'same-text-kind-changed';
  return 'part-of-one-larger-row';
}

const retiredItems=[],versionedItems=[];
const totals={retired:{items:0,ids:0,in_a_snapshot:0,branch_commits_only:0,mapped_and_text_checked:0,with_problems:0,more_than_one_old_meaning:0,by_class:{},pooled_values_absent_from_target:0},
  versioned:{items:0,ids:0,entries:0,snapshot_ids_checked:0,snapshot_ids_same_meaning_today:0,snapshot_ids_same_text_other_kind:0,snapshot_ids_retired_see_alias_file:0,by_class:{},with_problems:0}};
for(const item of items){
  const target=version(TARGET,item);if(!target||!target.record)continue;const targetReach=reach(target);
  const targetRows=new Map(target.item.rows.map(r=>[r.id,r]));
  const targetMeaning=new Map(),targetSegments=new Map();
  for(const e of [...(target.record.aliases||[]),...target.record.rows]){targetMeaning.set(e.original.id,e.original);targetSegments.set(e.original.id,e);}
  for(const r of target.item.rows)targetMeaning.set(r.id,r);
  const commits=[...new Set([...git('log',`${BASE}..${TARGET}`,'--format=%H','--',`data/items/${item}.json`).trim().split('\n').filter(Boolean),
    ...git('log',`${BASE}..HEAD`,'--format=%H','--',`data/items/${item}.json`).trim().split('\n').filter(Boolean),...snapshots])];
  // order newest first by commit date so that "latest version containing the id" is well defined
  const dated=commits.map(c=>({c,t:Number(git('log','-1','--format=%ct',c).trim())})).sort((a,b)=>b.t-a.t);
  const seen=new Map(); // id -> [{commit,row}]
  for(const {c} of dated){if(c===TARGET)continue;const v=version(c,item);if(!v)continue;for(const row of v.item.rows){if(!seen.has(row.id))seen.set(row.id,[]);seen.get(row.id).push({v,row});}}
  // ---- class 1: retired ids
  const rEntries=[];
  for(const [id,occ] of seen){ if(targetReach.has(id))continue;
    const meanings=new Map();for(const o of occ){const k=`${o.row.ar}|${o.row.fa}|${o.row.kind}`;if(!meanings.has(k))meanings.set(k,[]);meanings.get(k).push(o);}
    const {v,row}=occ[0];const ar=mapField(v,row,'ar',target),fa=mapField(v,row,'fa',target);const problems=[...ar.problems,...fa.problems];
    if(id.startsWith('m'))problems.push('retired merged row: needs a tool decision, not a plain alias');
    const mapping={ar:ar.segments,fa:fa.segments};const cls=classify(row,mapping,target);
    const inSnaps=[...new Set(occ.filter(o=>isSnapshot.has(o.v.commit)).map(o=>short(o.v.commit)))];
    const absent=['ar','fa'].filter(l=>row[l]!=null&&textAt(TARGET,row[l])===undefined).map(l=>({text_id:row[l],field:l,rebuild_from:(l==='ar'?ar:fa).provenance}));
    totals.retired.ids++;totals.retired[inSnaps.length?'in_a_snapshot':'branch_commits_only']++;totals.retired.by_class[cls]=(totals.retired.by_class[cls]||0)+1;
    if(problems.length)totals.retired.with_problems++;else totals.retired.mapped_and_text_checked++;
    if(meanings.size>1)totals.retired.more_than_one_old_meaning++;totals.retired.pooled_values_absent_from_target+=absent.length;
    rEntries.push({old_id:id,old_kind:row.kind??null,last_seen_in:short(v.commit),published_in_snapshots:inSnaps,seen_in_commits:[...new Set(occ.map(o=>short(o.v.commit)))].length,
      class:cls,current_rows:[...new Set([...mapping.ar,...mapping.fa].map(s=>s.row))],current_kinds:[...new Set([...mapping.ar,...mapping.fa].map(s=>targetRows.get(s.row)?.kind??null))],
      text_checked:problems.length===0,...(problems.length?{problems}:{}),...(meanings.size>1?{old_meanings:meanings.size}:{}),...(absent.length?{pooled_values_absent_from_target:absent}:{}),
      proposed_alias:{original:row,ar:mapping.ar,fa:mapping.fa}});
  }
  if(rEntries.length){totals.retired.items++;retiredItems.push({item,target_mapping_format:target.record.format_version,ids:rEntries.length,entries:rEntries.sort((a,b)=>a.old_id<b.old_id?-1:1)});}
  // ---- class 2: ids that exist in the target but stood for other text in an earlier snapshot
  const vEntries=[];
  const olderSnaps=snapshots.filter(s=>s!==TARGET);
  const byId=new Map();
  for(const s of olderSnaps){const v=version(s,item);if(!v||!v.record)continue; // not authored yet in that snapshot: base rows only
    for(const row of v.item.rows){totals.versioned.snapshot_ids_checked++;
      // What the id stands for in the target: a current row, or the old row kept by an alias or a mapping original.
      const now=targetMeaning.get(row.id);
      if(!now){totals.versioned.snapshot_ids_retired_see_alias_file++;continue;}
      if(now.ar===row.ar&&now.fa===row.fa){ if(now.kind===row.kind)totals.versioned.snapshot_ids_same_meaning_today++;else totals.versioned.snapshot_ids_same_text_other_kind++; continue;}
      const k=`${row.ar}|${row.fa}|${row.kind}`;if(!byId.has(row.id))byId.set(row.id,new Map());const m=byId.get(row.id);if(!m.has(k))m.set(k,{v,row,snaps:[]});m.get(k).snaps.push(short(s));
    }}
  for(const [id,meanings] of byId){const now=targetMeaning.get(id),via=targetRows.has(id)?'current-row':'alias-or-original';const versions=[];
    for(const {v,row,snaps} of meanings.values()){const ar=mapField(v,row,'ar',target),fa=mapField(v,row,'fa',target);const problems=[...ar.problems,...fa.problems];
      const mapping={ar:ar.segments,fa:fa.segments};const dest=[...new Set([...mapping.ar,...mapping.fa].map(s=>s.row))];
      const nowRow=via==='current-row'?id:(targetSegments.get(id)?.ar[0]??targetSegments.get(id)?.fa[0])?.row;
      const cls=dest.length===1&&dest[0]===nowRow?'id-now-opens-a-row-that-contains-the-old-text':dest[0]===nowRow?'id-now-opens-the-start-of-the-old-text':dest.includes(nowRow)?'id-now-opens-part-of-the-old-text':'id-now-opens-different-text';
      totals.versioned.entries++;totals.versioned.by_class[cls]=(totals.versioned.by_class[cls]||0)+1;if(problems.length)totals.versioned.with_problems++;
      versions.push({snapshots:snaps,old:{ar:row.ar,fa:row.fa,kind:row.kind??null},class:cls,destination_rows:dest,text_checked:problems.length===0,...(problems.length?{problems}:{}),mapping});}
    totals.versioned.ids++;
    const nowRows=via==='current-row'?[id]:[...new Set(['ar','fa'].flatMap(l=>(targetSegments.get(id)?.[l]??[]).map(x=>x.row)))];
    vEntries.push({id,current:{ar:now.ar,fa:now.fa,kind:now.kind??null,resolves_through:via,rows:nowRows},versions,
      unversioned_link:{action:'warn-and-offer',known_destinations:[{meaning:`target ${short(TARGET)} and later`,rows:nowRows},...versions.map(x=>({meaning:`snapshot ${x.snapshots.join(', ')}`,rows:x.destination_rows}))]}});
  }
  if(vEntries.length){totals.versioned.items++;versionedItems.push({item,target_mapping_format:target.record.format_version,ids:vEntries.length,entries:vEntries.sort((a,b)=>a.id<b.id?-1:1)});}
}
const common={format_version:2,author:AGENT,base:BASE,target_snapshot:TARGET,snapshots_checked:snapshots.map(short),generated_by:`${OUT}/scripts/recompute-row-links.cjs`};
fs.writeFileSync(path.join(OUT,'historical-row-links.json'),JSON.stringify({...common,kind:'historical-row-link-proposal',
  status:'proposal only; not applied to data/. To be applied by the coordinator tooling as durable aliases, not by hand.',
  how_to_read:'Each proposed_alias has the shape of an aliases[] entry of data/row-splits: original is the old row exactly as it was published; ar and fa tile that old field from offset 0 with slices of rows of the target snapshot (code-point offsets). pooled_values_absent_from_target lists old text values that the target pool does not hold, with the source slice from which each can be rebuilt.',
  totals:totals.retired,items:retiredItems},null,1)+'\n');
fs.writeFileSync(path.join(OUT,'reused-row-ids.json'),JSON.stringify({...common,kind:'snapshot-versioned-row-link-map',
  status:'proposal only; not applied to data/. These ids are in use: do not alias, overwrite or redirect them. A link needs the snapshot it was made against.',
  how_to_read:'Each entry is a row id that exists in the target snapshot but stood for other text (or another kind) in an earlier snapshot. versions[] gives, per earlier meaning, the snapshots that carried it and where that old text is in the target (same segment shape as an alias). A link that names one of those snapshots follows that mapping. A link without a snapshot cannot be decided: unversioned_link lists the known destinations to offer.',
  totals:totals.versioned,items:versionedItems},null,1)+'\n');
console.log(JSON.stringify({target:TARGET,snapshots:snapshots.map(short),retired:totals.retired,versioned:totals.versioned},null,1));
