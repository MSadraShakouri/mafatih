# agent-6 status

**State: 45 JOINS ACCEPTED BY AGENT-1; AGENT-5 SNAPSHOTS UP TO `f192ee09` MERGED AND
REVIEWED (101 COMPLETE, 14 NEED WORK); LINK MAPPINGS RECOMPUTED AND WAITING FOR THE
COORDINATOR'S MIGRATION; 20 ITEMS HELD FROM FINAL RELEASE.**
Updated 2026-11-14 (UTC).

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
5. **The kind of the elegy verses in `item-mrsyh-am-albnyn`** (agent-5's item). I
   lean `quotation`. A kind change alters the row ID, so it would retire the IDs
   of the rows agent-5 has just joined. I left it as `uncertain` and did not ask
   agent-5 to change it.
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

- 101 complete, 14 need work, 0 errors (`verify-review`, all 115 records).
- Every record names an isolated agent-5 snapshot that is merged here: 89 name
  `4aae1ccd`, 2 name `8121f9b2`, 1 names `48f3ea69`, 17 name `b81241ae`,
  6 name `f192ee09`.
- Merges of agent-5's snapshots: `fe5d86d0`, `fe0f3878`, `6f178ea2` (the chain
  `5fdda3a7`, `1bf2e925`, `d28d23e5`, `85268da2`, `b81241ae`) and `175d6327`
  (`f192ee09`). No conflicts. Only agent-5's files changed; every changed file
  equals the snapshot; no pooled value was lost. `npm run check` passed after
  each of the last two (278 tests, 275 pass, 0 fail, 3 skipped).
- Last round (23 changed items): 21 complete, 2 need work. All 34 new proposed
  spaces are accepted, each checked against the two joined pieces and by code
  point. The 13 joins that the pinned test used to hold are applied and correct.
  No row ID published in agent-5's earlier snapshots was lost (1,259 checked).
- The 14 open records:
  - Author fixes, link-safe (12): `amal-ahd-bhshty`, `amal-daahay-sjdh-shkr`,
    `dua-daa-aymny-shr`, `dua-iftitah`,
    `fazilat-svrhqdrvtryqtfryqmrtbhmrtbhanbrshbanhrvz`, `item-asharh-5`,
    `item-avzh-kyk-kk`, `item-azn-dkhvl-hrmhay`, `khavas-avzat-drd-chshm`,
    `khavas-tlqyn-myt`, `ziyarat-adab`, `ziyarat-fzylt-jafr-hrm`. Each rests on
    a specific point: a numbered section that starts inside a prose row, an
    Arabic sentence left in the Persian slot, or an Arabic piece beside Persian
    that renders other words. None rests on length or on counts.
  - Kind questions for the coordinator, nothing for the author (2):
    `dua-vdaa-hsyn-alyh`, `item-mrsyh-am-albnyn`.
  - Waiting for alias tooling: the kind of `dua-daa-aymny-shr` r00009 and of
    `khavas-avzat-drd-chshm` r00011. A kind change on a cut piece gives it a new
    row ID and retires the published one, so I ask agent-5 not to change them
    yet.
- Offered to agent-5 and not required: four more joins of sentences broken
  across source rows (`amal-aamal-rmzan-2` r00002 with r00003 and r00006 with
  r00007, `ziyarat-mshtrk-kazmyn-alyhma` r00003 with r00004,
  `ziyarat-mvsy-kazm-rza` r00003 with r00004). My own items keep breaks of the
  same sort, so I do not hold his items for them.
- The earlier link audit of agent-5's items stands: 16 retired row IDs in 12
  items still do not resolve. That is the same tooling gap as in my items.
- A warning that is not new: `npm run validate` reports 85 unreferenced pooled
  text values. It was 86 before this round, and this round added none. I traced
  71 of the 85 to earlier isolated snapshots (64 to my `561fdfb0`, the rest to
  my other early snapshots and to agent-5's first one): they are the texts of
  rows that were later cut again. 14 I did not trace. Nothing is missing. I
  suggest keeping them until the link migration is validated, because they are
  the old texts behind the retired row IDs; removing them is a step for the
  coordinator's final integration, not for one agent's branch.

## What I am waiting for

- agent-1: nothing. His review of snapshot `3e35f4ca` is done.
- agent-5: the two fixes of the last round (`khavas-tlqyn-myt`,
  `dua-daa-aymny-shr`) and the ten older author fixes, as isolated snapshots.
- The coordinator: the link migration (points 2 and 3) and points 4 to 6 above.

I have no other task I am allowed to start; the remaining join candidates were
explicitly not requested.
