// Audit the coordinator's provisional row-version register against a branch.
//
//   npx tsx agent-work/agent-1/tools/register-audit.ts [commit]
//
// The register (docs/split-assignments/row-version-findings.json) is metadata-only
// safety evidence: 467 IDs in 94 items, each group bound by SHA-256 to the exact item
// and split record it was checked against. Per docs/row-version-links.md a changed
// binding disables the candidate targets while keeping the warning.
//
// This tool re-derives, from the corpus at `commit` (default HEAD):
//   1. each item's binding hash, and whether it currently matches the register;
//   2. for a matching binding, whether every target slice still reconstructs the
//      recorded old text exactly, contiguously, in the recorded field;
//   3. the current state of each candidate ID: live row, installed split alias, or
//      neither (the register's unroutable class);
//   4. for a stale binding, whether the reason is an item with no authored split
//      record on this branch or an authored record that differs from the register;
//   5. whether the project compiler accepts the register at this commit;
//   6. which register IDs also occur as rows of agent-1's own items (the known
//      cross-item ID recurrence caused by the piece-ID hash input), so that any
//      reader or migration keeps keying on (item, ID).
//
// Read-only: writes nothing, never touches data/.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpusAtCommit } from '../../../src/git-corpus.js';
import { compileRowVersionFindings, itemVersionBinding, RowVersionFindingsSchema } from '../../../src/row-version-safety.js';
import type { RowSplitRecord } from '../../../src/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = execFileSync('git', ['rev-parse', process.argv[2] ?? 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const corpus = loadCorpusAtCommit(sha);
const raw = JSON.parse(readFileSync(path.join(root, 'docs/split-assignments/row-version-findings.json'), 'utf8'));
const register = RowVersionFindingsSchema.parse(raw);
const manifest = JSON.parse(readFileSync(path.join(root, 'docs/split-assignments/assignments.json'), 'utf8'));
const owner = new Map<string, string>();
for (const group of manifest.groups as { agent?: string; agent_id?: string; items: (string | { item?: string; id?: string })[] }[]) {
  for (const entry of group.items) {
    const id = typeof entry === 'string' ? entry : (entry.item ?? entry.id);
    if (id) owner.set(id, group.agent ?? group.agent_id ?? 'unknown');
  }
}
const mine = new Set([...owner].filter(([, who]) => who === 'agent-1').map(([item]) => item));

const cp = (value: string) => Array.from(value);
const splitEntry = (split: RowSplitRecord | undefined, id: string) =>
  [...(split?.rows ?? []), ...(split?.aliases ?? [])].find(entry => entry.original.id === id);

type ItemReport = {
  item: string; owner: string; bound: boolean;
  stale_reason?: 'no-authored-record' | 'record-differs';
  candidates: number; live: number; alias: number; unroutable: number;
  reconstructed: number; problems: string[];
};

const reports: ItemReport[] = [];
for (const [item, group] of Object.entries(register.items)) {
  const current = corpus.items.get(item), split = corpus.rowSplits.get(item);
  const bound = current !== undefined && itemVersionBinding(current, split) === group.target_sha256;
  const report: ItemReport = {
    item, owner: owner.get(item) ?? 'unowned', bound,
    ...(bound ? {} : { stale_reason: split === undefined ? 'no-authored-record' as const : 'record-differs' as const }),
    candidates: group.rows.length, live: 0, alias: 0, unroutable: 0, reconstructed: 0, problems: [],
  };
  for (const candidate of group.rows) {
    if (candidate.original.id !== candidate.id) report.problems.push(`${candidate.id}: original ID differs from the candidate ID`);
    const live = current?.rows.find(row => row.id === candidate.id && row.kind !== 'audio-reciter');
    if (live) report.live += 1;
    else if (splitEntry(split, candidate.id)) report.alias += 1;
    else report.unroutable += 1;
    if (!current || !bound) continue; // stale bindings withhold targets by design
    for (const language of ['ar', 'fa'] as const) {
      const pooled = candidate.original[language];
      const source = pooled === null ? '' : corpus.texts.get(pooled);
      if (source === undefined) { report.problems.push(`${candidate.id}/${language}: recorded pooled text is unavailable`); continue; }
      const points = cp(source), segments = candidate[language];
      let end = 0, exact = true;
      for (const part of segments) {
        if (part.start !== end) { report.problems.push(`${candidate.id}/${language}: mapping is not contiguous at ${part.start}`); exact = false; break; }
        const target = current.rows.find(row => row.id === part.row && row.kind !== 'audio-reciter');
        const targetId = target?.[part.language];
        const targetText = targetId ? corpus.texts.get(targetId) : undefined;
        if (targetText === undefined) { report.problems.push(`${candidate.id}/${language}: target ${part.row} is unavailable`); exact = false; break; }
        const slice = cp(targetText).slice(part.target_start, part.target_start + part.end - part.start).join('');
        if (slice !== points.slice(part.start, part.end).join('')) {
          report.problems.push(`${candidate.id}/${language}: slice of ${part.row} at ${part.target_start} differs from the recorded old text`);
          exact = false; break;
        }
        end = part.end;
      }
      if (exact && end !== points.length) { report.problems.push(`${candidate.id}/${language}: mapping does not cover the recorded old text`); exact = false; }
      if (exact) report.reconstructed += 1;
    }
  }
  reports.push(report);
}

