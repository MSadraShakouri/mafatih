import { z } from 'zod';

// Identifiers of pooled text are derived from the exact UTF-8 value; occurrence
// IDs (rows/paragraphs) are separate and must stay stable when text changes.
export const TextId = z.string().regex(/^t[0-9a-f]{24}$/);
export const ClaimId = z.string().regex(/^c[0-9a-f]{24}$/);
export const Key = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const Ref = TextId.nullable();
const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}, 'review date must be a real calendar date');
const Review = z.object({ reviewer: z.string().trim().min(1), date: ISODate, note: z.string().optional() }).strict();
const LangSources = z.object({ ar: z.array(Key).optional(), fa: z.array(Key).optional() }).strict();

export const RowSchema = z.object({
  id: Key,
  ar: Ref,
  fa: Ref,
  // Do not infer a note merely from an empty Arabic side.
  kind: z.enum(['unknown', 'recitation', 'note', 'heading', 'instruction', 'quotation', 'audio-reciter', 'other']).optional(),
  sources: LangSources.optional()
}).strict().refine(x => x.ar !== null || x.fa !== null, 'both language sides are empty');

export const ItemSchema = z.object({
  legacy_id: z.string().min(1).nullable(),
  title: z.object({ fa: Ref, ar: Ref, en: Ref }).strict(),
  category: z.enum(['quran','dua','ziyarat','namaz','monajat','amal','hadith','khavas','ahkam','adab','sahifa','other']),
  quran: z.object({chapter:z.number().int().min(1).max(114)}).strict().optional(),
  tags: z.array(TextId),
  // This is the OLD dataset's assertion, NOT an independent verification.
  legacy_alignment: z.string().nullable(),
  legacy_missing_english_reason_claim: ClaimId.optional(),
  legacy_missing_english_title: TextId.optional(),
  sources: LangSources.optional(),
  review: z.object({ titles: Review.optional(), text: Review.optional(), ar_fa: Review.optional() }).strict().optional(),
  rows: z.array(RowSchema).min(1)
}).strict();

export const EnglishDocumentSchema = z.object({
  // Optional editorial display values; source_metadata remains the historical source.
  display_title: z.object({en:Ref,ar:Ref,evidence:Key.optional()}).strict().optional(),
  source_metadata: z.object({
    title: Ref, title_ar: Ref, section: Ref, chapter: Ref,
    translator_claim: ClaimId.nullable(), origin_claim: ClaimId.nullable(),
    method_claim: ClaimId.nullable(), note_claim: ClaimId.nullable()
  }).strict(),
  // The source's actual scope is unknown until reviewed. A title or a legacy
  // link is not evidence that the entire prayer body is translated.
  coverage: z.enum(['unknown','intro','body','mixed','partial','other']),
  sources: z.array(Key).optional(),
  review: Review.optional(),
  paragraphs: z.array(z.object({
    id: Key, text: TextId, source_claim: ClaimId.optional(), sources: z.array(Key).optional()
  }).strict())
}).strict();

export const LinkSchema = z.object({
  item: Key, document: Key,
  // Keep the original relationship's origin even after a human reviews it.
  kind: z.enum(['legacy-primary','legacy-primary-only','legacy-coverage','proposed-quran','proposed']),
  review: Review.optional()
}).strict();
export const RelationsSchema = z.object({ english_links: z.array(LinkSchema) }).strict();

export interface NavNode {
  title: string; source_level: number | null; source_page: number | null;
  source_page_end?: number | null; item: string | null; children: NavNode[];
}
export const NavNodeSchema: z.ZodType<NavNode> = z.lazy(() => z.object({
  title: TextId, source_level: z.number().int().min(1).nullable(), source_page: z.number().int().nullable(),
  source_page_end: z.number().int().nullable().optional(), item: Key.nullable(), children: z.array(NavNodeSchema)
}).strict());
export const NavigationSchema = z.object({ default_order: z.array(Key), featured: z.array(Key), toc: z.array(NavNodeSchema) }).strict();

// The original source claims remain claims. Do not mark permission verified
// without inspecting the license/grant for the exact text and distribution.
export const SourceSchema = z.object({
  name: TextId,
  author: Ref.optional(), edition: Ref.optional(),
  url: z.string().url().nullable().optional(),
  license: z.object({
    status: z.enum(['unverified','permitted','restricted','disallowed']),
    name: Ref.optional(), url: z.string().url().nullable().optional(),
    evidence: Ref.optional(),
    allowed_uses: z.array(z.enum(['website','android','commercial','modification'])).optional()
  }).strict(),
  attribution: Ref.optional(), notes: Ref.optional()
}).strict();
export const SourcesSchema = z.object({ sources: z.record(Key,SourceSchema) }).strict();

