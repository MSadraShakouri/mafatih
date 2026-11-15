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

## 2. The 23 IDs

| # | item | reused id | change | old text elsewhere in corpus |
|---:|---|---|---|---|
| 1 | amal-adab-vzv | r00004-sa44b8f05e3e4e602 | punctuation/space only | — |
| 2 | amal-akhr-shaban-rmzan | r00001-s3dda56d9c83883fa | punctuation/space only | — |
| 3 | amal-akhr-shaban-rmzan | r00001-s5347c817c3599961 | text differs | — |
| 4 | khavas-khvas-ql-hvallh | r00001-s87a4572572fe3091 | punctuation/space only | — |
| 5 | khavas-khvas-ql-hvallh | r00001-sd0076416ed435839 | text differs | — |
| 6 | khavas-khvas-ql-hvallh | r00001-s8939275b275c817a | text differs | — |
| 7 | khavas-khvas-ql-hvallh | r00001-sa021c793590ec5ab | text differs | — |
| 8 | ziyarat-adab-mkhsvs-hsyn | r00013-s3d24e8d54d9902e9 | punctuation/space only | — |
| 9 | ziyarat-adab-mkhsvs-hsyn | r00013-s892a5505605738ea | text differs | — |
| 10 | ziyarat-aymh-bqya-alyhm | r00012-se62b3f362c1c151a | punctuation/space only | — |
| 11 | ziyarat-byan-anchh-vars | r00001-s909b8a58b8018daa | punctuation/space only | — |
| 12 | ziyarat-byan-anchh-vars | r00001-sa021c793590ec5ab | text differs | — |
| 13 | ziyarat-byan-anchh-vars | r00001-s1fa9d92731f5fd90 | text differs | **r00001-sa021c793590ec5ab / fa** |
| 14 | ziyarat-chharm-shbhay-qdr | r00001-s8939275b275c817a | text differs | — |
| 15 | ziyarat-fvayd-mdavmt-aashvra | r00001-sc5e9d9539705078a | punctuation/space only | — |
| 16 | ziyarat-fvayd-mdavmt-aashvra | r00001-sd0076416ed435839 | text differs | — |
| 17 | ziyarat-fzylt-rza-alyh | r00003-s1828851db03b603e | text differs | — |
| 18 | ziyarat-fzylt-rza-alyh | r00003-s1b27bb8c75bc48e1 | text differs | — |
| 19 | ziyarat-fzylt-rza-alyh | r00003-sd8fe963a13fe0305 | text differs | — |
| 20 | ziyarat-fzylt-rza-alyh | r00003-sb355d8466a6ab016 | text differs | **r00003-s1b27bb8c75bc48e1 / fa** |
| 21 | ziyarat-ghdyr | r00002-s16b235f3fb54b1a5 | punctuation/space only | — |
| 22 | ziyarat-ghdyr | r00002-s7912db66cde98eb8 | text differs | — |
| 23 | ziyarat-ghdyr | r00002-se090ec1c15d74b91 | text differs | **r00002-s7912db66cde98eb8 / fa** |

**Tally:** 8 punctuation/space only, 15 materially different text.
Of the 15, the old text survives byte-exact as a live row in only **3** cases; in **12** it
is gone from the corpus entirely.

---

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

**A further wrinkle:** for 20 of the 23 the old text no longer exists anywhere in the
corpus, so there is nothing to point an alias *at*. Only 3 have a byte-exact live target.
The other 20 would need either the old text restored or the alias to point at the piece that
now occupies that slot — which is a *provenance claim*, not a redirect, and should be the
coordinator's decision, not mine.

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
- Punctuation/space-insensitive comparison uses `[\s،؛؟.,!?;:ـ\u200c\u200e\u200f]`.
- Old-text search ran against **every live row of the whole corpus**, not just my items.
- Fragment guard: 9 old values are punctuation-only fragments with no letters or marks.
  These normalize to the empty string and would "match" anything, so they are reported as
  fragments and never counted as found. *My first pass lacked this guard and produced
  bogus matches; the tally above is from the corrected run.*
- I did not and cannot verify whether these 23 ids were ever used by a reader. Frequency of
  use is unknown; only that the link is now wrong.

## 6. What I am not doing

- Not writing into `data/`.
- Not re-cutting published pieces — the coordinator's instruction, and the ids cannot move
  until the migration supports them.
- Not choosing between retirement, content-addressing, or acceptance.
- Not claiming the 20 `content-lost` cases are recoverable; they are not, from the corpus as
  it stands.
