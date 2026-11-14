# agent-6 status

**State: READY TO APPLY, WAITING FOR THE COORDINATOR'S GO.** Updated 2026-11-14
(UTC), after the coordinator's commit `55ef3fe4` appeared on `main`.

- Branch: `arena/1a493a80-mafatih`
- Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`
- `main` as I last fetched it: `55ef3fe494826c4530b964a1578c54d8ce58aea3` ("Check
  corrected occurrences at merged-row offsets", author Arena Coordinator). It
  changes `tests/runtime-audio.test.ts`, `tests/helpers/row-split-history.ts` and
  the pin in `tool-info.json`. It is **not merged into this branch yet**.
- Role: author of 115 items (reviewer: agent-1); reviewer of agent-5's 115 items.

## What I tested with `55ef3fe4` (scratch copy only, nothing pushed)

I was told to keep the 45 joins on hold until the coordinator sends the approved
commit and the next instructions. So I tried everything in a throw-away clone and
left this branch untouched.

- Merged `55ef3fe4`: no conflict; `verify-tool-info` reports the pin matches.
- Applied all 45 held joins with `merge-rows`: all 45 accepted, including by the
  link guard. 39 take one space in both languages, 6 in Arabic only; 84 new
  spaces in total.
- Links: of 3,202 row IDs published for these 22 items in my five snapshots, the
  joins retire none (79 were unreachable before and the same 79 after; these are
  the old ones already reported). No ID changes the text it opens.
- `npm run validate` passes; `npm run check` exits 0 (278 tests, 275 pass,
  0 fail, 3 skipped); `audit-authored` reports 115 of 115 complete.
- The exact rows and modes are in
  `agent-work/agent-6/proposals/held-joins.json` (row IDs only).

So the test fix does unblock all 45, and the 45 are safe for historical links.

## What I need from the coordinator

1. **Your go: confirm that `55ef3fe4` is the approved commit and that I may apply
   the 45 joins now**, or tell me which further commit (anchor safety) to wait
   for. On your word I merge it, replay the 45 joins on this branch, publish an
   isolated snapshot and ask agent-1 to review each new space separately.
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

## What I will do on the coordinator's go

In this order, and nothing before it:

1. Merge the named `main` commit into this branch. Check the pin with
   `split-agent.ts verify-tool-info` and run `npm run check`.
2. Check the links of every item I am about to touch against all my earlier
   snapshots.
3. Apply only the joins that are safe under the new rules. Leave the rest and
   list them with the reason.
4. Publish an isolated author snapshot and send agent-1 a `ready` message that
   lists each new proposed space on its own, so each one is reviewed separately.

I am not re-pinning the tools myself, not bypassing the link guard, and not
adding aliases by hand.

## Where my own 115 items stand

- All 115 are authored; `audit-authored` reports 115 of 115 complete.
- Latest isolated snapshot: `df85a685ee6ab183142fd99389258603d081c126`, accepted
  and merged by agent-1. The authored data has not changed since; agent-1
  confirmed the 115 items on my current head are byte-identical to it.
- Of 243 places where an original row boundary cuts an Arabic sentence: 52 joins
  are applied (33 items), 45 are prepared, tested and held (22 items, see
  `proposals/held-joins.json`), 146 are left as they are.
- agent-1 pre-read the 45 pairs and found all 45 justified. His one objection
  (five Arabic-only joins would glue Persian words) does not apply: he read the
  whole original rows, and each join merges only the last piece of one row with
  the first piece of the next, where one side has no Persian. I sent him the
  evidence.

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

## Not waiting on anyone

Nothing. I have no open task I am allowed to start: the 45 joins wait for point
1, and the remaining candidates were explicitly not requested.
