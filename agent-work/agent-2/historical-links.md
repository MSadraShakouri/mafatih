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

All 24 are split-piece ids (`r000NN-s…`); see the reconciliation section below
for how the suffix is actually derived — positional references, not text.

**Root cause (corrected):** the round-1/round-2 revisions restructured the
affected rows — renumbering parts, re-pairing languages, or changing kinds —
which changed each piece's hashed `(source, part, kind)` inputs and therefore
its id. Pieces whose restructuring did not change those inputs kept their ids
even when other pieces around them changed (e.g. sahifa-19's r00003 pieces,
byte-identical in `52201b9` and today), which is why only these three items
are affected. My earlier wording ("piece ids hash their text") was an
empirical mislabel — see the reconciliation below; agent-3's description of
the algorithm is the correct one.

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
a piece boundary while the piece kept its **`(source, part, kind)` identity**
(the hashed inputs were unchanged; only the text the part refers to moved), so
the id served a different span afterwards. My earlier wording
("start-anchored") was also a mislabel — the anchor is the positional part
reference, not a start offset. Affected items: amal-aamal-msjd-shlh (4),
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

## Reconciliation: how split-piece ids are actually derived

Agent-3's description is correct and both of this report's earlier labels
("content-hashed", "start-anchored") were empirical mislabels. The algorithm
never differed between any relevant commit or snapshot — the discrepancy was
descriptive, not a tooling divergence.

**The code.** `src/split-canonical.ts` builds every output-row id as:

```ts
const rowId = unchangedAddress ? old.id
  : `${old.id}-s${serialHash({row:old.id,ar:out.ar,fa:out.fa,kind:out.kind}).slice(0,16)}`;
```

with `const serialHash = (input:unknown):string => sha256(JSON.stringify(input))`
(`src/split-canonical.ts:27`; also `src/split-agent.ts:74`). `out.ar`/`out.fa`
are **positional source/part references** — `{"source":"ar"|"fa","part":N}` or
`null` — plus the classified `kind`. The hashed payload contains no text and
no offsets. `unchangedAddress` (a single output row mapping each language to
part 0 of its own source) keeps the plain base id.

This exact construction is byte-identical at `0585cec` (line 97), `ffa01da9`
(97), `c75e50c` (100), `b2756bb0` (102), `55ef3fe` (102), and in the trees of
snapshots `52201b9`, `775e7df5`, `3bd51553` and `2dff9afa`. No version drift.

**Reproduction 1 — reused id, identical inputs, different text.**
`amal-aamal-msjd-shlh/r00007-s612834f5c13c1a1d`: its layout entry is
`{"ar":{"source":"ar","part":3},"fa":{"source":"fa","part":3},"kind":"recitation"}`
at **both** `52201b9` and current HEAD. Recomputing
`sha256(JSON.stringify({row:"r00007",ar:{"source":"ar","part":3},fa:{"source":"fa","part":3},kind:"recitation"}))`
yields `612834f5c13c1a1d` in both — the same id — while the row's text differs
between the snapshots. Positional, not content.

**Reproduction 2 — whole-item exactness.** Recomputing every output-row id
from the layout with this formula matches the actual rows with zero
mismatches for `amal-aamal-msjd-shlh` (46 ids) and `amal-byst-6` at both
`52201b9` and HEAD. (`ziyarat-item-11`'s two layout-computed ids
`r00002-s51331c3b3dd06d15` and `r00003` are absent from current data because
the reviewed merge `m3ec38f5` absorbed them — expected, not a formula failure.)

**Reproduction 3 — same text, different id (converse).**
`amal-byst-6/r00002-sb4c2bfb77eb89124` (at `52201b9`) and
`r00002-se78f6df715196b3d` (current) carry the byte-identical Arabic text
«وَ حابِسَهُما أَنْ تَزُولا، يَا عَلِيمُ…» under different ids, because their
hashed part references differ. Ids therefore neither bind text nor derive
from it in any direction.

**Consequences for this report's findings.** The 24 retired ids changed
because restructuring renumbered parts or changed kinds, not because text
moved; the 18 reused ids persisted because their `(source, part, kind)`
inputs survived a boundary move. Both mapping-proposal groups remain valid as
computed — they map content spans, which is independent of how ids are minted.

## Update: main 2163b5e provides the official recovery paths

