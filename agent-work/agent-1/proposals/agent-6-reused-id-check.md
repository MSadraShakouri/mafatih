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
> Also: 92 of the 93 are live rows and one is already a historical alias — retired
> by the reviewed joins of `3e35f4ca`, before the migration. All 93 remain
> version-ambiguous either way: an ID without a snapshot version cannot be resolved
> by this map, only warned about and offered its destinations.

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

**These 93 are live IDs — 92 live rows and one already a historical alias — and
ordinary alias migration does not admit them.** The
migration guard is for retired IDs with a single unambiguous meaning, and it never
redirects a live ID. Nothing in this report is a pass through that guard: it is a
separate reconstruction audit of a versioned map that tells a reader which old text
an ID stood for and where that text is today. What the audit establishes is that
every mapping rebuilds the old slice byte-for-byte and that the continuations are
adjacent; it cannot and does not establish occurrence identity for a live ID.

**2. The ID strings are not globally unique, and the reason is the hash input, not
the text.** A split-piece ID is `old.id-s…` where the suffix is
`sha256({row: old.id, ar: out.ar, fa: out.fa, kind: out.kind})` truncated to 16 hex
characters. `old.id` is the *local* row reference (`r00005`), and `out.ar` / `out.fa`
are the layout's **source-and-part references** — `{source, part}` pointing at a
source occurrence and one of its pieces — or `null` when that language has no piece
in the output row. So the hash covers the row reference, two source-and-part
references and the kind: **neither the item ID nor the text is in it.**

I reproduced the formula on real IDs rather than reading it off. In
`amal-byst-3`, `{row:'r00001', ar:null, fa:{source:'ar',part:0}, kind:'heading'}`
hashes to `r00001-sf8ca119bc7deb30b`, and
`{row:'r00001', ar:{source:'ar',part:1}, fa:{source:'fa',part:0}, kind:'recitation'}`
hashes to `r00001-s3e4b70ad1b9cb544` — both are live rows. Note the first: the
Persian slot is filled from the **Arabic** source, which is what "source-and-part
reference" means here; it is not a text ID.

Two consequences follow, and both are visible in this set. Because the item is
absent, two items with a `r00005` of the same part shape and kind produce the same
piece ID, which is why these strings recur across items — I found **3,488** such
cross-item occurrences at these six snapshots (for example
`amal-slvat-abvalhsn-zrab/r00005-s1342bec0684c82aa` is also a row of
`amal-amal-akhr-aashvra`, `ziyarat-al-yasyn-amam` and `ziyarat-arbaeen` at earlier
snapshots). Because the text is absent, an editorial correction to a piece leaves
its ID unchanged, and the same ID then opens different text — which is exactly how
the 93 reused IDs arose. The map is keyed by item and its `unversioned_link`
destinations are item-scoped, so the file itself is unambiguous — but any reader must
key on `(item, id)`. That conclusion is unchanged.

(An earlier version of this report said these IDs "hash the text" and, after a first
correction, that they hash the two pooled text IDs. Both were wrong: the hash holds
source-and-part references, not text, and no item ID.)

## Ambiguous cases, concretely

- **92 live rows and 1 historical alias.** The one alias,
  `ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcdaf315ab02c`, was retired by the reviewed
  joins of `3e35f4ca`; its alias exists in both snapshots and is identical across the
  migration, so the map's `resolves_through: alias-or-original` is accurate. All 93
  remain version-ambiguous: without a snapshot version the map warns and offers the
  known destinations rather than resolving.
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