// A punctuation edit addresses an occurrence, not just a pooled value: the
// same original string can also be used by an unchanged source claim/history.
export const PunctuationLocationSchema = z.discriminatedUnion('kind', [
  z.object({kind:z.literal('item-title'),item:Key,language:z.enum(['ar','fa','en'])}).strict(),
  z.object({kind:z.literal('item-tag'),item:Key,index:z.number().int().nonnegative()}).strict(),
  z.object({kind:z.literal('item-row'),item:Key,row:Key,language:z.enum(['ar','fa'])}).strict(),
  z.object({kind:z.literal('english-display'),document:Key,language:z.enum(['ar','en'])}).strict(),
  z.object({kind:z.literal('english-metadata'),document:Key,field:z.enum(['title','title_ar','section','chapter'])}).strict(),
  z.object({kind:z.literal('english-paragraph'),document:Key,paragraph:Key}).strict(),
  z.object({kind:z.literal('navigation'),path:z.array(z.number().int().nonnegative()).min(1)}).strict(),
]);
export const PunctuationEditSchema = z.object({location:PunctuationLocationSchema,previous:TextId,replacement:TextId}).strict();
export type PunctuationLocation = z.infer<typeof PunctuationLocationSchema>;
export type PunctuationEdit = z.infer<typeof PunctuationEditSchema>;

export const EditorialHistorySchema = z.object({
  evidence: z.record(Key,z.object({url:z.string().url(),description:z.string().min(1)}).strict()),
  metadata_corrections:z.array(z.object({item:Key,field:z.enum(['title.ar','title.en']),previous:TextId.nullable(),replacement:TextId.nullable(),source_document:Key,evidence:Key}).strict()),
  // Historical references are preserved even when an occurrence is corrected,
  // a duplicate paragraph is detached, or an erroneous relationship is removed.
  row_corrections:z.array(z.object({item:Key,row:Key,language:z.enum(['ar','fa']),previous:Ref,replacement:Ref,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  row_insertions:z.array(z.object({item:Key,row:Key,before:Key,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  row_classifications:z.array(z.object({item:Key,row:Key,previous_kind:z.string().nullable(),replacement_kind:z.literal('audio-reciter'),evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  paragraph_removals:z.array(z.object({document:Key,paragraph:Key,text:TextId,preserved_document:Key,preserved_paragraph:Key,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  created_documents:z.array(z.object({document:Key,based_on_document:Key,based_on_paragraph:Key,source_record:z.string().min(1),evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  proposed_links:z.array(z.object({item:Key,document:Key,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  retracted_links:z.array(z.object({item:Key,document:Key,kind:LinkSchema.shape.kind,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  // Previous values remain in the pool; no human review is claimed by this
  // purely mechanical, occurrence-specific whitespace correction.
  punctuation_normalizations:z.array(z.object({
    rule:z.literal('closing-punctuation-v1'),date:ISODate,changes:z.array(PunctuationEditSchema).min(1)
  }).strict()).optional(),
  quran_number_evidence:Key.optional()
}).strict();
export const CorpusMetaSchema = z.object({
  format_version: z.literal(1),
  legacy_import: z.object({repository:z.string().url(),commit:z.string().regex(/^[0-9a-f]{40}$/),original_build_date:z.string()}).strict(),
  review_policy:z.string()
}).strict();

const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const Bound = z.object({row:Key,start:z.number().int().nonnegative(),end:z.number().int().positive(),sha256:Hash}).strict();
const EnBound = z.object({document:Key,paragraph:Key,start:z.number().int().nonnegative(),end:z.number().int().positive(),sha256:Hash}).strict();
export const AlignmentFileSchema = z.object({
  item: Key,
  groups: z.array(z.object({
    id: Key,
    review: Review,
    method: z.enum(['manual','source-row-match','quran-verse-number']),
    evidence: z.object({source_url:z.string().url().optional(), source_record:z.string().optional(), source_row:z.number().int().optional(), note:z.string().optional()}).strict(),
    ar: z.array(Bound), fa: z.array(Bound), en: z.array(EnBound)
  }).strict().superRefine((g,ctx) => {
    if ([g.ar,g.fa,g.en].filter(x=>x.length>0).length < 2) ctx.addIssue({code:z.ZodIssueCode.custom,message:'alignment needs spans in at least two languages'});
  }))
}).strict();

export type Item = z.infer<typeof ItemSchema>;
export type Row = z.infer<typeof RowSchema>;
export type EnglishDocument = z.infer<typeof EnglishDocumentSchema>;
export type Relations = z.infer<typeof RelationsSchema>;
export type AlignmentFile = z.infer<typeof AlignmentFileSchema>;
export type AlignmentGroup = AlignmentFile['groups'][number];
export type Sources = z.infer<typeof SourcesSchema>;
