import fs from 'node:fs';import path from 'node:path';
import {loadCorpus,validateCorpus} from '../src/corpus.js';import {commit,pretty} from '../src/editor.js';
import {EditableEnglishSchema,readableEnglish,internEnglish} from '../src/editable.js';import {Key} from '../src/schema.js';
const raw=process.argv.slice(2),invalidate=raw.includes('--invalidate-reviewed'),allowDeletion=raw.includes('--allow-paragraph-deletion');
const args=raw.filter(x=>!['--invalidate-reviewed','--allow-paragraph-deletion'].includes(x));
const usage='Usage: npm run edit:english -- export <document> [output-file] OR apply <editable-json> [--invalidate-reviewed] [--allow-paragraph-deletion]';
const c=loadCorpus();const first=validateCorpus(c);if(first.errors.length)throw new Error(first.errors.join('\n'));
if(args[0]==='export'){
 const id=args[1];if(!id)throw new Error(usage);Key.parse(id);const data=readableEnglish(c,id),target=path.resolve(args[2]??path.join('generated','edit',id+'.english.json'));
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,pretty(data));console.log('Exported editable copy:',target);process.exit(0);
}
if(args[0]!=='apply'||!args[1])throw new Error(usage);
const d=EditableEnglishSchema.parse(JSON.parse(fs.readFileSync(path.resolve(args[1]),'utf8')));const old=c.english.get(d.id);if(!old)throw new Error('Unknown document '+d.id);
const oldReadable=readableEnglish(c,d.id);
if(oldReadable.display_title&&d.display_title&&(oldReadable.display_title.en!==d.display_title.en||oldReadable.display_title.ar!==d.display_title.ar)&&d.display_title.evidence===oldReadable.display_title.evidence){
 delete d.display_title.evidence;console.warn('Changed display title: cleared its previous evidence reference; attach fresh evidence if appropriate.');
}
const oldOrder=old.paragraphs.map(p=>p.id),nextOrder=d.paragraphs.map(p=>p.id),nextSet=new Set(nextOrder);
if(nextSet.size!==nextOrder.length)throw new Error('Duplicate paragraph IDs.');const removed=oldOrder.filter(id=>!nextSet.has(id));if(removed.length&&!allowDeletion)throw new Error(`Removing paragraph IDs requires --allow-paragraph-deletion: ${removed.join(', ')}`);
const orderChanged=JSON.stringify(oldOrder)!==JSON.stringify(nextOrder);const oldTexts=new Map(oldReadable.paragraphs.map(p=>[p.id,p.text]));
const changed=new Set(removed);for(const p of d.paragraphs)if(oldTexts.has(p.id)&&oldTexts.get(p.id)!==p.text)changed.add(p.id);
const materialChanged=JSON.stringify({...oldReadable,review:undefined})!==JSON.stringify({...d,review:undefined});
if(materialChanged&&old.review&&!invalidate)throw new Error('This document is reviewed. Pass --invalidate-reviewed after saving a backup.');
const prevRefs:(string|null|undefined)[]=[old.source_metadata.title,old.source_metadata.title_ar,old.source_metadata.section,old.source_metadata.chapter,old.display_title?.en,old.display_title?.ar,...old.paragraphs.map(p=>p.text)];
const next=internEnglish(c,d);if(invalidate&&materialChanged)delete next.review;
const changes=new Map<string,string|null>();let invalidated=0;
for(const [itemId,af] of c.alignments){const kept=af.groups.filter(g=>!g.en.some(s=>s.document===d.id&&(orderChanged||changed.has(s.paragraph))));
 const count=af.groups.length-kept.length;if(count){invalidated+=count;if(invalidate){af.groups=kept;changes.set(path.join(c.root,'alignments',itemId+'.json'),pretty(af));}}}
if(invalidated&&!invalidate)throw new Error(`This edit affects ${invalidated} reviewed alignment groups. Pass --invalidate-reviewed after saving a backup.`);
c.english.set(d.id,next);const r=validateCorpus(c);if(r.errors.length)throw new Error(`Refusing invalid edit:\n${r.errors.join('\n')}`);
const nextRefs:(string|null|undefined)[]=[next.source_metadata.title,next.source_metadata.title_ar,next.source_metadata.section,next.source_metadata.chapter,next.display_title?.en,next.display_title?.ar,...next.paragraphs.map(p=>p.text)];
changes.set(path.join(c.root,'english',d.id+'.json'),pretty(next));commit(c,changes,prevRefs.filter(x=>x&&!nextRefs.includes(x)),nextRefs.filter(x=>x&&!prevRefs.includes(x)));
console.log(`Applied ${d.id}; exact text interned with copy-on-write. ${changed.size} existing paragraph(s) changed, ${removed.length} removed.`);
if(invalidated)console.warn(`Removed ${invalidated} invalidated reviewed alignment group(s).`);
