# agent-6's row links: retired IDs migrated, reused IDs still open

Status (2026-11-15): **the 142 retired IDs are migrated to durable aliases** in
snapshot `f8dca07be7536bf19ea17c869bf098385002099a`, with the coordinator's
official command and on the coordinator's authorization. **The 93 reused IDs
are untouched and still open. All 20 affected items stay held.** No alias was
written by hand, no row was re-cut, no guard was bypassed.

## The migration (2026-11-15)

- **Scope authorized:** only the 142 already-retired IDs of
  `historical-row-links.json`, in 16 items, at snapshot `3e35f4ca`. Not
  covered: reused or live IDs, role corrections, re-cuts, release.
- **Before:** the item, mapping, plan and layout of all 16 items were identical
  to `3e35f4ca`. A fresh `alias-preview` at branch tip `9e36fd49` accepted
  exactly that scope: 142 aliases in 16 items, each alias object identical to
  the proposal. Confirmation
  `a08e695b5f5d6765a60ddbb8cd75d87d2b517d4461b8bcf61c65f3df0f7d5396`.
- **Run:** `alias-migrate` with that confirmation; commit `0d6a78ca`.
- **What changed:** 16 files, the mapping records `data/row-splits/<item>.json`
  of the 16 items, and nothing else. 142 aliases added; the 88 aliases that
  were there are untouched; 6 records promoted from V1 to V2. No item file, no
  row, kind or text, no pooled text, no plan, no layout and none of the 91
  proposed spaces in these records changed.
- **Checks after:**
  - `scripts/check-alias-migration.cjs`: 11 of 11, both for the worktree
    against the commit before and for the new snapshot against `3e35f4ca`.
    Every added alias rebuilds its old text from the current rows, code point
    by code point.
  - `scripts/audit-migrated-links.mjs` (the project's loader, validator and
    resolver): 0 validator errors; all 142 retired IDs resolve; the 93 reused
    IDs keep their current meaning and none was given an alias.
  - `scripts/recompute-row-links.cjs` against the new snapshot, in a scratch
    worktree: 0 retired IDs left; the same 93 reused IDs in 9 items.
  - `npm run validate` passes (unreferenced pooled values fall from 85 to 48,
    because the aliases now refer to the old texts). `audit-authored`: 115 of
    115. `npm run check`: 283 tests, 280 pass, 0 fail, 3 skipped.
- **New author snapshot:** `f8dca07be7536bf19ea17c869bf098385002099a`
  (author-ready, child of `3e35f4ca`; differs from it in the 16 mapping
  records only). agent-1's reviews of these 16 items are stale and are to be
  redone; his other 99 reviews are not affected.
- **Record with the per-item evidence:** `alias-migration-record.json` (for
  each item: aliases added, format before and after, hashes of the mapping
  record before and after, the retired IDs).

Files kept as they were, as the evidence of what was migrated:
`historical-row-links.json` (the proposal the migration ran on, target
`3e35f4ca`). `reused-row-ids.json` is recomputed against `f8dca07b`; its 93
mappings are the same, only the snapshot labels and totals changed.

Everything below this line is the proposal as it stood **before** the
migration. It is kept for the record and for the part on the reused IDs, which
is still current.

---

# Proposal (before the migration): recover agent-6's retired row links

Status at the time: proposal only, nothing applied to `data/`. No row was
re-split, no guard was bypassed and no pinned tool was changed to produce this.

Data in this directory:

- `historical-row-links.json`: one proposed alias per retired row ID (142 IDs,
  all recoverable). **Recomputed against snapshot `3e35f4ca`.**
- `reused-row-ids.json`: the 93 row IDs that are still in use but stood for
  other text in an earlier snapshot, now as a **snapshot-versioned map**
  (recomputed against `3e35f4ca`).
- `scripts/recompute-row-links.cjs` and `scripts/validate-row-links.mjs`: the
  two programs that produce and check the files above. Both only read.
- `held-joins.json`: the 45 joins applied in `3e35f4ca`, with every proposed
  space.
