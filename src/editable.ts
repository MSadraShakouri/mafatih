import { z } from 'zod';
import { ItemSchema, Key, RowFieldsSchema } from './schema.js';
import type { Corpus } from './corpus.js';
import { text } from './corpus.js';
import { intern } from './editor.js';

export const EditableRowSchema=RowFieldsSchema.extend({ar:z.string().nullable(),fa:z.string().nullable()}).strict()
  .refine(x=>Boolean(x.ar)||Boolean(x.fa),'both language sides cannot be empty');
export const EditableItemSchema=ItemSchema.extend({id:Key,title:z.object({fa:z.string().nullable(),ar:z.string().nullable(),en:z.string().nullable()}).strict(),
  tags:z.array(z.string()),legacy_missing_english_title:z.string().optional(),rows:z.array(EditableRowSchema).min(1)}).strict();
export type EditableItem=z.infer<typeof EditableItemSchema>;
export function readableItem(c:Corpus,id:string):EditableItem {
  const it=c.items.get(id);if(!it)throw new Error('Unknown item '+id);
  const deref=(ref:string|null|undefined)=>ref==null?null:text(c,ref);
  return EditableItemSchema.parse({id,...it,title:{fa:deref(it.title.fa),ar:deref(it.title.ar),en:deref(it.title.en)},tags:it.tags.map(x=>text(c,x)),
    ...(it.legacy_missing_english_title?{legacy_missing_english_title:text(c,it.legacy_missing_english_title)}:{}),
    rows:it.rows.map(r=>({...r,ar:deref(r.ar),fa:deref(r.fa)}))});
}
export function internItem(c:Corpus,data:EditableItem){
  const {id:_,...rest}=data;
  return ItemSchema.parse({...rest,
    title:{fa:data.title.fa===null?null:intern(c,data.title.fa),ar:data.title.ar===null?null:intern(c,data.title.ar),en:data.title.en===null?null:intern(c,data.title.en)},
    tags:data.tags.map(x=>intern(c,x)),
    ...(data.legacy_missing_english_title!==undefined?{legacy_missing_english_title:intern(c,data.legacy_missing_english_title)}:{}),
    rows:data.rows.map(r=>({...r,ar:r.ar?intern(c,r.ar):null,fa:r.fa?intern(c,r.fa):null}))});
}

import { ClaimId, EnglishDocumentSchema } from './schema.js';
export const EditableEnglishSchema=EnglishDocumentSchema.extend({
  id:Key,
  display_title:z.object({en:z.string().nullable(),ar:z.string().nullable(),evidence:Key.optional()}).strict().optional(),
  source_metadata:EnglishDocumentSchema.shape.source_metadata.extend({title:z.string().nullable(),title_ar:z.string().nullable(),section:z.string().nullable(),chapter:z.string().nullable()}).strict(),
  paragraphs:z.array(z.object({id:Key,text:z.string().min(1),source_claim:ClaimId.optional(),sources:z.array(Key).optional()}).strict())
}).strict();
export type EditableEnglish=z.infer<typeof EditableEnglishSchema>;
export function readableEnglish(c:Corpus,id:string):EditableEnglish {
  const d=c.english.get(id);if(!d)throw new Error('Unknown English document '+id);
  const get=(ref:string|null)=>ref===null?null:text(c,ref);const m=d.source_metadata;
  return EditableEnglishSchema.parse({id,...d,...(d.display_title?{display_title:{...d.display_title,en:get(d.display_title.en),ar:get(d.display_title.ar)}}:{}),source_metadata:{...m,title:get(m.title),title_ar:get(m.title_ar),section:get(m.section),chapter:get(m.chapter)},
    paragraphs:d.paragraphs.map(p=>({...p,text:text(c,p.text)}))});
}
export function internEnglish(c:Corpus,data:EditableEnglish){
  const {id:_,...rest}=data,m=data.source_metadata;const convert=(v:string|null)=>v===null?null:intern(c,v);
  return EnglishDocumentSchema.parse({...rest,...(data.display_title?{display_title:{...data.display_title,en:convert(data.display_title.en),ar:convert(data.display_title.ar)}}:{}),source_metadata:{...m,title:convert(m.title),title_ar:convert(m.title_ar),section:convert(m.section),chapter:convert(m.chapter)},
    paragraphs:data.paragraphs.map(p=>({...p,text:intern(c,p.text)}))});
}
