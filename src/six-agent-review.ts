import { z } from 'zod';
import type { Corpus } from './corpus.js';
import { Key } from './schema.js';
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
  const semantic=verifyAgentReview(base,preview,review.semantic_review);
  const complete=semantic.status==='agent-review-records-complete' && review.layout.decision==='accept';
  return {status:complete?'agent-review-records-complete' as const:'needs-work' as const,
    item:review.item,author:review.author,reviewer:review.reviewer,author_commit:review.author_commit,
    semantic_status:semantic.status,layout_decision:review.layout.decision,human_reviewed:false as const,
    note:'The records are independent agent assertions, not scholarly or rights approval.'};
}