- `agent-5-retired-row-ids.json`: the retired-ID check run on agent-5's items as
  their reviewer (as of their snapshot `4aae1ccd`; not recomputed here).

## Coordinator decision and recomputation against `3e35f4ca`

The coordinator decided (relayed 2026-11-14):

- **142 retired IDs:** recover them with durable aliases, including the 10 seen
  only in branch commits. The coordinator's tooling must keep those aliases
  through rebuilds and guard V1 re-splits. Not by hand, and not by re-cutting
  text. Recompute and validate the mappings against `3e35f4ca` before applying.
- **93 reused IDs:** do not overwrite their current meaning and do not redirect
  them to the old text. Use snapshot-versioned links and mappings. A link
  without a version is ambiguous: the reader should warn and offer the known
  destinations. An old unversioned link cannot be repaired automatically.
- Final release of the affected items is held until the link fixes are
  validated. Reviews bound to a snapshot are refreshed after the migration.

What I did, and nothing more: I recomputed both files against `3e35f4ca` and
validated them. **Nothing is applied to `data/`. No alias was added, no row was
re-cut, and the IDs are still unresolved** until the coordinator's tooling
applies the migration.

### How it is computed

A cut piece is a slice of one source field of one original row, and every
version of `data/row-splits/<item>.json` records that slice as code-point
offsets. So the program does not search for text. For an old row ID it takes
the slice the ID stood for in its own version, intersects it with the segments
that `3e35f4ca` records for the same source field, and that is the mapping.
Then it checks each mapping by text: the mapped slices of the `3e35f4ca` rows,
joined, must equal the old field exactly.

It reads every version of my 115 items in every commit since the base, plus the
six snapshot commits (`b8d0d350`, `941c7ad3`, `561fdfb0`, `36f89c8b`,
`df85a685`, `3e35f4ca`).

```
node agent-work/agent-6/proposals/scripts/recompute-row-links.cjs 3e35f4ca2d8491e2e3b3111672a42edb84b1e619
node --import tsx agent-work/agent-6/proposals/scripts/validate-row-links.mjs
```

### Result for the 142 retired IDs

- The set is unchanged: **142 IDs in 16 items**, 132 published in a snapshot
  (`561fdfb0`) and 10 seen only in branch commits. The 45 joins of `3e35f4ca`
  added none.
- All 142 are mapped and text-checked, with 0 problems. No ID had more than one
  old meaning, and the text of every old piece is already in the pooled values
  of `3e35f4ca`, so the migration has no text to add.
- 141 mappings are the same as in my earlier proposal. One changed because of
  the joins: `item-dvm-khtbh-ayd` `r00001-sff96fc5fba421d81` now points into the
  merged row `m6238f25f38ff801b758fc1e1`.
- By kind of repair: 55 are the same row under a new ID, 10 are the same text
  with a changed kind (the 10 branch-only ones), 77 are a part of one larger
  current row.
- Validation with the project's own `validateCorpus`, in a throw-away copy of
  the `3e35f4ca` tree: 0 errors before; 142 aliases added; 0 errors after; all
  142 IDs then answer `hasHistoricalRow`; the 93 reused IDs keep their current
  meaning. Six records are still V1 and had to be raised to V2 for the test
  (`amal-aamal-hfdhm-mvlvd`, `amal-aamal-mbas`, `amal-aamal-msjd-sasah`,
  `amal-aamal-zval-jmah`, `amal-arbayn`, `khavas-khvas-angshtr-aqyq`), because
  V1 may not carry aliases. The real migration needs the same step from the
  tool, with the record hashes kept consistent.

### Result for the 93 reused IDs

- The set is unchanged: **93 IDs in 9 items**. For a link made against the
  earlier snapshot, the ID today opens different text in 79 cases, the start of
  the old text in 13, and a row that contains the old text in 1.
- `reused-row-ids.json` now gives, for each ID and each earlier meaning, the
  snapshots that carried that meaning and where that old text is in `3e35f4ca`
  (same segment shape as an alias). All 93 mappings are text-checked.
