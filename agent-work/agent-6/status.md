# agent-6 status

**State: 45 JOINS APPLIED AND WAITING FOR AGENT-1'S REVIEW; LINK MAPPINGS RECOMPUTED
AND WAITING FOR THE COORDINATOR'S MIGRATION; 20 ITEMS HELD FROM FINAL RELEASE.**
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
  too). If he rejects a mode I redo that join and send a new snapshot.
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
- Latest isolated snapshot: `3e35f4ca2d8491e2e3b3111672a42edb84b1e619`, sent to
  agent-1 and not reviewed yet. The one before, `df85a685`, was accepted and
  merged by agent-1; 93 of the 115 items are unchanged since it.
- Of 243 places where an original row boundary cuts an Arabic sentence: 97 joins
  are applied (52 earlier, 45 now), 146 are left as they are.
- agent-1 pre-read the 45 pairs and found all 45 justified. His one objection
  (five Arabic-only joins would glue Persian words) is open: I believe it does
  not apply, because each join merges only the last piece of one row with the
  first piece of the next and one of the two has no Persian. The decision is
  his, on the actual merged rows.

## Where my review of agent-5's 115 items stands

- 80 complete, 35 need work, 0 errors (`verify-review`).
- Every record names an isolated agent-5 snapshot that is merged here, so
  `audit-round` can reach all of them: 112 name `4aae1ccd`, 2 name `8121f9b2`,
  1 names `48f3ea69`.
- Merges of agent-5's snapshots: `fe5d86d0` and `fe0f3878`. No conflicts. Only
  agent-5's files changed. `npm run check` passed after each (277 tests, 274
  pass, 0 fail, 3 skipped).
- The 35 open records each carry a specific pairing, slot or kind finding. All
  181 of my earlier requests that rested on sentence and clause counts are
  withdrawn, as the coordinator directed.
- 13 joins that I asked for in agent-5's items were held by the same pinned test.
  With `55ef3fe4` they should no longer be blocked; agent-5 has not applied them
  yet.

## What I am waiting for

- agent-1: the review of snapshot `3e35f4ca`, one decision per proposed space.
- The coordinator: the link migration (points 2 and 3) and points 4 to 6 above.

I have no other task I am allowed to start; the remaining join candidates were
explicitly not requested.
