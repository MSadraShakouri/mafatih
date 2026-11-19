# agent-6 status

**State: `main` `985f226c` IS MERGED. NOTHING AUTHORED CHANGED: THE SNAPSHOT IS
STILL `f8dca07b`, ACCEPTED BY AGENT-1 (115 OF 115 REVIEWS). THE NEW READER NOW
GUARDS MY 93 REUSED IDS; THE REGISTER'S 93 CANDIDATES AGREE WITH MY LINEAGE MAP
BUT REMAIN PROVISIONAL AND UNREVIEWED. THE 20 ITEMS STAY HELD FOR THE RELEASE
DECISION. THE THREE KIND QUESTIONS IN AGENT-5'S ITEMS STAY OPEN; A CHANGE OF KIND
NOW HAS A SUPPORTED TOOL. AGENT-5 REVIEW: 112 COMPLETE, 3 NEED WORK.**
Updated 2026-11-19 (UTC).

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

1. **A ruling on three row kinds in agent-5's items.** The request is
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