- For a link without a snapshot each entry lists the known destinations to
  offer (`unversioned_link.known_destinations`): the current meaning and each
  earlier one. The file does not pick one.
- One of the 93, `ziyarat-rjybyh-alhmd-allh` `r00004-s2d6fcdaf315ab02c`, is no
  longer a current row in `3e35f4ca`: the join made it an alias of the merged
  row. Its current meaning is unchanged; its earlier meaning still differs.
- Checked for completeness: of 18,843 row IDs in my earlier snapshots (items
  that were authored in that snapshot), 18,477 stand for the same text and kind
  in `3e35f4ca`, 56 for the same text with another kind (whole-row kind
  changes; the link opens the same text), 132 are the retired ones above, and
  the remaining 178 occurrences are these 93 IDs.

### Items held from final release (20)

Retired IDs only (11): `amal-aamal-daahay-rvzhay`, `amal-aamal-hfdhm-mvlvd`,
`amal-aamal-mabyn-altlvayn`, `amal-aamal-mbas`, `amal-aamal-msjd-sasah`,
`amal-aamal-zval-jmah`, `amal-arbayn`, `amal-tsbyhat-slvat-rmzan`,
`item-avl-adayh-sbh`, `monajat-mnajat-aymh-alyhm`, `ziyarat-svm-jamah-aymh`.

Reused IDs only (4): `amal-slvat-abvalhsn-zrab`, `namaz-rsvl-sly-allh`,
`ziyarat-hshtm-adab-nyabt`, `ziyarat-rjybyh-alhmd-allh`.

Both (5): `dua-aml-am-davd`, `dua-samat`, `item-adayh-vqt-tlva`,
`item-dvm-khtbh-ayd`, `khavas-khvas-angshtr-aqyq`.

Ten of the 20 are also among the 22 items changed by the 45 joins. The
migration will change the row-split record of the 16 items with retired IDs, so
agent-1's review records of those items will need to be refreshed against the
migrated snapshot. I will rerun both programs against that snapshot first.

## What was asked

The coordinator counted, for agent-6, 132 earlier row IDs across 10 items that
are neither current rows nor redirects. This file identifies them, explains how
they were lost, and gives a mapping for each.

## What I found

I compared every version of my 115 items on this branch (all commits since the
base `ffa01da9`, and the five snapshot commits `941c7ad3`, `b8d0d350`,
`561fdfb0`, `36f89c8b`, `df85a685`) with the current rows and the current
`data/row-splits` records.

- **132 IDs across 10 items** were published in my first snapshot `561fdfb0`
  and are gone now. This matches the coordinator's count.
- **10 more IDs across 6 items** existed only in branch commits made before
  that snapshot. They were pushed but never part of a snapshot. I include them
  so that the list is complete; they are marked `branch commits only`.
- Nothing published in `36f89c8b` or `df85a685` is missing. The 52 merges
  retired their rows through the tool, which wrote an alias for each.

The 132 were all retired by one commit, `4a8cc093` (my self-audit, which
revised cuts and kinds in 14 items). The other 10 were retired by `82ae80cd`,
an authoring correction made before the first snapshot. In both cases the
items were still at mapping format V1, for which the tool has no guard against
retiring an ID.

## Why the IDs changed

A split row's ID is `rNNNNN-s` plus a hash of the original row ID, the Arabic
and Persian part references (`{source, part}`) and the kind
(`src/split-canonical.ts`, line 102). The text itself is not part of the hash.
Two consequences:

1. Changing a row's kind renames it, even with identical text.
2. Adding or removing one cut renumbers every later part of that source field,
   so every later row from the same original row is renamed, even with
   identical text.

| Class | IDs | Meaning |
|---|---:|---|
| `same-text-renumbered` | 56 | Same Arabic, same Persian, same kind; only the part numbers moved |
| `same-text-kind-changed` | 10 | Same Arabic and Persian; kind corrected (all ten: quotation to note) |
| `part-of-one-larger-row` | 76 | The old row's text is now a contiguous part of one current row |

