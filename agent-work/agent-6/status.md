# agent-6 status

**State: 45 JOINS ACCEPTED BY AGENT-1; AGENT-5 SNAPSHOTS UP TO `bae5beb3` MERGED AND
REVIEWED (111 COMPLETE, 4 NEED WORK); LINK MAPPINGS RECOMPUTED AND WAITING FOR THE
COORDINATOR'S MIGRATION; 20 ITEMS HELD FROM FINAL RELEASE.**
Updated 2026-11-13 (UTC).

- Branch: `arena/1a493a80-mafatih`
- Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`
- `main` merged here: `55ef3fe494826c4530b964a1578c54d8ce58aea3` (merge `f3b36419`),
  confirmed by the coordinator as the intended fix. The tool pin matches.
- Latest isolated author snapshot: `3e35f4ca2d8491e2e3b3111672a42edb84b1e619`
  (author-ready, 115 of 115 items, direct child of `df85a685`).
- Role: author of 115 items (reviewer: agent-1); reviewer of agent-5's 115 items.

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

## Historical links: decided, recomputed, not yet applied

The coordinator decided how the older link problems are repaired. **They are
still unresolved in the data.** I added no alias by hand and re-cut nothing.

- **142 retired IDs (16 items):** to be recovered with durable aliases by the
  coordinator's tooling, including the 10 seen only in branch commits. As asked,
  I recomputed the mappings against `3e35f4ca` and validated them: same 142
  IDs, all mapped and text-checked; with the project's own validator in a
  throw-away copy, 0 errors before and after adding the 142 aliases, and all 142
  IDs resolve. One mapping changed because of the joins. File:
  `proposals/historical-row-links.json`.
- **93 reused IDs (9 items):** not overwritten and not redirected.
  `proposals/reused-row-ids.json` is now a snapshot-versioned map: for each ID
  and each earlier meaning, the snapshots that carried it and where that text is
  in `3e35f4ca`. For a link without a snapshot it lists the known destinations
  to offer and does not choose.
- **Held from final release (20 items)** until the link fixes are validated; the
  list is in `proposals/README.md`.
- After the migration I rerun both programs (`proposals/scripts/`) against the
  migrated snapshot, and the reviews bound to a snapshot are refreshed.

## What I still need from the coordinator

1. Nothing more for the 45 joins. They now wait only for agent-1's review.
2. **The migration itself:** the tooling that turns the 142 proposed aliases
   into durable aliases (kept through `apply` and `merge-rows`), raises the six
   V1 records that carry retired IDs, and guards V1 re-splits. Then the commit
   to merge. Until it exists I make no change to the cuts of an already-cut row.
3. **The reader side for the 93 reused IDs:** snapshot-versioned links, and the
   warning with the known destinations for a link without a version.
4. **Whether any links were saved against my first snapshot `561fdfb0` or the
   partial snapshots.** Only this tells how many old unversioned links exist.
5. **Two kind questions in agent-5's items**, kept `uncertain` in my records as
   directed: the elegy verses of `item-mrsyh-am-albnyn` (I lean `quotation`) and
   the opening row of `dua-vdaa-hsyn-alyh` (`heading` is doubtful). A kind
   change on an already-cut or joined piece gives it a new row ID, so I did not
   ask agent-5 to change them.
6. *(Optional.)* Whether a direction that the source prints twice, once in each
   language field, should be shown once. Today that needs a tool change. I
   accepted the two adjacent rows in `amal-aamal-shbhay-dhh` and
   `amal-bqyh-aamal` r00029 as a property of the source.

Details and evidence for points 2 to 4: `agent-work/agent-6/proposals/README.md`,
with `historical-row-links.json`, `reused-row-ids.json` and
`agent-5-retired-row-ids.json` in the same folder.

## Where my own 115 items stand

- All 115 are authored; `audit-authored` reports 115 of 115 complete.
- Latest isolated snapshot: `3e35f4ca2d8491e2e3b3111672a42edb84b1e619`. agent-1
  reviewed and accepted it; nothing is open between us on the joins.
- Of 243 places where an original row boundary cuts an Arabic sentence: 97 joins
  are applied (52 earlier, 45 now), 146 are left as they are.
- 20 items stay held from final release until the coordinator's link migration
  is applied and validated (list in the section on historical links). After the
  migration I publish a new snapshot and agent-1 rebinds the items concerned.

## Where my review of agent-5's 115 items stands

- **111 complete, 4 need work, 0 errors** (`verify-review`, all 115 records, each
  against the snapshot it names).
- Every record names an isolated agent-5 snapshot that is merged here: 79 name
  `4aae1ccd`, 2 name `8121f9b2`, 1 names `48f3ea69`, 14 name `b81241ae`,
  4 name `f192ee09`, 15 name `bae5beb3`. For the 100 records that name an
  older snapshot I compared the item, its mapping, plan and layout with
  `bae5beb3`: all 100 are identical there, so those reviews still hold.
- Merges of agent-5's snapshots: `fe5d86d0`, `fe0f3878`, `6f178ea2`,
  `175d6327` and now `fc7195fb` (the chain `69a996e3`, `bae5beb3`). No
  conflicts. Only agent-5's files changed; every changed file equals the
  snapshot; no pooled value was lost or changed. `npm run check` passed on
  `fc7195fb` (278 tests, 275 pass, 0 fail, 3 skipped).
- **This round (snapshot `bae5beb3`, 15 changed items): 13 complete, 2 need
  work.**
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
- The 4 open records:
  - Kind questions for the coordinator, kept `uncertain`, nothing for the
    author (2): `dua-vdaa-hsyn-alyh`, `item-mrsyh-am-albnyn`.
  - Waiting for alias tooling, nothing for the author (1): the kind of
    `dua-daa-aymny-shr` r00009. Its pieces are already cut; a kind change gives
    a cut piece a new row ID and retires the published one.
  - Author fix, link-safe (1): the kind of `khavas-avzat-drd-chshm` r00011
    (a verse to be said every day, `quotation` now, `recitation` in the same
    author's `item-jht-drd-zanv` r00005). **A correction of my last status:** I
    had listed this row as waiting for tooling. That was wrong. The row has
    never been cut, so a kind change keeps its ID, as `ziyarat-adab` r00025 to
    r00030 show in this snapshot. I have now asked agent-5 for it.
- Answered, complete, but to be redone when a re-cut can keep old IDs:
  `amal-daahay-sjdh-shkr` r00017. Its first published piece holds the end of an
  Arabic invocation that starts in r00016, and the label of the twelfth section.
  agent-5 asked me to rule on it; I agreed that it stays as it is. A join of the
  two note rows is offered to him, not required.
- Offered to agent-5 and not required: that join, and `ziyarat-adab` r00020
  with r00021 (a name broken at the row boundary). My own items keep breaks of
  the same sort, so I do not hold his items for them.
- The earlier link audit of agent-5's items stands: 16 retired row IDs in 12
  items still do not resolve. That is the same tooling gap as in my items.
- A warning that is not new: `npm run validate` reports 85 unreferenced pooled
  text values, the same number as before this merge. They are the old texts
  behind retired row IDs (71 of the 85 traced to earlier isolated snapshots).
  Nothing is missing. I suggest keeping them until the link migration is
  validated; removing them is a step for the coordinator's final integration.

## What I am waiting for

- agent-1: nothing. His review of snapshot `3e35f4ca` is done.
- agent-5: one kind change (`khavas-avzat-drd-chshm` r00011), as an isolated
  snapshot. Nothing else.
- The coordinator: the link migration (points 2 and 3) and points 4 to 6 above.

I have no other task I am allowed to start; the remaining join candidates were
explicitly not requested.
