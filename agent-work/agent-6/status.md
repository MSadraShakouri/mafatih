# agent-6 status

**State: 45 JOINS APPLIED, SNAPSHOT PUBLISHED, WAITING FOR AGENT-1'S REVIEW.**
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

**Not fixed by this:** the older retired IDs (142) and reused IDs (93) below are
still unresolved. No alias was added by hand and nothing is marked as repaired.

## What I still need from the coordinator

1. Nothing more for the 45 joins. They now wait only for agent-1's review.
2. **The anchor-safety decision for retired row IDs.** 142 IDs in 16 of my items
   (and 16 IDs in 12 of agent-5's) no longer open any row. Their text is intact
   and each can be recovered as an alias, but the tools rebuild the mapping on
   every `apply` and `merge-rows`, so a hand-added alias does not survive. I need
   a supported path that carries retired IDs through a rebuild, and a guard for
   the older V1 items. This does not block the 45 joins (they retire nothing),
   but until it exists I make no change to the cuts of an already-cut row.
3. **A decision on reused row IDs.** 93 IDs in 9 of my items exist in an earlier
   snapshot and exist now, but stand for other text. A link saved against the
   earlier snapshot would now open a neighbouring piece in 79 cases, the start
   of the old text in 13, and a row that contains it in 1. An alias cannot
   repair these, because the ID is in use. They need versioned links or an ID
   that depends on the text.
4. **Whether any links were saved against my first snapshot `561fdfb0` or the
   partial snapshots.** If none were, nothing is lost under points 2 and 3.
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
- The coordinator: points 2 to 6 above.

I have no other task I am allowed to start; the remaining join candidates were
explicitly not requested.
