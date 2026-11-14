import { z } from 'zod';
import type { Corpus } from './corpus.js';
import { Key, RowMergeInsertionSchema } from './schema.js';
import { AgentReviewSchema, createAgentReviewTemplate, splitAgentPlan, verifyAgentReview } from './split-agent.js';
import { CanonicalLayoutSchema, verifyCanonicalResult } from './split-canonical.js';
import { sha256 } from './text-ids.js';

const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Commit=z.string().regex(/^[a-f0-9]{40}$/);
export const CanonicalReviewSchema=z.object({
  format_version:z.literal(1),protocol:z.literal('ar-fa-canonical-review-v1'),
  item:Key,author:Key,reviewer:Key,author_commit:Commit,
  plan_sha256:Hash,layout_sha256:Hash,result_item_sha256:Hash,result_record_sha256:Hash,
  semantic_review:AgentReviewSchema,
  layout:z.object({decision:z.enum(['pending','accept','revise','uncertain']),note:z.string()}).strict(),
  // Separate, bound decisions are required for each proposed non-source space.
  spacing_review:z.array(RowMergeInsertionSchema.extend({
    decision:z.enum(['pending','accept','revise','uncertain']),note:z.string(),
  }).strict()).optional(),
}).strict();
const hash=(value:unknown):string=>sha256(JSON.stringify(value));

/** Create an independent review template only after checking the actual committed canonical result. */
export function createCanonicalReviewTemplate(base:Corpus,current:Corpus,plan:unknown,layoutInput:unknown,reviewer:string,authorCommit:string) {
  const layout=CanonicalLayoutSchema.parse(layoutInput), preview=splitAgentPlan(base,plan);
  Key.parse(reviewer);Commit.parse(authorCommit);
  if(reviewer===preview.author)throw new Error('The author cannot independently review their own work');
  verifyCanonicalResult(base,current,plan,layoutInput);
  return CanonicalReviewSchema.parse({
    format_version:1,protocol:'ar-fa-canonical-review-v1',item:preview.item,author:preview.author,reviewer,author_commit:authorCommit,
    plan_sha256:preview.plan_sha256,layout_sha256:hash(layoutInput),
    result_item_sha256:hash(current.items.get(preview.item)),result_record_sha256:hash(current.rowSplits.get(preview.item)),
    semantic_review:createAgentReviewTemplate(base,preview,reviewer),
    layout:{decision:'pending',note:''},
    ...(current.rowSplits.get(preview.item)?.format_version===3 ? {
      spacing_review:current.rowSplits.get(preview.item)!.insertions!.map(insertion=>({...insertion,decision:'pending',note:''})),
    } : {}),
  });
}

/** A review survives unrelated commits but not changed source, layout or result. */
export function verifyCanonicalReview(base:Corpus,current:Corpus,plan:unknown,layoutInput:unknown,reviewInput:unknown) {
  const review=CanonicalReviewSchema.parse(reviewInput),layout=CanonicalLayoutSchema.parse(layoutInput),preview=splitAgentPlan(base,plan);
  verifyCanonicalResult(base,current,plan,layoutInput);
  if(review.author===review.reviewer || review.item!==preview.item || review.author!==preview.author ||
     review.reviewer!==review.semantic_review.reviewer || review.plan_sha256!==preview.plan_sha256 ||
     review.layout_sha256!==hash(layoutInput) || review.result_item_sha256!==hash(current.items.get(preview.item)) ||
     review.result_record_sha256!==hash(current.rowSplits.get(preview.item)) || layout.item!==review.item) {
    throw new Error('Canonical review is stale or mismatched');
  }
  if(['revise','uncertain'].includes(review.layout.decision) && !review.layout.note.trim()) throw new Error('Layout finding needs a note');
  const record=current.rowSplits.get(preview.item), expected=record?.format_version===3 ? record.insertions! : [];
  if ((expected.length>0) !== (review.spacing_review!==undefined) || (review.spacing_review?.length ?? 0)!==expected.length)
    throw new Error('A separate spacing review is required for each editorial insertion');
  for (const [index,assessment] of (review.spacing_review ?? []).entries()) {
    const {decision,note,...insertion}=assessment;
    if (JSON.stringify(insertion)!==JSON.stringify(expected[index])) throw new Error('Spacing review is stale or mismatched');
    if (decision!=='pending'&&!note.trim()) throw new Error('A spacing decision needs a review note');
  }
  const semantic=verifyAgentReview(base,preview,review.semantic_review);
  const spacingComplete=(review.spacing_review ?? []).every(entry=>entry.decision==='accept');
  const complete=semantic.status==='agent-review-records-complete' && review.layout.decision==='accept' && spacingComplete;
  return {status:complete?'agent-review-records-complete' as const:'needs-work' as const,
    item:review.item,author:review.author,reviewer:review.reviewer,author_commit:review.author_commit,
    semantic_status:semantic.status,layout_decision:review.layout.decision,
    ...(expected.length?{spacing_decisions:review.spacing_review!.map(entry=>entry.decision)}:{}),human_reviewed:false as const,
    note:'The records are independent agent assertions, not scholarly or rights approval.'};
}
