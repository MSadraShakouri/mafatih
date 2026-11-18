# Independent check of agent-6's 93 snapshot-versioned reused-ID mappings

Read-only audit of `agent-work/agent-6/proposals/reused-row-ids.json` (their branch),
checked against the six snapshots it names — `b8d0d350`, `941c7ad3`, `561fdfb0`,
`36f89c8b`, `df85a685`, `3e35f4ca` — with `3e35f4ca` as the target.
**No corpus data was changed, no live ID was redirected, nothing was applied.**

> **Corrected after review of this report.** Two statements in the first version were
> wrong and are fixed below: split-piece IDs do not hash the text (they hash the local
> row reference, the two pooled text IDs and the kind, with no item ID), and the 93
> IDs are live IDs that ordinary alias migration does not admit at all, so this audit
> is not a pass through that guard. The item-scoped lookup conclusion stands.
> Also: 92 of the 93 are live rows; the ninety-third was retired by the reviewed
> joins of `3e35f4ca`, before the migration.

## Result

The map is internally correct. **Zero discrepancies** of the kind it claims to
describe: every version, every destination, every offset checks out.

| check | result |
|---|---|
| entries / versions | 93 / 93 (one earlier meaning per ID) |
| language mappings | 180 (24 span more than one row) |
| mappings that rebuild the old text exactly | **180 / 180** |
| multi-row mappings whose rows are consecutive in the target layout | **24 / 24** |
| version snapshot claims that carry the claimed old text and kind | **all** |
| snapshot meanings not recorded either as current or as a version | **0** |
| destinations that are live rows | **all** |
| `unversioned_link` entries omitting a known destination | **0** |
| class split vs their totals | 79 different text, 13 "current row opens the start of the old text", 1 "Persian identical, Arabic differs" — **matches their 13 / 79 / 1** |

The IDs whose current row merely *opens* the old text are the ones that matter, and
they are handled properly: their mappings continue into the next rows, and in all
24 multi-row cases those rows are adjacent in the target layout, so the
continuation is the same passage rather than a stitch of unrelated rows.

## Two things the evidence does not prove

These are not errors in the file; they are limits a consumer has to know about.

**1. There is no attribution evidence in these 9 items.** None of the 93 rows
carries a `sources` field at any of the six snapshots (0 of 93). My first pass
reported "350/350 attributions identical", which is true but vacuous — both sides
were empty. So occurrence identity here rests on **exact text reconstruction plus
the snapshot occurrence and adjacency**, not on source attribution.

**These 93 are live IDs, and ordinary alias migration does not admit them.** The
migration guard is for retired IDs with a single unambiguous meaning, and it never
redirects a live ID. Nothing in this report is a pass through that guard: it is a
separate reconstruction audit of a versioned map that tells a reader which old text
an ID stood for and where that text is today. What the audit establishes is that
every mapping rebuilds the old slice byte-for-byte and that the continuations are
adjacent; it cannot and does not establish occurrence identity for a live ID.

**2. The ID strings are not globally unique, and the reason is the hash input, not
the text.** A split-piece ID is `r000NN-s…` where the suffix is
`sha256({row, ar, fa, kind})` truncated — `row` is the *local row reference*
(`r00005`), `ar` and `fa` are pooled text IDs and `kind` is the row kind. **The item
ID is not in the hash.** So two items that both have a `r00005` with the same texts
and the same kind produce the same piece ID, which is why these strings recur across
items. (An earlier version of this report said the IDs "hash the text"; that was
wrong — the hash covers references plus kind, and the item is simply absent.)

I found **3,488** such cross-item occurrences at these six snapshots (for example
`amal-slvat-abvalhsn-zrab/r00005-s1342bec0684c82aa` is also a row of
`amal-amal-akhr-aashvra`, `ziyarat-al-yasyn-amam` and `ziyarat-arbaeen` at earlier
snapshots). The map is keyed by item and its `unversioned_link` destinations are
item-scoped, so the file itself is unambiguous — but a resolver that looks up an ID
without its item can land in the wrong item. Any reader built on this map must key
on `(item, id)`. That conclusion is unchanged.

## Ambiguous cases, concretely

- **1 ID is no longer a live row.** `ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcdaf315ab02c`
  was retired by the reviewed joins of `3e35f4ca`; its alias exists in both snapshots
  and is identical across the migration, so the map's `resolves_through:
  alias-or-original` is accurate.
- **1 ID with Persian unchanged and Arabic changed.** The mapping redirects per
  language, so following it does not silently borrow the current Arabic text.
- **13 prefix-continuation IDs.** These are the cases where a naive reader would see
  the old text apparently still present at the start of the current row; the map
  points past that prefix to the continuation rows, which are adjacent.
- **0 IDs with identical text and different occurrence** — the trap the guard names
  does not occur in this set, so no ID here needs the stronger evidence the guard
  demands.
- **No ID carries more than one earlier meaning**, so nothing in this set depends on
  a tie-break.

## What I did not do

I did not run `alias-migrate` for the 142-ID proposal and did not attempt any
migration. `alias-preview` refuses a cross-agent run by design ("Alias proposal
author or frozen base differs", then "Register agent-6 on your own branch"), and
that refusal is correct: the migration belongs on agent-6's own registered branch.
When an authorized migrated snapshot is published, the 16 affected items need a
rebind and a fresh review; the other 99 items of their 115 are unaffected.
