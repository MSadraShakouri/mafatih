import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, validateCorpus } from '../src/corpus.js';
import { commit, intern, pretty } from '../src/editor.js';
import { Key } from '../src/schema.js';

const argv=process.argv.slice(2);const invalidate=argv.includes('--invalidate-reviewed');const args=argv.filter(x=>x!=='--invalidate-reviewed');
const usage=`Usage (text file is read exactly; an editor's final newline is not removed):
  npm run edit:text -- item-row <item> <row> <ar|fa> <text-file> [--invalidate-reviewed]
  npm run edit:text -- item-title <item> <fa|ar|en> <text-file> [--invalidate-reviewed]
  npm run edit:text -- english-paragraph <document> <paragraph> <text-file> [--invalidate-reviewed]
  npm run edit:text -- english-title <document> <title|title_ar|section|chapter> <text-file>
  npm run edit:text -- intern <text-file>  (for adding a source/claim; attach the ID afterwards)
An empty row/title file clears that field. Empty English paragraphs are rejected.`;
if(!args.length){console.error(usage);process.exit(2);}
const c=loadCorpus();const initial=validateCorpus(c);if(initial.errors.length)throw new Error(`Fix existing errors first:\n${initial.errors.join('\n')}`);
const mode=args[0];let file:string|undefined;
if(mode==='item-row')file=args[4];else if(mode==='item-title')file=args[3];else if(mode==='english-paragraph')file=args[3];else if(mode==='english-title')file=args[3];else if(mode==='intern')file=args[1];
if(!file){console.error(usage);process.exit(2);}
const newValue=fs.readFileSync(path.resolve(file),'utf8');const changes=new Map<string,string|null>();const oldIds:(string|null|undefined)[]=[];const newIds:(string|null|undefined)[]=[];
let changedItem:string|undefined,changedDoc:string|undefined,changedRow:string|undefined,changedLang:'ar'|'fa'|undefined,changedPara:string|undefined;
if(mode==='intern'){
  const id=intern(c,newValue);newIds.push(id);commit(c,changes,[],newIds);console.log(id);console.log('Attach this ID in canonical data; until then validation will warn that it is unreferenced.');process.exit(0);
}else if(mode==='item-row'){
  const [id,rowId,lang]=args.slice(1,4);if(!id||!rowId||!['ar','fa'].includes(lang??''))throw new Error(usage);Key.parse(id);Key.parse(rowId);
  const item=c.items.get(id);const row=item?.rows.find(r=>r.id===rowId);if(!item||!row)throw new Error(`Unknown item/row ${id}/${rowId}`);
  const l=lang as 'ar'|'fa';const old=row[l];const next=newValue?intern(c,newValue):null;
  if(old===next){console.log('No change.');process.exit(0);}row[l]=next;
  if(!row.ar&&!row.fa)throw new Error('Cannot make both sides empty.');oldIds.push(old);newIds.push(next);changedItem=id;changedRow=rowId;changedLang=l;
  if((item.review?.text||item.review?.ar_fa)&&!invalidate)throw new Error('This item has text/alignment review. Pass --invalidate-reviewed to clear affected reviews.');
  if(invalidate&&item.review){delete item.review.text;delete item.review.ar_fa;}
  changes.set(path.join(c.root,'items',id+'.json'),pretty(item));
}else if(mode==='item-title'){
  const [id,lang]=args.slice(1,3);if(!id||!['ar','fa','en'].includes(lang??''))throw new Error(usage);Key.parse(id);
  const item=c.items.get(id);if(!item)throw new Error('Unknown item '+id);const l=lang as 'ar'|'fa'|'en';const old=item.title[l],next=newValue?intern(c,newValue):null;
  if(old===next){console.log('No change.');process.exit(0);}if(item.review?.titles&&!invalidate)throw new Error('Title is reviewed. Pass --invalidate-reviewed to clear that review.');
  item.title[l]=next;if(invalidate&&item.review)delete item.review.titles;oldIds.push(old);newIds.push(next);changes.set(path.join(c.root,'items',id+'.json'),pretty(item));
}else if(mode==='english-paragraph'){
  const [docId,paraId]=args.slice(1,3);if(!docId||!paraId)throw new Error(usage);Key.parse(docId);Key.parse(paraId);
  if(!newValue)throw new Error('An English paragraph cannot be empty.');const doc=c.english.get(docId);const para=doc?.paragraphs.find(p=>p.id===paraId);if(!doc||!para)throw new Error(`Unknown document/paragraph ${docId}/${paraId}`);
  const old=para.text,next=intern(c,newValue);if(old===next){console.log('No change.');process.exit(0);}
  if(doc.review&&!invalidate)throw new Error('Document is reviewed. Pass --invalidate-reviewed to clear its review.');
  para.text=next;if(invalidate)delete doc.review;oldIds.push(old);newIds.push(next);changedDoc=docId;changedPara=paraId;
  changes.set(path.join(c.root,'english',docId+'.json'),pretty(doc));
}else if(mode==='english-title'){
  const [id,field]=args.slice(1,3);if(!id||!['title','title_ar','section','chapter'].includes(field??''))throw new Error(usage);Key.parse(id);
  const doc=c.english.get(id);if(!doc)throw new Error('Unknown English document '+id);const k=field as 'title'|'title_ar'|'section'|'chapter';const old=doc.source_metadata[k],next=intern(c,newValue);
  if(old===next){console.log('No change.');process.exit(0);}if(doc.review&&!invalidate)throw new Error('Document is reviewed. Pass --invalidate-reviewed to clear its review.');
  doc.source_metadata[k]=next;if(invalidate)delete doc.review;oldIds.push(old);newIds.push(next);changes.set(path.join(c.root,'english',id+'.json'),pretty(doc));
}else throw new Error(usage);
const affected:string[]=[];
for(const [itemId,af] of c.alignments){
  const kept=af.groups.filter(g=>!(changedItem===itemId && changedRow && changedLang && g[changedLang].some(x=>x.row===changedRow)) &&
    !(changedDoc&&changedPara&&g.en.some(x=>x.document===changedDoc&&x.paragraph===changedPara)));
  if(kept.length!==af.groups.length){affected.push(`${itemId}: ${af.groups.length-kept.length} group(s)`);if(invalidate){af.groups=kept;changes.set(path.join(c.root,'alignments',itemId+'.json'),pretty(af));}}
}
if(affected.length&&!invalidate)throw new Error(`Edit would invalidate reviewed alignments (${affected.join(', ')}). Pass --invalidate-reviewed after saving a backup.`);
const checked=validateCorpus(c);if(checked.errors.length)throw new Error(`Refusing invalid edit:\n${checked.errors.join('\n')}`);
commit(c,changes,oldIds,newIds);console.log('Saved exact text with copy-on-write; unrelated occurrences were not changed.');
if(affected.length)console.warn('Removed invalidated reviewed groups:',affected.join(', '));
