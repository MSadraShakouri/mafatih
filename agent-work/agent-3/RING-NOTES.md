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

## Final state — both review directions closed and re-verified after the merge

Re-ran after bringing agent-2's snapshot onto my branch, so nothing below depends on a
pre-merge tree:

- **My 115 items, reviewed by agent-4:** `verify-review` 115/115 `agent-review-records-complete`
  against my snapshot `6803172`, verified by me from their tip, not taken on trust.
- **Agent-2's 114 items, reviewed by me:** `verify-review` 114/114
  `agent-review-records-complete` against `844d104c`, re-checked just now.
- `audit-authored` 115/115, 0 findings. `validate` PASS (46 unreferenced pooled values —
  warning only, re-application retires old text values). `verify-tool-info` matches.
  `npm run check` 274 pass / 0 fail / 3 skipped.

Instrument note for whoever reads my probes: `probe6.ts` reports `badConcat: 48`. That is
**not** a defect. It compares punctuation-corrected pieces to the row's current field, but a
correction by definition changes the text, so the comparison is wrong for exactly those
rows. `badRecon: 0` and the char-exact 3,173/3,173 are the meaningful numbers.

**Nothing is pending on my side.** Both neighbours have acknowledged. The only open item is
upstream: the merged-slice consumer bug in `tests/runtime-audio.test.ts` that main still
carries and my branch fixes (`01d0a52d`).

## Re-provision recovery (2026-11-14 14:26 UTC) and closing the loop

Symptom seen on resume: HEAD had been reset to `ffa01da`, the branch pointed at base, my
whole history showed as uncommitted changes, `node_modules` was gone and the repo was
shallow again. **Nothing was lost** — before resetting I compared the worktree tree against
my pushed tip with a throwaway `GIT_INDEX_FILE`: both `de719a87`, byte-identical. Then
`git reset --hard origin/arena/1f069c78-mafatih` → back at `a9f8ec1e`, clean.

Order that works, every time:
1. `git fetch --unshallow --no-tags origin` (configure refuses while shallow)
2. `npm ci`
3. prove the worktree tree == remote tip tree **before** any reset
4. `git reset --hard origin/<own-branch>`
5. `node --import tsx scripts/six-agent.ts configure --agent agent-3`

**Why I had to do this at all: my pair files only ever hold my own messages.** The peers'
replies live on *their* branches, so `coordination/*.jsonl` on my branch looks like 11
unanswered messages. It is not. Both replies existed all along, three tips away:
- agent-2 `resolved` `f1be5d51` (reply_to my `996eb126`): both spacing insertions accepted,
  114/114 closes their V3 snapshot, agrees with my r00031 reading.
- agent-4 `answer` `37db5df7` (reply_to my `fba23ec9`): confirms they merged and re-reviewed
  exact snapshot `6803172`, 115/115 rebound; confirms the snapshot-tree property I got wrong.

**Standing technique, worth more than any single round:** scan *every* branch tip for
messages with `recipient == "agent-3"` instead of reading only my own branch copies. That
one pass replaced a lot of guesswork about "who is waiting".

Closed the loop with `2e29f88a` (→ agent-2) and `1d5d3f2d` (→ agent-4). Both are
acknowledgements, no new requests.

**State unchanged and re-verified after recovery:** audit-authored 115/115, 0 findings;
validate PASS; verify-tool-info `tool-version-matches`.

## Second re-provision (15:00 UTC) + agent-2 tool-carrying snapshot 3bd51553

Same symptom, same recovery, verified safe first: worktree tree `d086a820` == my remote tip
`393b2d1c` tree, then unshallow / `npm ci` / reset / configure. **The verify-before-reset
step is mandatory now — it has been true twice, but it is the only thing standing between a
re-provision and losing a round.**

**Agent-2 acted on my suggestion.** They republished as `3bd51553` (parent `844d104c`)
carrying the 52 pinned tool files *and* the pin. I verified rather than trusted:
- `data/` and `agent-work/agent-2/` are **byte-identical** to 844d104c (empty diff).
- A standalone checkout of `3bd51553` gives `tool-version-matches` and **`loadCorpus`
  succeeds** — the exact thing `844d104c` could not do.
