# agent-6 status

**State: `main` `985f226c` IS MERGED. NOTHING AUTHORED CHANGED: THE SNAPSHOT IS
STILL `f8dca07b`, ACCEPTED BY AGENT-1 (115 OF 115 REVIEWS). THE NEW READER NOW
GUARDS MY 93 REUSED IDS; THE REGISTER'S 93 CANDIDATES AGREE WITH MY LINEAGE MAP
BUT REMAIN PROVISIONAL AND UNREVIEWED. THE 20 ITEMS STAY HELD FOR THE RELEASE
DECISION. AGENT-5 CHANGED TWO OF THE THREE OPEN KINDS WITH THE GUARDED TOOL (SNAPSHOT
`1a908eac`); I REVIEWED BOTH ITEMS AFRESH AND ACCEPTED THEM. THE COORDINATOR
DECIDED TO KEEP THE HEADING IN `dua-vdaa-hsyn-alyh`; I AGREE AND RECORDED MY
REVIEW. AGENT-5 REVIEW: 115 COMPLETE, 0 OPEN.**
Updated 2026-11-26 (UTC). **My own authored work is unchanged. What I still
wait for is listed in the next section.**

- Branch: `arena/1a493a80-mafatih`
- Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`
- `main` merged here: `985f226c4acc1241041b807c2cb4f4fc10d36734` (merge
  `504afeb4`): the version-aware reader, the guarded `revise-preview` and
  `revise`, and the provisional register of guarded row IDs. No conflict; no
  file under `data/`, `agent-work/` or `coordination/` changed in the merge;
  `verify-tool-info` reports the pin matches (Node v22.22.3, ICU 78.2,
  Unicode 17.0); `verify-partitions` is valid. Test results are in the next
  section. Earlier merge: `2163b5e7` (as `99e481d9`).
- Latest isolated author snapshot: `f8dca07be7536bf19ea17c869bf098385002099a`
  (author-ready, 115 of 115 items, direct child of `3e35f4ca`; differs from it
  only in the 16 migrated mapping records).
- Role: author of 115 items (reviewer: agent-1); reviewer of agent-5's 115 items.

## Round of 2026-11-26: the heading is kept; my review of agent-5 is complete

- **`main`:** fetched; still `985f226c4acc1241041b807c2cb4f4fc10d36734`,
  already merged here. Nothing to pull, no new merge.
- **Coordinator decision (2026-11-26):** keep the existing `heading` in
  `dua-vdaa-hsyn-alyh` (`r00001-sf8ca119bc7deb30b`).
- **My independent review: I agree.** I read the three rows of the item again
  in both languages before recording it. Grounds:
  1. The row holds the number of the section (offsets 0-5) and the name of the
     transmitter (offsets 7-20). It marks the start of numbered section 20 and
     tells the reader nothing to do. The direction is wholly in `r00002`,
     which is `instruction`.
  2. The source itself puts these words in a row of their own; the split keeps
     that row.
  3. Keeping the kind keeps the published ID live. No link changes.
  One note, kept so it is not lost and not a concern against the decision:
  grammatically the name is the subject of the verb that opens `r00002`, so
  one sentence runs from the heading into the next row. That is how the
  source breaks its rows.
- **The record:** `reviews/dua-vdaa-hsyn-alyh.json` is rewritten from a fresh
  template and bound to agent-5's latest isolated snapshot
  `1a908eacb7a6b8cbb66f43569615f62c25548122`. The item is unchanged since
  `4aae1ccd`: item, mapping, plan and layout are the same Git objects at
  `4aae1ccd`, `1a908eac`, his tip `8fa542a6` and here; its five text values
  are identical and match their hash IDs. No cut, join, space, alias or
  retired ID. Every row ID published for the item since the frozen base opens
  the same character (4 ID meanings, 1,373 code points). `verify-review`:
  complete.
- **agent-5's items: 115 of 115 complete, nothing open.** By snapshot named:
  78 `4aae1ccd`, 14 `b81241ae`, 4 `f192ee09`, 1 `8121f9b2`, 1 `48f3ea69`,
  13 `bae5beb3`, 1 `d0fb5765`, 3 `1a908eac`. No other review was redone, because no other item changed.
- **The two items accepted on 2026-11-20** (`item-mrsyh-am-albnyn`,
  `dua-daa-aymny-shr`): the coordinator did not ask to hold them, so they stay
  accepted.
- **Peers:** agent-5's tip is `8fa542a6` and agent-1's is `93e20304`, both as
  on 2026-11-20. No new snapshot, no new message to me.
- **Historical links:** all kept provisional. Nothing migrated, nothing
  approved, no hash refreshed. No source text or published link changed in
  this round; I changed one review record, the notes and one message.
- **Message:** to agent-5, `resolved` `ce186574` (IDs and offsets only).
- **After my push (fetched again):** agent-5's tip is `85fa0079`. No snapshot
  after `1a908eac`; his 460 authored files equal it. His message `aa14ebcd`
  asks me to record my review of the heading or explain a concern; my
  `ce186574` already answers it, so I sent nothing more.
- **Checks on 2026-11-26** (worktree: pushed tip `12cf6db5` plus the one
  review record, the message and these notes):
  - `npm run check`: 307 tests, 304 pass, 0 fail, 0 cancelled, 3 skipped,
    exit 0; web build succeeded. Skipped, as before, are the project's own
    optional tests: test 64 (generated review page absent), test 65
    (alignment candidates absent), test 97 (lam-pair corpus comparison).
  - Browser specs, all 31 files in both configurations: **520 tests, 520
    pass, 0 fail, 0 skipped, 0 flaky.** Playwright 1.64.1 with Chromium
    153.0.8010.0 from the npm package `@sparticuz/chromium@153.0.0`, kept
    outside the repository. This is a substitute for the Chromium build that
    Playwright pins, which cannot be downloaded here. Scratch copy of
    `playwright.config.ts` (same projects, servers and specs; only the
    browser path and launch flags added), on the build made by the check
    above.
  - `npm run validate`: passes; 48 unreferenced pooled values, as before.
  - `verify-review` over all 115 of my records, each against the snapshot it
    names: **115 complete.**
  - `audit-authored`: agent-5 115 of 115; agent-6 115 of 115. My 460 authored
    files still equal `f8dca07b`.
  - `audit-round`: `needs-work`, exit 1, as expected on one agent's branch:
    115 complete, none of agent-5's items has a finding; 571 `missing`,
    because the other agents' plans, layouts and reviews are on their own
    branches.
  - `verify-tool-info`: matches. `verify-partitions`: valid.
  - No APK, no device test.
- **Sandbox note:** the working copy came back at the frozen base with
  uncommitted files. I proved with a temporary index that every file was
  byte-identical to my pushed tip `12cf6db5` (0 tracked differences, 0
  untracked files) and only then moved the branch pointer there with a mixed
  `git reset`, which changes no file.

**What I wait for now, exactly:**

1. **From the coordinator:** the release decision for my 20 held items (16
   migrated and 4 with reused IDs only), and whether the 93 provisional link
   candidates need agent-1's review first.
2. **From agent-5:** nothing. If he publishes a new snapshot of any item, I
   review that item again against it. His 16 retired IDs remain his to migrate
   after the coordinator's authorization; I have approved none.
3. **From agent-1:** nothing. His 115 reviews of my items stand on `f8dca07b`.

The sections below are older. Their waiting lists are replaced by the list
above.

## Round of 2026-11-20, second part: agent-5's snapshot `1a908eac` reviewed

After my first push of this round, agent-5 pushed a new isolated author
snapshot and asked for a fresh review (his message `71a270d2`).

- **His snapshot:** `1a908eacb7a6b8cbb66f43569615f62c25548122`, a direct child
  of `d0fb5765` (the one I reviewed last). His branch tip is `67e6b254`.
  Merged here as `7b81120c` (no conflict, eight files, all his).
- **What changed:** exactly two items; 8 of his 460 authored files. The other
  113 items are identical at the old snapshot, the new one, his tip and here,
  so their reviews stand and I did not redo them.
  - `item-mrsyh-am-albnyn`: eight verse rows, `recitation` to `quotation`.
    Six uncut rows keep their IDs. The two joined rows have new IDs:
    `m7fd11ac1993a4b4f9d3db507` is now `m8295de084366aef28d7b3740`;
    `m593b5e8d63e327587f6fea00` is now `m9fabefe023a95654ead5e658`.
  - `dua-daa-aymny-shr`: the verse piece of `r00009`, `quotation` to
    `recitation`; `r00009-se370353bb3dfce92` is now `r00009-s94f3428995dfd8af`.
    The Persian-only piece `r00009-sc64421e6669ebe6d` is unchanged.
- **How I reviewed (each item afresh, against that exact snapshot):**
  1. Read every row of both items in both languages again and wrote a new
     note for every source field (16 and 19 fields).
  2. Checked the mapping separately from the kinds, with a new reviewer
     script, `proposals/scripts/check-role-revision.mjs` (result:
     `proposals/role-revision-check.json`). 21 checks per item, all pass:
     no text reference and no attribution changed; no pooled text changed;
     each of the 3 retired IDs is an alias holding the exact old row and
     pointing to the whole field of the new row at offset 0; the 4 earlier
     aliases are carried with the same offsets; the 2 further aliases in the
     first item are the left sides of the re-made joins and were never
     published; no new ID ever existed before; plan and layout differ only in
     kinds; the project's validator and canonical check pass.
  3. Checked every row ID published for each item since the frozen base, code
     point by code point: 19 ID meanings and 3,231 code points; 21 ID meanings
     and 6,933 code points. Every one opens the same character as before.
  4. Reviewed each proposed space on its own: the 2 spaces of the re-made
     joins (`m8295de084366aef28d7b3740` Arabic offset 59,
     `m9fabefe023a95654ead5e658` Arabic offset 57) and the 3 carried spaces
     of the second item (`ma8b5fc6e4d9b4e00b7ae91e8` Arabic 43,
     `mb0571663cc8f471c1b956998` Arabic 265 and Persian 235). All five
     accepted: one U+0020, the only character added, a complete word on each
     side, no doubled space.
  5. The three new live IDs are the same three my in-memory dry run of
     2026-11-19 predicted (`proposals/kind-revision-dry-run.json`).
- **Result:** both records are rewritten, bound to `1a908eac`, and
  `verify-review` reports both complete. **agent-5's items: 114 complete,
  1 needs work.** My two kind findings on these items are closed, because the
  rows now have the kind I had argued for and no link was lost.
- **What this acceptance is and is not:** it is the assigned reviewer's
  acceptance of split, roles and mapping. It is not a coordinator ruling, not
  a scholarly or rights approval, and it approves no provisional
  historical-link candidate. The earlier instruction was to keep the three
  kind questions open until the coordinator rules; the round note of
  2026-11-20 told agent-5 to address them and told me to review a changed
  snapshot, so I reviewed and recorded the honest result. If the coordinator
  wants these two held for his own ruling, one word reopens them.
- **Still open, `dua-vdaa-hsyn-alyh` `r00001-sf8ca119bc7deb30b`:** agent-5 did
  not change it (kind `heading`) and asked for my view. The item is unchanged,
  so the review at `4aae1ccd` is not redone and still reports `needs-work`.
  My view, sent to him: I have no objection to `heading`; the row holds the
  section number and the narrator's name, and a change to `instruction` would
  also be safe (1 ID retired and kept as an alias, per my dry run). Author and
  reviewer now both lean to keep. I do not close it myself, because the
  standing instruction is to keep it open until the coordinator rules and
  nothing in this item changed.
- **Register:** neither changed item is in the provisional register. My
  lineage check of agent-5's register items still gives 27 of 27 IDs agreeing
  and 14 of 14 bindings current. Nothing migrated, nothing approved, no hash
  refreshed.
- **One limit, stated plainly:** the link check covers row IDs from the frozen
  base onward. A row of the second item (`r00006`) had other text in the first
  commit of the repository, before the base; that older history is outside the
  split mapping and I did not judge it.
- **Message:** to agent-5, `review` `59a530f1` (reply to his `71a270d2`; IDs and offsets only).
- **Peers after my push (fetched again):** agent-5's tip is `8fa542a6`; it
  adds only a note file and his message `5d96126c`, sent before he could read
  my review. No snapshot after `1a908eac`; his 460 authored files equal it.
  agent-1's tip is `93e20304`; no review file of his changed. His message
  `f5be4e43` is an independent check of my register confirmation from raw Git
  objects: 93 of 93 meanings, 9 of 9 bindings, 595 of 595 observations; my
  conclusion stands; nothing is asked of me; the 20 items stay held. Two
  qualifications of his, which I accept: my list of 19 snapshots is evidence,
  not every commit on every branch; and my count of 279 scanned commits is
  true of my branch only (his history has 151). I acknowledged with
  `49673bec`.
- **Checks after the merge and the review** (worktree: merge `7b81120c` plus
  the two review records, the new script and its result file, the message and
  these notes):
  - `npm run check`: 307 tests, 304 pass, 0 fail, 0 cancelled, 3 skipped,
    exit 0; web build succeeded. The three skipped tests are the project's own
    optional ones: test 64 (generated review page absent), test 65 (alignment
    candidates absent), test 97 (lam-pair corpus comparison).
  - `npm run validate`: passes; 48 unreferenced pooled values, as before.
  - `verify-review` over all 115 of my records, each against its own snapshot:
    114 complete, 1 `needs-work` (`dua-vdaa-hsyn-alyh`).
  - `audit-round`: `needs-work`, exit 1, as expected on one agent's branch:
    114 complete; 1 `invalid-or-incomplete` (`dua-vdaa-hsyn-alyh`); 571
    `missing`, because the other agents' plans, layouts and reviews are on
    their own branches.
  - `audit-authored` agent-5 at the merged state: 115 of 115, no finding.
    `audit-authored` agent-6: 115 of 115; my 460 authored files still equal
    `f8dca07b`.
  - `verify-tool-info`: matches. `verify-partitions`: valid.
  - Register checks: 93 of 93 and 9 of 9 bindings current (mine); 27 of 27
    and 14 of 14 bindings current (agent-5's).
  - **Browser specs: run, with a substitute browser.** All 31 spec files in
    both configurations (root and Pages): **520 tests, 520 pass, 0 fail,
    0 skipped, 0 flaky** (9.7 minutes, one worker). The two link spec files
    alone (`row-split-links`, `row-version-links`): 56 of 56. Playwright
    1.64.1 with **Chromium 153.0.8010.0** from the npm package
    `@sparticuz/chromium@153.0.0`, installed outside the repository. This is
    a substitute: the Chromium build that Playwright 1.64.1 pins is not
    installed and cannot be downloaded here. The run used a scratch copy of
    `playwright.config.ts` (same projects, same preview servers, same specs;
    only the browser path and launch flags added), kept outside Git, on the
    production build made by `npm run check` above. In my earlier rounds I
    reported the browser specs as not runnable; agent-5's note showed this
    substitute, and I used the same package.
  - No APK, no device test.

**What I wait for now, exactly:**

1. **From the coordinator:** one word on `dua-vdaa-hsyn-alyh`
   `r00001-sf8ca119bc7deb30b`: the kind stays `heading` (then I close the
   record), or it changes (then agent-5 runs `revise-preview` and `revise`,
   publishes a snapshot, and I review it).
2. **From the coordinator:** the release decision for my 20 held items, and
   whether the 93 provisional candidates need agent-1's review.
3. **From agent-5:** nothing at present, unless the coordinator rules a change
   under point 1 or he changes another item.

The section below is the first part of the same day. Its waiting list is
replaced by the list above.

## Round of 2026-11-20

- **`main`:** fetched, still `985f226c`, already merged here (`504afeb4`). No
  new merge. Branch, registration and frozen base are as before. The tool pin
  matches.
- **agent-5 (I review him):** his tip is `24ebdcb4`, the same as at the end of
  the last round. No snapshot after `d0fb5765`. For all 115 items, item,
  mapping, plan and layout are identical at the snapshot each of my records
  names, at his tip and here. So I redid no review. State: **112 complete,
  3 need work.** The three open records still report `needs-work`.
- **agent-1 (he reviews me):** his tip is `10b8be27`. No review file changed;
  all 115 of his records of my items name `f8dca07b`. His message `eee2f41d`
  asks nothing. It reports his own measurement of the register (the same 9
  items, 93 candidates, 92 live rows and 1 alias) and one consequence, which
  I confirmed with the project's resolver on this branch:
  - for all 93 guarded IDs, a link **without** a version now returns a choice,
    not a row (93 of 93 `ambiguous`);
  - a link with the current row version resolves (93 of 93);
  - a link with the old content version is offered as provisional (93 of 93);
  - this includes `ziyarat-rjybyh-alhmd-allh` `r00004-s2d6fcdaf315ab02c`: its
    reviewed alias no longer opens without a version. That is the guard
    working as designed; the coordinator should know it before release.
- **My own items:** all 460 authored files equal snapshot `f8dca07b`. Nothing
  to revise, no new snapshot.
- **Historical links:** all kept provisional. Nothing migrated, nothing
  approved, no hash refreshed.
- **Messages (IDs and offsets only, no source text):** to agent-5 `b6f0099a`
  (the three findings by row ID and what I wait for); to agent-1 `9765ef44`
  (acknowledgement).

- **Checks on 2026-11-20** (worktree on top of `f84ddccb`; only status, handoff
  and the two message files differ from it):
  - `verify-tool-info`: matches. `verify-partitions`: valid, 686 items.
  - `npm run check`: 307 tests, 304 pass, 0 fail, 3 skipped, exit 0. The three
    skipped tests are the project's own optional ones (generated review page
    absent, alignment candidates absent, the lam-pair corpus comparison).
  - `npm run validate`: passes; 48 unreferenced pooled values, as before.
  - `audit-authored` agent-6: 115 of 115, no finding.
  - `verify-review` on the three open records and one closed record: 3
    `needs-work`, 1 complete. The other records were not run again because
    nothing they cover changed.
  - Register checks rerun: 93 of 93 (my items), 27 of 27 (agent-5's items).
  - **Browser specs: not run.** Playwright 1.64.1 is installed as a package,
    but no browser binary is present and none can be downloaded here, so there
    is no browser version to report. No APK, no device test.

**What I wait for, exactly:**

1. **From agent-5:** a new isolated author snapshot, later than `d0fb5765`, in
   which any of these rows changed, made with `revise-preview` and `revise` on
   his branch, and the commit sent to me:
   `dua-vdaa-hsyn-alyh` `r00001-sf8ca119bc7deb30b`;
   `item-mrsyh-am-albnyn` `m7fd11ac1993a4b4f9d3db507`,
   `m593b5e8d63e327587f6fea00`, `r00007`, `r00009` to `r00013`;
   `dua-daa-aymny-shr` `r00009-se370353bb3dfce92`.
   Then I review each changed item against that commit.
2. **Or from the coordinator:** for any of the three that is to stay as it is,
   the word that the kind stays. Then I close that record. The round note of
   2026-11-20 tells agent-5 to address these findings; I do not read that as a
   ruling to keep or to change, so the three records stay open.
3. **From the coordinator:** the release decision for the 20 held items, and
   whether the 93 provisional candidates need agent-1's review.

## Round of 2026-11-19

Identity checked first: agent-6, registered for `arena/1a493a80-mafatih` on base
`ffa01da9`; the platform names the same branch as this session's branch.

**Nothing under `data/` changed in this round, and no plan or layout.** Item,
mapping, plan and layout of all 115 of my items are identical to `f8dca07b`
(0 of 460 files differ; all 33,844 pooled values of the snapshot are present
and equal). So no new author snapshot was made and no review became stale.

1. **My own items: no open finding.** agent-1's branch tip is `3c8547ed`. His
   115 records of my items all name `f8dca07b`; `verify-review` with the
   upgraded tools reports 115 of 115 complete; 115 layouts and 178 spacing
   decisions accepted. His new message `1cb127bd` corrects his own description
   of how a piece ID is computed; it changes nothing in my files.
2. **My 93 reused IDs and the new register.** The register on `main`
   (`docs/split-assignments/row-version-findings.json`) lists, for my items,
   exactly these 93 IDs in the same 9 items, and no other ID of mine.
   - Compared with my lineage map `proposals/reused-row-ids.json`: 93 of 93
     old meanings and segment lists are equal.
   - Checked again from the frozen source offsets, in every snapshot the
     register names: 595 observations in 19 commits, all readable here, all
     right. Every candidate tiles its old field and gives back its exact text;
     no attribution differs.
   - The 9 binding hashes match my current item and mapping. I changed no
     hash.
   - 279 commits on all fetched branches (50 distinct versions of the 9 items)
     show only two meanings per ID: the register's old one and today's. 92 IDs
     are live rows, 1 is the existing alias, as before.
   - The project's own test walks every code point of every bound candidate
     through the reader's resolver: an unversioned link warns, a versioned link
     to the old meaning is offered as provisional and never opens by itself.
     It passes on this branch.
   - This is my **author confirmation** of the 93 candidates. They are still
     provisional and unreviewed; I installed no alias and approved nothing.
   - Scripts: `proposals/scripts/check-version-register.mjs`,
     `proposals/scripts/check-register-lineage.mjs`. Result:
     `proposals/version-register-check.json`.
3. **My review of agent-5: nothing new to review.** His branch is still at
   `891d3ed0` (last snapshot `d0fb5765`, 2026-11-16). All 115 of my records
   were verified again with the upgraded tools, each against the snapshot it
   names: 112 complete, 3 need work, 0 errors. For all 115 items, item,
   mapping, plan and layout are identical at the recorded snapshot, at his
   branch tip and here.
   Checked again at the end of the round: his tip moved to `24ebdcb4` (his
   merge of `main` and a handoff note). No item, mapping, plan or layout
   changed, and there is no new snapshot. His message `623807d3` says the
   three kind questions stay open, no kind was changed and no alias was
   migrated. That agrees with my records.
4. **The register's 27 candidates in agent-5's items** (14 items: 16 retired
   IDs, 11 reused), checked as his reviewer by the same lineage method: 232
   observations in 32 commits, 27 of 27 agree, bindings match. This is a
   check, not an authorization to migrate; no alias is installed for them.
5. **The three kind questions: still open, but option B is now possible.**
   `revise` keeps a retired ID as an alias in the same step. I tried the three
   changes in memory only (`proposals/scripts/simulate-kind-revision.mjs`,
   result `proposals/kind-revision-dry-run.json`): each is accepted by the
   project's functions; 1, 2 and 1 live IDs would retire and stay reachable as
   aliases; six uncut rows keep their IDs; earlier aliases and all proposed
   spaces stay; no text or attribution changes; 41 published IDs and 10,855
   code points still open the same character. Nothing was written, and this is
   not agent-5's preview. `proposals/kind-decision-request.md` has the update
   at its top.
6. **Messages:** to agent-1 `7439f9fe` (register check, nothing to re-review);
   to agent-5 `a6e2371c` (the tool now exists, the ruling is still the
   coordinator's, no hand edit, the register check).
7. **Checks on this branch** (data state of merge `504afeb4`, unchanged since):
   - `verify-tool-info`: the pin matches. `verify-partitions`: valid, 686 items.
   - Focused tests (`row-version-corpus`, `row-version-safety`,
     `row-version-anchor`, `six-agent-revision`, `six-agent-revision-cli`):
     24 tests, 24 pass.
   - `npm run check` at `76a8a275`: 307 tests, 304 pass, 0 fail, 3 skipped;
     exit 0 (type check, tests, repository check, line-break check, web build).
   - `npm run validate`: structural validation passes; the known warning of 48
     unreferenced pooled values is unchanged.
   - `audit-authored` for agent-6: 115 of 115 complete, no finding.
   - `audit-round` on this branch alone: for agent-5's items, 112 complete and
     the 3 open ones. My own 115 show as "missing" there only because agent-1's
     review files are on his branch; I verified them from his branch (115 of
     115 complete).
   - **Not run:** the browser specs (no Playwright browser can be installed in
     this sandbox), so the reader's warning was checked through the resolver
     and the Node tests only, not in a browser and not on a device. No APK was
     built.

## What was done on the coordinator's go

- Merged `55ef3fe4`: no conflict; `verify-tool-info` reports the pin matches.
- Applied the 45 held joins (commit `39d0a930`), exactly as tested beforehand in
  a scratch clone. 22 items. 39 take one space in both languages, 6 in Arabic
  only; 84 proposed editorial spaces in total.
- Link check before committing: of 3,202 row IDs published for these 22 items in
  my five earlier snapshots, the joins retire none and none opens different
  text. Every source field is rebuilt exactly from the mapped pieces.
- `npm run validate` passes; `npm run check` exits 0 (278 tests, 275 pass,
  0 fail, 3 skipped); `audit-authored` reports 115 of 115 complete.
- Published the isolated snapshot and asked agent-1 to review every one of the
  84 spaces separately, and to judge the six Arabic-only joins against the
  actual merged rows (he had argued that five of them need a space in Persian
  too).
- Result: agent-1 accepted all 45 joins and all 84 spaces (his message
  `a1f21241`). He withdrew his five corrections after checking the merged rows,
  checked every junction (82 Arabic, 73 Persian), and rebound all 115 of his
  review records to `3e35f4ca` with 178 spacing decisions and no failure.
- The table of joins, with the merged row IDs and the offset of every space, is
  `agent-work/agent-6/proposals/held-joins.json`.

## Historical links: retired IDs migrated, reused IDs still open

**Done on 2026-11-15, on the coordinator's authorization, with the official
command only.** The authorization covered the 142 already-retired IDs of
`proposals/historical-row-links.json` in 16 items at snapshot `3e35f4ca`, and
nothing else.

- **Before:** item, mapping, plan and layout of the 16 items were identical to
  `3e35f4ca`. A fresh `alias-preview` at branch tip `9e36fd49` accepted exactly
  that scope: 142 aliases, 16 items, every alias identical to the proposal.
- **Run:** `alias-migrate` with the confirmation of that preview
  (`a08e695b…7d5396`); commit `0d6a78ca`.
- **What changed:** 16 mapping records under `data/row-splits/`, nothing else.
  142 aliases added, the 88 earlier aliases untouched, 6 records promoted from
  V1 to V2. No row, kind, text, pooled text, plan, layout or proposed space
  changed.
- **Checks after:** my comparison with the state before (11 of 11); every
  added alias rebuilds its old text from the current rows by code point; all
  142 IDs resolve with the project's resolver; validator 0 errors;
  `npm run validate` passes (unreferenced pooled values 85 → 48, because the
  aliases now refer to the old texts); `audit-authored` 115 of 115;
  `npm run check` 283 tests, 280 pass, 0 fail, 3 skipped. Recomputing the link
  audit against the new snapshot finds 0 retired IDs left.
- **New snapshot:** `f8dca07be7536bf19ea17c869bf098385002099a`.
- **Independent review: accepted.** agent-1 merged the snapshot, re-reviewed
  the 16 migrated records and accepted them (his message `51fc6141`, his report
  `agent-work/agent-1/proposals/migration-review-f8dca07b.md`). He found the
  change to be metadata only, all 142 IDs resolving, every alias identical to
  the proposal and rebuilding its old text, and no live ID redirected. I checked
  his branch myself: all 115 of his review records of my items name
  `f8dca07b`, every layout is accepted, all 178 spacing decisions are accepted
  and no source or issue decision is open.
- **Evidence:** `proposals/alias-migration-record.json` (per item: aliases
  added, format and hashes before and after, the retired IDs),
  `proposals/README.md`, and the checkers in `proposals/scripts/`.

**Not done, and not covered by the authorization:**

- **93 reused IDs (9 items):** *(2026-11-19: the reader on `main` `985f226c`
  now guards them; see the section "Round of 2026-11-19".)* Untouched, and
  none was given an alias by the
  migration. **92 are live rows** with unchanged text. **One is an existing
  alias**, not a live row: `ziyarat-rjybyh-alhmd-allh`
  `r00004-s2d6fcdaf315ab02c`. My reviewed joins had already turned it into an
  alias at `3e35f4ca`, and that alias is identical in `f8dca07b`. (My last
  status said all 93 were still live; that was imprecise.) All 93 keep the
  meaning they have today. `proposals/reused-row-ids.json` (against `f8dca07b`,
  same 93 mappings, checked independently by agent-1 with zero discrepancies)
  is the snapshot-versioned map for the reader change. A reader built on it
  must key on item plus ID, never on the ID alone. Five of the nine items are
  also among the 16 migrated ones.
  agent-1 also notes that none of these rows carries source attribution, so
  their identity rests on exact text reconstruction and position only.
- **Held from final release: all 20 items** (the 16 migrated and the 4 that
  have reused IDs only), pending the version-aware reader and the coordinator's
  release decision. agent-1's acceptance of the migration does not release
  them. The reader is now on `main` and merged here; the release decision has
  not been given, so all 20 stay held.
- No role correction and no re-cut of a published row.

## What I still need from the coordinator

1. **(Closed 2026-11-26.)** The three row kinds: two were changed by agent-5
   and accepted by me on 2026-11-20; the coordinator kept the third. The text
   of this point is kept for the record: A ruling on three row kinds in
   agent-5's items. The request is
   `proposals/kind-decision-request.md`: `dua-vdaa-hsyn-alyh` (opening row),
   `item-mrsyh-am-albnyn` (eight verse rows) and `dua-daa-aymny-shr` r00009.
   For each: keep the kind, or change it. A change retires a live ID in each
   case (1, 2 and 1). Since `main` `985f226c` the guarded `revise` supports it
   and keeps each retired ID as an alias; my dry run shows no lost link. What
   is missing is only your ruling and, for a change, your authorization of
   agent-5, who must run it on his own branch.
2. **The reader side for the 93 reused IDs: delivered** on `main` `985f226c`.
   Still yours: whether the 93 register candidates, which I confirm as author,
   need an independent review by agent-1 before release.
3. **Whether any links were saved against my first snapshot `561fdfb0` or the
   partial snapshots.** Only this tells how many old unversioned links exist.
4. **When the held items may be released.** I release nothing on my own.
5. *(Optional.)* Whether a direction that the source prints twice, once in each
   language field, should be shown once. Today that needs a tool change. I
   accepted the two adjacent rows in `amal-aamal-shbhay-dhh` and
   `amal-bqyh-aamal` r00029 as a property of the source.

## Where my own 115 items stand

- All 115 are authored; `audit-authored` reports 115 of 115 complete.
- Latest isolated snapshot: `f8dca07be7536bf19ea17c869bf098385002099a`. agent-1
  re-reviewed it and accepted it: all 115 of his reviews are bound to it,
  with the same 178 accepted spacing decisions. Nothing is open between us.
- Of 243 places where an original row boundary cuts an Arabic sentence: 97 joins
  are applied (52 earlier, 45 now), 146 are left as they are.
- 20 items stay held from final release, pending the version-aware reader and
  the release decision (list in `proposals/README.md` and in
  `proposals/alias-migration-record.json`).

## Where my review of agent-5's 115 items stands

- **Now 115 complete, 0 open** (see the round of 2026-11-26 at the top). The
  rest of this section is the state of 2026-11-19, kept for the record.
- **112 complete, 3 need work, 0 errors** (`verify-review` with the upgraded
  tools, all 115 records, each against the snapshot it names).
- Every record names an isolated agent-5 snapshot that is merged here: 79 name
  `4aae1ccd`, 2 name `8121f9b2`, 1 names `48f3ea69`, 14 name `b81241ae`,
  4 name `f192ee09`, 14 name `bae5beb3`, 1 names `d0fb5765`. For the 100
  records that name a snapshot older than `bae5beb3` I compared the item, its
  mapping, plan and layout with `bae5beb3`: all 100 are identical there, and
  `d0fb5765` changes one item only, so those reviews still hold.
- **Latest round (snapshot `d0fb5765`, one item): complete.**
  `khavas-avzat-drd-chshm` r00011 is now `recitation` in both languages, as I
  had asked. Checked against `bae5beb3` (21 of 21 mechanical checks, then read):
  the row ID and both text IDs are kept; every row of the item has the same
  text; the row is still uncut; the mapping record differs only in the two
  hashes that bind plan and layout; no other item, mapping, plan, layout,
  space, join or alias of agent-5 changed; no pooled text changed. Merge
  `330d609c`, no conflict; `npm run check` passed on it (283 tests, 280 pass,
  0 fail, 3 skipped). All 88 accepted spacing decisions are as they were.
- Merges of agent-5's snapshots: `fe5d86d0`, `fe0f3878`, `6f178ea2`,
  `175d6327`, `fc7195fb` (the chain `69a996e3`, `bae5beb3`) and `330d609c`. No
  conflicts. Only agent-5's files changed; every changed file equals the
  snapshot; no pooled value was lost or changed. `npm run check` passed on
  `fc7195fb` (278 tests, 275 pass, 0 fail, 3 skipped).
- **Round before (snapshot `bae5beb3`, 15 changed items): 13 complete, 2 need
  work at the time, 1 now.**
  - All 12 author fixes I had asked for are done and read in both languages:
    numbered sections now open their own rows, Arabic sentences that stood in
    the Persian slot are in the Arabic slot, and the three pairings I had
    questioned are mended.
  - The 3 joins I had offered are made (`amal-aamal-rmzan-2` r00002 with r00003,
    `ziyarat-mshtrk-kazmyn-alyhma`, `ziyarat-mvsy-kazm-rza`). The fourth
    (`amal-aamal-rmzan-2` r00006 with r00007) is not made because the two rows
    have different kinds; I agree.
  - **All 26 new proposed spaces are accepted, each with its own decision and
    note** (22 from `69a996e3`, 4 from `bae5beb3`). Each was read against the
    two joined pieces and checked by code point: one U+0020, a real word on each
    side, no doubled space, nothing else added. The 15 items have 28 junctions
    in joined rows; all 28 carry a recorded space. My 115 records now hold 88
    spacing decisions, all `accept`.
  - Of 442 row IDs that earlier agent-5 snapshots published for these 15 items,
    441 still resolve. The one that does not
    (`fazilat-svrhqdr…` `r00003-sa800142d710dfc87`) is one of the 16 already
    reported; this snapshot lost none.
- The 3 open records, all kept open on purpose and none for the author:
  - Kind questions for the coordinator, kept `uncertain` (2):
    `dua-vdaa-hsyn-alyh`, `item-mrsyh-am-albnyn`.
  - Blocked by missing tooling (1): the kind of `dua-daa-aymny-shr` r00009. Its
    pieces are already cut; a kind change gives a cut piece a new row ID and
    retires the published one.
  - All three are now put to the coordinator in
    `proposals/kind-decision-request.md`.
- Answered, complete, but to be redone when a re-cut can keep old IDs:
  `amal-daahay-sjdh-shkr` r00017. Its first published piece holds the end of an
  Arabic invocation that starts in r00016, and the label of the twelfth section.
  agent-5 asked me to rule on it; I agreed that it stays as it is. A join of the
  two note rows is offered to him, not required.
- Offered to agent-5 and not required: that join, and `ziyarat-adab` r00020
  with r00021 (a name broken at the row boundary). My own items keep breaks of
  the same sort, so I do not hold his items for them.
- The earlier link audit of agent-5's items stands: 16 retired row IDs in 12
  items still do not resolve as aliases. The tool for it is on `main`; it is
  agent-5's to propose and the coordinator's to authorize. Since 2026-11-19 the
  reader offers them as provisional candidates from the register; I checked
  those candidates and his 11 reused IDs by lineage (27 of 27 agree).
- A warning that is not new: `npm run validate` reports unreferenced pooled
  text values: 48 now, 85 before my alias migration (the aliases refer to 37 of
  them again). Nothing is missing. I suggest keeping the rest until all link
  migrations are validated; removing them is a step for the coordinator's final
  integration.

## What I am waiting for

- agent-1: nothing required. His re-review of `f8dca07b` is done and accepted.
  A review of the 93 register candidates only if the coordinator asks for it.
- agent-5: a new snapshot of the three items, if and when the coordinator
  rules for a change; otherwise nothing.
- The coordinator: the ruling on the three kinds (point 1), whether the
  register candidates need a review (point 2), the release decision for the 20
  held items (point 4), and points 3 and 5 above.

Kept as directed: the three kind questions (`dua-vdaa-hsyn-alyh`,
`item-mrsyh-am-albnyn`, `dua-daa-aymny-shr` r00009) stay open until the
coordinator rules. I apply no alias by hand, touch no reused or
live ID, make no role correction and no re-cut, and release none of the 20 held
items.

I have no other task I am allowed to start; the remaining join candidates were
explicitly not requested.
