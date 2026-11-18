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

## 4. The offset convention — corrected

**Both coordinates are field offsets. Neither is a frozen source offset.**

| field | indexes | example |
|---|---|---|
| `start` / `end` | the **retired row's own published field** | `0..1` for the 1-cp piece `.` |
| `target_start` | the **destination row's own published field** | `110` in a 111-cp field |

### What I got wrong, and why the brute force misled me

I had two wrong models in sequence, and the second one survived a test that looked conclusive.

**First** I used frozen source offsets for `start`/`end` (`start:62` for the namaz orphan).
Refused. Correct value is `0..1`, because that row's own field is the single character `.`.

**Then** I claimed `target_start` was in "source-field coordinates" and that `target_start:110`
was accepted for `amal-adab-vzv` because `110` was the *source* offset. **That was wrong.**

The truth is that the two coincide numerically in this case, because the destination row is
the field's tail: the record maps source `[95,206)` into a destination field of length
`206 - 95 = 111`. So a `target_start` of `110` is simultaneously "destination offset 110" and
"frozen offset 205". My brute force over `{0, 14, 15, 109, 110}` therefore could not
distinguish the two models — **it was a test that could only reject, not identify.**

Worse, my "`110 - 95 = 15`" computation was a category error: subtracting the destination's
source start from an offset I had mis-derived. Frozen offset 110 is the letter `و`, and
destination offset 15 is that same `و` — which is exactly why `15` was refused.

### The correct reading, verified

`amal-adab-vzv`, destination `r00004-sa44b8f05e3e4e602`:

- record segment: source `[95,206)` → destination field length **111**; `206 - 95 = 111` ✓
- `destination[110]` is `"."` and `frozen[205]` is `"."` — **the same character**; `95 + 110 = 205` ✓
- `destination[15]` is `"و"`, matching `frozen[110]` — a different character, correctly rejected

So `target_start` is an offset in the destination row's field, and the accepted `110` stands.
**No proposal value changes.** This section previously stated the opposite; the correction is
to the explanation, not to the data.

### Recheck under the corrected convention

All **216** aliases were re-verified with the destination field read directly out of
`data/items` + `data/texts` at HEAD, asserting for every segment:
`destination_field[target_start : target_start + (end - start)] == retired pooled text`.

Result: **216 of 216 byte-exact, 0 problems.** Script:
`agent-work/agent-3/scratch/recheck-offsets.mjs`.

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

---

## 7. Correction log — offset explanation (this revision)

The coordinator corrected §4. My stated model was wrong:

- **I wrote:** `target_start` is in frozen source coordinates.
- **Correct:** `target_start` is an offset in the **destination row's own field**.

The value `110` for `amal-adab-vzv` was right and is unchanged. What was wrong was my account
of *why* it is right, and that matters because a wrong model produces wrong offsets the moment
a destination row stops being the field's tail.

The coordinator's arithmetic, verified independently: destination covers frozen `[95,206)`,
so destination offset `110` corresponds to frozen `205`, and `95 + 110 = 205`. Both positions
hold `"."`. The destination field length `206 − 95 = 111` matches the row's actual length.

**Why my brute force did not catch this.** Because the destination row is the tail of the
field, "destination offset" and "frozen offset" coincide numerically for the accepted answer
only by accident of `95 + 110 = 205`. Testing `{0, 14, 15, 109, 110}` could reject `15` but
could not distinguish "destination offset" from "frozen offset". I treated a one-answer test
as an identification test; it was not.

**What did catch it**: reading the destination field directly. `destination[15]` is `"و"` and
`frozen[110]` is `"و"` — the same letter, which is precisely why `15` failed.

### Recheck performed

Every one of the **216** aliases across both proposals was re-verified with the destination
field read from `data/items` + `data/texts` at HEAD:

> for each segment, `destination_field[target_start : target_start + (end − start)]`
> must equal the retired row's pooled text.

**216 of 216 byte-exact. 0 problems.** Script: `scratch/recheck-offsets.mjs`.

### Staleness fixed

Both proposals had `target_snapshot` = `74f801a6`, one commit behind HEAD `e1a29f7f`. The
preview accepts it because it binds `history_head` separately, but the instructions call a
stale snapshot a stop condition, so I rebound both and re-ran the previews:

`target_snapshot` cannot name the commit that contains the proposal — that is self-referential
— so rebinding had to happen in a *following* commit. Both are now `target_snapshot` =
`faf72033` (commit `b2c7a062`, which changes only that one field in each proposal file).
`data/` is byte-identical between `e1a29f7f` and `faf72033` (verified: `git diff --stat
e1a29f7f HEAD -- data/` is empty), and the tool requires only that the target be an
**ancestor** of HEAD and that item, mapping, plan and layout match it — which they do.

| proposal | items | aliases | `review_sha256` at `history_head` `25600624` |
|---|---:|---:|---|
| `historical-row-links.json` | 58 | 210 | `d0f46c9d03ab…` |
| `historical-row-links-ambiguous6.json` | 6 | 6 | `584e53f62676…` |

**The `review_sha256` is not a stable identifier — do not cite it as one.** It is
`sha256({protocol, head, bundle, before})`, so it changes with every commit, even when the
aliases are byte-identical: this same set of 210 hashed to `16201fc7…`, then `ddb304e746db…`,
then `d0f46c9d03ab…` as HEAD advanced. It is an **operator confirmation token**, valid only
for the HEAD it was computed at. The operational consequence: `alias-preview` and the
`alias-migrate --confirm` that consumes the hash must run back-to-back with **no commit in
between**, since committing the proposal itself moves HEAD and invalidates the hash. The
stable identity of a proposal is its alias set, not its hash.

**Still not migrated.** No `data/` file has changed — verified with `git diff --stat -- data/`.
