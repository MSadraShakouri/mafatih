# agent-6 status

**State: THE 142 RETIRED ROW IDS ARE MIGRATED (16 ITEMS, OFFICIAL COMMAND, ON THE
COORDINATOR'S AUTHORIZATION); NEW AUTHOR SNAPSHOT `f8dca07b` WAITS FOR AGENT-1'S
RE-REVIEW OF THOSE 16 ITEMS; THE 93 REUSED IDS ARE UNTOUCHED; ALL 20 ITEMS STAY
HELD. AGENT-5 REVIEW: 112 COMPLETE, 3 NEED WORK, DECISION REQUEST SENT.**
Updated 2026-11-15 (UTC).

- Branch: `arena/1a493a80-mafatih`
- Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`
- `main` merged here: `2163b5e7aa43fe9cb72ac681e6a62dc0f4936fe4` (merge `99e481d9`):
  the re-split guard and the retired-link migration (`alias-preview`,
  `alias-migrate`). No conflict; the 12 changed files equal `main`; the tool pin
  matches; `npm run check` passes (283 tests, 280 pass, 0 fail, 3 skipped).
- Latest isolated author snapshot: `f8dca07be7536bf19ea17c869bf098385002099a`
  (author-ready, 115 of 115 items, direct child of `3e35f4ca`; differs from it
  only in the 16 migrated mapping records).
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
- **New snapshot:** `f8dca07be7536bf19ea17c869bf098385002099a`. agent-1 has the
  list of the 16 items for independent re-review (message `a8947b4e`); his
  other 99 reviews are not affected.
- **Evidence:** `proposals/alias-migration-record.json` (per item: aliases
  added, format and hashes before and after, the retired IDs),
  `proposals/README.md`, and the checkers in `proposals/scripts/`.

**Not done, and not covered by the authorization:**

- **93 reused IDs (9 items):** untouched. Each is still live with its current
  meaning and none was given an alias. `proposals/reused-row-ids.json` (now
  against `f8dca07b`, same 93 mappings) is the snapshot-versioned map for the
  reader change. Five of the nine items are also among the 16 migrated ones.
- **Held from final release: all 20 items** (the 16 migrated and the 4 that
  have reused IDs only). The migration is not validated until agent-1 has
  re-reviewed the 16, and the reused IDs need the reader change.
- No role correction and no re-cut of a published row.

## What I still need from the coordinator

1. **A ruling on three row kinds in agent-5's items.** The request is
   `proposals/kind-decision-request.md`: `dua-vdaa-hsyn-alyh` (opening row),
   `item-mrsyh-am-albnyn` (eight verse rows) and `dua-daa-aymny-shr` r00009.
   For each: keep the kind, or change it. A change retires a live ID in each
   case (1, 2 and 1) and no tool supports it today: `apply` refuses to orphan a
   published ID and `alias-migrate` takes only IDs that are already retired.
   The migration of my retired IDs does not make such a correction safe.
2. **The reader side for the 93 reused IDs:** snapshot-versioned links, and the
   warning with the known destinations for a link without a version.
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
  accepted its parent `3e35f4ca` in full; the new one differs in 16 mapping
  records (the alias migration) and waits for his re-review of those 16 items.
- Of 243 places where an original row boundary cuts an Arabic sentence: 97 joins
  are applied (52 earlier, 45 now), 146 are left as they are.
- 20 items stay held from final release (list in `proposals/README.md` and in
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
  items still do not resolve. The tool for it is now on `main`; it is agent-5's
  to propose and the coordinator's to authorize.
- A warning that is not new: `npm run validate` reports unreferenced pooled
  text values: 48 now, 85 before my alias migration (the aliases refer to 37 of
  them again). Nothing is missing. I suggest keeping the rest until all link
  migrations are validated; removing them is a step for the coordinator's final
  integration.

## What I am waiting for

- agent-1: his independent re-review of the 16 migrated items at `f8dca07b`.
- agent-5: nothing.
- The coordinator: the ruling on the three kinds (point 1), the reader side
  (point 2) and points 3 to 5 above.

Kept as directed: the two kind questions and `dua-daa-aymny-shr` r00009 stay
open until the coordinator rules. I apply no alias by hand, touch no reused or
live ID, make no role correction and no re-cut, and release none of the 20 held
items.

I have no other task I am allowed to start; the remaining join candidates were
explicitly not requested.
