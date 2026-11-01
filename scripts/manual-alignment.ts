/** Build a reviewed-group import from exact, unique text excerpts supplied by a person.
 * This never asserts that excerpts are translations; the reviewer makes that judgment.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { AlignmentFileSchema, Key } from '../src/schema.js';
import { codePoints, sha256 } from '../src/text-ids.js';

const args=process.argv.slice(2);
const usage='Usage: npm run alignment:manual -- <draft.json> --confirm-reviewed [--output <file>]';
if(!args[0]||!args.includes('--confirm-reviewed'))throw new Error(`${usage}\nOnly use --confirm-reviewed after personally checking the text and relationship against your evidence.`);
const outputIndex=args.indexOf('--output');
if(outputIndex>=0&&!args[outputIndex+1])throw new Error(usage);
const Quote=z.object({row:Key,quote:z.string().min(1)}).strict();
const EnglishQuote=z.object({document:Key,paragraph:Key,quote:z.string().min(1)}).strict();
const draft=z.object({
 item:Key,id:Key,reviewer:z.string().trim().min(1),date:z.string(),review_note:z.string().optional(),
 evidence:z.object({source_url:z.string().url().optional(),source_record:z.string().optional(),source_row:z.number().int().optional(),note:z.string().optional()}).strict(),
 ar:z.array(Quote),fa:z.array(Quote),en:z.array(EnglishQuote)
}).strict().parse(JSON.parse(fs.readFileSync(path.resolve(args[0]),'utf8')));
if(!draft.evidence.source_url&&!draft.evidence.note?.trim())throw new Error('Provide an evidence URL or a note identifying the edition/evidence used.');
const c=loadCorpus();const initial=validateCorpus(c);if(initial.errors.length)throw new Error(initial.errors.join('\n'));
const item=c.items.get(draft.item);if(!item)throw new Error(`Unknown item ${draft.item}`);
function bounds(value:string,quote:string,label:string){
 const index=value.indexOf(quote);if(index<0)throw new Error(`Exact quote not found in ${label}; use the original text with its exact spacing and diacritics.`);
 if(value.indexOf(quote,index+1)>=0)throw new Error(`Exact quote is ambiguous in ${label}; choose a longer unique excerpt.`);
 const start=codePoints(value.slice(0,index)).length,end=start+codePoints(quote).length;
 return {start,end,sha256:sha256(quote)};
}
const side=(language:'ar'|'fa',entries:z.infer<typeof Quote>[])=>entries.map(x=>{
 const row=item!.rows.find(r=>r.id===x.row);if(!row||!row[language])throw new Error(`Missing ${language} row ${draft.item}/${x.row}`);
 return {row:x.row,...bounds(text(c,row[language]),x.quote,`${draft.item}/${x.row}/${language}`)};
});
const english=draft.en.map(x=>{
 const doc=c.english.get(x.document),para=doc?.paragraphs.find(p=>p.id===x.paragraph);if(!para)throw new Error(`Missing paragraph ${x.document}/${x.paragraph}`);
 return {document:x.document,paragraph:x.paragraph,...bounds(text(c,para.text),x.quote,`${x.document}/${x.paragraph}`)};
});
const group=AlignmentFileSchema.parse({item:draft.item,groups:[{
 id:draft.id,method:'manual',review:{reviewer:draft.reviewer,date:draft.date,...(draft.review_note?{note:draft.review_note}:{})},
 evidence:draft.evidence,ar:side('ar',draft.ar),fa:side('fa',draft.fa),en:english
}]}).groups[0]!;
const existing=c.alignments.get(draft.item)?.groups??[];
if(existing.some(x=>x.id===group.id))throw new Error(`Group ${group.id} already exists; choose a new ID or compare the existing group.`);
c.alignments.set(draft.item,{item:draft.item,groups:[...existing,group]});
const result=validateCorpus(c);if(result.errors.length)throw new Error('Invalid alignment:\n'+result.errors.join('\n'));
const target=path.resolve(outputIndex>=0?args[outputIndex+1]!:path.join('generated','review',`${draft.item}.${draft.id}.manual.json`));
if(target.startsWith(path.resolve(c.root)+path.sep))throw new Error('Output must be outside canonical data; use alignment:import to merge reviewed groups.');
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({item:draft.item,groups:[group]},null,2)+'\n');
console.log(`Wrote ${target}. Nothing was added to the canonical data.`);
console.log('Import only if you reviewed every selected excerpt: npm run alignment:import -- '+target);
