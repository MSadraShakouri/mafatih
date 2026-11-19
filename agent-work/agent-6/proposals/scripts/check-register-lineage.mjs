// agent-6: independent source-occurrence lineage check of the provisional
// register docs/split-assignments/row-version-findings.json. Reads only.
//
//   node --import tsx agent-work/agent-6/proposals/scripts/check-register-lineage.mjs agent-5
//   node --import tsx agent-work/agent-6/proposals/scripts/check-register-lineage.mjs agent-6
//
// It does not search for text. For each candidate and each snapshot the register
// names (when the commit is readable here):
//   a. the row with that ID in that snapshot must be the register's `original`
//      (ar, fa, kind and attribution);
//   b. that snapshot's own mapping says which code points of which frozen source
//      field the old row held; the current mapping says where those same source
//      code points are now; the result must equal the register's segments;
//   c. the segments must tile the old field from 0 and give back its exact text.
// The binding hash is compared with the current item and mapping, never updated.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const AGENT=process.argv[2];if(!/^agent-[1-6]$/.test(AGENT??'')){console.error('usage: check-register-lineage.mjs agent-N');process.exit(2);}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:1<<29,stdio:['ignore','pipe','ignore']});
const tryGit=(...a)=>{try{return git(...a);}catch{return null;}};
const root=git('rev-parse','--show-toplevel').trim();process.chdir(root);
const {loadCorpus}=await import(pathToFileURL(path.join(root,'src/corpus.ts')).href);
const {itemVersionBinding}=await import(pathToFileURL(path.join(root,'src/row-version-safety.ts')).href);
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const reg=json(process.env.REGISTER??'docs/split-assignments/row-version-findings.json'); // REGISTER: a mutated copy, for self-tests only
const own=new Set(json('docs/split-assignments/assignments.json').groups.find(g=>g.agent===AGENT).items.map(i=>i.item));
const c=loadCorpus(path.join(root,'data'));const cp=s=>Array.from(s);
const cache=new Map();const at=(commit,file)=>{const k=commit+':'+file;if(!cache.has(k)){const raw=tryGit('show',k);cache.set(k,raw?JSON.parse(raw):null);}return cache.get(k);};
const textAt=(commit,id)=>at(commit,`data/texts/${id.slice(1,3)}.json`)?.[id];
const readable=new Map();const isCommit=s=>{if(!readable.has(s))readable.set(s,tryGit('cat-file','-t',s)?.trim()==='commit');return readable.get(s);};
const coalesce=segs=>{const out=[];for(const s of segs){const p=out[out.length-1];
  if(p&&p.row===s.row&&p.language===s.language&&p.end===s.start&&p.target_start+(p.end-p.start)===s.target_start)p.end=s.end;else out.push({...s});}return out;};
const norm=segs=>coalesce(segs.map(x=>({row:x.row,language:x.language,start:x.start,end:x.end,target_start:x.target_start??0})));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const out={head:git('rev-parse','HEAD').trim(),author:AGENT,items:0,ids:0,live_or_aliased_now:0,retired_now:0,bindings_current:0,bindings_stale:[],
  snapshots:{distinct:0,readable:0,unreadable:[]},observations:{listed:0,checked:0,unreadable:0},
  old_row_differs_in_snapshot:[],lineage_differs:[],lineage_problems:[],text_rebuild_differs:[],attribution_differs:[],ids_fully_agreeing:0,per_item:{}};