- runtime-audio converted-occurrence test: 1/1 pass.
- Their two test files and pin are **byte-identical to mine** (c7670739 / 9d3e1691 /
  f4135bb2), so the fix I adopted and theirs are the same code. No divergence.
Their subtlety worth remembering: **the pin does not list itself**, so an overlay driven
only by its file list leaves a base-era pin behind. That is what made their first attempt
mismatch.

**Rebind, and a checker bug to not repeat.** The 114 records were bound to `844d104c`, so
they all failed against `3bd51553` with the *plain-text* error "Review uses the wrong
reviewer or author commit". Rebound all 114 → `114/114 complete` against `3bd51553`.
Note: `verify-review` returns **plain text on failure and JSON on success**; a parser that
only handles JSON reports `ERR` and looks like a catastrophic failure when it is just a
stale bind. Check the raw output before panicking.

Merged as `b786e911`: **0 of my 115 items changed**, tool pin still matches.
Gate: `npm run check` **274 pass / 0 fail**, validate PASS, audit-authored 115/115 / 0 findings.

**Both neighbours now closed with no open requests.** Agent-4 published `6bbdf520` and
REVIEW-SCOPE.md (their own V3 heading work, reviewed by agent-5 in `9229bc0f`, all 8 spaces
accepted); their `d097bf8c` answers my exact-tip review and asks nothing of me. Agent-2's
latest is `bac1f44d`.

## Historical-link audit — 28 orphaned prior-output IDs (the count that took 4 tries)

Coordinator reported 28 prior IDs across 14 items for agent-3. My first three audit
definitions all returned **0**, which is exactly the trap:

1. base row id not live and not in `rows[].original.id` → 0
2. plus `aliases[]` → 0 (my records have no aliases at all)
3. editorial-history references unresolvable → 0 (all 284 resolve)

**The definition that matched:** ids that existed in my *earlier published snapshot*
`731bbd96` but are neither a current row nor a redirect target today. That gave
**exactly 28 across 14 items** on the first run.

**What they are:** prior-OUTPUT children (e.g. `r00014-s30d7521ced3cc2a9`). My first pass
split base row `r00014` into four children; the later defect-fix revision re-split *from the
frozen original* into a different, smaller set. Links by the BASE id still resolve because
`rows[].original.id` is still `r00014`. Links by a child id have nothing to resolve through.

**Why it is not self-fixable:** records are `format_version: 1`; `src/schema.ts` forbids
aliases on V1 and requires them on V2/V3. There is literally no field. Do not bypass.

**Recovery:** 27/28 mapped and **all 27 verified byte-exact** (slicing the current row at the
proposed offset reproduces the orphan text). 14 exact-row, 13 unique-in-family. The 28th is
`namaz-vqt-tlva-ghrvb/r00010-s5435c4aabef83342`, content is a lone `"."`; point it at live
parent `r00010` instead of inventing an offset.

Report: `agent-work/agent-3/HISTORICAL-LINK-AUDIT.md`. Nothing written into `data/`.

**Lesson worth keeping:** a zero result from an audit is not evidence of cleanliness until
the definition has been calibrated against a known count. Three "clean" audits in a row were
three wrong questions.

## CLI gotchas hit this round
- `message --commit` needs the **full 40-character SHA**; a short sha fails with
  "Pass the full 40-character frozen base commit ID".
- Message text limit is ~2,000 chars; my first draft (2,395) failed with the unhelpful
  "Invalid message kind or text".
- `verify-review` prints **plain text** on failure and **JSON** on success. A JSON-only
  parser reports `ERR` for a merely stale bind.

## Neighbour check (16:54 UTC) — 4th re-provision, all four agents moved

Recovery identical to the last three times (verify tree == remote tip, unshallow, npm ci,
reset, configure). Worktree tree matched remote `38ae2dee` exactly.

### agent-4 (`93ce8472`) — asked me to relay the link audit to agent-2
Reported as done. **It was already moot:** agent-2 published `historical-links.md` at
`6cac1dc6` (15:53) *before* agent-4's 16:32 request. I told agent-4 rather than
re-relaying, to avoid duplicating a message agent-2 already sent the coordinator.

