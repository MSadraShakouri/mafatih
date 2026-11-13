import { z } from 'zod';

// Identifiers of pooled text are derived from the exact UTF-8 value; occurrence
// IDs (rows/paragraphs) are separate and must stay stable when text changes.
export const TextId = z.string().regex(/^t[0-9a-f]{24}$/);
export const ClaimId = z.string().regex(/^c[0-9a-f]{24}$/);
export const Key = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const Ref = TextId.nullable();
const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}, 'review date must be a real calendar date');
const Review = z.object({ reviewer: z.string().trim().min(1), date: ISODate, note: z.string().optional() }).strict();
const LangSources = z.object({ ar: z.array(Key).optional(), fa: z.array(Key).optional() }).strict();

// Share the unrefined fields with the readable editing schema. Zod 4 keeps
// refinements on the object rather than wrapping it in an effects type.
export const RowFieldsSchema = z.object({
  id: Key,
  ar: Ref,
  fa: Ref,
  // Do not infer a note merely from an empty Arabic side.
  kind: z.enum(['unknown', 'recitation', 'note', 'heading', 'instruction', 'quotation', 'audio-reciter', 'other']).optional(),
  sources: LangSources.optional()
}).strict();
export const RowSchema = RowFieldsSchema.refine(x => x.ar !== null || x.fa !== null, 'both language sides are empty');

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

export const SourcePageSeriesSchema = z.enum(['front-matter', 'main']);
export type SourcePageSeries = z.infer<typeof SourcePageSeriesSchema>;
const PositivePage = z.number().int().positive();

/** Also used by validateCorpus for in-memory edits that have not been reparsed. */
export function sourcePageIssues(value: {
  source_page: unknown; source_page_end?: unknown; source_page_series?: unknown;
}): string[] {
  const { source_page: start, source_page_end: end, source_page_series: series } = value;
  const positive = (number: unknown): number is number => typeof number === 'number' && Number.isSafeInteger(number) && number > 0;
  const errors: string[] = [];
  if (start !== null && !positive(start)) errors.push('source_page must be a positive integer or null');
  if (end != null && !positive(end)) errors.push('source_page_end must be a positive integer or null');
  if (series !== null && series !== 'front-matter' && series !== 'main') errors.push('source_page_series must be front-matter, main, or null');
  if (start !== null && series == null) errors.push('source_page requires a source_page_series');
  if (end != null && start == null) errors.push('source_page_end requires a source_page');
  if (positive(start) && positive(end) && end < start) errors.push('source_page_end precedes source_page');
  return errors;
}
export interface NavNode {
  title: string; source_level: number | null; source_page: number | null;
  source_page_series: SourcePageSeries | null; source_page_end?: number | null; item: string | null; children: NavNode[];
}
export const NavNodeSchema: z.ZodType<NavNode> = z.lazy(() => z.object({
  title: TextId, source_level: z.number().int().min(1).nullable(), source_page: PositivePage.nullable(),
  source_page_series: SourcePageSeriesSchema.nullable(), source_page_end: PositivePage.nullable().optional(),
  item: Key.nullable(), children: z.array(NavNodeSchema)
}).strict().superRefine((node, ctx) => {
  for (const message of sourcePageIssues(node)) ctx.addIssue({code:z.ZodIssueCode.custom,message});
}));
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

// Historical starts/ends can legitimately contain zero or a reversed range.
// Optional keys preserve the distinction between a missing field and null.
const PreviousPageSnapshotSchema = z.object({
  start:z.number().int().nullable(), end:z.number().int().nullable().optional(),
  series:SourcePageSeriesSchema.nullable().optional()
}).strict();
const ReplacementPageSnapshotSchema = z.object({
  start:PositivePage.nullable(), end:PositivePage.nullable().optional(), series:SourcePageSeriesSchema.nullable()
}).strict().superRefine((page,ctx) => {
  for (const message of sourcePageIssues({source_page:page.start,source_page_end:page.end,source_page_series:page.series}))
    ctx.addIssue({code:z.ZodIssueCode.custom,message});
});
const NavigationPageObservationSchema = z.object({
  kind:z.enum(['source-heading','mixed-series-root','unnumbered-metadata','unpaginated-after-book','not-in-edition','legacy-unmapped']),
  heading:PositivePage.nullable(), previous_footer:PositivePage.nullable(), next_footer:PositivePage.nullable(),
  last_text_footer:PositivePage.nullable(), subtree_footer:PositivePage.nullable(), descendant_max_end:PositivePage.nullable()
}).strict();
const NavigationPageCorrectionBatchSchema = z.object({
  method:z.enum(['heading-trailing-footers-v1','legacy-unmapped-v1']), date:ISODate.nullable(), evidence:Key,
  source_sha256:Hash.nullable(), changes:z.array(z.object({
    // Paths describe the TOC at edit time, not permanent navigation IDs.
    path:z.array(z.number().int().nonnegative()).min(1), title:TextId, item:Key.nullable(),
    source_level:z.number().int().min(1).nullable(), previous:PreviousPageSnapshotSchema,
    replacement:ReplacementPageSnapshotSchema, observation:NavigationPageObservationSchema
  }).strict()).min(1)
}).strict();

