// Independently check the provisional register's historical claims for named items.
//
//   npx tsx agent-work/agent-1/tools/register-history-check.ts <item-id> [<item-id> ...]
//
// Works on raw Git blobs, not the corpus loader: early commits in this repository carry
// data files that today's schema rejects, and a row's meaning is fully described by its
// pooled-text references and kind, which are immutable. For each named item this reads
// every commit that touches `data/items/<item>.json` — the only commits where a row's
// meaning can change — plus HEAD, and records the (ar, fa, kind) triple of every register
// candidate ID.
//
// It then reports, per candidate:
//   - how many distinct meanings were live across reachable history;
//   - whether the register's recorded `original` is one of them;
//   - whether the *current* meaning (live row at HEAD, or the original row of an installed
//     split alias) is one of them;
//   - any meaning that is neither, with the commits where it was live — that would be a
//     meaning the two-way choice cannot represent;
//   - whether every (candidate, snapshot) pair the register lists is true at that commit.
// Read-only: writes nothing, touches no data/.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RowVersionFindingsSchema } from '../../../src/row-version-safety.js';
import { loadCorpusAtCommit } from '../../../src/git-corpus.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const git = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
const items = process.argv.slice(2);
if (!items.length) throw new Error('usage: register-history-check.ts <item-id> [<item-id> ...]');
const register = RowVersionFindingsSchema.parse(
  JSON.parse(readFileSync(path.join(root, 'docs/split-assignments/row-version-findings.json'), 'utf8')),
);
const head = git(['rev-parse', 'HEAD']).trim();
const headCorpus = loadCorpusAtCommit(head);

type Triple = string;
const triple = (ar: string | null, fa: string | null, kind: string | null | undefined) => JSON.stringify([ar, fa, kind ?? null]);
const parse = (value: string) => JSON.parse(value) as Triple;
const rawItem = (commit: string, item: string) => {
  try { return JSON.parse(git(['show', `${commit}:data/items/${item}.json`])) as { rows?: { id: string; ar: string | null; fa: string | null; kind?: string }[] }; }
  catch { return undefined; }
};

// Current meaning of an ID: the live row, or the original row of an installed alias.
const currentTriple = new Map<string, Triple | undefined>(); // `${item}/${id}`
for (const item of items) {
  const record = headCorpus.items.get(item), split = headCorpus.rowSplits.get(item);
  for (const candidate of register.items[item]!.rows) {
    const live = record?.rows.find(row => row.id === candidate.id && row.kind !== 'audio-reciter');
    const alias = [...(split?.rows ?? []), ...(split?.aliases ?? [])].find(entry => entry.original.id === candidate.id);
    const row = live ?? alias?.original;
    currentTriple.set(`${item}/${candidate.id}`, row ? triple(row.ar, row.fa, row.kind) : undefined);
  }
}

const report: unknown[] = [];
let observationsListed = 0, observationsTrue = 0;
const falseObservations: string[] = [];
for (const item of items) {
  const group = register.items[item]!;
  const commits = git(['rev-list', 'HEAD', '--', `data/items/${item}.json`]).trim().split('\n').filter(Boolean);
  if (!commits.includes(head)) commits.unshift(head);
  const live = new Map<string, Map<Triple, string[]>>(); // id → triple → commits
  for (const commit of commits) {
    const raw = rawItem(commit, item);
    if (!raw?.rows) continue;
    const subject = git(['log', '-1', '--format=%h %s', commit]).trim().slice(0, 80);
    for (const candidate of group.rows) {
      const row = raw.rows.find(entry => entry.id === candidate.id);
      if (!row) continue;
      const map = live.get(candidate.id) ?? new Map<Triple, string[]>();
      const list = map.get(triple(row.ar, row.fa, row.kind)) ?? [];
      list.push(`${commit.slice(0, 8)} (${subject})`);
      map.set(triple(row.ar, row.fa, row.kind), list); live.set(candidate.id, map);
    }
  }
  for (const candidate of group.rows) {
    const old = triple(candidate.original.ar, candidate.original.fa, candidate.original.kind);
    const current = currentTriple.get(`${item}/${candidate.id}`);
    const meanings = live.get(candidate.id) ?? new Map<Triple, string[]>();
    const others = [...meanings].filter(([value]) => value !== old && value !== current);
    // Every listed snapshot must really carry the recorded old meaning at that commit.
    const falseForCandidate: string[] = [];
    for (const snapshot of candidate.snapshots) {
      observationsListed += 1;
      const raw = rawItem(snapshot, item);
      const row = raw?.rows?.find(entry => entry.id === candidate.id);
      if (row && triple(row.ar, row.fa, row.kind) === old) observationsTrue += 1;
      else { falseForCandidate.push(snapshot.slice(0, 8)); falseObservations.push(`${item}/${candidate.id}@${snapshot.slice(0, 8)}`); }
    }
    report.push({
      item, id: candidate.id,
      distinct_meanings_in_history: meanings.size,
      register_original_matches: meanings.has(old),
      current_meaning_matches: current === undefined ? 'no-current-meaning' : meanings.has(current),
      unrepresented_meanings: others.map(([value, commits]) => ({ meaning: value, commits: commits.slice(0, 3) })),
      listed_snapshots: candidate.snapshots.length,
      false_snapshots: falseForCandidate,
    });
  }
}

const rows = report as { item: string; id: string; distinct_meanings_in_history: number; register_original_matches: boolean; current_meaning_matches: boolean | string; unrepresented_meanings: unknown[]; false_snapshots: string[] }[];
console.log(JSON.stringify({
  head,
  items: items.length,
  candidates: rows.length,
  listed_snapshot_observations: observationsListed,
  listed_snapshot_observations_true: observationsTrue,
  false_snapshot_observations: falseObservations,
  candidates_whose_recorded_original_was_live: rows.filter(row => row.register_original_matches).length,
  candidates_with_unrepresented_meanings: rows.filter(row => row.unrepresented_meanings.length > 0).map(row => `${row.item}/${row.id}`),
  candidates_without_a_current_meaning: rows.filter(row => row.current_meaning_matches === 'no-current-meaning').map(row => `${row.item}/${row.id}`),
  meaning_counts: Object.fromEntries([...new Set(rows.map(row => row.distinct_meanings_in_history))].sort().map(count => [count, rows.filter(row => row.distinct_meanings_in_history === count).length])),
}, null, 2));
