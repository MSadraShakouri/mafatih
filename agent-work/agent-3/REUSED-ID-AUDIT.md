# Reused row IDs between snapshots — audit of 23 IDs across 10 items

**Requested by the coordinator.** Verify the count of reused IDs between
`731bbd960c4161a7665f93745f43271fe6eadc7c` and
`680317220f161994082132d8fb9aeb8dcc4d48e1`, and prepare versioned mapping proposals.

**Result: reproduced exactly — 23 reused IDs across 10 items.** Verified independently,
not accepted on report.

**Nothing was applied. No file under `data/` changed.** Per the coordinator's instruction
and the shared rule, this is a proposal document only.

---

## 1. What "reused" means here, and why it is the dangerous class

A pre-split row id is not a content hash. It is a hash of the **address**:

```ts
// src/split-canonical.ts:102
const rowId = unchangedAddress ? old.id
  : `${old.id}-s${serialHash({row:old.id, ar:out.ar, fa:out.fa, kind:out.kind}).slice(0,16)}`;
```

`out.ar` / `out.fa` are references of the form `{source, part}` — a **positional part
index**, not the text. So the id encodes *which source piece this row was cut from*, not
*what the row says*.

When a later revision re-splits a base row from the frozen original and produces **fewer**
pieces, positional index *k* now names different text — but the hash input is unchanged, so
the id is unchanged too. **The same URL now serves different content.**

This matters more than the retired-ID problem I audited earlier. A retired id fails
loudly (no row, no redirect). A reused id resolves *successfully* to the wrong text, and no
reader-side check can detect it.

### The mechanism is confirmed by the data, not assumed

For all 23 affected base rows, the piece count **shrank** on re-split — 23 of 23, none grew:

| item | base | pieces |
|---|---|---:|
| amal-adab-vzv | r00004 | 4 → 3 |
| amal-akhr-shaban-rmzan | r00001 | 9 → 8 |
| khavas-khvas-ql-hvallh | r00001 | 6 → 4 |
| ziyarat-adab-mkhsvs-hsyn | r00013 | 7 → 6 |
| ziyarat-aymh-bqya-alyhm | r00012 | 4 → 3 |
| ziyarat-byan-anchh-vars | r00001 | 6 → 5 |
| ziyarat-chharm-shbhay-qdr | r00001 | 4 → 3 |
| ziyarat-fvayd-mdavmt-aashvra | r00001 | 3 → 2 |
| ziyarat-fzylt-rza-alyh | r00003 | 8 → 5 |
| ziyarat-ghdyr | r00002 | 4 → 3 |

A shrinking piece list is exactly the condition that re-points a positional index.

---

## 2. The 23 IDs — all reconstructed, none lost

**Correction to my own first report.** I previously wrote that 20 of the 23 had "old text
absent from the corpus" and only 3 were recoverable. **That was wrong**, and the coordinator
was right to reject it. I had measured *whole-row equality* — whether the old row's complete
text exists as a complete current row. That is the wrong test. The old and current pieces are
both slices of the same base row, so the correct test is whether the old text is a contiguous
slice of some current row.

Reconstructed with a provenance method rather than string search: take the old piece's slot
in the concatenation of the old family's pieces, then find which current piece covers that
same span in the current concatenation. Cumulative offsets must agree for the spans to line
up, so this cannot silently attach a fragment to a lookalike elsewhere in the item.

**Result: 23 of 23 reconstructed byte-exactly. 0 lost.**

| class | count | meaning |
|---|---:|---|
| reconstructed-slice | 18 | contiguous `[start,end)` inside a current row |
| reconstructed-whole-row | 2 | the current row *is* the old piece |
| reconstructed-after-editorial-change | 1 | old Arabic is a prefix of a row that grew by a trailing `". "` |
| reconstructed-after-adjacent-change | 1 | row unchanged; only its neighbour changed |
| deleted-as-duplicate | 1 | the piece *was* removed as a redundant period |

The single `deleted-as-duplicate` case is `ziyarat-byan-anchh-vars/r00001-sa021c793590ec5ab`,
a lone `". "`. In `731bbd96` the Persian read `رَفِیقاً. . تمامی` — a duplicated period. Today
it reads `رَفِیقاً. تمامی`. The duplicate was deleted, so the fa family lost 2 code points
(728→726). **No destination is claimed for it, because none exists.** Inventing one would be
the exact error this audit exists to avoid.

Full per-id destination ranges are in `proposals/reused-id-mappings.json`, keyed by item.

### Verification

`agent-work/agent-3/scratch/verify-proposal.mjs` re-reads every destination range from the
snapshot and compares it against the historical source text:
**22 of 22 claimed destination segments reproduce byte-exactly; 0 failures; 1 segment
intentionally unclaimed** (the deleted duplicate).

The coordinator's worked example is one of them, and it verifies:

> `amal-akhr-shaban-rmzan/r00001-s5347c817c3599961`, old Arabic `[0,2)`,
> maps to `r00001-s3dda56d9c83883fa` Arabic `[103,105)`.

