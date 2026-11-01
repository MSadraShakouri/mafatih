import {z} from 'zod';
import {type Corpus,itemTitle,linksForItem,text} from './corpus.js';
import {Key} from './schema.js';
import {codePoints,sha256,slicePoints} from './text-ids.js';

const Hash=z.string().regex(/^[0-9a-f]{64}$/);
const CutFields={source_sha256:Hash,cuts:z.array(z.number().int().positive()).optional(),cut_after:z.array(z.string().min(1)).optional()};
const RowSource=z.object({language:z.enum(['ar','fa']),row:Key,...CutFields}).strict();
const EnglishSource=z.object({language:z.literal('en'),document:Key,paragraph:Key,...CutFields}).strict();
const RowPart=z.object({row:Key,part:z.number().int().nonnegative()}).strict();
const EnglishPart=z.object({document:Key,paragraph:Key,part:z.number().int().nonnegative()}).strict();
const ProposedGroup=z.object({id:Key,ar:z.array(RowPart),fa:z.array(RowPart),en:z.array(EnglishPart)}).strict()
  .refine(g=>[g.ar,g.fa,g.en].filter(x=>x.length>0).length>=2,'a proposed group needs at least two languages');
export const SplitPlanSchema=z.object({format_version:z.literal(1),item:Key,
  sources:z.array(z.union([RowSource,EnglishSource])).min(1),groups:z.array(ProposedGroup).default([])}).strict();
type Plan=z.infer<typeof SplitPlanSchema>;
type Source=Plan['sources'][number];
type Segment={language:'ar'|'fa'|'en';row?:string;document?:string;paragraph?:string;part:number;start:number;end:number;source_sha256:string;sha256:string;text:string};
const policy='Preserve exact wording. Do not AI-translate Arabic text or use an intermediate devotional translation. All split and alignment suggestions are unreviewed.';

/** Export existing text and hashes so a separate AI service can propose cuts. */
export function exportSplitInput(c:Corpus,itemId:string){
  const item=c.items.get(itemId);if(!item)throw new Error(`Unknown item ${itemId}`);
  const value=(ref:string|null)=>ref===null?null:{text:text(c,ref),source_sha256:sha256(text(c,ref))};
  return {format_version:1,item:itemId,title:itemTitle(c,itemId),policy,
    instructions:[
      'Propose boundaries only; never write or translate source text. A cut is between Unicode code points.',
      'Create a plan with sources and optional groups. For each source, copy its source_sha256 from this export.',
      'Use cuts as increasing zero-based Unicode code-point offsets, OR cut_after as unique exact excerpts ending at each split point. Omit both for an unsplit source.',
      'Groups refer to zero-based part numbers. They are proposals, not reviewed alignments. See docs/ai-splitting.md.'
    ],
    rows:item.rows.filter(r=>r.kind!=='audio-reciter').map(r=>({id:r.id,kind:r.kind??'unknown',ar:value(r.ar),fa:value(r.fa)})),
    excluded_audio_rows:item.rows.filter(r=>r.kind==='audio-reciter').length,
    english_documents:linksForItem(c,itemId).map(l=>({id:l.document,link_kind:l.kind,link_reviewed:Boolean(l.review),
      paragraphs:c.english.get(l.document)!.paragraphs.map(p=>({id:p.id,text:text(c,p.text),source_sha256:sha256(text(c,p.text))}))}))};
}

function key(s:{language:'ar'|'fa'|'en';row?:string;document?:string;paragraph?:string}):string{
  return s.language==='en'?`en\0${s.document}\0${s.paragraph}`:`${s.language}\0${s.row}`;
}
function graphemeBoundaries(value:string):Set<number>{
  // Intl.Segmenter protects Arabic combining marks, emoji and ZWJ sequences.
  const boundaries=new Set([0]);let n=0;
  for(const {segment} of new Intl.Segmenter('und',{granularity:'grapheme'}).segment(value)){
    n+=codePoints(segment).length;boundaries.add(n);
  }
  return boundaries;
}
function cutsFor(s:Source,value:string,label:string):number[]{
  if(s.cuts!==undefined&&s.cut_after!==undefined)throw new Error(`${label}: choose cuts OR cut_after, not both`);
  const length=codePoints(value).length;
  const cuts=s.cut_after?.map(quote=>{
    const index=value.indexOf(quote);
    if(index<0)throw new Error(`${label}: cut_after excerpt not found exactly`);
    if(value.indexOf(quote,index+1)>=0)throw new Error(`${label}: cut_after excerpt is ambiguous; use a longer unique excerpt`);
    return codePoints(value.slice(0,index+quote.length)).length;
  })??s.cuts??[];
  const boundaries=graphemeBoundaries(value);let last=0;
  for(const cut of cuts){
    if(cut<=last||cut>=length)throw new Error(`${label}: cuts must be strictly increasing and inside the source text`);
    if(!boundaries.has(cut))throw new Error(`${label}: cut ${cut} splits a Unicode grapheme (such as a letter and diacritic)`);
    last=cut;
  }
  return cuts;
}

