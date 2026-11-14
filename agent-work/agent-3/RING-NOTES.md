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

## My own four pairing defects — FIXED
`item-avl-taqybat-mshtrk` r00014, r00018; `namaz-item-3` r00001; `ziyarat-bad-rza-alyh` r00017.

**Diagnosis (I initially misread this).** I first assumed these were like agent-2's cases —
parallel pieces emitted as four single-language rows, fixable with `merge-rows`. Wrong.
Previewing `merge-rows` on r00014 showed it would have produced one row holding the Arabic
prayer plus only «خدایا!» and orphaned the rest of the Persian.

**Actual defect:** the `fa` field is the complete translation of a *single* Arabic prayer,
and I had inserted a gratuitous `fa` cut in the middle of that translation (e.g. splitting
«خدایا! درود فرست بر…» after «خدایا!»). That made the Persian look like two pieces while
the Arabic stayed one, so the layout had nowhere to put `fa` part 1 except its own row.

**Fix:** removed the `fa` cut in the plan (cuts `[]`, kinds `[recitation]`), rebuilt each
layout to two rows — `{fa: ar#0}` instruction/note, `{ar: ar#1, fa: fa#0}` recitation — and
re-applied. Result is two rows, the second carrying both languages.

Re-verified: 3,173/3,173 original occurrences character-exact across all 115 of my items,
0 mid-word cuts, unpaired-parallel-pieces detector now returns 0.
`audit-authored` 115/115 complete, 0 findings; `npm run check` 277 tests 274 pass 0 fail.

NOTE: `validate` reports 18 unreferenced pooled texts at HEAD and 26 after this fix.
That pre-existed my change; re-application retires old text values. Not an error.

## Agent-2 snapshot 844d104c — V3 spacing review (first time applying the new duty)
Only TWO items changed vs 775e7df5, both V3 with one insertion each:
- `amal-aamal-jmah` ar @199, between «مَعَاکِفُ» and «الْهِمَمِ».
- `ziyarat-item-11` ar @11, between «اَلسَّلامُ» and «عَلَيْكَ».

I checked each against the BASE rows rather than the author's description. Both base
boundaries genuinely have no whitespace (`r00030` ends «…وَ مَعَاکِفُ« / `r00031` begins
«الْهِمَمِ…»; `r00002` ends «…گفت می‌گویم: اَلسَّلامُ» / `r00003` begins «عَلَيْكَ…»),
so an exact join produces a non-word. Accepted both: one U+0020 each, no other character
touched. Verified programmatically that the space really sits at the recorded offset and
is not doubled before accepting.

Note the ziyarat row also keeps a legitimate leading space from the base narration
boundary; the insertion is a separate second space inside the salutation.

Also decided the pre-existing plan issues for both items (3 and 1 respectively), including
amal-aamal-jmah r00031's ambiguous-boundary, which is a genuine source-corpus row shift the
same-row layout cannot fix — recorded as a source limitation, not a splitter error.

Result: 114/114 records complete at 844d104c. Data: 3,543/3,543 character-exact ignoring
the two authorised spaces, 0 mid-word cuts, 3 source-inherited orphan separators.

## Agent-4 status — IMPORTANT
Agent-4's latest snapshot `283c8c6d` contains NONE of my work: all 115 of my items are
byte-identical to BASE `ffa01da9`. Their 115 review records are bound to `d10ce632` and all
fail verification against my `6803172` (115/115 not-valid). Timing explains it: their
snapshot is 08:16, my ready message was 08:24, so they simply have not seen it yet. But it
means "my snapshot is merged and reviewed" over there is true only for d10ce632, which is
two revisions stale and contains the four pairing defects I fixed afterwards.

## Main-side defect found while merging agent-2's V3 snapshot (2026-11-14)

Merging 844d104c was clean (my items untouched: 0 of 115 changed), but the gate went red:
`npm run check` → 274 pass / **1 fail**, "generated reader, search, navigation and
English data use the corrected canonical occurrences".

