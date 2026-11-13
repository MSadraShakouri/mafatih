import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  AlignmentFileSchema, ClaimId, CorpusMetaSchema, EditorialHistorySchema, EnglishDocumentSchema, ItemSchema,
  Key, NavigationSchema, RelationsSchema, RowSplitRecordSchema, SourcesSchema, TextId, sourcePageIssues,
  type AlignmentFile, type EnglishDocument, type Item, type NavNode, type Relations, type RowSplitRecord, type Sources
} from './schema.js';
import { claimId, codePoints, sha256, slicePoints, textId } from './text-ids.js';
import { validatePunctuationHistory } from './punctuation-history.js';
import { validateLineBreakMarkerHistory } from './line-break-history.js';
import { validateSourcePageHistory } from './source-page-history.js';
import { hasHistoricalRow, validateRowSplitRecords } from './row-splits.js';

type Metadata=z.infer<typeof CorpusMetaSchema>;
type Navigation=z.infer<typeof NavigationSchema>;
export interface Corpus {
  root:string; meta:Metadata; items:Map<string,Item>; english:Map<string,EnglishDocument>;
  texts:Map<string,string>; textShards:Map<string,string>; claims:Record<string,string>;
  nav:Navigation; relations:Relations; sources:Sources; editorial:z.infer<typeof EditorialHistorySchema>; alignments:Map<string,AlignmentFile>;
  rowSplits:Map<string,RowSplitRecord>;
}
function assembleCorpus(root:string, contents:(name:string)=>string, list:(dir:string)=>string[]):Corpus {
  const read=<T>(name:string,schema:z.ZodType<T>):T => {
    const parsed=schema.safeParse(JSON.parse(contents(name)) as unknown);
    if(!parsed.success) throw new Error(`${name}: ${parsed.error.message}`);
    return parsed.data;
  };
  const items=new Map<string,Item>(); const english=new Map<string,EnglishDocument>();
  const texts=new Map<string,string>(); const textShards=new Map<string,string>();
  for(const f of list('texts')){
    const shard=f.slice(0,-5);
    if(!/^[0-9a-f]{2}$/.test(shard)) throw new Error(`bad text shard ${f}`);
    const values=read(`texts/${f}`,z.record(TextId,z.string()));
    for(const [id,value] of Object.entries(values)){
      if(texts.has(id)) throw new Error(`duplicate text id ${id}`);
      texts.set(id,value); textShards.set(id,shard);
    }
  }
  for(const f of list('items')){ const id=f.slice(0,-5); Key.parse(id); items.set(id,read(`items/${f}`,ItemSchema)); }
  for(const f of list('english')){ const id=f.slice(0,-5); Key.parse(id); english.set(id,read(`english/${f}`,EnglishDocumentSchema)); }
  const alignments=new Map<string,AlignmentFile>(), rowSplits=new Map<string,RowSplitRecord>();
  for(const f of list('alignments')){ const id=f.slice(0,-5); Key.parse(id); alignments.set(id,read(`alignments/${f}`,AlignmentFileSchema)); }
  for(const f of list('row-splits')){ const id=f.slice(0,-5); Key.parse(id); rowSplits.set(id,read(`row-splits/${f}`,RowSplitRecordSchema)); }
  return {root,items,english,texts,textShards,alignments,rowSplits,
    meta:read('corpus.json',CorpusMetaSchema), claims:read('claims.json',z.record(ClaimId,TextId)),
    nav:read('navigation.json',NavigationSchema), relations:read('relations.json',RelationsSchema),
    sources:read('sources.json',SourcesSchema), editorial:read('editorial-history.json',EditorialHistorySchema)
  };
}

export function loadCorpus(root=process.env.MAFATIH_DATA_ROOT ?? path.resolve('data')):Corpus {
  root=path.resolve(root);
  return assembleCorpus(root, name => fs.readFileSync(path.join(root,name),'utf8'), dir => {
    const directory=path.join(root,dir);
    return fs.existsSync(directory)?fs.readdirSync(directory).filter(f=>f.endsWith('.json')).sort():[];
  });
}