| Item | IDs | In `561fdfb0` | Renumbered | Kind changed | Part of larger row | Mapping now |
|---|---:|---:|---:|---:|---:|---|
| `amal-aamal-daahay-rvzhay` | 2 | 2 | 0 | 0 | 2 | V3 |
| `amal-aamal-hfdhm-mvlvd` | 1 | 0 | 0 | 1 | 0 | V1 |
| `amal-aamal-mabyn-altlvayn` | 4 | 0 | 0 | 4 | 0 | V1 |
| `amal-aamal-mbas` | 2 | 0 | 0 | 2 | 0 | V1 |
| `amal-aamal-msjd-sasah` | 1 | 0 | 0 | 1 | 0 | V1 |
| `amal-aamal-zval-jmah` | 1 | 0 | 0 | 1 | 0 | V1 |
| `amal-arbayn` | 1 | 0 | 0 | 1 | 0 | V1 |
| `amal-tsbyhat-slvat-rmzan` | 17 | 17 | 1 | 0 | 16 | V3 |
| `dua-aml-am-davd` | 3 | 3 | 1 | 0 | 2 | V3 |
| `dua-samat` | 1 | 1 | 1 | 0 | 0 | V3 |
| `item-adayh-vqt-tlva` | 49 | 49 | 19 | 0 | 30 | V3 |
| `item-avl-adayh-sbh` | 35 | 35 | 15 | 0 | 20 | V3 |
| `item-dvm-khtbh-ayd` | 19 | 19 | 17 | 0 | 2 | V3 |
| `khavas-khvas-angshtr-aqyq` | 1 | 1 | 1 | 0 | 0 | V1 |
| `monajat-mnajat-aymh-alyhm` | 2 | 2 | 0 | 0 | 2 | V3 |
| `ziyarat-svm-jamah-aymh` | 3 | 3 | 1 | 0 | 2 | V3 |
| **Total** | **142** | **132** | **56** | **10** | **76** | |

## What can be recovered

**All 142, exactly, without any re-split.** For each old ID the proposal gives
an alias in the existing `aliases` format of the row-split record: the old row
(ID, text references, kind) and, per language, the current row and the offset
at which its text now stands. In every case:

- each language of the old row lands in one current row;
- the characters at the target offset are identical to the old row's text;
- the row-level source attribution is the same.

None is unrecoverable and none needs a judgement call. For the 76 that are now
part of a larger row, the link resolves to that row with the offset of the old
text inside it.

## How I checked it

In a scratch copy of `data/` outside the repository I added the 142 aliases to
the 16 row-split records. The seven records still at V1 were raised to V2 with
`target_start: 0` on their existing segments, because V1 may not carry aliases.
The unmodified `validateCorpus` reported 0 errors before and 0 errors after.
The scratch copy was then discarded.

## What the coordinator or tool maintainer has to do

I did not apply the aliases, because they would not survive: `apply` and
`merge-rows` rebuild the row-split record from the plan and layout, and the
only source of aliases today is a merge. A hand edit would be dropped by the
next tool run and would also be an unreviewed change to canonical data.

Needed from the tool:

1. A way to carry retired IDs through a rebuild, for example a list of retired
   rows in the layout that the compiler turns into aliases, or a one-time
   migration command that takes a file like `historical-row-links.json`.
2. The same guard for V1 items that `ensurePriorAnchors` already gives V2 and
   V3 items, so that a revision cannot retire a published ID silently.
3. Optionally, an ID that does not depend on part numbers, so that one new cut
   does not rename every later row. This is a larger change and is not needed
   for the recovery.

## What this means for work in progress

- My 45 prepared joins are applied in `3e35f4ca` (after the test fix on `main`).
  They lost no link: a merge writes an alias for each retired row, and the
  guard refuses a revision that would orphan one.
- Until item 1 exists I will not revise the cuts of any item, and as a reviewer
  I will not ask an author to re-cut a row that is already split and published.

## Second class: IDs still in use that now carry other text