**Cause, and it is not agent-2's data.** `tests/runtime-audio.test.ts` at main `b2756bb0`
still asserts `built?.[piece.language] === piece.text`. Once an occurrence maps to a slice
of a row that later merged with a neighbour, the built field is the whole merged row, so
that equality is false by construction. `tests/helpers/row-split-history.ts` on main
already slices at `target_start`; the consumer was never updated. Reproduced on a clean
main worktree by dropping in only agent-2's two changed items → same failure. Latent for
anyone: 3 of my items (amal-aamal-jmah, amal-hsyn-alyh-alslam, ziyarat-zman-alyh-alslam)
have both a punctuation-corrected row and a merged row. Agent-4's 2 merged items happen to
have no overlap, so their gate stays green by luck.

**Fix taken:** agent-2's own f7ce25f9 consumer change (compare the slice at `target_start`,
assert the whole row separately) plus its regenerated `tool-info.json` pin. Both are
coordinator-pinned files, so they move together; `verify-tool-info` still reports
`tool-version-matches`. Committed `01d0a52d`.

**A second, separate trap — do not conflate the two.** A *standalone checkout* of
snapshot 844d104c cannot load its own corpus: its `src/schema.ts` / `src/row-splits.ts`
are base-era while `data/row-splits/amal-aamal-jmah.json` already carries `aliases` and
`insertions`, so `build:data` fails with "Structural validation failed: output text is
missing" and `loadCorpus` rejects the record. Merging the snapshot into a branch that
already has main does **not** regress the schema (verified: my schema hash is byte-identical
before and after the merge). So this only bites someone reading the raw snapshot tree.
I initially told agent-2 the merge caused it and sent `c5cdf9f3` correcting that.

Final state after both: `verify-tool-info` matches, **274 pass / 0 fail / 3 skipped**,
`validate` PASS, `audit-authored` 115/115 with 0 findings, my 115 items unchanged by the
merge.

**Open for the coordinator:** this consumer bug is on main and will hit every agent whose
corpus gains a V3/V2 merge. My branch carries the fix; main does not.

## Agent-4 round CLOSED — independently verified, not taken on trust

Agent-4's tip `857420b0` merges `4cd08faa` (my snapshot 6803172) and `5df47f79` rebinds
their 115 review records. I did not accept their "115/115 verified" on trust: I fetched
their tip and ran `verify-review` myself for all 115 items against my exact snapshot
`680317220f16…`. Result **115/115 agent-review-records-complete**, 0 failures.

Content check on their fresh work: 3,188 source entries, **all accept/accept**, each with a
note. 3,180 are the same structural-inspection template repeated; the **8 substantive
notes land exactly on my four fixed rows** (item-avl-taqybat-mshtrk r00014+r00018,
namaz-item-3 r00001, ziyarat-bad-rza-alyh r00017) and describe the fix correctly. So the
re-review is real where it matters, and honestly labelled where it is structural. Caveat
worth keeping: 3,188 is not 3,188 independent judgements.

**I was wrong about their snapshot and have retracted it.** `six-agent-snapshot` deliberately
descends from the *prior isolated snapshot* and contains only the agent's own authored
items. So `283c8c6d` not containing my work was a tool property, not a failed merge. My
original "question" assumed otherwise. Recorded in `69e84dcc` so it is not re-raised.

Also noted for them: they are only *accidentally* safe from the main-side consumer bug —
2 merged items, 0 overlap with punctuation-corrected items.

## Status
Both review directions closed. My 115 authored items: 115/115 complete, agent-4 records
verified. Agent-2's 114: 114/114 complete at 844d104c, merged into my branch. Gate green:
274 pass / 0 fail / 3 skipped, validate PASS, verify-tool-info matches.
Remaining open item is upstream only: the main-side consumer bug my branch fixes.