export const EditorialHistorySchema = z.object({
  evidence: z.record(Key,z.object({url:z.string().url(),description:z.string().min(1)}).strict()),
  metadata_corrections:z.array(z.object({item:Key,field:z.enum(['title.ar','title.en']),previous:TextId.nullable(),replacement:TextId.nullable(),source_document:Key,evidence:Key}).strict()),
  // Historical references are preserved even when an occurrence is corrected,
  // a duplicate paragraph is detached, or an erroneous relationship is removed.
  row_corrections:z.array(z.object({item:Key,row:Key,language:z.enum(['ar','fa']),previous:Ref,replacement:Ref,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  // Formatting-only movement of existing list/section markers between stable
  // row occurrences. Both rows also have reversible row_corrections entries.
  line_break_marker_moves:z.array(z.object({
    item:Key,language:z.enum(['ar','fa']),source_row:Key,destination_row:Key,
    marker:z.string().min(1).max(32).refine(value=>!/[\s\u0085]/u.test(value),'marker must not contain whitespace'),
    source_previous:TextId,source_replacement:TextId,destination_previous:TextId,destination_replacement:TextId,
    evidence:Key,reason:z.string().min(1)
  }).strict()).optional(),
  row_insertions:z.array(z.object({item:Key,row:Key,before:Key,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  row_classifications:z.array(z.object({item:Key,row:Key,previous_kind:z.string().nullable(),replacement_kind:z.literal('audio-reciter'),evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  paragraph_removals:z.array(z.object({document:Key,paragraph:Key,text:TextId,preserved_document:Key,preserved_paragraph:Key,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  created_documents:z.array(z.object({document:Key,based_on_document:Key,based_on_paragraph:Key,source_record:z.string().min(1),evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  proposed_links:z.array(z.object({item:Key,document:Key,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  retracted_links:z.array(z.object({item:Key,document:Key,kind:LinkSchema.shape.kind,evidence:Key,reason:z.string().min(1)}).strict()).optional(),
  // Previous values remain in the pool; no human review is claimed by this
  // purely mechanical, occurrence-specific whitespace correction.
  punctuation_normalizations:z.array(z.object({
    rule:z.enum(['closing-punctuation-v1','quran-verse-marker-spacing-v1']),date:ISODate,changes:z.array(PunctuationEditSchema).min(1)
  }).strict()).optional(),
  navigation_page_corrections:z.array(NavigationPageCorrectionBatchSchema).optional(),
  quran_number_evidence:Key.optional()
}).strict();
export const CorpusMetaSchema = z.object({
  format_version: z.literal(1),
  legacy_import: z.object({repository:z.string().url(),commit:z.string().regex(/^[0-9a-f]{40}$/),original_build_date:z.string()}).strict(),
  review_policy:z.string()
}).strict();

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

// Per-item reversible record for a physical AR/FA split.  The source row is
// retained here when its occurrence ID is retired; each segment is an exact
// code-point slice, possibly moved to the other language field after review.
export const RowSplitSegmentSchema = z.object({
  row: Key, language: z.enum(['ar', 'fa']),
  start: z.number().int().nonnegative(), end: z.number().int().positive(),
}).strict();
export const RowSplitRecordSchema = z.object({
  format_version: z.literal(1), item: Key, author: Key,
  baseline_item_sha256: Hash, plan_sha256: Hash, layout_sha256: Hash,
  rows: z.array(z.object({
    original: RowSchema, results: z.array(Key).min(1),
    ar: z.array(RowSplitSegmentSchema), fa: z.array(RowSplitSegmentSchema),
  }).strict()),
}).strict();
export type RowSplitRecord = z.infer<typeof RowSplitRecordSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Row = z.infer<typeof RowSchema>;
export type EnglishDocument = z.infer<typeof EnglishDocumentSchema>;
export type Relations = z.infer<typeof RelationsSchema>;
export type AlignmentFile = z.infer<typeof AlignmentFileSchema>;
export type AlignmentGroup = AlignmentFile['groups'][number];
export type Sources = z.infer<typeof SourcesSchema>;
