import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { commit, intern, pretty } from '../src/editor.js';
import { Key } from '../src/schema.js';
import { EditableItemSchema, readableItem, internItem } from '../src/editable.js';

const usage=`Usage:
  npm run edit:item -- export <slug> [output-file]
  npm run edit:item -- apply <editable-json> [--invalidate-reviewed] [--allow-row-deletion]
Export is a readable, untracked working copy. Apply interns exact strings and changes only this item.
Keep existing row IDs stable. An export is NOT canonical data and should not be committed.`;
const raw=process.argv.slice(2),invalidate=raw.includes('--invalidate-reviewed'),allowDeletion=raw.includes('--allow-row-deletion');
const args=raw.filter(x=>!['--invalidate-reviewed','--allow-row-deletion'].includes(x));
const c=loadCorpus();const initial=validateCorpus(c);if(initial.errors.length)throw new Error(`Fix existing errors first:\n${initial.errors.join('\n')}`);
const deref=(id:string|null|undefined)=>id==null?null:text(c,id);
if(args[0]==='export'){
  const id=args[1];if(!id)throw new Error(usage);Key.parse(id);const it=c.items.get(id);if(!it)throw new Error('Unknown item '+id);
  const out=readableItem(c,id);
  const target=path.resolve(args[2]??path.join('generated','edit',id+'.json'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,pretty(out),'utf8');console.log(`Exported editable copy: ${target}`);process.exit(0);
}
if(args[0]!=='apply'||!args[1])throw new Error(usage);
const data=EditableItemSchema.parse(JSON.parse(fs.readFileSync(path.resolve(args[1]),'utf8')));
const old=c.items.get(data.id);if(!old)throw new Error('Unknown item '+data.id+'; creating items requires a new canonical record and navigation entry.');
if(data.legacy_id!==old.legacy_id)throw new Error('Changing legacy_id is not supported by this editor; preserve the stable external ID.');
const oldOrder=old.rows.map(x=>x.id),newOrder=data.rows.map(x=>x.id);const oldSet=new Set(oldOrder),newSet=new Set(newOrder);
if(newSet.size!==newOrder.length)throw new Error('Duplicate row IDs.');
const removed=oldOrder.filter(x=>!newSet.has(x));if(removed.length&&!allowDeletion)throw new Error(`Removing row IDs requires --allow-row-deletion: ${removed.join(', ')}`);
const orderChanged=JSON.stringify(oldOrder)!==JSON.stringify(newOrder);const oldRows=new Map(old.rows.map(x=>[x.id,x]));
const changedRows=new Set<string>(removed);
for(const row of data.rows){const previous=oldRows.get(row.id);if(previous&&(deref(previous.ar)!==(row.ar||null)||deref(previous.fa)!==(row.fa||null)))changedRows.add(row.id);}
const titlesChanged=(['fa','ar','en'] as const).some(l=>deref(old.title[l])!==data.title[l]);
const contentChanged=changedRows.size>0||orderChanged;
if(((titlesChanged&&old.review?.titles)||(contentChanged&&(old.review?.text||old.review?.ar_fa)))&&!invalidate)
  throw new Error('This edit invalidates item-level review. Pass --invalidate-reviewed after saving a backup.');
const beforeIds:(string|null|undefined)[]=[...Object.values(old.title),...old.tags,old.legacy_missing_english_title,...old.rows.flatMap(r=>[r.ar,r.fa])];
const {id,...rest}=data;
const candidate=internItem(c,data);
if(invalidate&&candidate.review){if(titlesChanged)delete candidate.review.titles;if(contentChanged){delete candidate.review.text;delete candidate.review.ar_fa;}}
const af=c.alignments.get(id);let invalidated=0;
if(af){const kept=af.groups.filter(g=>!orderChanged&&!g.ar.some(s=>changedRows.has(s.row))&&!g.fa.some(s=>changedRows.has(s.row)));
  invalidated=af.groups.length-kept.length;if(invalidated&&!invalidate)throw new Error(`This edit affects ${invalidated} reviewed alignment groups. Pass --invalidate-reviewed after saving a backup.`);
  if(invalidate)af.groups=kept;}
c.items.set(id,candidate);
const checked=validateCorpus(c);if(checked.errors.length)throw new Error(`Refusing invalid edit:\n${checked.errors.join('\n')}`);
const afterIds:(string|null|undefined)[]=[...Object.values(candidate.title),...candidate.tags,candidate.legacy_missing_english_title,...candidate.rows.flatMap(r=>[r.ar,r.fa])];
const oldOnly=beforeIds.filter(x=>x&&!afterIds.includes(x)),newOnly=afterIds.filter(x=>x&&!beforeIds.includes(x));
const changes=new Map<string,string|null>();changes.set(path.join(c.root,'items',id+'.json'),pretty(candidate));
if(af&&invalidated&&invalidate)changes.set(path.join(c.root,'alignments',id+'.json'),pretty(af));
commit(c,changes,oldOnly,newOnly);
console.log(`Applied ${id}; exact text interned with copy-on-write. ${changedRows.size} existing row(s) changed, ${removed.length} removed.`);
if(invalidated)console.warn(`Removed ${invalidated} invalidated reviewed alignment group(s).`);
