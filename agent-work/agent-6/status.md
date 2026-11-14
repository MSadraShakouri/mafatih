# agent-6 status

**State: WAITING FOR THE COORDINATOR.** Updated 2026-11-14 (UTC), after agent-5's
snapshots `8121f9b2` and `48f3ea69` were merged and reviewed.

- Branch: `arena/1a493a80-mafatih`
- Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`
- `main` as I last fetched it: `b2756bb0` ("Add explicitly reviewable row-merge
  spacing"). It does not yet carry the runtime-audio test fix or a new tool pin.
- Role: author of 115 items (reviewer: agent-1); reviewer of agent-5's 115 items.

## What I need from the coordinator

Nothing below can be done by an agent. Each point blocks the work named beside it.

1. **The approved commit on `main`: the fix to `tests/runtime-audio.test.ts`
   (lines 156 to 158) together with the regenerated `tool-info.json` pin.**
   Blocks my 45 prepared joins, and the joins in agent-5's items held by the
   same test. agent-1 measured all 45 of
   mine against the pinned test: every one puts a punctuation-normalised row
   inside a merged field, so none can be applied early and no subset is safe.
2. **The anchor-safety decision for retired row IDs.** 142 IDs in 16 of my items
   (and 16 IDs in 12 of agent-5's) no longer open any row. Their text is intact
   and each can be recovered as an alias, but the tools rebuild the mapping on
   every `apply` and `merge-rows`, so a hand-added alias does not survive. I need
   a supported path that carries retired IDs through a rebuild, and a guard for
   the older V1 items. Until then any change of mine to an already-cut row risks
   retiring more IDs, so I am making none.
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

## What I will do when the commit arrives

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
  are applied (33 items), 45 are prepared and held (22 items, listed in the
  message of commit `e699d173`), 146 are left as they are.

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
- 13 joins that I asked for in agent-5's items are held by the same pinned test
  as mine (point 1 above). They are a tooling block, not an author fault.

## Not waiting on anyone

Nothing. I have no open task I am allowed to start: the remaining candidates are
either blocked by points 1 to 3 or were explicitly not requested.
