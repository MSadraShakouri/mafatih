/** Conservative mechanical gate for the entire generated corpus, not legal or scholarly certification. */
import {loadCorpus,validateCorpus} from '../src/corpus.js';
const c=loadCorpus();const structural=validateCorpus(c);if(structural.errors.length)throw new Error(structural.errors.join('\n'));
const commercial=process.argv.includes('--commercial');const issues=new Map<string,{count:number;examples:string[]}>();
function issue(kind:string,example:string){const v=issues.get(kind)??{count:0,examples:[]};v.count++;if(v.examples.length<5)v.examples.push(example);issues.set(kind,v);}
function checkSources(ids:string[]|undefined,context:string){
 if(!ids?.length){issue('Missing text-specific source',context);return;}
 for(const id of ids){const s=c.sources.sources[id];if(!s){issue('Unknown source',`${context}: ${id}`);continue;}
  const l=s.license;if(!['permitted','restricted'].includes(l.status))issue('Source permission not reviewed',`${context}: ${id}`);
  const allowed=l.allowed_uses??[];const uses:Array<'website'|'android'|'commercial'>=['website','android'];if(commercial)uses.push('commercial');
  for(const use of uses)if(!allowed.includes(use))issue('Use not explicitly permitted',`${context}: ${id} (${use})`);
  if(!l.url&&!l.evidence)issue('No license/permission evidence',`${context}: ${id}`);
  if(!s.attribution)issue('No attribution text recorded',`${context}: ${id}`);
 }
}
for(const [id,item] of c.items){
 if(!item.review?.titles)issue('Item titles not reviewed',id);
 if(!item.review?.text)issue('Item text not reviewed',id);
 if(item.rows.some(r=>r.ar&&r.fa)&&!item.review?.ar_fa)issue('Arabic/Persian alignment not reviewed',id);
 for(const row of item.rows)for(const lang of ['ar','fa'] as const)if(row[lang])checkSources(row.sources?.[lang]??item.sources?.[lang],`${id}/${row.id}/${lang}`);
}
for(const [id,doc] of c.english){
 if(!doc.paragraphs.length)issue('Empty English document in generated output',id);
 if(!doc.review)issue('English document not reviewed',id);
 if(doc.coverage==='unknown')issue('English coverage unknown',id);
 for(const para of doc.paragraphs)checkSources(para.sources??doc.sources,`${id}/${para.id}/en`);
}
for(const link of c.relations.english_links){
 if(!link.review)issue('Item/English relationship not reviewed',`${link.item} / ${link.document}`);
 const item=c.items.get(link.item)!;const doc=c.english.get(link.document)!;
 if(item.rows.some(r=>r.ar&&r.fa)&&['body','mixed','partial'].includes(doc.coverage)){
  const groups=c.alignments.get(link.item)?.groups??[];
  if(!groups.some(g=>g.en.some(s=>s.document===link.document)))issue('No reviewed body alignment for linked document',`${link.item} / ${link.document}`);
 }
}
if(issues.size){
 console.error(`PUBLICATION CHECK FAILED for the entire corpus${commercial?' (commercial use included)':''}.`);
 for(const [name,v] of issues)console.error(`- ${name}: ${v.count} (e.g. ${v.examples.join('; ')})`);
 console.error('Do not ship generated/web-data as a public website or APK until these and the substantive reviews are resolved.');process.exitCode=1;
}else console.log('Mechanical publication checklist passed. This does NOT prove translation accuracy, complete alignment coverage, or legal permission.');