/** Create lossless, non-canonical segments and unreviewed proposed groups. */
export function compileSplitPlan(c:Corpus,input:unknown){
  const plan=SplitPlanSchema.parse(input);const item=c.items.get(plan.item);if(!item)throw new Error(`Unknown item ${plan.item}`);
  const linked=new Set(linksForItem(c,plan.item).map(x=>x.document));
  const resolved=new Map<string,Segment[]>();const segments:Segment[]=[];
  for(const s of plan.sources){
    const k=key(s);if(resolved.has(k))throw new Error(`Duplicate source in split plan: ${k.replaceAll('\0','/')}`);
    let value:string,label:string;
    if(s.language==='en'){
      label=`${s.document}/${s.paragraph}/en`;
      if(!linked.has(s.document))throw new Error(`${label}: English document is not linked to the item`);
      const p=c.english.get(s.document)?.paragraphs.find(x=>x.id===s.paragraph);
      if(!p)throw new Error(`${label}: paragraph does not exist`);value=text(c,p.text);
    }else{
      label=`${plan.item}/${s.row}/${s.language}`;
      const row=item.rows.find(x=>x.id===s.row);if(!row)throw new Error(`${label}: row does not exist`);
      if(row.kind==='audio-reciter')throw new Error(`${label}: audio-reciter labels are not devotional text`);
      if(!row[s.language])throw new Error(`${label}: this language side is empty`);value=text(c,row[s.language]);
    }
    if(!value)throw new Error(`${label}: empty source text cannot be segmented`);
    if(sha256(value)!==s.source_sha256)throw new Error(`${label}: source hash changed; re-export before splitting`);
    const bounds=[0,...cutsFor(s,value,label),codePoints(value).length];const out:Segment[]=[];
    for(let i=0;i<bounds.length-1;i++){
      const start=bounds[i]!,end=bounds[i+1]!,partText=slicePoints(value,start,end);
      out.push({language:s.language,...(s.language==='en'?{document:s.document,paragraph:s.paragraph}:{row:s.row}),
        part:i,start,end,source_sha256:s.source_sha256,sha256:sha256(partText),text:partText});
    }
    if(out.map(p=>p.text).join('')!==value)throw new Error(`${label}: reconstruction failed`);
    resolved.set(k,out);segments.push(...out);
  }
  const groupIds=new Set<string>();
  const groups=plan.groups.map(g=>{
    if(groupIds.has(g.id))throw new Error(`Duplicate proposed group ID: ${g.id}`);groupIds.add(g.id);
    const rowParts=(language:'ar'|'fa',refs:z.infer<typeof RowPart>[])=>refs.map(ref=>{
      const part=resolved.get(key({language,row:ref.row}))?.[ref.part];
      if(!part)throw new Error(`${g.id}: missing ${language} source or part ${ref.row}/${ref.part}`);
      return {row:ref.row,start:part.start,end:part.end,sha256:part.sha256};
    });
    const enParts=g.en.map(ref=>{
      const part=resolved.get(key({language:'en',document:ref.document,paragraph:ref.paragraph}))?.[ref.part];
      if(!part)throw new Error(`${g.id}: missing English source or part ${ref.document}/${ref.paragraph}/${ref.part}`);
      return {document:ref.document,paragraph:ref.paragraph,start:part.start,end:part.end,sha256:part.sha256};
    });
    return {id:g.id,status:'proposed-unreviewed' as const,ar:rowParts('ar',g.ar),fa:rowParts('fa',g.fa),en:enParts};
  });
  return {format_version:1,item:plan.item,status:'proposed-unreviewed',policy,
    note:'Lossless slices of existing text only. No canonical row, paragraph, link, translation or reviewed alignment was changed.',
    source_count:plan.sources.length,segment_count:segments.length,segments,groups};
}