for(const [id,g] of Object.entries(reg.items)){if(!own.has(id))continue;out.items++;
  const item=c.items.get(id),split=c.rowSplits.get(id);
  const bound=itemVersionBinding(item,split)===g.target_sha256;bound?out.bindings_current++:out.bindings_stale.push(id);
  const rows=new Map(item.rows.map(r=>[r.id,r]));let okIds=0;
  for(const r of g.rows){out.ids++;let ok=bound;const tag=`${id}/${r.id}`;
    (rows.has(r.id)||[...(split?.rows??[]),...(split?.aliases??[])].some(x=>x.original.id===r.id))?out.live_or_aliased_now++:out.retired_now++;
    // c. tiling and exact text against the current worktree
    for(const slot of ['ar','fa']){const ref=r.original[slot];const old=ref==null?[]:cp(c.texts.get(ref)??textAt(r.snapshots.find(isCommit)??'HEAD',ref)??'\uFFFF');
      let end=0,built='';for(const s of r[slot]){if(s.start!==end)ok=false;const t=rows.get(s.row);const tv=t?.[s.language]?c.texts.get(t[s.language]):undefined;
        built+=tv===undefined?'\uFFFE':cp(tv).slice(s.target_start,s.target_start+s.end-s.start).join('');end=s.end;
        if(t&&!same(r.original.sources?.[slot]??[],t.sources?.[s.language]??[])){out.attribution_differs.push(`${tag}/${slot}->${s.row}`);ok=false;}}
      if(end!==old.length||built!==old.join('')){out.text_rebuild_differs.push(`${tag}/${slot}`);ok=false;}}
    // a, b. per listed snapshot
    for(const s of r.snapshots){out.observations.listed++;if(!isCommit(s)){out.observations.unreadable++;continue;}out.observations.checked++;
      const oi=at(s,`data/items/${id}.json`),orec=at(s,`data/row-splits/${id}.json`);const row=oi?.rows.find(x=>x.id===r.id);
      if(!row||!same(row,r.original)){out.old_row_differs_in_snapshot.push(`${tag}@${s.slice(0,8)}`);ok=false;continue;}
      for(const slot of ['ar','fa']){const ref=row[slot];if(ref==null){if(r[slot].length){out.lineage_differs.push(`${tag}/${slot}@${s.slice(0,8)}`);ok=false;}continue;}
        const oldLen=cp(textAt(s,ref)??'').length;let prov=[];
        if(orec)for(const e of orec.rows)for(const lang of ['ar','fa'])for(const x of e[lang])if(x.row===r.id&&x.language===slot)prov.push({orig:e.original.id,lang,start:x.start,end:x.end,tstart:x.target_start??0});
        prov.sort((a,b)=>a.tstart-b.tstart);if(!prov.length)prov=[{orig:r.id,lang:slot,start:0,end:oldLen,tstart:0}];
        const segs=[];let expect=0;const problems=[];
        for(const p of prov){if(p.tstart!==expect)problems.push(`gap or inserted character at ${expect}`);
          const entry=split?.rows.find(e=>e.original.id===p.orig);
          if(!entry){ // not cut today: the frozen row itself is the current row
            if(rows.has(p.orig))segs.push({row:p.orig,language:p.lang,start:p.tstart,end:p.tstart+(p.end-p.start),target_start:p.start});else problems.push(`frozen row ${p.orig} not in the current mapping`);}
          else for(const cs of [...entry[p.lang]].sort((a,b)=>a.start-b.start)){const a=Math.max(p.start,cs.start),b=Math.min(p.end,cs.end);if(a>=b)continue;
            segs.push({row:cs.row,language:cs.language,start:p.tstart+(a-p.start),end:p.tstart+(b-p.start),target_start:(cs.target_start??0)+(a-cs.start)});}
          expect=p.tstart+(p.end-p.start);}
        if(expect!==oldLen)problems.push(`lineage covers ${expect} of ${oldLen} code points`);
        if(problems.length){out.lineage_problems.push(`${tag}/${slot}@${s.slice(0,8)}: ${problems.join('; ')}`);ok=false;}
        else if(!same(norm(segs),norm(r[slot]))){out.lineage_differs.push(`${tag}/${slot}@${s.slice(0,8)}`);ok=false;}}}
    if(ok){out.ids_fully_agreeing++;okIds++;}}
  out.per_item[id]=`${okIds}/${g.rows.length}`;}
out.snapshots.distinct=readable.size;out.snapshots.readable=[...readable.values()].filter(Boolean).length;out.snapshots.unreadable=[...readable].filter(([,v])=>!v).map(([s])=>s);
console.log(JSON.stringify(out,null,1));
if(out.ids_fully_agreeing!==out.ids||out.observations.unreadable)process.exitCode=1;