/** Load a Git snapshot already held in memory, without a second checkout or copied data directory. */
export function loadCorpusFromEntries(entries:Map<string,string>):Corpus {
  return assembleCorpus('<git-snapshot>', name => {
    const data=entries.get(name); if(data===undefined)throw new Error(`snapshot missing data/${name}`); return data;
  }, dir => [...entries.keys()].filter(name=>name.startsWith(`${dir}/`) && !name.slice(dir.length+1).includes('/') && name.endsWith('.json'))
    .map(name=>name.slice(dir.length+1)).sort());
}
export function text(c:Corpus,id:string|null|undefined):string {
  if(id==null) return '';
  const v=c.texts.get(id); if(v===undefined) throw new Error(`missing text ${id}`);
  return v;
}
export function claim(c:Corpus,id:string|null|undefined):string {
  if(id==null) return '';
  const t=c.claims[id]; if(t===undefined) throw new Error(`missing claim ${id}`); return text(c,t);
}
export function itemTitle(c:Corpus,id:string):{fa:string;ar:string;en:string} {
  const it=c.items.get(id);if(!it) throw new Error(`missing item ${id}`);
  return {fa:text(c,it.title.fa),ar:text(c,it.title.ar),en:text(c,it.title.en)};
}
export function documentTitle(c:Corpus,id:string):string {
  const d=c.english.get(id);if(!d) throw new Error(`missing document ${id}`);return text(c,d.display_title?d.display_title.en:d.source_metadata.title);
}
export function linksForItem(c:Corpus,id:string){return c.relations.english_links.filter(x=>x.item===id);}
/** Resolve a retired paragraph occurrence without treating its old item link as valid. */
export function resolveEnglishParagraph(c:Corpus,document:string,paragraph:string):
  {document:string;paragraph:string;redirected:boolean;originalTextId?:string}|undefined {
  if(c.english.get(document)?.paragraphs.some(p=>p.id===paragraph))return {document,paragraph,redirected:false};
  const retired=(c.editorial.paragraph_removals??[]).filter(e=>e.document===document&&e.paragraph===paragraph);
  if(retired.length>1)throw new Error(`Ambiguous retired paragraph ${document}/${paragraph}`);
  const e=retired[0];if(!e)return undefined;
  if(!c.english.get(e.preserved_document)?.paragraphs.some(p=>p.id===e.preserved_paragraph))
    throw new Error(`Missing retired-paragraph destination ${e.preserved_document}/${e.preserved_paragraph}`);
  return {document:e.preserved_document,paragraph:e.preserved_paragraph,redirected:true,originalTextId:e.text};
}
export function walkNavigation(nodes:NavNode[],fn:(node:NavNode)=>void):void { for(const n of nodes){fn(n);walkNavigation(n.children,fn);} }