I confirmed both halves independently: the old piece is `"! "` (2 cp) and
`cp.slice(103,105)` of the current 105-cp field is exactly `"! "`.

### The proposal file is now properly keyed

My earlier JSON had every entry under a single `"undefined"` key — a bug in my generator,
which read `entry.item` while the audit had written `entry.it`. The regenerated file is keyed
by item name, 10 items, 23 ids, with `format_version`, both snapshot SHAs, the offset
convention stated explicitly (half-open, zero-based, code points via `Array.from`), and a
`reconstruction_check` per id.

## 3. The blocker nobody has stated yet: all 23 are still live

Every one of the 23 is **still a current row** in the item. None is retired.

That is decisive, because of `src/row-splits.ts:170-172`:

```ts
for (const alias of record.aliases ?? []) {
  const id = alias.original.id;
  if (aliasIds.has(id) || originals.has(id) || current.has(id))
    fail(`${id}: duplicate or reused alias identity`);
```

An alias whose id is a **current** row fails validation. So:

- The V1→V2/V3 migration is *necessary* — V1 records cannot hold aliases at all
  (`src/schema.ts:237-245`).
- But the migration is **not sufficient**. Even with V2/V3 in place, all 23 aliases are
  rejected while the ids remain live.

**The live-row case needs its own decision, separate from the migration.** Options, none of
which I am applying:

1. **Retire the affected ids** on the next revision (rename the current rows), then add an
   alias for each old id pointing at its intended target. Requires a revision pass; preserves
   every old link.
2. **Re-cut so ids are content-addressed** — change the id derivation to hash the text. This
   makes reuse structurally impossible in future but does not repair existing links and is a
   tooling change the coordinator must make, not an agent.
3. **Accept and document** — leave the ids, publish a note that these 23 URLs changed
   meaning. Weakest option; silent for any consumer not reading the note.

I have no authority to pick. Option 1 is the only one that both repairs the links and stays
inside the per-item mapping model.

**Correction to that wrinkle, which I got wrong the first time.** I wrote that 20 of the 23
had "no byte-exact target". That was an artefact of testing whole-row equality. All 22 that
still exist have a byte-exact target — a slice inside a current row — and `[start,end)` for
each is in the proposal file. So the alias target does exist for 22 of 23; what is missing is
an *expressible* alias, for the liveness and V1 reasons above. The 23rd was deleted as a
duplicate and should have no alias at all.

This also means the destination is a *slice*, not always a whole row. An alias entry that
points at a row without a range would resolve readers to the wrong text — which is the same
class of defect as the reused ids themselves. Any applied mapping must carry `start`/`end`.

---

## 4. Proposals

`agent-work/agent-3/proposals/reused-id-mappings.json` — versioned, machine-readable, one
entry per id, with:

- `historical_id`, codepoint lengths of old and new text, whether text differs;
- `candidate_targets` — byte-exact live rows carrying the old text (empty for 20 of 23);
- `blocking` — why no alias can be written today, with file and line;
- `proposed_class` — `redirect-after-retirement` (3) or `content-lost-no-target` (20).

The proposal is deliberately **not** in the applied `aliases` shape: writing it that way
would imply it can be dropped in, and it cannot.

---

## 5. Method and limits

- Both snapshots resolved in-repo; text read from `data/texts/<xx>.json` via `data/items`
  references at each snapshot, so old and new are compared as the reader saw them.
- **Final method is provenance, not string search.** Locate the old piece's slot in the
  concatenation of the old base-row family, then find which current piece covers that span in
  the current concatenation of the same family. This attaches each fragment to its actual
  provenance, so it cannot drift to a lookalike elsewhere in the item.
- *String search alone was insufficient and I abandoned it.* 7 of 23 are 2-code-point
  fragments (`". "`, `"! "`) that occur at many offsets, and matching produced impossible
  destinations — a `r00013` fragment placed inside `r00006`. The coordinator's provenance
  framing is what corrected this; the earlier "content-lost" conclusion came from the same
  flawed approach.
- 3 ids could not be reconstructed by family concatenation alone because their families
  genuinely changed between snapshots (one gained a trailing `". "`, one lost a duplicate
  `". "`). Those three are adjudicated individually in the proposal file with their evidence.
- I did not and cannot verify whether these 23 ids were ever used by a reader. Frequency of
  use is unknown; only that the link is now wrong.

## 6. What I am not doing

- Not writing into `data/`.
- Not re-cutting published pieces — the coordinator's instruction, and the ids cannot move
  until the migration supports them.
- Not choosing between retirement, content-addressing, or acceptance.
- Not retiring live ids, and not using an ordinary alias to pick between reused meanings —
  both explicitly ruled out by the coordinator.
- Not claiming any case is unrecoverable: 22 of 23 reconstruct byte-exactly. Only
  `ziyarat-byan-anchh-vars/r00001-sa021c793590ec5ab` has no destination, and that is because
  its content was deliberately deleted as a duplicate — the correct answer there is no alias.
