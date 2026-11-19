// agent-6 (reviewer of agent-5): what would option B of
// proposals/kind-decision-request.md do with the upgraded `revise` tooling?
// IN MEMORY ONLY. Writes nothing, changes no plan, layout, item or mapping, and is
// not agent-5's `revise-preview` (that runs only on his own registered branch).
//
//   node --import tsx agent-work/agent-6/proposals/scripts/simulate-kind-revision.mjs
//
// For each case it takes agent-5's committed plan and layout as merged here,
// changes only the named kinds, and runs the project's own functions:
// compileCanonicalSplit, prepareLiveRevision (lineage-composed aliases),
// verifyLiveRevisionHistory (reachable history from the frozen base to my HEAD),
// validateCorpus and verifyCanonicalResult. Then it checks by code point that
// every row ID the item ever published here still opens the same character.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:1<<29,stdio:['ignore','pipe','ignore']});
const root=git('rev-parse','--show-toplevel').trim();process.chdir(root);
const imp=f=>import(pathToFileURL(path.join(root,f)).href);
const {loadCorpus,validateCorpus}=await imp('src/corpus.ts');
const {loadCorpusAtCommit}=await imp('src/git-corpus.ts');
const {compileCanonicalSplit,verifyCanonicalResult}=await imp('src/split-canonical.ts');
const {splitAgentPlan}=await imp('src/split-agent.ts');
const {prepareLiveRevision,verifyLiveRevisionHistory}=await imp('src/row-revision.ts');
const {resolveLegacyRowAnchor}=await imp('web/row-split-anchor.ts');
const BASE=JSON.parse(fs.readFileSync('agent-work/agent-6/registration.json','utf8')).base,HEAD=git('rev-parse','HEAD').trim();
const base=loadCorpusAtCommit(BASE),current=loadCorpus(path.join(root,'data'));
const cp=s=>Array.from(s);const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
// The cases of the decision request. `rows` are frozen original rows; `piece` limits the change to one output of that row.
const CASES=[
  {name:'1',item:'dua-vdaa-hsyn-alyh',edits:[{row:'r00001',from:'heading',to:'instruction'}]},
  {name:'2',item:'item-mrsyh-am-albnyn',edits:['r00003','r00004','r00005','r00006','r00007','r00009','r00010','r00011','r00012','r00013'].map(row=>({row,from:'recitation',to:'quotation'}))},
  {name:'3',item:'dua-daa-aymny-shr',edits:[{row:'r00009',from:'quotation',to:'recitation'}]},
];
const results=[];
for(const k of CASES){const out={case:k.name,item:k.item,change:`${k.edits[0].from} -> ${k.edits[0].to}`,frozen_rows_edited:k.edits.map(e=>e.row)};results.push(out);
  try{
    const plan=read(`agent-work/agent-5/plans/${k.item}.json`),layout=read(`agent-work/agent-5/layouts/${k.item}.json`);
    const before=current.items.get(k.item),previous=current.rowSplits.get(k.item);
    verifyCanonicalResult(base,current,plan,layout); // the committed plan and layout describe the current item
    const nextPlan=structuredClone(plan),nextLayout=structuredClone(layout);let pieces=0;
    for(const e of k.edits){const lr=nextLayout.rows.find(r=>r.row===e.row);
      for(const o of lr.output){if(o.kind!==e.from)continue;o.kind=e.to;pieces++;
        for(const lang of ['ar','fa']){const ref=o[lang];if(!ref)continue;const src=nextPlan.sources.find(s=>s.row===e.row&&s.language===ref.source);
          if(src.kinds[ref.part]!==e.from)throw new Error(`${e.row}: plan piece kind is ${src.kinds[ref.part]}, not ${e.from}`);src.kinds[ref.part]=e.to;}}}
    out.output_pieces_edited=pieces;
    nextLayout.plan_sha256=splitAgentPlan(base,nextPlan).plan_sha256;
    // A kind is part of a piece ID, so the merge decisions must name the new piece IDs.
    const noMerge=l=>{const c=structuredClone(l);delete c.merges;return c;};
    const oldV1=compileCanonicalSplit(base,plan,noMerge(layout)).item.rows,newV1=compileCanonicalSplit(base,nextPlan,noMerge(nextLayout)).item.rows;
    if(oldV1.length!==newV1.length)throw new Error('piece count changed');
    const rename=new Map(oldV1.map((r,i)=>[r.id,newV1[i].id]));
    for(const m of nextLayout.merges??[]){for(const side of ['left','right']){if(!rename.has(m[side]))throw new Error(`merge side ${m[side]} is not a first-level piece; not simulated`);m[side]=rename.get(m[side]);}}
    const compiled=compileCanonicalSplit(base,nextPlan,nextLayout);
    const prepared=prepareLiveRevision(base,current,k.item,compiled);
    verifyLiveRevisionHistory(BASE,HEAD,base,prepared.corpus,k.item,previous,prepared.retired,prepared.newLive);
    const v=validateCorpus(prepared.corpus);if(v.errors.length)throw new Error('validator: '+v.errors.slice(0,3).join('; '));
    verifyCanonicalResult(base,prepared.corpus,nextPlan,nextLayout);
    const after=compiled.item,rec=prepared.record;
    // Row by row: only kinds may differ; text IDs and attribution must be equal.
    if(after.rows.length!==before.rows.length)throw new Error('row count changed');
    const changed=[];let textOrAttribution=0;
    after.rows.forEach((r,i)=>{const o=before.rows[i];
      if(r.ar!==o.ar||r.fa!==o.fa||JSON.stringify(r.sources??null)!==JSON.stringify(o.sources??null))textOrAttribution++;
      if(r.kind!==o.kind||r.id!==o.id)changed.push({old_id:o.id,old_kind:o.kind,new_id:r.id,new_kind:r.kind,id_kept:r.id===o.id});});
    out.rows=before.rows.length;out.rows_with_text_or_attribution_change=textOrAttribution;out.rows_changed=changed;
    out.live_ids_retired=prepared.retired.map(a=>a.original.id);out.new_live_ids=prepared.newLive.map(r=>r.id);
    out.ids_kept_with_new_kind=changed.filter(c=>c.id_kept).map(c=>c.old_id);
    out.mapping_format={before:previous.format_version,after:rec.format_version};
    out.aliases={before:(previous.aliases??[]).length,after:(rec.aliases??[]).length,earlier_aliases_all_kept:(previous.aliases??[]).every(a=>(rec.aliases??[]).some(b=>b.original.id===a.original.id&&JSON.stringify(b.original)===JSON.stringify(a.original)))};
    const ins=r=>(r.insertions??[]).map(x=>`${x.language}@${x.target_start}:${JSON.stringify(x.value)}`).sort();
    out.proposed_spaces={before:ins(previous).length,after:ins(rec).length,same_language_and_offset:JSON.stringify(ins(previous))===JSON.stringify(ins(rec))};
    // Every ID ever published for this item in my reachable history, at every code point.
    const entries=[...rec.rows,...(rec.aliases??[])],newRows=new Map(after.rows.map(r=>[r.id,r]));
    const commits=git('log','--full-history','--format=%H',`${BASE}..${HEAD}`,'--',`data/items/${k.item}.json`).trim().split('\n').filter(Boolean);
    const published=new Map();for(const c of [...commits,BASE]){const it=JSON.parse(git('show',`${c}:data/items/${k.item}.json`));for(const r of it.rows){const key=JSON.stringify([r.id,r.ar,r.fa]);if(!published.has(key))published.set(key,{row:r,commit:c});}}
    let ids=0,points=0;const wrong=[];
    for(const {row,commit} of published.values()){ids++;
      for(const lang of ['ar','fa']){if(row[lang]==null)continue;const oldText=cp(prepared.corpus.texts.get(row[lang])??JSON.parse(git('show',`${commit}:data/texts/${row[lang].slice(1,3)}.json`))[row[lang]]);
        for(let i=0;i<oldText.length;i++){points++;const t=resolveLegacyRowAnchor(entries,{row:row.id,language:lang,offset:i});const tr=newRows.get(t.row);
          const ch=tr&&tr[t.language]?cp(prepared.corpus.texts.get(tr[t.language]))[t.offset]:undefined;if(ch!==oldText[i]){wrong.push(`${row.id}/${lang}/${i}`);break;}}}}
    out.published_ids_checked=ids;out.code_points_checked=points;out.code_points_opening_other_text=wrong;
    out.result=wrong.length||textOrAttribution?'PROBLEM':'accepted by the project functions; every published link keeps its character';
  }catch(e){out.result='REFUSED: '+e.message;}
}
console.log(JSON.stringify({head:HEAD,base:BASE,note:'in-memory dry run by the reviewer; nothing written; not an authorization and not agent-5\'s revise-preview',cases:results},null,1));
if(results.some(r=>!r.result.startsWith('accepted')))process.exitCode=1;
