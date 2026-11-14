# agent-2 historical-link audit

Coordinator ask: identify prior row ids missing from current rows and redirects,
propose mappings, and report what can be safely recovered — without applying
unsafe re-splits. **No data, plan, layout or pinned-tool file was changed for
this audit**; the deliverables are this report and
`proposals/historical-link-aliases.json`.

## Method

Coverage of an id = current row in `data/items` ∪ alias original in
`data/row-splits` (`aliases[].original.id`) ∪ split-record original
(`rows[].original.id`). Prior ids = every row id appearing in any published
snapshot of my items (`52201b9`, `bbfe933c`, `775e7df5`, `844d104c`,
`3bd51553`). Cross-checked `data/editorial-history.json` row references and
`data/relations.json` (its `english_links` are item-level only — the corpus has
no row-level english links).

## Result: 24 missing ids across 3 items (matches the coordinator's table)

| item | ids | last published | replaced by |
|---|---:|---|---|
| amal-byst-6 | 4 | `52201b9` | round-1 cut revision of r00002 → `bbfe933c` |
| dua-hrm-hsyn-alyh | 4 | `bbfe933c` | round-2 pairing fix of r00003 (cut 680→648) → `775e7df5` |
| monajat-mnajat-tlb-rvzy | 16 | `52201b9` (r00002 set) / `bbfe933c` (r00003 set) | round-1 r00002 fix → `bbfe933c`; round-2 r00003 fix → `775e7df5` |

All 24 are content-hashed split-piece ids (`r000NN-s…`).

**Root cause:** piece ids hash their text, so when the round-1/round-2
revisions moved a cut, every piece whose text changed received a new id, and
the revision driver wrote no aliases for the retired ones. Items whose
revisions did not change a piece's text kept identical ids (e.g. sahifa-19's
r00003 pieces are byte-identical in `52201b9` and today), which is why only
these three items are affected.

## Proposed recovery — safe, no re-splits

Append the 24 entries in `proposals/historical-link-aliases.json`
(`revision_replaced_pieces`) to the `aliases` arrays of the three items'
row-splits records.

Verification already done for every entry:

- the concatenation of its `ar`/`fa` segments equals the retired piece's pooled
  text **exactly** (content-exact rebuild from current rows);
- all 26 distinct pooled text values the retired pieces reference still exist
  in the text pool (24 remain referenced elsewhere, 2 survive unreferenced);
- one piece (`monajat-mnajat-tlb-rvzy/r00003-s90ce2cbb3805f148`) maps to two
  current rows because the round-2 cut moved inside it; the rest map to one.

Applying these is pure redirect metadata: no row is re-split, no text changes,
and `resolveLegacyRowAnchor` would then answer anchors into all 24 retired ids.
**Not applied here** — data writes go through the six-agent tooling and the
shared instruction for this audit says propose, not apply. The coordinator can
land them together with the anchor-migration work.

## Secondary finding: 5 merged base rows are traceable but not URL-redirected

`amal-aamal-jmah/r00031`, `amal-hsyn-alyh-alslam/r00133` + `r00134`,
`ziyarat-item-11/r00003`, `ziyarat-zman-alyh-alslam/r00007` were plain rows in
published snapshots, were absorbed by reviewed merges, and hold `rows[]`
segment mappings — so `historicalRow`/`currentPieces` resolve them and review
records verify — but they carry **no alias**, so a reader URL anchored to them
will not redirect. Empirically the merge tool aliases absorbed split-pieces and
intermediate m-rows (jmah's two r00030 pieces plus `m4d5600`, namaz-sadq's two
pieces, ziyarat-item-11's left piece) but not plain base-row operands. The
`merged_base_rows` group in the proposals file holds verified alias entries for
these 5 if anchor-level coverage is wanted.

## Other checks (all clean)

- editorial-history row references for my 114 items: every reference resolves
  through a current row, an alias original, or a split-record original — 0
  dangling.
- base-commit row ids: all covered — 0 dangling.
- `relations.json` english links: item-level only.
- the 20 unreferenced pooled values: 18 pre-date this round (agent-6 revision
  residue, as agent-1's status notes); 2 are retired-piece texts from the 24
  above, deliberately kept in the pool so alias originals can reference them.

## Standing constraints honoured

No link guard bypassed, no pinned tool touched, no translation, no re-split for
row length, and no new spacing proposal was created.
