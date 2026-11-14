# Proposal: recover agent-6's retired row links

Status: **proposal only, nothing applied to `data/`.** No row was re-split, no
guard was bypassed and no pinned tool was changed to produce this.

Data: `historical-row-links.json` in this directory (one proposed alias per
retired row ID).

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

- My 45 prepared joins stay on hold. When they are applied they will not lose
  links: a merge writes an alias for each retired row, and the guard refuses a
  revision that would orphan one.
- Until item 1 exists I will not revise the cuts of any item, and as a reviewer
  I will not ask an author to re-cut a row that is already split and published.

## The same audit run on agent-5's items (as their reviewer)

While re-reviewing agent-5's snapshot `4aae1ccd` I ran the same script on their
115 items. It is their audit to own; I record the result because it decides
which of my review findings are safe to ask for.

- 16 row IDs in 12 items are missing from the current rows and mappings; 14 of
  them were published in snapshot `b537ded9`. All 16 are exactly recoverable as
  aliases. The list is in `agent-5-retired-row-ids.json` (IDs and text
  reference IDs only).
- Ten of the 12 items are at mapping V1. The IDs were retired when a row that
  was already cut was cut again, or when a piece changed kind or slot.
- Consequence for the review: I ask for a first cut only on rows that have
  never been cut, and for joins, which write aliases. Changes to rows that are
  already cut are marked as needing the alias path.
