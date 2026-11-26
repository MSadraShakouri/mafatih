# Decision request: three open row kinds in agent-5's items

From agent-6 (reviewer of agent-5) to the coordinator. Written 2026-11-15 (UTC)
against agent-5's snapshot `d0fb57659675c25d0dbbe878a7ec9e9e6b7056d3`.

This file quotes and translates no devotional text. Rows are named by item and
row ID; what a row holds is described by its role only.

## Update 2026-11-26: closed

The coordinator decided case 1: keep `heading` (option A). I agree and
recorded my review against agent-5's snapshot
`1a908eacb7a6b8cbb66f43569615f62c25548122`. All three cases are closed; this
file is kept for the record only.

## Update 2026-11-20: cases 2 and 3 are done; only case 1 is open

agent-5 applied option B to cases 2 and 3 with `revise-preview` and `revise`
and published snapshot `1a908eacb7a6b8cbb66f43569615f62c25548122`. I reviewed
both items afresh against it and accepted them (`role-revision-check.json`;
`status.md`, section "Round of 2026-11-20, second part"). The new live IDs are
the ones my dry run predicted. **Case 1 (`dua-vdaa-hsyn-alyh`) is unchanged
and still yours to answer**; author and reviewer both lean to option A (keep).

## Update 2026-11-19: option B now has a supported tool

`main` `985f226c` adds `revise-preview` and `revise`. They change a published
split and, in the same guarded step, keep every old row ID as an alias built
from the frozen source offsets. So the sentence "B cannot be done with today's
tools" below is **no longer true**, and point 4 of the last section is met by
the tool. The three questions themselves are unchanged and still yours to
answer.

I tried option B for each case **in memory only**, with the project's own
functions, on agent-5's committed plans and layouts as merged here
(`scripts/simulate-kind-revision.mjs`, result in `kind-revision-dry-run.json`).
Nothing was written. This is not agent-5's preview and not an authorization.

| Case | Change tried | Live IDs retired, each kept as an alias | Rows that keep their ID | Earlier aliases | Proposed spaces | Text or attribution changed | Published links checked |
|---|---|---|---|---|---|---|---|
| 1 | `heading` to `instruction` | 1 (`r00001-sf8ca119bc7deb30b`) | none affected | 0, kept | 0 | none | 4 IDs, 1,373 code points, all open the same character |
| 2 | `recitation` to `quotation`, eight rows | 2 (the two joined rows) | 6 uncut rows | 2, kept | 2, same place | none | 17 IDs, 2,780 code points, all the same |
| 3 | `quotation` to `recitation`, verse piece | 1 (`r00009-se370353bb3dfce92`) | none affected | 2, kept | 3, same place | none | 20 IDs, 6,702 code points, all the same |

All three passed the history check, the validator and the canonical check.
Limits: the history I can check is the frozen base up to my own branch tip
(it holds all 26 isolated agent-5 snapshots, not his other commits); none of
the three items has an entry in the provisional register.

What this changes in my advice:

- **Case 1:** still **A**. B no longer costs a link, but the gain is small.
  Either answer is safe.
- **Case 2:** **B**, without the earlier reservation.
- **Case 3:** **B** for the verse piece, without the earlier reservation.

If you choose B anywhere, the steps are: you authorize agent-5 for that item;
he runs `revise-preview` and `revise` on his own branch and publishes a
snapshot; I review the changed item again against that exact snapshot, every
re-made space separately. I make no change to his files.

## What I ask

For each of the three cases below, choose **A** (keep the kind, I close the
question) or **B** (change the kind). Only B has a link effect, and B cannot be
done with today's tools. So if you choose B anywhere, I also need point 4 of the
last section.

Until you decide, my three review records stay `needs work`, nothing is asked of
agent-5, and no row is changed.

## Why the tools matter here

- The ID of a **cut piece** and of a **joined row** is computed from, among other
  things, its kind. Change the kind and the row gets a new ID; the old ID, which
  is live and published, is no longer a row.
- The ID of an **uncut row** stays the same when only its kind changes. The
  guard on `main` allows that.
- `apply` now refuses any revision that would leave a published row ID without a
  destination ("would orphan a previously published row link"). It does so for
  V1, V2 and V3 records.
- `alias-migrate` cannot help beforehand. It accepts only IDs that are already
  retired in the reachable history, and it refuses an ID that is still a live
  row. The migration of my own 142 retired IDs shows that retired IDs can be
  recovered; it does not establish a safe way to correct a live row.

So today there is **no supported operation** that changes the kind of a cut
piece or of a joined row. Text and source attribution would not change in any
of these cases, so an exact alias from the old ID to the same text is possible
in principle; the tool that writes it in the same guarded step does not exist.

## Case 1: `dua-vdaa-hsyn-alyh`, opening row

- **Row:** `r00001-sf8ca119bc7deb30b`, kind `heading`. Persian only, 21 code
  points. Mapping record V1, no alias, no proposed space.
- **Why it has a computed ID though it is not cut:** the source keeps this
  Persian text in the Arabic field, and the layout moves it to the Persian slot.
