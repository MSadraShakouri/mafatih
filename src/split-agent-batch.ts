import fs from 'node:fs';
import path from 'node:path';
import type { Corpus } from './corpus.js';
import {
  AgentPartitionsSchema, AgentPlanSchema, AgentPreviewSchema, AgentReviewSchema,
  SPLIT_AGENT_PROTOCOL, splitAgentPlan, verifyAgentPartitions, verifyAgentReview,
} from './split-agent.js';

/**
 * Read-only completeness audit for a private work directory. A per-item plan,
 * compiled preview and separate assigned review are required. The whole
 * report describes agent assertions, never human or scholarly approval.
 */
export function auditAgentBatch(c: Corpus, manifestInput: unknown, workDir: string) {
  verifyAgentPartitions(c, manifestInput);
  const manifest = AgentPartitionsSchema.parse(manifestInput), root = path.resolve(workDir);
  type Finding = { item: string; author: string; reviewer: string; status: string; detail?: string };
  const items: Finding[] = [], expectedFiles = new Set<string>();
  let missing = 0, invalid = 0, incomplete = 0, findings = 0, complete = 0;
  const read = (file: string): unknown => JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  for (const group of manifest.groups) for (const entry of group.items) {
    const base = { item: entry.item, author: group.agent, reviewer: group.reviewer };
    const planPath = path.join(root, group.agent, 'plans', `${entry.item}.json`);
    const previewPath = path.join(root, group.agent, 'previews', `${entry.item}.json`);
    const reviewPath = path.join(root, group.reviewer, 'reviews', `${entry.item}.json`);
    for (const file of [planPath, previewPath, reviewPath]) expectedFiles.add(path.relative(root, file));
    const missingFiles = [planPath, previewPath, reviewPath].filter(file => !fs.existsSync(file));
    if (missingFiles.length) {
      missing++;
      items.push({ ...base, status: 'missing', detail: missingFiles.map(file => path.relative(root, file)).join(', ') });
      continue;
    }
    try {
      const planInput = read(planPath), previewInput = read(previewPath), reviewInput = read(reviewPath);
      const plan = AgentPlanSchema.parse(planInput), preview = AgentPreviewSchema.parse(previewInput), review = AgentReviewSchema.parse(reviewInput);
      if (plan.item !== entry.item || plan.author !== group.agent || preview.item !== entry.item ||
          preview.author !== group.agent || review.reviewer !== group.reviewer) {
        throw new Error('Item, author or reviewer differs from the partition assignment');
      }
      // Recompile rather than trusting a preview that was edited after the plan.
      const compiled = splitAgentPlan(c, planInput);
      if (JSON.stringify(compiled) !== JSON.stringify(preview)) throw new Error('Preview does not match the complete source plan');
      const result = verifyAgentReview(c, previewInput, reviewInput);
      if (result.status === 'review-incomplete') incomplete++;
      else if (result.status === 'findings-require-adjudication') findings++;
      else complete++;
      items.push({ ...base, status: result.status });
    } catch (error) {
      invalid++;
      items.push({ ...base, status: 'invalid', detail: error instanceof Error ? error.message : String(error) });
    }
  }
  // A valid manifest alone must not hide duplicate or misassigned work files.
  // Ignore inputs and explicitly archived versions, but inspect the three live
  // directories for every assigned agent and any extra agent-* directory.
  const agents = new Set(manifest.groups.flatMap(g => [g.agent, g.reviewer]));
  if (fs.existsSync(root)) for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if ((entry.isDirectory() || entry.isSymbolicLink()) && /^agent-[a-z0-9-]+$/.test(entry.name)) agents.add(entry.name);
  }
  const unexpected: string[] = [];
  for (const agent of agents) for (const kind of ['plans', 'previews', 'reviews']) {
    const directory = path.join(root, agent, kind);
    if (!fs.existsSync(directory)) continue;
    for (const name of fs.readdirSync(directory)) {
      const relative = path.join(agent, kind, name);
      if (!expectedFiles.has(relative)) unexpected.push(relative);
    }
  }
  unexpected.sort();
  return { format_version: 1 as const, protocol: SPLIT_AGENT_PROTOCOL, snapshot_sha256: manifest.snapshot_sha256,
    status: complete === items.length && unexpected.length === 0 ? 'agent-review-records-complete' as const : 'needs-work' as const,
    total_items: items.length, missing_items: missing, invalid_items: invalid, incomplete_reviews: incomplete,
    findings_require_adjudication: findings, complete_reviews: complete, unexpected_work_files: unexpected, items,
    human_reviewed: false as const,
    note: 'Full file coverage and agent identity claims are checked, not the truth or quality of semantic, rights, translation or scholarly review.' };
}