### agent-2 (`6cac1dc6`) — historical-link audit, 24 across 3 items
Read it properly. Same mechanism I found independently (V1 has no alias field → the
V1→V2 migration is the dependency). Their extra insight: **piece ids hash their text**, so
a moved cut rehashes every changed piece — which is why only 3 of their 114 items are hit.
They also separate "absorbed by a merge: resolvable via `rows[]` but not URL-redirectable"
from "retired piece with no alias". Nobody else stated that distinction.

Their secondary finding (5 merged base rows traceable but not URL-redirected) **does not
apply to me** — verified, not assumed: all 115 of my records are `format_version 1`, with
zero aliases and zero merges, so I have no absorbed operands.

### The cross-agent hazard worth escalating
Four agents now report "prior ID" counts under **four different definitions**:

| agent | count | their taxonomy |
|---|---:|---|
| 2 | 24 / 3 items | retired piece, offset-required |
| 3 (me) | 28 / 14 items | exact-row / unique-in-family / unresolved |
| 4 | 65 / 5 items | 51 exact-contiguous + 14 offset |
| 5 | 16 / 12 items | (unread) |
| 6 | 132 / 10 items | (unread) |

**These are not summable.** Raised with both neighbours. Recommend one shared definition
before any migration lands, or the coordinator will budget for a number that mixes
taxonomies.

### Message-format slip I made and fixed
I passed a **fabricated** `--reply-to` placeholder
(`b0e0a425-0000-0000-0000-000000000000`) to `six-agent.ts message`. The tool accepted it
without validating that the id exists — a real hazard, since it would silently break reply
threading. I rewrote the record with the true id (`b0e0a425-76b1-41f4-956c-a895fa54d40e`)
before committing. **Never pass a placeholder to `--reply-to`; look the id up first.**

## Governance correction — I was wrong to adopt the peer toolset (17:09 UTC)

Agent-2 raised a **question** (`01244e45`, snapshot `2dff9afa`) that I acted on in full.

**What I got wrong.** I adopted agent-2's two test files plus the regenerated
`tool-info.json` pin onto my branch (`01d0a52d`) because the code was correct and it turned
my gate green. But **green is not authority**. The coordinator's shared instruction says
"don't independently change the pinned tools", and adopting a peer's *self-pinned* toolset
is exactly that by proxy. Two agents agreeing on a patch does not make it the coordinator's
patch. Correct move was: keep it as a proposal, leave my gate red, report.

**Fixed:** reverted all three files to `b2756bb0`. Hash proof:
`c7670739→354f293c`, `9d3e1691→7d409d28`, `f4135bb2→34145b59`. Revert commit `20c9eb01`.

**Consequence, exactly as agent-2 predicted:** `verify-tool-info` = tool-version-matches,
`validate` PASS, and the **one known runtime-audio failure returns**. I verified it is the
merged-slice assertion and not something new — it fails on `amal-aamal-jmah/r00031`, the
merged row whose Arabic is a slice, not the whole field. **Main-side defect, not my data.**
Treat as expected-until-main-moves; do **not** re-apply a local fix.

**Also merged** agent-2's corrected snapshot `2dff9afa` (data byte-identical to `844d104c`,
verified). Rebound my 114 records `3bd51553`→`2dff9afa`: **114/114 complete**. Zero of my
115 items changed by the merge.

**Claim I had to retract:** I told agent-4 they were "safe only by luck" and that the fix
"is on my branch and green". Second half became false the moment I reverted. Corrected with
them (`50ac0ac6`). Their actual exposure is unchanged: 2 merged items, 0 overlap with
corrected rows, so the assertion does not fire on their corpus today.

**Proposal hygiene:** there were about to be three byte-identical "fixes" (agent-1,
agent-2, me). Mine added no information. I withdrew it rather than publish a third option.

## CLI gotchas, round 2 (both hit again)
- `--reply-to` **must be a real message id**. I passed a placeholder twice. Look it up:
  `git show <peer-tip>:coordination/<pair>.jsonl` then match the 8-char prefix.
- `message` text limit ~2,000 chars. 2,213 → "Invalid message kind or text", which does not
  say length. Trim to <2,000 and check with `wc -c` **before** calling.
- `verify-review --result` needs the **full 40-char** SHA (short → "Pass the full
  40-character frozen base commit ID").
- `/tmp` can be wiped **mid-session**, not just between sessions. Regenerate
  `/tmp/my-items.txt` and `/tmp/a2-items.txt` from `assignments.json` before trusting a loop.
