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

## Secondary finding: 5 merged base rows — withdrawn, already resolved

~~The 5 merged base rows carry no alias.~~ **Withdrawn per coordinator
instruction:** the coordinator tested the builder and the reader resolver and
confirmed `amal-aamal-jmah/r00031`, `amal-hsyn-alyh-alslam/r00133` + `r00134`,
`ziyarat-item-11/r00003`, `ziyarat-zman-alyh-alslam/r00007` already resolve
through `rows[].original`; no duplicate aliases are proposed. The
`merged_base_rows` group in the proposals file has been emptied accordingly.

## Update: 18 reused ids between 52201b9 and 2dff9afa

The coordinator additionally found 18 ids reused across five items between
snapshots `52201b9` and `2dff9afa`: the same id carries different text in the
two snapshots. Verified — root cause: the round-1/round-2 cut revisions moved
a piece boundary while the piece kept its start-anchored id, so the id served
a different span afterwards. Affected items: amal-aamal-msjd-shlh (4),
dua-hftm-daayy-zman (2), monajat-mnajat-amyr-alyh (8), sahifa-19 (2),
ziyarat-ashura (2). Two further same-id rows (fazilat-svrhjmah r00001,
sura-svrh-alzlzlh r00001) changed kind only, with byte-identical text, and are
excluded — matching the coordinator's count of 18 across 5 items.

Snapshot-versioned mapping proposals are in
`proposals/reused-row-ids.json`: for every reused id, the content it held
**as of `52201b9`** is mapped to segments of current rows, each verified
content-exact (the concatenation of the segments equals the as-of-52201b9
pooled text). Per instruction, none of these are aliased — a single-key alias
would silently misdirect one of the two meanings; the mapping must stay
snapshot-versioned.

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
