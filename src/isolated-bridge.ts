import type { Corpus } from './corpus.js';
import { fieldLineage, type LineageRun } from './row-alias-migration.js';
import type { Item, Row, RowSplitAlias, RowSplitRecord } from './schema.js';
import { codePoints } from './text-ids.js';

type Language='ar'|'fa';
type Segment=RowSplitAlias['ar'][number];
type Mapping={original:Pick<Row,'id'|'ar'|'fa'|'sources'>;ar:Segment[];fa:Segment[]};
const languages=['ar','fa'] as const;
function sameFields(a:Mapping['original'],b:Mapping['original']):boolean {
  return a.id===b.id&&a.ar===b.ar&&a.fa===b.fa&&
    languages.every(l=>JSON.stringify(a.sources?.[l]??[])===JSON.stringify(b.sources?.[l]??[]));
}
function direct(row:Row,corpus:Corpus):Mapping {
  const parts=(l:Language):Segment[]=>{
    const id=row[l];if(id===null)return [];
    const value=corpus.texts.get(id);if(value===undefined)throw new Error(`${row.id}/${l}: missing text`);
    return [{row:row.id,language:l,start:0,end:codePoints(value).length,target_start:0}];
  };
  return {original:row,ar:parts('ar'),fa:parts('fa')};
}
/** Compare both physical text and source-occurrence lineage, including
 * insertion identities, of every previously published live row and mapping.
 * This is not an approval or rebinding of provisional version-link entries. */
export function verifyIsolatedBridgeMappings(base:Corpus,old:Corpus,next:Corpus,author:string):{items:number;live:number;mappings:number;fields:number} {
  let items=0,live=0,mappings=0,fields=0;
  for(const [itemId,priorRecord] of old.rowSplits){
    if(priorRecord.author!==author)continue;
    const priorItem=old.items.get(itemId),targetItem=next.items.get(itemId),targetRecord=next.rowSplits.get(itemId);
    if(!priorItem||!targetItem||!targetRecord||targetRecord.author!==author)throw new Error(`${itemId}: published author item or record disappeared`);
    items++;
    const targets=new Map<string,Mapping>();
    for(const e of [...targetRecord.rows,...(targetRecord.aliases??[])])targets.set(e.original.id,e);
    for(const r of targetItem.rows)if(!targets.has(r.id))targets.set(r.id,direct(r,next));
    const cache=new Map<string,LineageRun[]>();
    const runs=(c:Corpus,item:Item,record:RowSplitRecord,row:string,lang:Language):LineageRun[]=>{
      const key=`${c===old?'o':'n'}\0${row}\0${lang}`;let result=cache.get(key);
      if(!result){result=fieldLineage(base,c,itemId,item,record,row,lang);cache.set(key,result);}return result;
    };
    const check=(prior:Mapping):void=>{
      const target=targets.get(prior.original.id),label=`${itemId}/${prior.original.id}`;
      if(!target||!sameFields(prior.original,target.original))throw new Error(`${label}: old identity is missing or reused`);
      for(const lang of languages){
        if(prior.original[lang]===null){if(target[lang].length)throw new Error(`${label}/${lang}: unexpected target field`);continue;}
        const v=old.texts.get(prior.original[lang]!);if(v===undefined||next.texts.get(prior.original[lang]!)!==v)throw new Error(`${label}/${lang}: original pooled field missing or changed`);
        const length=codePoints(v).length;let at=0;fields++;
        while(at<length){
          const a=prior[lang].find(s=>s.start<=at&&at<s.end),b=target[lang].find(s=>s.start<=at&&at<s.end);
          if(!a||!b||(a.target_start===undefined&&priorRecord.format_version!==1)||(b.target_start===undefined&&targetRecord.format_version!==1))throw new Error(`${label}/${lang}: incomplete old or new mapping`);
          const ao=(a.target_start??0)+at-a.start,bo=(b.target_start??0)+at-b.start;
          const ar=runs(old,priorItem,priorRecord,a.row,a.language).find(r=>r.start<=ao&&ao<r.end);
          const br=runs(next,targetItem,targetRecord,b.row,b.language).find(r=>r.start<=bo&&bo<r.end);
          if(!ar||!br||ar.origin!==br.origin||ar.originStart+ao-ar.start!==br.originStart+bo-br.start)
            throw new Error(`${label}/${lang}: historical source or insertion lineage differs`);
          const step=Math.min(a.end-at,b.end-at,ar.end-ao,br.end-bo);if(step<=0)throw new Error(`${label}/${lang}: invalid mapping interval`);at+=step;
        }
      }
    };
    for(const row of priorItem.rows){live++;check(direct(row,old));}
    for(const entry of [...priorRecord.rows,...(priorRecord.aliases??[])]){mappings++;check(entry);}
  }
  return {items,live,mappings,fields};
}

/** Only additive immutable text values and assigned author result files may
 * differ; explicitly named metadata is review evidence, never a migration. */
export function verifyBridgeScope(paths:string[],author:string,assigned:Set<string>,metadata:Set<string>):void {
  for(const p of paths){
    if(metadata.has(p)||/^data\/texts\/[0-9a-f]{2}\.json$/.test(p))continue;
    const data=/^data\/(?:items|row-splits)\/([^/]+)\.json$/.exec(p);
    const work=new RegExp(`^agent-work/${author}/(?:plans|layouts)/([^/]+)\\.json$`).exec(p);
    const id=data?.[1]??work?.[1];
    if(!id||!assigned.has(id))throw new Error(`Unapproved bridge scope: ${p}`);
  }
}
export function verifyBridgePool(prior:Corpus,next:Corpus):number {
  let count=0;
  for(const [id,value] of prior.texts){
    if(next.texts.get(id)!==value)throw new Error(`Prior immutable pooled value missing or changed: ${id}`);count++;
  }
  return count;
}
