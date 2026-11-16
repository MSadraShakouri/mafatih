# Independent check of agent-6's 93 snapshot-versioned reused-ID mappings

Read-only audit of `agent-work/agent-6/proposals/reused-row-ids.json` (their branch),
checked against the six snapshots it names — `b8d0d350`, `941c7ad3`, `561fdfb0`,
`36f89c8b`, `df85a685`, `3e35f4ca` — with `3e35f4ca` as the target.
**No corpus data was changed, no live ID was redirected, nothing was applied.**

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
the snapshot occurrence and adjacency**, not on source attribution. Under main's new
alias guard ("identical repeated text is not sufficient evidence of the same
occurrence") this set passes because the texts genuinely differ — 79 wholly, 13 as
a prefix continuation, 1 in Arabic only — and because each mapping rebuilds the old
text byte-for-byte. It would not pass on attribution, because there is none.

**2. The ID strings are not globally unique.** These are content-hashed piece IDs, so
the same string names a row of a *different* item whenever the text matches. I found
**3,488** such cross-item occurrences at these six snapshots (for example
`amal-slvat-abvalhsn-zrab/r00005-s1342bec0684c82aa` is also a row of
`amal-amal-akhr-aashvra`, `ziyarat-al-yasyn-amam` and `ziyarat-arbaeen` at earlier
snapshots). The map is keyed by item and its `unversioned_link` destinations are
item-scoped, so the file itself is unambiguous — but a resolver that looks up an ID
without its item can land in the wrong item. Any migration or reader code built on
this map must key on `(item, id)`.

## Ambiguous cases, concretely

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