- **The question:** the row is not a title. It holds an ordinal and the name of
  a narrator, and its sentence continues in `r00002`, which is `instruction`.
  `heading` is doubtful; the kind of `r00002` would be consistent.
- **A, keep `heading`:** no link effect. A short opening line stays styled as a
  heading. agent-5's weekday item `ziyarat-mvsy-kazm-rza` keeps a similar opening
  line as `heading`, and I accepted it there.
- **B, change to the kind of `r00002`:** retires **1 live ID**, published in
  all nine agent-5 snapshots from `b537ded` to `d0fb5765`. Refused by `apply`
  today. After B, a join with `r00002` would become possible; that is a second,
  separate step with one proposed space.
- **My recommendation: A.** The reading gain of B is small and it costs a
  published ID.

## Case 2: `item-mrsyh-am-albnyn`, the eight verse rows

- **Rows:** eight rows of elegy verses, all `recitation`. Mapping record V3,
  2 aliases, 2 accepted Arabic spaces.
  - Six uncut rows: `r00007`, `r00009`, `r00010`, `r00011`, `r00012`, `r00013`.
  - Two joined rows: `m7fd11ac1993a4b4f9d3db507` (from `r00003` and `r00004`)
    and `m593b5e8d63e327587f6fea00` (from `r00005` and `r00006`). Each carries
    one accepted space and stands over one alias
    (`r00003-s3230365f4763acdc`, `r00005-sbd4e608dd116bf2e`).
- **The question:** the verses are reported inside the compiler's narrative;
  the reader is not told to recite them. Two comparable places are `quotation`:
  agent-5's own `amal-byan-nhvst-sfr` `r00006`, and the elegy verses of my
  `amal-byst-sfr` (accepted by agent-1). `recitation` here differs from both.
- **A, keep `recitation` in all eight:** no link effect. One item stays
  inconsistent with the two others.
- **B, change all eight to `quotation`:**
  - six rows keep their IDs (uncut; allowed today);
  - **2 live joined IDs** retire, published in seven snapshots from `8121f9b2`
    to `d0fb5765`; refused by `apply` today;
  - the 2 aliases under them must be carried to the new rows;
  - the two joins are made again, so their 2 spaces need a fresh proposal and
    a fresh review; agent-5 publishes a snapshot and I re-review the item.
- **C, change only the six uncut rows:** possible today and link-safe, but it
  leaves one poem with two kinds. **I advise against C.**
- **My recommendation:** B is right on substance, but only with a supported
  operation. Without one, A; the item can be released as it is, with the
  inconsistency recorded.

## Case 3: `dua-daa-aymny-shr`, source row `r00009`

- **Rows:** two cut pieces of `r00009`. Mapping record V3, 2 aliases and
  3 accepted spaces elsewhere in the item, none in these two rows.
  - `r00009-se370353bb3dfce92`, kind `quotation`: Arabic (122 code points)
    beside its Persian (109).
  - `r00009-sc64421e6669ebe6d`, kind `instruction`: Persian only, 27 code
    points, stored by the source in the Arabic field.
- **The question, second piece:** it is the third verse of the prayer. The two
  verses before it stand in the row just above (`ma8b5fc6e4d9b4e00b7ae91e8`),
  which is `recitation`. So one prayer shows two verses as `recitation` and the
  third as `quotation`.
- **The question, first piece:** it is not a direction to the reader. It only
  repeats the opening words of the Persian of the verse. `instruction` is
  doubtful, but no other kind fits clearly; this is a property of the source.
- **A, keep both:** no link effect. The inconsistency inside the prayer stays.
- **B, second piece to `recitation`:** retires **1 live ID**, published in all
  nine agent-5 snapshots. Refused by `apply` today. The first piece is left as
  it is.
- **My recommendation: B for the second piece**, when a supported operation
  exists, because the inconsistency is inside one prayer and visible. Leave the
  first piece as it is in either case.

## Summary

As of 2026-11-19 (see the update at the top):

| Case | Rows in question | Live IDs retired by B (kept as aliases) | B possible | I recommend |
|---|---|---|---|---|
| 1 `dua-vdaa-hsyn-alyh` | 1 | 1 | yes, with `revise` | A (B is also safe) |
| 2 `item-mrsyh-am-albnyn` | 8 | 2 (6 keep their IDs) | yes, with `revise` | B |
| 3 `dua-daa-aymny-shr` `r00009` | 2 | 1 | yes, with `revise` | B for the verse |

## What I need from you

1. Case 1: A or B.
2. Case 2: A or B (not C).
3. Case 3: A or B for the verse piece.
4. *(Met on 2026-11-19 by `revise` on `main` `985f226c`; what remains is your
   authorization of agent-5 for each item where you choose B.)* Only if any
   answer is B: a supported, guarded operation for a **kind-only
   change of a cut piece or joined row** that, in the same step, records the old
   ID as an alias to the unchanged text and carries existing aliases and
   spaces; or your word that these rows wait for the version-aware reader. I
   will not ask agent-5 for a hand edit, and the guard would refuse it.

After your decision: for A, I set the kind decisions to `accept` with a note of
your ruling and the records become complete. For B, agent-5 makes the change
with the supported operation and publishes a snapshot; I review the item again
against that exact snapshot, each re-made space separately.
