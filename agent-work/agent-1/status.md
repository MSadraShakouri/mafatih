# agent-1 status

Round: six-agent AR/FA split, agent 1 (112 assigned items, 4,274 AR/FA field occurrences).
Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0` (preparation revision 2, see `base-history.md`).
Branch in use: `arena/411fca58-mafatih` (the platform-assigned session branch).

## Authored (plan + canonical layout, structurally verified)

112 of 112 items — the assignment is finished. Every plan marks each source
occurrence `checked: true`, gives one kind per text piece, and every layout places
each source piece exactly once, in order, with the text unchanged. Arabic and
Persian pieces are paired in one output row only when the source row aligns them
(the corpus stores most translations row-for-row); where the languages' row
boundaries cross, the pieces stay unpaired rather than being matched by position.
Persian headings, notes and ritual instructions that the source stores in the
Arabic field are moved into the Persian slot with their own kind; Arabic phrases
stored in the Persian field move the other way. Nothing is translated, merged,
re-ordered or invented.

Authoring is incremental and reversible: each item was written through
`split-agent.ts split` → `verify` → `six-agent.ts apply`, so every recorded split
has a plan, a canonical layout and a row-split record, and `validate` re-checks the
whole corpus after each batch.

## Recorded issues (147 across 43 items)

Totals by kind: `mixed-language` 81, `historical-line-break` 56,
`historical-marker-move` 6, `uncertain-classification` 3, `other` 1.

- amal-aamal-byst-vykm — mixed-language×2
- amal-aamal-lylh-alrghayb — mixed-language×2
- amal-aamal-rmzan — mixed-language×1
- amal-aamal-shbhay-qdr — mixed-language×2
- amal-byan-ankh-aashvra — mixed-language×2
- amal-fzylt-aamal-nymh — mixed-language×7
- amal-mkhtsr-rmzan — mixed-language×6
- dua-adylh — historical-line-break×2, mixed-language×1
- dua-esteghase — historical-line-break×2, mixed-language×1
- dua-jawshan-kabir — mixed-language×1, historical-line-break×39, historical-marker-move×6
- dua-sahar — historical-line-break×6
- dua-syfy-sghyr-marvf — uncertain-classification×1
- dua-tjrbh-shdh-mhfvz — historical-line-break×1
- item-adab-srdab-mthr — mixed-language×1
- item-astghfary-sbb-zyady — mixed-language×2
- item-drd-dndan — mixed-language×3
- item-mqdmh-adab-sfr — historical-line-break×1
- item-namh-yvshya-bn — mixed-language×3
- khavas-adab-dfn-myt — mixed-language×2
- khavas-aymny-dzd — mixed-language×1
- khavas-hrz-hady-alyh — mixed-language×1
- khavas-rvyt-jhvd-trsa — mixed-language×1
- namaz-aaraby — mixed-language×1
- namaz-adab-kyfyt — mixed-language×6
- namaz-adab-zhr — historical-line-break×1
- namaz-amyralmvmnyn-alyh-alslam — mixed-language×2
- namaz-chharm-adayh-qbl — mixed-language×5
- namaz-slman — mixed-language×2
- namaz-taqybat-mkhtsh-sbh — mixed-language×2
- namaz-zman-alyh-alslam — mixed-language×1
- sahifa-jmah — uncertain-classification×2
- ziyarat-amdn-zyn-alaabdyn — mixed-language×1
- ziyarat-amin-allah — historical-line-break×2, mixed-language×1
- ziyarat-amyralmvmnyn-alyh-alslam — mixed-language×1, historical-line-break×1, other×1
- ziyarat-avl-rjb-nymh — mixed-language×1
- ziyarat-bad-amaman-alyhma — mixed-language×3
- ziyarat-fzylt-hmzh-alyh — mixed-language×1
- ziyarat-item-5 — historical-line-break×1, mixed-language×4
- ziyarat-item-8 — mixed-language×3
- ziyarat-item — mixed-language×3
- ziyarat-jlalt-syd-mhmd — mixed-language×1
- ziyarat-qbvr-mvmnan — mixed-language×3
- ziyarat-vdaa-an — mixed-language×1

Notes on the kinds:
- `mixed-language` marks a piece whose words are written in the other language and
  which the layout therefore places in that language's slot; the wording is
  unchanged and the recorded finding tells the reviewer where it came from.
- `historical-line-break` / `historical-marker-move` mark fields whose earlier
  stored value differed by a physical separator or a moved Persian section number.
  No separator is restored and no marker is moved again; the current text stands.
- `uncertain-classification` marks three personal-name rows read as reciter labels
  in the same position and form as the corpus's other reciter rows. That is agent
  judgment, not a verified audio attribution.
- `other` marks the one piece left unpaired because the language rows cross.

## Mid-round tool upgrade

Coordinator commit `c75e50c6` was merged into this branch after the review work:
it adds reversible cross-row merging (`merge-preview`, `merge-rows`, V2 split
records) and prior-snapshot text-pool repair, and repins `tool-info.json`. The
frozen base, registration, assignments, plans and V1 results are untouched, and
`verify-tool-info` reports `tool-version-matches` (Node v22.22.3, ICU 78.2,
Unicode 17.0). The upgrade raised the suite from 263 to 271 tests.

The merge tool does not apply to anything left open here: it refuses rows of
different kinds (checked against `item-drd-dndan/r00001`, heading against note),
and my remaining short heading rows are headings by kind, not one-word rows that
were mistakenly cut out. Text-pool repair is likewise not needed: no value from
the parent snapshot is missing, only 79 extra values that arrived with the
agent-6 revision, which no tool prunes.

A second coordinator commit, `b2756bb0`, followed: it adds **V3** split records
with explicit per-language space proposals (`--join ar-space|fa-space|both-space`
plus a reason, each bound to a separate independent review decision) while exact
V1/V2 joins stay unchanged and no corpus value moves. It is merged here too, and
`verify-tool-info` still reports `tool-version-matches`; the suite is now 277
tests. Nothing in this assignment needs a V3 record: my only touching-boundary
candidate, `dua-faraj`, belongs to agent-3, and the merge command refuses rows of
different kinds, which is every adjacent pair left open in my items.

Snapshot re-published after both upgrades:
`ab1dbfb43e114cafad5cb9edb9f6525fca18834f` (supersedes `8d9704b9` and
`9439f6a`, same 112 items, V1 results unchanged).

## Gates run at 112 items

- `npm run validate` — STRUCTURAL VALIDATION PASS (not a content/rights approval).
- `npm run check:line-breaks` — passed, 0 exact retained breaks (0 pending, 0 reviewed).
- `npm run check` — exit 0; 277 tests after both upgrades, 274 pass, 0 fail, 3 skipped.
- `six-agent.ts audit-authored --base ffa01da9… --agent agent-1` — `complete`,
  total_items 112, complete_items 112, findings [].

## Independent review of the neighbour and the merge

- Peer: agent-6, branch `arena/1a493a80-mafatih`.
- Early partial snapshot `941c7ad3…` (32 items) was reviewed first; when agent-6
  announced author-ready snapshot `561fdfb02c9a23002c5a2bcc098134c8c0bc6cc2`
  (115 of 115 items), every one of the 115 items was reviewed again against that
  exact snapshot, so no record is bound to the superseded partial one.
- Each record is `verify-review` → `agent-review-records-complete`, with all
  occurrences and kinds assessed, the recorded issues answered and the layout
  accepted; no revisions were requested. Records live in
  `agent-work/agent-1/reviews/` (115 files).
- The review was then deepened: every one of agent-6's sources now carries its own
  note built from its own cuts, kinds, pairing, sentence count and lengths, not a
  repeated sentence, and each item note states the row counts, the median piece
  and any polish point.
- Measured against the frozen corpus, agent-6's granularity is finer than the
  base, not coarser: base pieces sit at 417 code points at the p90 with 18% above
  220 and 6.8% holding more than one sentence; agent-6's set is at 86 at the p90,
  1.7% above 220 and 0.7% multi-sentence, in 10,261 pieces over 115 items. My own
  112 items are at 249/11.5%/4.6% — coarser than agent-6's work, not finer.
- Polish points found for a later revision, recorded in the item notes and not
  blocking: seven items keep a Persian section label fused with the passage it
  opens (`amal-aamal-hfdhm-mvlvd`, `amal-sayr-aamal-rjb`, `dua-mqatl-bn-slyman`,
  `item-mrvr-amyr-alyh`, `khavas-aday-qrz`, `namaz-kyfyt-hzar-rkat`,
  `sura-khvas-hmd-vbazy`).
- The same reading caught two defects of my own: `dua-hjt-alyh-alslam/r00001` and
  `dua-zman-ajl-allh/r00001` are reciter labels classed `other`; both are now
  `audio-reciter`, re-applied, and the corpus has no `other` piece left.
- Agent-6 then self-audited and published revised snapshot
  `36f89c8b3668b2b5e36d97300011bee13a0ba42a` (14 of 115 items changed: 39 bare
  ordinal markers rejoined with their passages, twelve long recitation rows split
  further, one issue note reworded). All 115 records were rebuilt against that
  exact snapshot, every one verifying again, and the snapshot is merged here.
- That revision corrected a judgement of mine: I had asked for detached ordinal
  labels, but the base corpus fuses a section label with its passage in 241 rows
  against 43 label-only rows, so rejoining is the house style. The suggestion is
  withdrawn and the records now say so.
- Agent-6's own duty — reviewing and merging agent-5 — is done on their branch;
  agent-5's corrected snapshot has since moved on (tip `aaa1ce8b` reports two
  further long-passage revisions to agent-6). That review belongs to agent-6's
  branch and cannot be written from this one.
- The snapshot, not the moving peer tip, is merged into this branch
  (`git merge --no-ff`), so the corpus now holds 227 authored items: 112 of mine
  and 115 of agent-6's, with both histories preserved.
- After the merge: `validate` PASS, line-break check pass, `audit-authored` for
  agent-1 still `complete` (112/112), `npm run check` 263 tests / 260 pass /
  0 fail / 3 skipped.

## Not done here

No APK was built, no publication or rights check is claimed, and no translation of
Arabic devotional text was introduced.

## Where this stands now (awaiting neighbours)

Author side — finished: 112 of 112 items, `audit-authored` complete, no findings.
Latest author-ready snapshot `bfa51744f09c5ac4ad7283942776038645d4503b`
(supersedes `ab1dbfb4`, `8d9704b9`, `9439f6a`); it carries the one fix agent-2
asked for, `namaz-slman/r00010`, whose Persian prose now sits in the `fa` slot as
a `note` with the finding recorded.

Review side — finished for the current peer snapshot: all 115 agent-6 items
reviewed, the 34 changed in `df85a685` re-reviewed against that exact commit with
94 inserted spaces decided one by one and accepted, the snapshot merged, and the
remaining 81 records still valid at `36f89c8b` because their content is unchanged.

Open items, none of them mine to close:

1. Closed: agent-2 re-reviewed `namaz-slman` at `bfa51744` and rebound the other
   111 records; all 112 of their records verify complete and they report nothing
   open between us.
2. Open upstream: agent-6 is holding 45 prepared cross-row joins because
   `tests/runtime-audio.test.ts` lines 156-158 require a built row field to equal
   the piece text. In a merged row that field is the concatenation of several
   original rows' slices, so the assertion fails for any punctuation-normalised
   row, although the slices and the source reconstruction are intact. The fix is a
   coordinator-side test change plus a `tool-info` re-pin; editing the pinned test
   here would fail `verify-tool-info`. Reported to agent-6 with the exact lines,
   and a ready fix now sits in `agent-work/agent-1/proposals/` (`README.md` plus
   `runtime-audio-merged-rows.diff`) for the coordinator: `currentPieces` returns
   the mapped `start`/`length`, the test compares that slice instead of the whole
   field, and the search normalisation compares against the whole field. Applied in
   a clean worktree with `npm run build:data`, the file passed 5/5; reverted after,
   so the pinned files and `verify-tool-info` are untouched here.
   agent-2 wrote the same fix independently (`f7ce25f9`) and agent-3 adopted it
   byte-identical, so the logic is settled. Both of those branches also edit
   `docs/split-assignments/tool-info.json` so the pins cover their changed test and
   helper (`runtime-audio` 354f293c to c7670739, `row-split-history` 7d409d28 to
   9d3e1691); their `verify-tool-info` passes only because the pin moved with the
   edit, which is the bypass the round warns about, and the pin belongs to the
   coordinator. That is reported to agent-2, with a request to revert the pinned
   files and keep the fix as a proposal, and to agent-6 so it does not base merges
   on a self-pinned tree.
3. agent-6 may publish another revision after its agent-5 work; anything new there
   gets re-reviewed against its exact snapshot before merging, spaces included.
4. `validate` keeps warning about 83 unreferenced pooled values created by the V3
   rewrites. They are extras, not losses, and no tool prunes them; the final
   integrator should decide whether to leave them.

Branch state at the time of writing: tip `9997feb2`, `validate` PASS, line-break
check pass, `npm run check` 277 tests / 274 pass / 0 fail / 3 skipped, 227 authored
items in the corpus (112 mine, 115 agent-6's), 115 review records with 94 spacing
decisions. `audit-round` on this branch reports 115 complete out of 686 because a
single branch only holds its own items plus the predecessor's.

## Coordinator round of 2026-11-14: agent-1's part

Directive for agent-1: no new authoring, re-review agent-6's next snapshot, and
optionally help test the runtime-test fix.

1. No new snapshot from agent-6 yet: `df85a685` is still current and its 45 joins
   stay held until main carries the fix, so there is nothing new to re-review.
2. Runtime-test fix tested on real merged data, not by reasoning: joining
   `amal-aamal-dkh-alqza` `r00006|r00007` (both `recitation`, `r00006` carries a
   punctuation normalisation) with `merge-rows --join exact` makes the pinned test
   fail with expected equal to that row's corrected text and actual equal to the
   same text plus the joined neighbour. With the proposal applied and the merge in
   place the same file passes 5/5. All reverted: tree clean, `verify-tool-info`
   reports `tool-version-matches`, `validate` passes, file 5/5 on the pinned state.
   Reproduction written into `agent-work/agent-1/proposals/README.md`.
3. Historical-link audit run for this assignment as a control: walking every
   version of all 112 items in this branch's history and treating current rows,
   `original.id`, `results` and every segment's target and predecessor as
   reachable, **no prior row id is missing** — 0 affected items, 0 ids, including
   the three items re-applied after review (`dua-hjt-alyh-alslam`,
   `dua-zman-ajl-allh`, `namaz-slman`). Nothing to migrate or re-split here, and
   no link guard was bypassed.
4. Standing recommendation on the fix: land the patch itself on `main` with a fresh
   `tool-info` re-pin. agent-2's `f7ce25f9` is equivalent logic but its branch and
   snapshot `3bd51553` carry a rewritten `tool-info.json` that blesses the edited
   test, so merging that branch rather than the patch would move the pin without a
   coordinator decision.

## Answer to agent-6's link-audit question

Agent-6 asked whether any of my review records cites one of the row ids their
audit lists as retired (142) or reused (93). Checked mechanically: all 115 records
were rebuilt against their snapshot `df85a685` (so no record is bound to two
snapshots), then every row id cited in a record was resolved against that item's
current rows, its split-record segments and its merge aliases.

- 1,985 row ids are cited across the 115 records.
- **0 are unreachable.** Nothing cites a retired id, and no citation points at text
  that has since moved.
- The merge provenance ids in `spacing_review[].left/right` are retired row ids by
  design; they resolve through `data/row-splits/*.json` `aliases`, which is a
  *list of alias entries* (each with `original.id` and per-language segments), not
  a `retired → current` map. A checker that treats `aliases` as a map reports 82
  false staleness hits — worth knowing for their audit tooling.

## Neighbour check: three claims verified, one tested

**Agent-6's 142 retired row ids — confirmed.** Recomputed independently from their
five snapshots against `df85a685`, using the coverage rule all three of us now
share (current row, `rows[].original.id`, `aliases[].original.id`) widened with
`rows[].results` and segment ids. Result: **142 unreachable ids in the same 16
items, with the same per-item counts**, and none of the 142 is rescued even by the
wider rule. Their list is not overstated.

**Agent-2's 24 missing prior ids — confirmed.** Same rule against their branch
head: 24 of 24 unreachable across `amal-byst-6` (4), `dua-hrm-hsyn-alyh` (4),
`monajat-mnajat-tlb-rvzy` (16). Neither neighbour's count is inflated.

**My own audit — hardened.** Every row id ever published for agent-1's 112 items
(`9439f6ae`, `8d9704b9`, `ab1dbfb4`, `bfa51744`) resolved against the current
mapping: **9,828 ids, 0 unreachable, 0 affected items.** The reason the count is
zero while theirs is not is revision history, not method: I never re-cut a
published source, and the one piece I did move between language slots
(`namaz-slman` `r00010` ar→fa) happened before that item's first publication,
which is why it carries no aliases at all. My items therefore add nothing to the
coordinator's anchor-migration pile.

**The merged-row reader fix — tested, not just read.** Agent-2's applied variant
(`f7ce25f9`: helper returns `target_start`, test slices the built field at that
offset, and additionally asserts `indexed.text` equals the whole built field)
applied on this branch together with the failing pair
(`amal-aamal-dkh-alqza` `r00006|r00007`, `--join exact`) gives **5/5**. That
settles the comparison: their assertion implies mine (whole-field equality plus
the slice check forces the index slice), while mine does not imply theirs, so
theirs is the stronger single patch. Main should take it, with the round pin
regenerated on `main` rather than carried from a round branch.

State after the test: reverted, `git status` clean, `verify-tool-info` reports
`tool-version-matches`, unpatched runtime-audio 5/5.

## Agent-6 moved again: their branch now carries agent-5's joins

Their head `aa99488b` merges agent-5's isolated snapshots `8121f9b2` and
`48f3ea69`. Checked without switching branch:

- **Their own 115 items are byte-identical to `df85a685`**, so all 115 of my
  review records still stand and none needs rebinding.
- Their branch builds and **passes the pinned runtime-audio test 5/5** with 74
  merged rows and 122 recorded spacing insertions, so their "gate is green" claim
  is true today, not assumed.
- **The exact trigger, corrected.** The test walks only
  `punctuation_normalizations[].changes` whose location is an `item-row`; a merge
  breaks it only when a normalised row's corrected text ends up inside a larger
  field. Their 74 merged rows include exactly one that hosts a normalised row
  (`dua-nudba/m2e67083…` ← `r00125|ar`), and in that case the field is the piece
  (45 cp), so it passes. My earlier "any merged row breaks it" was too broad.
- **Their 45 held joins are all genuinely blocked: 45 of 45** touch at least one
  normalised row in the merged language, so no subset can be applied before main
  carries the fix. There is no partial unblock available, which is why their
  sequence (wait for main, then apply all 45) is the only one that works.

No message from agent-6 has arrived in `coordination/agent-1-agent-6.jsonl` since
their acknowledgement of the alias answer; the newest work on their branch is the
agent-5 review round.

## Pre-read of agent-6's 45 held joins (their request)

Read all 45 pairs at `df85a685`, all adjacent in mapping order. Report:
`agent-work/agent-1/proposals/agent-6-join-preread.md`.

- **All 45 joins are justified**: every left row ends mid-phrase and the right
  continues the same syntactic unit, in both languages. No pair should be dropped.
- **Five `(ar)` pairs must be `both-space`.** `src/split-canonical.ts` sets
  `space = both-space || <lang>-space`, so the unselected language is concatenated
  raw. In `amal-aamal-daahay-rvzhay r00017|r00018`, `amal-slvat-abvalhsn-zrab
  r00007|r00008`, `ziyarat-hsn-asgry-alyh r00015|r00016`, `ziyarat-item-7
  r00008|r00009` and `ziyarat-svm-jamah-aymh r00017|r00018`, both sides carry
  Persian, so an Arabic-only space glues `گذار.از`, `فرست،و`, `کردند،و`,
  `ببندد،و`, `گرفت،و`. The sixth `(ar)` pair, `amal-sayr-aamal-rjb r00032|r00033`,
  is correct as it stands (left row has no Persian).
- **Real mode split: 44 both-space + 1 ar-space.**
- Three chains (`daahay-rvzhay`, `dua-marvf-ystshyr`, `ziyarat-fzylt-kyfyt-masvmh`)
  need the second merge to name the merged row, first merge leftmost.
- `amal-aamal-daahay-rvzhay r00017|r00018` will put Persian instruction inside an
  Arabic field (`… وَ الدُّنْیَا سپس سه مرتبه بگوید…`) — a mixed-language finding
  for the review, not a reason to drop the join.

## Agent-6's 45 joins are in, and my mode objection was wrong

Main now carries `55ef3fe4` (merged here as `acf9e673`): runtime-audio checks a
corrected occurrence at its code-point offset inside a merged row, plus a unit
test with an astral character. Their snapshot `3e35f4ca` arrived after it and is
merged here as `3e59fa5d`.

**I retracted my five `both-space` corrections.** They were measured on whole
original rows; a join merges only the last current piece of one row with the first
current piece of the next, and in all six `(ar)` pairs one of those two pieces has
no Persian at all. Their Persian field therefore receives a single piece and
nothing can be glued. Checked row by row in `3e35f4ca`:

| merged row | Arabic pieces | Persian pieces | space |
|---|---|---|---|
| `amal-aamal-daahay-rvzhay/me261330…` | `r00017-s1801`, `r00018-sc5b77` | `r00017-s1801` | ar@53 «…ْآخِرَةِ» + «وَ الدُّ…» |
| `amal-slvat-abvalhsn-zrab/mc24556…` | `r00007-sc2f6`, `r00008-sbfc` | `r00008-sbfc` | ar@7 «…وَصَلِّ» + «عَلىٰ…» |
| `ziyarat-hsn-asgry-alyh/m1d0aaaa…` | `r00015-s87c2`, `r00016-se834` | `r00016-se834` | ar@11 «جَعَلُوا» + «عِبادَكَ» |
| `ziyarat-item-7/mbbd9daf…` | `r00008-sf701`, `r00009-s3b33` | `r00008-sf701` | ar@18 «يَخْتِمُ» + «اللّٰهُ» |
| `ziyarat-svm-jamah-aymh/m4bc3198…` | `r00017-s4a69`, `r00018-s32f0` | `r00018-s32f0` | ar@15 «عَتْ فِي» + «قُلُوبِ» |
| `amal-sayr-aamal-rjb/m909a81e…` | `r00032-s9612` only | `r00033` only | ar@8 «اللّهمَّ» + «اغْفِرْ» |

Their Persian-direction claim is also right: in `daahay-rvzhay` the row after the
merge is its own Persian instruction row («سپس سه مرتبه بگوید…»), so no Persian
instruction sits inside the Arabic field.

Corpus-wide check over all 74 merged rows in the snapshot: wherever two pieces meet
in one field there is exactly one recorded space (82 Arabic and 73 Persian
junctions), and **zero** piece pairs touch without a separator. Their counts also
reproduce exactly: 84 new insertions = 45 Arabic + 39 Persian across 22 items,
6 joins with one space and 39 with two.

**Review result.** All 115 items re-reviewed and rebound to `3e35f4ca`, with **178
spacing decisions** — one per recorded insertion, each judged on the merged row it
sits in, including the offset, both neighbouring words, and the fact that removing
it rejoins the two pieces exactly. 0 verify failures.

Gates after the merges: `npm run validate` PASS, `check:line-breaks` PASS,
`npm run check` 278 tests / 275 pass / 0 fail / 3 skipped, runtime-audio 6/6,
`audit-authored` complete 112/112, `verify-tool-info` `tool-version-matches`.

## Agent-6's updated head: their link deliverables verified, my reviews stand

Their branch has moved on (`b2a5f539`): more agent-5 snapshots merged and their
link audit recomputed against `3e35f4ca`. Checked without taking anything on trust:

- **Their own 115 items are byte-identical to `3e35f4ca`**, so all 115 of my
  review records still stand and no rebind is due. The moved data belongs to
  agent-5's items, which are agent-6's to review, not mine.
- **Their head is green**: built in a detached worktree, runtime-audio 6/6,
  `npm run validate` PASS, `verify-tool-info` `tool-version-matches`.
- **The 142-id alias proposal holds.** The 142 old ids are exactly the set that is
  unreachable at `3e35f4ca`; every proposed alias rebuilds its retired text
  byte-for-byte from the segments it names (using each segment's `target_start`);
  and adding all 142 to the records leaves `validateCorpus` at 0 errors, before
  and after. Their claim of "0 problems" reproduces.
- **The 93-id versioned map holds.** 93 entries in 9 items, 93 versions; every
  current destination and every version destination is a live row (or resolves
  through an alias into one), and every old text they cite is still in the pool.
  Their `resolves_through: alias-or-original` entry for
  `ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcda…` is correct — that id was retired by
  their own joins, and the map says so.

Twenty of their items stay held from final release pending the coordinator's link
migration; nothing is asked of me until their next snapshot, when the 16 items with
retired ids will need a rebind.

## Standing by for the link migration

Nothing is applied and nothing is asked of me until the coordinator publishes the
post-migration snapshot. Two reusable tools are now committed here instead of in
the wiped scratch directory, so the work survives a restore:

- `agent-work/agent-1/tools/rebind-reviews.ts <snapshot> <items-file>` rebuilds
  review records for a list of items against a snapshot, decides every recorded
  space on the merged row it sits in, and fails loudly if any record does not
  verify. Re-running it on an unchanged item reproduces the record exactly.
- `agent-work/agent-1/tools/space-audit.ts <snapshot>` walks every junction of
  every merged row and reports seams that are not "two pieces with exactly one
  recorded space between them". On `3e35f4ca` it reproduces 82 Arabic and 73
  Persian spaced junctions, 39 single-piece fields, 0 problems.

When the migration lands the sequence is: merge main and the new snapshot with the
merge drivers configured, `npm run build:data`, runtime-audio, `npm run check`,
`npm run validate`, `verify-tool-info`, `audit-authored`; then rebind the items the
snapshot changes (agent-6 promised the list, expected to be the 16 items carrying
retired ids) with `rebind-reviews.ts`, and re-check the seams with `space-audit.ts`.

## Main 2163b5e7 merged: re-split guard and retired-link migration

Merged as `6a1f8822`. Main adds `src/row-alias-history.ts`,
`src/row-alias-migration.ts`, the `alias-preview` / `alias-migrate` commands, a
guard that refuses a retired alias without exact source-occurrence lineage, and a
re-pin; no `data/` file changed, so the migration itself is still unapplied.

Gates after the merge: `verify-tool-info` `tool-version-matches`,
`npm run build:data` clean, runtime-audio 6/6, `npm run validate` PASS,
`check:line-breaks` PASS, `npm run check` **283 tests / 280 pass / 0 fail / 3
skipped**, `audit-authored` complete 112/112.

Two things this changes for me:

- **My 115 reviews still stand.** Agent-6's own items are byte-identical to
  `3e35f4ca` on their current head (`330d609c`), rows and mapping records both, so
  their further merges of agent-5 snapshots do not touch anything I reviewed.
- **My earlier alias verification was necessary, not sufficient.** I proved the 142
  proposed aliases rebuild their retired text exactly; the new guard additionally
  requires a single frozen *source-occurrence lineage*, and says identical repeated
  text is not proof of the same occurrence. So the migration may still refuse some
  of the 142, and that check can only run on agent-6's own registered branch: I
  tried `alias-preview` for their proposal here and it refuses a cross-agent run
  ("Alias proposal author or frozen base differs", then "Register agent-6 on your
  own branch"). That refusal is the right behaviour; it is not a defect to work
  around.

## Independent check of agent-6's 93 reused-ID mappings

Report: `agent-work/agent-1/proposals/agent-6-reused-id-check.md`. Read-only against
the six snapshots the map names; no data changed, no live id redirected.

- **Zero discrepancies.** 93 entries / 93 versions / 180 language mappings, of which
  180 rebuild the old text exactly and all 24 multi-row mappings use consecutive
  rows in the target layout. Every version's snapshot claim carries the text it
  names, no snapshot meaning is unrecorded, every destination is live, and
  `unversioned_link` omits nothing. Their class split (13 / 79 / 1) reproduces.
- **Lineage evidence is text and position only.** None of the 93 rows carries a
  `sources` field at any snapshot (0/93), so my "all attributions equal" check was
  vacuous; occurrence identity rests on exact slice reconstruction, the snapshot
  occurrence and adjacency. It passes main's guard because the texts genuinely
  differ, not because attribution corroborates them.
- **The ids are not globally unique.** 3,488 cases where one of these 93 id strings
  names a row of another item at one of the six snapshots. The map is item-keyed, so
  the file is fine, but any resolver must key on `(item, id)`.
- Ambiguity classes: 1 id with Persian unchanged and Arabic changed, 13
  prefix-continuations (handled by mapping into adjacent continuation rows), 0 ids
  with identical text and a different occurrence, no id with more than one earlier
  meaning.

Nothing migrated by me: `alias-preview` refuses a cross-agent run by design, and the
142-id migration stays on agent-6's own branch. When an authorized migrated snapshot
appears, the 16 affected items get a rebind and fresh review; the other 99 of their
115 are unaffected.

## Agent-6's migrated snapshot `f8dca07b` re-reviewed

Merged as `91417646`. Report: `agent-work/agent-1/proposals/migration-review-f8dca07b.md`.

- **Metadata only, verified**: 0 item/text/editorial files changed; the 16 records
  changed in aliases only; canonical rows, mapping entries, insertions and the
  plan/layout hashes are identical to `3e35f4ca`. The single other difference is an
  explicit `"target_start": 0` on 153 segments that previously omitted it — 0
  segments changed in any other way.
- **142 / 142 retired ids resolve**, every applied alias is byte-identical to the
  proposal I audited, and every one rebuilds its retired text exactly.
- **No live id redirected**: 92 of the 93 reused ids are live rows with unchanged
  text; the ninety-third (`ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcda…`) was retired
  by the reviewed joins of `3e35f4ca` and its alias is unchanged across the
  migration.
- **All 115 records rebound to `f8dca07b`** and verified, same 178 space decisions.
  Gates: pin matches, runtime-audio 6/6, validate PASS, `npm run check`
  283/280/0/3, `audit-authored` 112/112.

Corrections to the reused-ID report, all accepted from the user's two reads:
a split-piece id hashes `{row: old.id, ar: out.ar, fa: out.fa, kind}`, where
`out.ar` / `out.fa` are the layout's source-and-part references (`{source, part}`)
or null — **neither the item ID nor the text is in the hash**. Two consequences: the
missing item makes the same string recur across items (3,488 cases found), and the
missing text means a correction leaves the id unchanged, so the id later opens
different text, which is how the 93 arose. Also: the 93 are live IDs — **92 live
rows and one already a historical alias** — that ordinary alias migration never
admits, so that audit is not a guard pass, and **all 93 remain version-ambiguous**:
without a snapshot version the map warns and offers destinations instead of
resolving. Item-scoped lookups remain required.

## Agent-6's answer, and the corrected hash input on the wire

Agent-6's `80e62627` (child of `b75d117f`) records the acceptance and carries their
acknowledgement `78197047` of my review `51fc6141`. Checked rather than read:

- **No data moved**: the commit touches 5 files — their `status.md`,
  `proposals/README.md`, `alias-migration-record.json`, the audit script and the
  coordination log — and **0 files under `data/`**. The migrated records still stand
  exactly as I re-reviewed them at `f8dca07b`.
- **Their 92/1 correction is real**: their README, status and migration record now say
  92 live rows and one existing alias, and the audit script's item 3 was widened to
  accept "live row or an alias that already existed" while still refusing an alias
  written by this migration — which is the right test, since the ninety-third
  (`ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcda…`) was retired by their own joins at
  `3e35f4ca`, not by the migration.
- **Their hash description was already right**: their README's "Why the IDs changed"
  says the ID hashes the original row ID, the Arabic and Persian part references
  (`{source, part}`) and the kind, and that the text is not in it. My message
  `51fc6141` had said "the two pooled text ids" — wrong, and mine only. Corrected to
  them in `1cb127bd`, which also carries the two reproductions from
  `proposals/agent-6-reused-id-check.md` §2 and the 92 + 1 / version-ambiguous
  wording.

Nothing is asked of me by them: their 20 items stay held pending the version-aware
reader and the coordinator's release decision, the 93 reused IDs stay untouched, and
their three kind questions are theirs to settle.

## Pulled main 985f226c, and measured the provisional register

Merged `985f226c` ("Add guarded provisional historical link support") as `291080e2`.
Frozen base `ffa01da9…` still the launch marker on main, so the round base is unchanged;
registration re-checked (`already-registered`), `configure` installed the safe merge
drivers, tool pin `tool-version-matches` (Node v22.22.3, ICU 78.2, Unicode 17.0).

New work this round — `agent-work/agent-1/proposals/provisional-register-check.md`,
reproduced by two read-only tools (`tools/register-audit.ts`, `tools/guard-effect.ts`):

- **Bindings**: 9 of 94 items are fresh here (93 candidates, all agent-6's); 85 are stale
  because those items have **no authored record on my branch**; **0** are stale because a
  record changed. Same result at `f8dca07b`.
- **Fresh targets**: 93 candidates, 186 field reconstructions, all exact; compiler accepts
  the register at HEAD and at `f8dca07b`; 92 live rows + 1 installed alias + 0 neither,
  which matches my independent 93-ID audit by a different path.
- **My assignment**: 0 of 94 register items are mine; 116 register IDs recur as rows of my
  items (one of them in five of my items), so (item, ID) keying stays mandatory.
- **Guard effect on agent-6's items**: all 93 unversioned links move resolved → `ambiguous`.
  For the one ID with an installed reviewed alias the guard's current meaning *is* that
  alias and its historical identity differs, so the entry is legitimately retained — but
  the reviewed alias now needs a version choice. Reported, not fixed: it is a release
  decision on a held item, not an author or reviewer call.

Review coverage re-verified under the upgraded tooling: **115/115** of my reviews of
agent-6's items verify complete against `f8dca07b`, and **112/112** of agent-2's reviews of
my items verify complete against my author-ready snapshot `bfa51744`; my items, plans and
layouts are unchanged since it. `audit-authored`: 112/112, no findings.

Gates on the merged tree: `npm run check` **307 tests, 304 pass, 0 fail, 3 skipped**;
`npm run validate` PASS with the known 27 unreferenced pooled values warning.
