// Measure what the new versioned-row guard does to existing unversioned links on
// agent-6's items at this branch's HEAD.
//
//   npx tsx agent-work/agent-1/tools/guard-effect.ts [commit]
//
// For every candidate ID of the provisional register that belongs to an item whose
// binding is fresh, this evaluates the link twice with the same anchor:
//   - legacy: resolveLegacyRowAnchor, the pre-upgrade split/alias resolver;
//   - guarded: resolveVersionedRowAnchor, the new fail-closed resolver.
// It reports the before/after status pairs and, for the one candidate that already
// has an installed reviewed alias, whether the guard's "current" meaning is that
// alias and whether its historical meaning carries a different content identity.
//
// Read-only. Anchors are synthetic (offset 0, first available field), so no text is
// printed; only row IDs, statuses and counts.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpusAtCommit } from '../../../src/git-corpus.js';
import { compileRowVersionFindings, itemVersionBinding, RowVersionFindingsSchema, rowVersion } from '../../../src/row-version-safety.js';
import { resolveLegacyRowAnchor, resolveVersionedRowAnchor, type RowSplitRedirect, type VersionedLiveRow } from '../../../web/row-split-anchor.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = execFileSync('git', ['rev-parse', process.argv[2] ?? 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const corpus = loadCorpusAtCommit(sha);
const raw = JSON.parse(readFileSync(path.join(root, 'docs/split-assignments/row-version-findings.json'), 'utf8'));
const register = RowVersionFindingsSchema.parse(raw);
const versions = compileRowVersionFindings(corpus, raw);

const transitions = new Map<string, string[]>();
const aliasChecks: unknown[] = [];
let candidates = 0;

for (const [item, group] of Object.entries(register.items)) {
  const current = corpus.items.get(item), split = corpus.rowSplits.get(item);
  if (!current || itemVersionBinding(current, split) !== group.target_sha256) continue; // stale: targets withheld
  const redirects: RowSplitRedirect[] = [...(split?.rows ?? []), ...(split?.aliases ?? [])]
    .map(entry => ({ original: { id: entry.original.id }, version: rowVersion(item, entry.original), ar: entry.ar, fa: entry.fa }));
  const rows: VersionedLiveRow[] = current.rows.filter(row => row.kind !== 'audio-reciter')
    .map(row => ({ id: row.id, version: rowVersion(item, row), ar: row.ar ?? '', fa: row.fa ?? '' }));
  const entries = versions.get(item) ?? [];
  for (const candidate of group.rows) {
    candidates += 1;
    const anchor = { row: candidate.id, language: (candidate.original.ar === null ? 'fa' : 'ar') as 'ar' | 'fa', offset: 0 };
    const legacy = resolveLegacyRowAnchor(redirects, anchor);
    const legacyStatus = legacy.row === anchor.row ? 'resolved-current-row' : 'resolved-through-alias';
    const guarded = resolveVersionedRowAnchor(redirects, entries, anchor, rows, false);
    const key = `${legacyStatus} -> ${guarded.status}`;
    const list = transitions.get(key) ?? [];
    list.push(`${item}/${candidate.id}`);
    transitions.set(key, list);
    const entry = entries.find(candidateEntry => candidateEntry.id === candidate.id);
    const installed = redirects.find(redirect => redirect.original.id === candidate.id);
    if (installed && entry) {
      const currentSnapshots = entry.current?.snapshots ?? [];
      aliasChecks.push({
        item, id: candidate.id,
        guard_current_is_the_installed_alias: currentSnapshots.includes(installed.version!),
        guard_current_version_labels: currentSnapshots.length,
        historical_identities_differ: entry.historical.every(meaning => !currentSnapshots.includes(meaning.snapshots[0]!)),
        unversioned_before: legacyStatus, unversioned_after: guarded.status,
      });
    }
  }
}

console.log(JSON.stringify({
  commit: sha,
  candidates_measured: candidates,
  transitions: Object.fromEntries([...transitions].map(([key, list]) => [key, { count: list.length, examples: list.slice(0, 3) }])),
  installed_alias_candidates: aliasChecks,
}, null, 2));
