# Retired-ID migration: accepted, rejected, unresolved

Scope: **every** retired row ID across my 115 assigned items, not just the 28 from the earlier
audit. Enumerated from reachable history from the frozen base `ffa01da9` to HEAD, reading
`data/items/*.json` and `data/row-splits/*.json` at every commit that touched them.

**511 retired IDs across 89 items.**

| class | count | what it means |
|---|---:|---|
| already covered by existing `rows[]` mappings | 295 | nothing to migrate |
| candidate, preview accepted | **210** | proposal prepared and verified |
| candidate, preview rejects every destination | 0 | — |
| unresolved / ambiguous | 0 after disambiguation | see §4 |

**Nothing applied. `data/` untouched.** All proposals are preview-verified only.

---

## 1. The 295 "already covered" cases are the main finding, not a footnote

My first pass called these "old text absent from every current row" and treated them as
unresolved. **That was wrong**, and the error is worth stating because it inflated the problem
by roughly 60%.

They are rows that a **re-split already mapped**. Example — `khavas-tmjyd-hq-taaly/r00002` is
not live, but the record already carries:

```json
"original": {"id":"r00002","ar":null,"fa":"t634fc9560a88fc8405fc4d56"},
"results": ["r00002-s16b235f3fb54b1a5","r00002-s7912db66cde98eb8"]
```

Its content survives as two pieces with a complete `rows[]` mapping. It needs no alias — it is
already redirectable. My enumerator flagged it because I tested "is this ID a live row?", not
"is this ID already covered by `rows[]` or `aliases[]`?". The second question is the right one.

## 2. The 210 accepted candidates

58 items, 210 aliases, one proposal:
`agent-work/agent-3/proposals/historical-row-links.json`
→ `review_sha256: 16201fc784d7dad0a447d1e10620bdc4c2e9104687c8c187fa371b2671b17365`

Largest groups: `ziyarat-fzylt-rza-alyh` 16, `amal-aamal-jmah-2` 15,
`ziyarat-adab-mkhsvs-hsyn` 13, `item-avl-taqybat-mshtrk` 12, `amal-aamal-mkhsvsh-byst` 9.

**Risk note I am not hiding:** by length, 179 are 31+ code points, 29 are 11–30, and only 2 are
4–10. Long unique text is the *safe* end of this work — it is the short fragments that are
ambiguous. That is the opposite of the original 28-ID audit, where the trouble was punctuation
fragments. These 210 are mostly whole phrases with exactly one home.

Selection rule was deliberately strict: a candidate had to have **exactly one** destination
occurrence after deduplication. Anything with 2+ was escalated to §3, not guessed.

## 3. The 6 ambiguous cases — all resolved by provenance

Six retired IDs are short strings occurring at several offsets (`.` ×3, `ابن`, `بگوید:`,
`خدایا! `). Naive search gives 2–11 candidate destinations. All six resolve uniquely by the
family-concatenation method: the piece's cumulative offset in its old family, mapped through
the current family concatenation, which is byte-identical in all six cases.

Proposal: `proposals/historical-row-links-ambiguous6.json`
→ `review_sha256: 1954e742308413d4c1eef79deb282c15a99ad28f257b1ab6226fc415d2afc6c5`

| item / retired id | text | destination | `target_start` |
|---|---|---|---|
| `amal-aamal-jmah-2/r00008-s5dc11d00b5bdd07d` | `بگوید:` | `r00008-s2c6a015796faa033` fa | 0 |
| `amal-adab-vzv/r00004-sc37c134c2f2b5db5` | `.` | `r00004-sa44b8f05e3e4e602` ar | 110 |
| `item-avl-taqybat-mshtrk/r00014-sdded2196be4783b3` | `خدایا! ` | `r00014-s6d3577567ca79464` fa | 0 |
| `namaz-vqt-tlva-ghrvb/r00010-s5435c4aabef83342` | `.` | `r00010` fa | 62 |
| `ziyarat-aymh-bqya-alyhm/r00012-sb2130a49d3b9105e` | `.` | `r00012-se62b3f362c1c151a` ar | 261 |
| `ziyarat-chharm-shbhay-qdr/r00001-sa021c793590ec5ab` | `ابن` | `r00001-s8939275b275c817a` fa | 414 |

## 4. The offset convention — I had it wrong twice, and both errors were caught by the tool

Your reminder is exactly where I was going wrong, in two distinct ways. Recording both because
the second is not obvious from the instruction.

**Error 1 — which string `start`/`end` index.** I first used frozen source offsets (`start:62`
for the namaz orphan). Refused. `start`/`end` are offsets in **the retired row's own field**,
which for that orphan is the single character `.` → `start:0, end:1`.

**Error 2 — which string `target_start` indexes.** I then assumed it was the offset in the
destination row's own field, and computed `110 - 95 = 15` for `amal-adab-vzv`. Refused.
`target_start` is in **source-field coordinates**: the offset where the piece sat in the
original pre-split field. `110` was accepted, `15` was not.

So the two ends of one alias entry use *different* coordinate spaces:

| field | indexes | example |
|---|---|---|
| `start` / `end` | the historical row's own published field | `0..1` for a 1-cp piece |
| `target_start` | the frozen source field, as the current record segments it | `110`, `62`, `261` |

I confirmed this by brute force rather than inference: for `amal-adab-vzv` I tested
`target_start ∈ {0, 14, 15, 109, 110}` and **only 110 previews clean**. That is a one-answer
test, not a fit.

## 5. What the tool does and does not establish

Established per accepted entry: reachable history contains the ID; no observed version has
different text, attribution or frozen source lineage; the destination reconstructs the old
slices; the entry is bound to base, HEAD and current records.

Not established: whether any reader ever used these URLs; whether links exist outside the
reachable history; scholarly or rights approval. The tool says "other histories are not
assessed" and I am not widening its claim.

## 6. Explicitly out of scope, per your instruction

- **The 23 reused IDs** are kept in a separate file and are **not** in either proposal. They
  are live rows whose meaning was reused; the tooling forbids them and policy requires a
  snapshot-version-aware reader.
- **Agent-4's live-row findings remain open and unapplied** —
  `ziyarat-aymh-bqya-alyhm` r00001 and r00009, `ziyarat-item-12` r00001. I did not let the
  retired-alias tool near them. It migrates *retired* IDs; those are **live** rows needing a
  slot/role correction, which changes the id and retires a live row. That is a re-split-class
  change, not an alias, and the tool's acceptance of a different ID in the same item
  (`r00012-sb2130…` in aymh-bqya) must not be read as approval of those.
- No re-cut and no migration applied.
