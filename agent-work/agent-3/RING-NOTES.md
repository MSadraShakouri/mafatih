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

## Second upgrade (main b2756bb0) — merged as b2756bb0 into this branch
"Add explicitly reviewable row-merge spacing" — introduces **V3** row-split records.

- `merge-preview`/`merge-rows` gain `--join ar-space|fa-space|both-space --reason TEXT`.
  Inserts exactly one U+0020 into the CURRENT canonical text for the chosen language.
  Explicitly a **proposed editorial correction**, not a source character and not an
  approval. Refused if either side is absent, boundary whitespace already exists, or the
  insertion would split a grapheme or protected Quran marker.
- V3 mapping records each inserted space with destination code-point offset, source-side
  row IDs and reason, while retaining both exact originals and provenance.
- V1 and exact V2 behaviour unchanged; old clients cannot read V3.

### Consequence for me as REVIEWER
If an item I review carries V3 insertions, the review MUST include a `spacing_review`
array with one entry per insertion, each with its own `decision` and a non-empty `note`.
Layout + source acceptance alone is NOT sufficient — `verify-review` returns needs-work.
The entries are hash-checked against the record's `insertions`, so a stale spacing review
fails with "Spacing review is stale or mismatched".
`review-template` now auto-populates `spacing_review` from a V3 record with `pending`.

Verified after this merge: verify-tool-info -> tool-version-matches; npm run check
277 tests, 274 pass, 0 fail.

## Agent-2 revision 775e7df5 — re-reviewed, 114/114 complete
Both pairing findings are genuinely fixed, verified by reading row content:
- `dua-hrm-hsyn-alyh` r00003: now 2 rows, each bilingual, ar part i with fa part i.
- `monajat-mnajat-tlb-rvzy` r00003: now 2 paired bilingual rows, AND the ar cut moved
  680 -> 648. That second part matters: at 680 the cut fell after «اِنَّکَ ذُو الطَّوْلِ
  الْعَظیمِ», whose rendering OPENS the Persian piece, so pairing alone would have left a
  phrase-level misalignment. Agent-2 caught that themselves. Better fix than I asked for.

Agent-2 also used the new merge tool for three source row shifts the same-row layout could
not express: amal-hsyn r00133+r00134, namaz-sadq r00002 (ya-sani litany), ziyarat-zman
r00006+r00007. All three records are V2 with **zero spacing insertions**, so no
`spacing_review` was required. They deliberately did NOT merge amal-aamal-jmah r00030/31 or
ziyarat-item-11 r00002 because the source split those without whitespace and merging would
word-glue («مَعَاکِفُ|الْهِمَمِ», «اَلسَّلامُ|عَلْیْکَ») — correct call under the no-invented-
whitespace rule.

Full re-verification at 775e7df5: 3,543/3,543 original occurrences character-exact,
4,608 cuts, 0 mid-word, 3 source-inherited orphan separators, 114/114 records complete.

### Remaining work on MY side
My own 4 unpaired rows (item-avl-taqybat-mshtrk r00014/r00018, namaz-item-3 r00001,
ziyarat-bad-rza-alyh r00017) are still unfixed. See "Same defect class in MY OWN output".