export interface ValidationResult { errors:string[]; warnings:string[]; stats:Record<string,number>; }
export function validateCorpus(c:Corpus):ValidationResult {
  const errors:string[]=[]; const warnings:string[]=[];
  const fail=(s:string)=>errors.push(s);
  for(const [id,value] of c.texts){
    if(textId(value)!==id) fail(`text ${id}: content hash mismatch (use npm run edit:text)`);
    if(c.textShards.get(id)!==id.slice(1,3)) fail(`text ${id}: wrong shard`);
  }
  for(const [id,tid] of Object.entries(c.claims)){
    const value=c.texts.get(tid);
    if(value===undefined) fail(`claim ${id}: missing text ${tid}`);
    else if(claimId(value)!==id) fail(`claim ${id}: content hash mismatch`);
  }
  // Find every text and claim reference in the authored JSON (never scan the pool itself).
  const referencedTexts=new Set<string>(); const referencedClaims=new Set<string>();
  function scan(x:unknown):void {
    if(typeof x==='string'){
      if(/^t[0-9a-f]{24}$/.test(x)) referencedTexts.add(x);
      if(/^c[0-9a-f]{24}$/.test(x)) referencedClaims.add(x);
    } else if(Array.isArray(x)) for(const v of x) scan(v);
    else if(x && typeof x==='object') for(const v of Object.values(x)) scan(v);
  }
  scan(c.claims);scan(c.nav);scan(c.relations);scan(c.sources);scan(c.editorial);
  for(const v of c.items.values())scan(v);for(const v of c.english.values())scan(v);for(const v of c.alignments.values())scan(v);for(const v of c.rowSplits.values())scan(v);
  for(const id of referencedTexts) if(!c.texts.has(id)) fail(`missing referenced text ${id}`);
  for(const id of referencedClaims) if(!(id in c.claims)) fail(`missing referenced claim ${id}`);
  let unusedTexts=0;for(const id of c.texts.keys())if(!referencedTexts.has(id))unusedTexts++;
  if(unusedTexts) warnings.push(`${unusedTexts} unreferenced pooled text value(s); remove or attach them before committing.`);
  const usedLegacy=new Set<string>();let rowCount=0,arOnly=0,faOnly=0,manual=0;
  const sourceExists=(id:string,where:string)=>{if(!(id in c.sources.sources))fail(`${where}: missing source ${id}`);};
  for(const [id,it] of c.items){
    if(it.legacy_id){if(usedLegacy.has(it.legacy_id)) fail(`${id}: duplicate legacy_id`);usedLegacy.add(it.legacy_id);}
    const rowIds=new Set<string>();
    if(it.legacy_alignment==='manual-v1')manual++;
    if(it.quran&&it.category!=='quran')fail(`${id}: whole-chapter identity requires the quran category`);
    for(const [l,ss] of Object.entries(it.sources??{})) for(const s of ss??[])sourceExists(s,`${id} ${l}`);
    for(const r of it.rows){
      rowCount++;if(rowIds.has(r.id))fail(`${id}: duplicate row ${r.id}`);rowIds.add(r.id);
      if(r.ar===null)faOnly++; if(r.fa===null)arOnly++;
      for(const [l,ss] of Object.entries(r.sources??{}))for(const s of ss??[])sourceExists(s,`${id} ${r.id} ${l}`);
    }
  }
  let paragraphs=0;
  for(const [id,doc] of c.english){
    const seen=new Set<string>();for(const s of doc.sources??[])sourceExists(s,`document ${id}`);
    if(doc.display_title?.evidence&&!(doc.display_title.evidence in c.editorial.evidence))fail(`${id}: display-title evidence is missing`);
    for(const p of doc.paragraphs){
      paragraphs++;if(seen.has(p.id))fail(`${id}: duplicate paragraph ${p.id}`);seen.add(p.id);
      if(c.texts.get(p.text)==='')fail(`${id} ${p.id}: empty paragraph`);
      for(const s of p.sources??[])sourceExists(s,`${id} ${p.id}`);
    }
  }
  if(c.editorial.quran_number_evidence&&!(c.editorial.quran_number_evidence in c.editorial.evidence))fail('Quran chapter evidence is missing');
  for(const edit of c.editorial.metadata_corrections){
    if(!c.items.has(edit.item))fail(`editorial history: missing item ${edit.item}`);
    if(!c.english.has(edit.source_document))fail(`editorial history: missing document ${edit.source_document}`);
    if(!(edit.evidence in c.editorial.evidence))fail(`editorial history: missing evidence ${edit.evidence}`);
  }
  for(const error of validateRowSplitRecords(c))fail(error);
  for(const error of validatePunctuationHistory(c))fail(error);
  for(const error of validateLineBreakMarkerHistory(c))fail(error);
  for(const error of validateSourcePageHistory(c))fail(error);
  const historyEvidence=(id:string)=>{if(!(id in c.editorial.evidence))fail(`editorial history: missing evidence ${id}`);};
  const historyRow=(item:string,row:string)=>{
    const it=c.items.get(item);if(!it)fail(`editorial history: missing item ${item}`);
    else if(!hasHistoricalRow(c,item,row))fail(`editorial history: missing row ${item}/${row}`);
  };
  for(const e of c.editorial.row_corrections??[]){historyRow(e.item,e.row);historyEvidence(e.evidence);}
  for(const e of c.editorial.row_insertions??[]){historyRow(e.item,e.row);historyRow(e.item,e.before);historyEvidence(e.evidence);}
  for(const e of c.editorial.row_classifications??[]){historyRow(e.item,e.row);historyEvidence(e.evidence);}
  const retiredParagraphs=new Set<string>();
  for(const e of c.editorial.paragraph_removals??[]){
    const original=c.english.get(e.document);
    if(!original)fail(`editorial history: missing document ${e.document}`);
    else if(original.paragraphs.some(p=>p.id===e.paragraph))fail(`editorial history: retired paragraph ID reused ${e.document}/${e.paragraph}`);
    const key=e.document+'\0'+e.paragraph;
    if(retiredParagraphs.has(key))fail(`editorial history: duplicate retired paragraph ${e.document}/${e.paragraph}`);retiredParagraphs.add(key);
    const other=c.english.get(e.preserved_document);
    if(!other?.paragraphs.some(p=>p.id===e.preserved_paragraph))fail(`editorial history: missing preserved paragraph ${e.preserved_document}/${e.preserved_paragraph}`);
    historyEvidence(e.evidence);
  }
  for(const e of c.editorial.created_documents??[]){
    if(!c.english.has(e.document)||!c.english.has(e.based_on_document))fail(`editorial history: missing document in creation ${e.document}`);
    historyEvidence(e.evidence);
  }
  for(const e of c.editorial.proposed_links??[]){
    if(!c.items.has(e.item)||!c.english.has(e.document))fail(`editorial history: missing proposed-link item or document`);
    historyEvidence(e.evidence);
  }
  for(const e of c.editorial.retracted_links??[]){
    if(!c.items.has(e.item))fail(`editorial history: missing item ${e.item}`);
    if(!c.english.has(e.document))fail(`editorial history: missing document ${e.document}`);
    historyEvidence(e.evidence);
  }
  const pairSet=new Set<string>(); const primary=new Map<string,number>();
  for(const l of c.relations.english_links){
    if(!c.items.has(l.item))fail(`link: missing item ${l.item}`);
    if(!c.english.has(l.document))fail(`link: missing document ${l.document}`);
    if(l.kind==='proposed-quran'){const n=/^surah-(\d+)$/.exec(l.document);if(!n||Number(n[1])!==c.items.get(l.item)?.quran?.chapter)fail(`proposed Quran link has inconsistent chapter: ${l.item} / ${l.document}`);}
    const k=l.item+'\0'+l.document;if(pairSet.has(k))fail(`duplicate link ${l.item} / ${l.document}`);pairSet.add(k);
    if(l.kind==='legacy-primary'||l.kind==='legacy-primary-only')primary.set(l.item,(primary.get(l.item)??0)+1);
  }
  for(const [id,n] of primary)if(n>1)fail(`${id}: multiple original primary English documents`);
  const order=new Set<string>();for(const id of c.nav.default_order){if(!c.items.has(id))fail(`order: missing ${id}`);if(order.has(id))fail(`order: duplicate ${id}`);order.add(id);}
  for(const id of c.items.keys())if(!order.has(id))fail(`order: missing item ${id}`);
  const featured=new Set<string>();for(const id of c.nav.featured){if(!c.items.has(id))fail(`featured: missing ${id}`);if(featured.has(id))fail(`featured: duplicate ${id}`);featured.add(id);}
  let tocNodes=0; const tocItems=new Set<string>();
  walkNavigation(c.nav.toc,n=>{tocNodes++;if(n.item){if(!c.items.has(n.item))fail(`TOC: missing ${n.item}`);tocItems.add(n.item);}
    for(const issue of sourcePageIssues(n))fail(`TOC ${n.item??n.title}: ${issue}`);
  });
  const notInToc=[...c.items.keys()].filter(id=>!tocItems.has(id));
  if(notInToc.length)warnings.push(`${notInToc.length} item(s) not present in the TOC.`);
  let reviewedGroups=0;
  for(const [id,file] of c.alignments){
    if(id!==file.item)fail(`alignment ${id}: file/item mismatch`);
    const item=c.items.get(id);if(!item){fail(`alignment ${id}: item missing`);continue;}
    const rows=new Map(item.rows.map(r=>[r.id,r]));const ids=new Set<string>();
    for(const group of file.groups){
      reviewedGroups++;if(ids.has(group.id))fail(`${id}: duplicate alignment ${group.id}`);ids.add(group.id);
      for(const lang of ['ar','fa'] as const){
        for(const s of group[lang]){
          const row=rows.get(s.row);if(!row){fail(`${id}/${group.id}: missing row ${s.row}`);continue;}
          const value=text(c,row[lang]);if(s.start>=s.end||s.end>codePoints(value).length){fail(`${id}/${group.id}: invalid ${lang} span ${s.row}`);continue;}
          if(sha256(slicePoints(value,s.start,s.end))!==s.sha256)fail(`${id}/${group.id}: stale ${lang} span ${s.row}`);
        }
      }
      for(const s of group.en){
        const doc=c.english.get(s.document);const para=doc?.paragraphs.find(p=>p.id===s.paragraph);
        if(!para){fail(`${id}/${group.id}: missing English ${s.document}/${s.paragraph}`);continue;}
        if(!pairSet.has(id+'\0'+s.document))fail(`${id}/${group.id}: English document is not related to item`);
        const value=text(c,para.text);if(s.start>=s.end||s.end>codePoints(value).length){fail(`${id}/${group.id}: invalid EN span`);continue;}
        if(sha256(slicePoints(value,s.start,s.end))!==s.sha256)fail(`${id}/${group.id}: stale EN span`);
      }
    }
  }
  warnings.push('Structural validation does NOT verify transcription, translation, source permissions, or the accuracy of imported links.');
  return {errors,warnings,stats:{items:c.items.size,rows:rowCount,englishDocuments:c.english.size,paragraphs,texts:c.texts.size,
    importedManualItems:manual,faOnlyRows:faOnly,arOnlyRows:arOnly,links:c.relations.english_links.length,tocNodes,reviewedGroups}};
}
