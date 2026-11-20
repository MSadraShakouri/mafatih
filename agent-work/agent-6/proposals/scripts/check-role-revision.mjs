// Reviewer aid (agent-6). Checks that author snapshot NEW differs from the
// reviewed snapshot OLD, for ITEM, only by row kinds, and that every link
// survives. Reads Git objects only and writes nothing.
//
//   node --import tsx agent-work/agent-6/proposals/scripts/check-role-revision.mjs OLD NEW ITEM [AUTHOR]
//
// Exit 0 only if every check passes. It does not replace reading the rows.
import path from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const [OLD,NEW,ITEM,AUTHOR='agent-5']=process.argv.slice(2);
if(!ITEM||!/^[0-9a-f]{40}$/.test(OLD)||!/^[0-9a-f]{40}$/.test(NEW)){console.error('usage: OLD NEW ITEM [AUTHOR] (full commits)');process.exit(2);}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:1<<29,stdio:['ignore','pipe','ignore']});
const tryGit=(...a)=>{try{return git(...a);}catch{return null;}};
const root=git('rev-parse','--show-toplevel').trim();process.chdir(root);
const imp=f=>import(pathToFileURL(path.join(root,f)).href);
const {loadCorpusAtCommit}=await imp('src/git-corpus.ts');const {validateCorpus}=await imp('src/corpus.ts');
const {verifyCanonicalResult}=await imp('src/split-canonical.ts');const {resolveLegacyRowAnchor}=await imp('web/row-split-anchor.ts');
import fs from 'node:fs';
const BASE=JSON.parse(fs.readFileSync('agent-work/agent-6/registration.json','utf8')).base; // the one frozen base of the round
const show=(c,p)=>{const r=tryGit('show',`${c}:${p}`);return r?JSON.parse(r):null;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);const cp=s=>Array.from(s);
let fail=0;const facts={};const check=(name,ok,detail='')=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?'  — '+detail:''}`);};
const files={item:`data/items/${ITEM}.json`,rec:`data/row-splits/${ITEM}.json`,plan:`agent-work/${AUTHOR}/plans/${ITEM}.json`,layout:`agent-work/${AUTHOR}/layouts/${ITEM}.json`};
const o={item:show(OLD,files.item),rec:show(OLD,files.rec),plan:show(OLD,files.plan),layout:show(OLD,files.layout)};
const n={item:show(NEW,files.item),rec:show(NEW,files.rec),plan:show(NEW,files.plan),layout:show(NEW,files.layout)};
// 1. scope
check('new snapshot descends from the reviewed one',tryGit('merge-base','--is-ancestor',OLD,NEW)!==null);
const changed=git('diff','--name-only',OLD,NEW).trim().split('\n').filter(Boolean);
check('no pooled text file changed',!changed.some(p=>p.startsWith('data/texts/')),changed.filter(p=>p.startsWith('data/texts/')).slice(0,3).join(', '));
facts.files_changed_in_snapshot=changed.length;
// 2. rows: only kinds (and the IDs that follow from them)
check('same number of rows',o.item.rows.length===n.item.rows.length,`${o.item.rows.length} -> ${n.item.rows.length}`);
const rename=new Map(),kindChanged=[],kept=[],retired=[];let textDiff=0,attrDiff=0,idOnly=0;
o.item.rows.forEach((r,i)=>{const m=n.item.rows[i];if(!m)return;if(r.ar!==m.ar||r.fa!==m.fa)textDiff++;if(!same(r.sources??null,m.sources??null))attrDiff++;
  if(r.id!==m.id)rename.set(r.id,m.id);
  if(r.kind!==m.kind){kindChanged.push(`${r.id}:${r.kind}->${m.kind}`);(r.id===m.id?kept:retired).push(r.id);}else if(r.id!==m.id)idOnly++;});
check('no row changed its Arabic or Persian text reference',textDiff===0,String(textDiff));
check('no row changed its source attribution',attrDiff===0,String(attrDiff));
check('no row got a new ID without a kind change',idOnly===0,String(idOnly));
const {rows:_1,...oRest}=o.item,{rows:_2,...nRest}=n.item;check('item fields other than rows are identical',same(oRest,nRest));
facts.rows=o.item.rows.length;facts.kind_changes=kindChanged;facts.ids_kept_with_new_kind=kept;facts.ids_retired=retired;facts.new_ids=retired.map(id=>rename.get(id));
// 3. mapping record
const rn=id=>rename.get(id)??id;const rnSegs=segs=>segs.map(s=>({...s,row:rn(s.row),target_start:s.target_start??0}));
const oAliases=o.rec.aliases??[],nAliases=n.rec.aliases??[];
const carried=oAliases.every(a=>{const b=nAliases.find(x=>x.original.id===a.original.id);return b&&same(b.original,a.original)&&same(rnSegs(a.ar),rnSegs(b.ar))&&same(rnSegs(a.fa),rnSegs(b.fa));});
check('every earlier alias is carried: same original, same offsets, only the target row renamed',carried,`${oAliases.length} earlier`);
const newRows=new Map(n.item.rows.map(r=>[r.id,r])),oldRows=new Map(o.item.rows.map(r=>[r.id,r]));
const pool=id=>id==null?'':JSON.parse(git('show',`${NEW}:data/texts/${id.slice(1,3)}.json`))[id];
let aliasOk=true;const aliasNotes=[];
for(const id of retired){const a=nAliases.find(x=>x.original.id===id),old=oldRows.get(id),t=newRows.get(rename.get(id));
  if(!a||!same(a.original,old)){aliasOk=false;aliasNotes.push(`${id}: no alias with the exact old row`);continue;}
  for(const l of ['ar','fa']){const len=cp(pool(old[l])).length;const want=old[l]==null?[]:[{row:t.id,language:l,start:0,end:len,target_start:0}];
    if(!same(rnSegs(a[l]),want)){aliasOk=false;aliasNotes.push(`${id}/${l}: alias is not the whole field at offset 0 of ${t.id}`);}}}
check('each retired ID has an alias: exact old row, whole field, offset 0 of the renamed row',aliasOk,aliasNotes.join('; '));
const known=new Set([...oAliases.map(a=>a.original.id),...retired]);const extra=nAliases.filter(a=>!known.has(a.original.id));
const pub=new Set();// Versions from the frozen base onward. Earlier history (before the round) is covered by the
// project's editorial history, not by the split mapping, and is not judged here.
const commits=[...git('log','--full-history','--format=%H',`${BASE}..${NEW}`,'--',files.item).trim().split('\n').filter(Boolean),BASE];
const versions=new Map();for(const c of commits){const it=show(c,files.item);if(!it)continue;for(const r of it.rows){pub.add(r.id);const k=JSON.stringify([r.id,r.ar,r.fa]);if(!versions.has(k))versions.set(k,{row:r,commit:c});}}
const extraPublished=extra.filter(a=>{const c=commits.filter(c=>c!==NEW).some(c=>show(c,files.item)?.rows.some(r=>r.id===a.original.id));return c;});
check('other new aliases are intermediate pieces of the re-made joins, never published before',extraPublished.length===0,`${extra.length} new intermediate`);
facts.aliases={before:oAliases.length,after:nAliases.length,for_retired_ids:retired.length,new_intermediate:extra.map(a=>a.original.id)};
const oRowsMap=o.rec.rows.map(e=>({original:e.original,results:e.results.map(rn),ar:rnSegs(e.ar),fa:rnSegs(e.fa)})),nRowsMap=n.rec.rows.map(e=>({original:e.original,results:e.results,ar:rnSegs(e.ar),fa:rnSegs(e.fa)}));
check('the mapping of every frozen original row is the same, only target rows renamed',same(oRowsMap,nRowsMap));
check('mapping record names the same item, author and frozen baseline',o.rec.item===n.rec.item&&o.rec.author===n.rec.author&&o.rec.baseline_item_sha256===n.rec.baseline_item_sha256);
// 4. proposed spaces
const insKey=x=>({row:rn(x.row),language:x.language,target_start:x.target_start,value:x.value,reason:x.reason});
const oIns=(o.rec.insertions??[]).map(insKey),nIns=(n.rec.insertions??[]).map(insKey);
check('proposed spaces: same rows (renamed), languages, offsets, value and reason',same(oIns,nIns),`${oIns.length} -> ${nIns.length}`);
let spaceOk=true;for(const x of n.rec.insertions??[]){const t=newRows.get(x.row),s=cp(pool(t?.[x.language]));
  if(x.value!==' '||s[x.target_start]!==' '||!s[x.target_start-1]||/\s/u.test(s[x.target_start-1])||!s[x.target_start+1]||/\s/u.test(s[x.target_start+1]))spaceOk=false;}
check('each proposed space is one U+0020 with a non-space character on both sides',spaceOk);
facts.proposed_spaces=(n.rec.insertions??[]).map(x=>`${x.row}/${x.language}@${x.target_start}`);
// 5. plan and layout: kinds only
const strip=(v,keys)=>JSON.parse(JSON.stringify(v,(k,val)=>keys.includes(k)?undefined:val));
check('plan differs only in kinds',same(strip(o.plan,['kinds']),strip(n.plan,['kinds'])));
const lay=l=>{const c=strip(l,['kind','plan_sha256']);for(const m of c.merges??[]){m.left=rn(m.left);m.right=rn(m.right);}return c;};
const firstLevel=new Map();{ // first-level piece IDs change with the kind too; compare merges by position
  const a=(o.layout.merges??[]),b=(n.layout.merges??[]);a.forEach((m,i)=>{if(b[i]){firstLevel.set(m.left,b[i].left);firstLevel.set(m.right,b[i].right);}});}
const lay2=l=>{const c=strip(l,['kind','plan_sha256']);for(const m of c.merges??[]){m.left=firstLevel.get(m.left)??m.left;m.right=firstLevel.get(m.right)??m.right;}return c;};
check('layout differs only in kinds, the plan hash and the renamed sides of the same joins',same(lay2(o.layout),lay2(n.layout)));
check('layout no row uses a new ID scheme',!JSON.stringify(n.layout).includes('id_scheme'));
// 6. project functions on the new snapshot
const base=loadCorpusAtCommit(BASE),cur=loadCorpusAtCommit(NEW);
const v=validateCorpus(cur);check('project validator: no error on the new snapshot',v.errors.length===0,v.errors.slice(0,2).join('; '));
let canon='';try{verifyCanonicalResult(base,cur,n.plan,n.layout);}catch(e){canon=e.message;}
check('project canonical check: plan and layout rebuild the published item and mapping',canon==='',canon);
// 7. every ID ever published for the item, every code point
const entries=[...n.rec.rows,...nAliases];let ids=0,points=0;const wrong=[];
for(const {row,commit} of versions.values()){ids++;for(const l of ['ar','fa']){if(row[l]==null)continue;
  const text=cp(JSON.parse(git('show',`${commit}:data/texts/${row[l].slice(1,3)}.json`))[row[l]]);
  for(let i=0;i<text.length;i++){points++;const t=newRows.has(row.id)&&newRows.get(row.id).ar===row.ar&&newRows.get(row.id).fa===row.fa?{row:row.id,language:l,offset:i}:resolveLegacyRowAnchor(entries,{row:row.id,language:l,offset:i});
    const tr=newRows.get(t.row);const ch=tr&&tr[t.language]?cp(pool(tr[t.language]))[t.offset]:undefined;if(ch!==text[i]){wrong.push(`${row.id}/${l}/${i}@${commit.slice(0,8)}`);break;}}}}
check('every row ID published since the frozen base opens the same character at every code point',wrong.length===0,`${ids} ID meanings, ${points} code points${wrong.length?'; wrong: '+wrong.slice(0,5).join(', '):''}`);
const newIds=[...rename.values(),...extra.map(a=>a.original.id)];
const reusedNew=newIds.filter(id=>commits.filter(c=>c!==NEW&&tryGit('merge-base','--is-ancestor',c,OLD)!==null).some(c=>{const it=show(c,files.item),rc=show(c,files.rec);return it?.rows.some(r=>r.id===id)||[...(rc?.rows??[]),...(rc?.aliases??[])].some(e=>e.original.id===id);}));
check('no new ID ever existed in an earlier version of the item',reusedNew.length===0,reusedNew.join(', '));
facts.published_id_meanings_checked=ids;facts.code_points_checked=points;facts.item_versions_scanned=commits.length;
console.log(JSON.stringify({old:OLD,new:NEW,item:ITEM,author:AUTHOR,...facts,failed_checks:fail},null,1));
process.exitCode=fail?1:0;