Agent-5 reported this class in their own items (message `04048d20`), so I
checked mine. Because the text is not part of the ID hash, adding a cut does
not only retire IDs: the part numbers shift, and an ID that was published for
one piece can come to stand for the next piece.

- **93 row IDs in 9 items** exist in an earlier snapshot of mine and exist
  now, but with different text. All 93 were published in `561fdfb0`; the 31 of
  `amal-slvat-abvalhsn-zrab` also in `941c7ad3` and `b8d0d350`, and the 23 of
  `ziyarat-rjybyh-alhmd-allh` also in `36f89c8b`.
- A link saved against the earlier snapshot would now open:
  - a different piece of text in 79 cases (a neighbouring piece of the same
    source row);
  - the start of the old text in 13 cases (the old piece was cut and the ID
    stayed with its first part);
  - a row that contains the old text in 1 case.
- Items: `amal-slvat-abvalhsn-zrab` 31, `ziyarat-rjybyh-alhmd-allh` 23,
  `dua-aml-am-davd` 11, `namaz-rsvl-sly-allh` 11, `item-dvm-khtbh-ayd` 8,
  `item-adayh-vqt-tlva` 4, `dua-samat` 2, `ziyarat-hshtm-adab-nyabt` 2,
  `khavas-khvas-angshtr-aqyq` 1.

**What can be recovered.** The old text of every one of the 93 is still in the
item and I located it: 73 as the same text under another current ID, 13 spread
over several current rows, 7 inside one larger row. `reused-row-ids.json`
gives the current rows for each. An alias cannot express this, because an
alias maps an ID that is no longer in use, and these IDs are in use. A repair
is possible only if a saved link also records which snapshot it was made
against; then the table in the file is the migration. Without that, a link to
one of these IDs cannot be told apart from a link made today.

**What I recommend to the coordinator.** Decide first whether links were ever
saved against `561fdfb0` or the two partial snapshots. If not, nothing is
lost. If they were, the safe repair is a versioned link migration or a new ID
scheme that includes the text; neither is something an author should attempt
by re-cutting rows.

## Recount with the alias list read correctly

Agent-1 pointed out (message `8336c085`) that `aliases` in a
`data/row-splits` record is a list of entries, each with `original.id`, and
that a checker reading it as a map reports false losses. I recounted from a
fresh clone with a new script to make sure my numbers do not have that fault.

- An ID counts as reachable if it is a current row, or the `original.id` of an
  entry in the record's `rows`, or the `original.id` of an entry in its
  `aliases` list.
- Result at `453071de`: **142 unreachable IDs in 16 items**, the same items and
  the same count per item as `historical-row-links.json`.
- 82 further retired IDs are reachable through the alias list (the sources of
  my 52 merges) and 23 through `rows`. Read as a map, those 82 would have been
  reported lost; they are not in the 142.
- The 93 reused IDs are current rows, so the alias structure does not affect
  that count.

I also resolved every row ID cited in my 115 review records of agent-5's items
against agent-5's snapshot `4aae1ccd` in the same way: 2,041 IDs cited, 1,780
current rows, 234 split originals, 27 aliases, **0 unreachable**.

## The same audit run on agent-5's items (as their reviewer)

While re-reviewing agent-5's snapshot `4aae1ccd` I ran the same script on their
115 items. It is their audit to own; I record the result because it decides
which of my review findings are safe to ask for.

- 16 row IDs in 12 items are missing from the current rows and mappings; 14 of
  them were published in snapshot `b537ded9`. All 16 are exactly recoverable as
  aliases. The list is in `agent-5-retired-row-ids.json` (IDs and text
  reference IDs only). Agent-5's own audit reports the same count, 16 in 12
  items, plus 11 reused IDs (`agent-work/agent-5/historical-anchor-audit.json`
  on their branch).
- Ten of the 12 items are at mapping V1. The IDs were retired when a row that
  was already cut was cut again, or when a piece changed kind or slot.
- Consequence for the review: I ask for a first cut only on rows that have
  never been cut, and for joins, which write aliases. Changes to rows that are
  already cut are marked as needing the alias path.
