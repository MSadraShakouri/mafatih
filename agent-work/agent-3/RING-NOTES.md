# Agent-3 ring notes (durable; survives re-provisioning)

## Mid-round tool upgrade (main c75e50c) — merged into this branch as 60182bb
Coordinator added reversible cross-row merging (V2 row-split records).

- `merge-preview` / `merge-rows --join exact`: literal concatenation of two **adjacent**
  current rows. No separator is inserted, not even a space. Refuses differing row kinds
  or conflicting row-level source attributions. Writes layout `merges:[{left,right,checked:true}]`,
  item, mapping and text values as one guarded operation. Does not git add or commit.
- V2 records carry `target_start` offsets and `origin_kind`; older V1 records stay valid.
- Process: merge updated `main` before using/reviewing V2 records; keep `$BASE` and
  registration; an unchanged V1 result keeps its existing review, but **an item changed
  by a merge needs a fresh independent review**.
- `restore-snapshot-texts` added for prior-snapshot text-pool repair.
- Verified after merge: `verify-tool-info` -> tool-version-matches (v22.22.3 / ICU 78.2 /
  Unicode 17.0); `npm run check` 271 tests, 268 pass, 0 fail; `validate` PASS.

### The tool does NOT fix my two open findings
`mergeRows` refuses `left.kind !== right.kind`, and in `dua-hrm-hsyn-alyh` r00003 the four
rows are `{ar0 recitation},{ar1 recitation},{fa0 recitation},{fa1 recitation}`. Merging
adjacent pairs would fuse Arabic+Arabic and Persian+Persian, not pair Arabic with Persian.
The correct shape is two rows each carrying both languages — a layout-shape fix, not a merge.

### Same defect class in MY OWN output (must fix before handoff)
Four rows emit 2 Arabic pieces + 2 Persian pieces as separate single-language rows with
zero bilingual rows, where the pieces correspond 1:1:
- `item-avl-taqybat-mshtrk` r00014
- `item-avl-taqybat-mshtrk` r00018
- `namaz-item-3` r00001
- `ziyarat-bad-rza-alyh` r00017

### Tooling gotcha
`merge-preview`/`merge-rows` call `requireOwnBranch(author)`, so they only run on the
**author's** registered branch. A reviewer cannot dry-run them on a peer's item in a
scratch worktree: it fails on the branch-pattern check, then on "Register agent-N on your
own branch". To test on a peer's item you must evaluate the layout shape instead.