Coordinator commit `2163b5e7aa43fe9cb72ac681e6a62dc0f4936fe4` ("Guard re-splits
and migrate retired row links", merged here as `5049ec99`) lands tooling that
maps exactly onto the two classes this report identified:

- **Retired ids (my 24 `revision_replaced_pieces`)** — the new
  `alias-preview` / `alias-migrate` commands migrate a reviewed, metadata-only
  proposal on the author's registered branch: retired IDs with one unambiguous
  meaning only, verified against reachable history since the frozen base,
  exact source-occurrence lineage, and target spans that reconstruct the old
  slices. V1 records are promoted to V2; reviews bound to changed records go
  stale and need fresh independent review. Migration is coordinator-sequenced
  (the ring is standing by for the post-migration snapshot), so my proposal
  file stays proposal-only until then. Note for that step: the accepted input
  is agent-6's `historical-row-link-proposal` format or the minimal
  `ar-fa-retired-row-aliases-v1` format — my
  `proposals/historical-link-aliases.json` predates both and will need a
  mechanical reformat (existing row objects, pooled text ids, code-point
  spans; no quoted passages) before `alias-preview`.
- **Live reused ids (my 18 in `proposals/reused-row-ids.json`)** — the
  instructions keep these unredirected: a historical ID that is still live
  with a different meaning needs a separate snapshot-version-aware reader,
  and affected items stay on hold. This matches the snapshot-versioned
  mapping-proposal form already delivered.

Also new in `2163b5e`: `apply` now refuses a revision that would orphan a
prior row link **or reuse a live ID for different text or attribution** for
V1/V2/V3 alike — the guard now catches at authoring time the reuse pattern
this audit found after the fact.

## Retired-ID proposal converted to the official format; preview 24/24 pass

Coordinator directive (turn 17): convert the 24 retired-ID proposal to the
official `ar-fa-retired-row-aliases-v1` input using existing row references
and offsets, run a read-only preview on my registered branch, report exactly,
keep the 18 reused IDs separate, and do not migrate.

- **File**: `proposals/historical-row-links.json` (format_version 1, protocol
  `ar-fa-retired-row-aliases-v1`, author agent-2, base `ffa01da9…`, target
  snapshot `2dff9afa…` — that commit's item/record/plan/layout for all three
  items are byte-identical to current HEAD).
- **Originals** are exact historical row objects (id, pooled ar/fa text ids,
  kind) lifted verbatim from reachable snapshots. **Segments** were recomputed
  from frozen source-occurrence lineage, not text containment; they came out
  identical to the turn-13 content-exact segments.
- **Preview** (`alias-preview`, read-only, registered branch, HEAD `8d95fa35`):
  status `alias-migration-preview`, **alias_count 24 — all pass**,
  review_sha256
  `95060c294704cdeab3f1b46437c3e465ff90afd936a9204272fcd2e0fc46427e`.
  No files changed; nothing migrated; full output saved at
  `proposals/historical-row-links.preview.json`.
- **Structure**: amal-byst-6 ×4 (2 ar + 2 fa pieces of r00002),
  dua-hrm-hsyn-alyh ×4 (2 ar + 2 fa of r00003), monajat-mnajat-tlb-rvzy ×16
  (12 of r00002 + 4 of r00003). Two tlb-rvzy r00003 pieces need two segments
  each — the round-2 re-cut moved the 648 boundary, so one old 680-cp ar text
  now spans current `r00003-s3a5c66…` [0,648) and `r00003-sf9cbb0…`
  [648,680), and another old piece maps at target_start 32 inside the new
  piece.
- **Item-scoping finding (flagged for the coordinator, as the instructions
  require)**: the 24 are item-scoped entries over only 16 distinct id
  strings. Eight ids were minted independently by two items each —
  `r00002-sb4c…`, `s93ed…`, `s33d1…`, `sa634…` (amal-byst-6 **and**
  monajat-mnajat-tlb-rvzy) and `r00003-s90ce…`, `se283…`, `sa800…`,
  `s17ee…` (dua-hrm-hsyn-alyh **and** monajat-mnajat-tlb-rvzy) — because the
  piece-id hash covers only (row id, ar/fa part refs, kind), not the item.
  Per item, the lineage checks pass cleanly; interpreted globally the same 8
  strings carry different historical texts and would be rejected as
  "different historical meanings require version-aware handling". The same
  mechanism is live today: 203 current piece ids are shared across 2–23
  items (plain base ids have always been item-scoped). Any id-based redirect
  or version-aware reader must resolve ids within an item, never globally.
- The 18 reused live IDs remain separate in `proposals/reused-row-ids.json`
  for snapshot-version-aware handling; untouched, per instruction.

## Turn-18 update: coordinator safety register verified against my data

Main `985f226c` ("Add guarded provisional historical link support") landed the
version-aware reader and the metadata-only register
`docs/split-assignments/row-version-findings.json` (467 IDs / 94 items,
provisional-unreviewed, target snapshot `0cbcdf7f…`). Verified on my branch
after merging main as `fcb3079`:

- **All 8 of my affected items are BOUND** (itemVersionBinding(item, split)
  equals the register's target_sha256), so the provisional candidates are
  live rather than withheld on this branch: amal-aamal-msjd-shlh (4),
  dua-hftm-daayy-zman (2), monajat-mnajat-amyr-alyh (8), sahifa-19 (2),
  ziyarat-ashura (2) — the 18 reused; amal-byst-6 (4), dua-hrm-hsyn-alyh
  (4), monajat-mnajat-tlb-rvzy (16) — the 24 retired.
- **Register rows for my 24 retired candidates equal my official-format
  proposal byte-exact** (originals and both segment arrays;
  `proposals/historical-row-links.json`), and 18/18 reused IDs are present.
- The official `alias-preview` re-passed 24/24 on the upgraded toolset at
  HEAD `fcb3079` (review_sha256 `1c6f566f…`); main's only migration-code
  change is additive (`allowRoleOnly` for the register builder).
- Agent-3's offset-semantics rule (frozen source offset vs alias-entry
  offset) is confirmed correct; my segments already use alias-entry offsets,
  and the passing preview is the evidence.
- Nothing migrated; the register's provisional status is unchanged, and the
  alias-migrate step still requires explicit coordinator authorization and
  a fresh independent review of the changed records.