let compiler: { status: string; detail?: string };
try { compileRowVersionFindings(corpus, raw); compiler = { status: 'accepted' }; }
catch (error) { compiler = { status: 'rejected', detail: error instanceof Error ? error.message : String(error) }; }

// Cross-item recurrence: the same ID string can legitimately be a row of two items,
// because a piece ID hashes the local row reference, the source-and-part references
// and the kind — never the item. Recorded here so no reader keys on ID alone.
const recurrences = new Map<string, string[]>();
for (const item of mine) {
  const record = corpus.items.get(item);
  if (!record) continue;
  const ids = new Set(record.rows.map(row => row.id));
  for (const [registerItem, group] of Object.entries(register.items)) {
    for (const candidate of group.rows) if (ids.has(candidate.id)) {
      const list = recurrences.get(`${registerItem}/${candidate.id}`) ?? [];
      list.push(item); recurrences.set(`${registerItem}/${candidate.id}`, list);
    }
  }
}

const bound = reports.filter(report => report.bound);
const boundProblems = bound.flatMap(report => report.problems.map(problem => `${report.item}: ${problem}`));
const byOwner = Object.fromEntries([...new Set(reports.map(report => report.owner))].sort().map(who => {
  const own = reports.filter(report => report.owner === who);
  return [who, {
    items: own.length, bound: own.filter(report => report.bound).length,
    candidates: own.reduce((sum, report) => sum + report.candidates, 0),
    no_authored_record: own.filter(report => report.stale_reason === 'no-authored-record').length,
    record_differs: own.filter(report => report.stale_reason === 'record-differs').length,
  }];
}));

console.log(JSON.stringify({
  status: boundProblems.length || compiler.status !== 'accepted' ? 'findings' : 'consistent-with-branch',
  commit: sha,
  register_target_snapshot: register.target_snapshot,
  frozen_base: register.frozen_base,
  items: reports.length,
  candidates: reports.reduce((sum, report) => sum + report.candidates, 0),
  current_state: {
    live_row: reports.reduce((sum, report) => sum + report.live, 0),
    installed_alias: reports.reduce((sum, report) => sum + report.alias, 0),
    neither: reports.reduce((sum, report) => sum + report.unroutable, 0),
  },
  bindings: {
    fresh: bound.length, stale: reports.length - bound.length,
    stale_no_authored_record: reports.filter(report => report.stale_reason === 'no-authored-record').length,
    stale_record_differs: reports.filter(report => report.stale_reason === 'record-differs').length,
  },
  compiler,
  by_owner: byOwner,
  fresh_items: reports.filter(report => report.bound).map(report => ({
    item: report.item, owner: report.owner, candidates: report.candidates,
    live: report.live, alias: report.alias, unroutable: report.unroutable, reconstructed: report.reconstructed,
  })),
  agent_1_items_in_register: reports.filter(report => report.owner === 'agent-1').map(report => report.item),
  fresh_binding_problems: boundProblems,
  cross_item_recurrences_with_agent_1_items: recurrences.size,
  cross_item_recurrence_examples: [...recurrences].slice(0, 5).map(([id, list]) => ({ id, agent_1_items: list })),
}, null, 2));
