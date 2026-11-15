# Main `2163b5e7` — migration tooling now exists; two proposals verified, none applied

Main landed **"Guard re-splits and migrate retired row links"** (`2163b5e7`). Merged,
pin verified, `npm run check` green (283 tests, 280 pass, 0 fail).

This changes what is possible, so this note records exactly what I tested and what I am
*not* doing.

---

## 1. The guard confirms my earlier conclusion, and shuts the live-ID door properly

The instructions now say a historical ID **still live with a different meaning** "needs a
separate snapshot-version-aware reader. Ordinary aliases cannot disambiguate an unversioned
link. Keep affected items on hold."

That is now policy, not just my inference from `src/row-splits.ts:171`. **All 23 reused IDs
remain on hold.** The new tooling does not change that, and I did not attempt to migrate any
of them. Any proposal claiming to would be misusing the tool.

## 2. I made an error building the first alias proposal — worth recording

My first proposal used `start: 62, end: 63` for the namaz orphan, reading the offsets as
**frozen source offsets** (which is how `HISTORICAL-LINK-AUDIT.md` describes the recovery).
The tool refused:

```
namaz-vqt-tlva-ghrvb/r00010-s5435c4aabef83342: destination has different source lineage, even if the text repeats
```

I initially diagnosed this as a defect in `assertSameLineage` — I thought it indexed the old
runs with `start` (62) when the old row is only 1 code point long. **That diagnosis was
wrong**, and I want it on the record because I nearly reported a coordinator bug that did not
exist.

The correct reading: in an alias entry, `start`/`end` are offsets **within the original
row's own field**, and `target_start` is the offset in the destination row. The orphan's own
field is the single character `"."`, so it is `start: 0, end: 1`. Its frozen source offset
(62) is already recorded in the row-splits history and is not what this field means.

Corrected to `start: 0, end: 1, target_start: 62` → preview passes.

**The general lesson:** two different offset spaces are in play in this work.
- *Frozen source offsets* — positions in the original pre-split field. Used by the audit
  tables and by `row-splits` `start`/`end`.
- *Alias-entry offsets* — positions in the historical row's own published field.

Mixing them produces a plausible-looking proposal that the tool correctly rejects. Every
proposal I publish now states which space it uses.

## 3. Two proposals verified by preview, neither applied

Both are metadata-only, resolve to existing pooled values, and reproduce the exact old text.

| item | retired id | destination | range | `review_sha256` |
|---|---|---|---|---|
| `namaz-vqt-tlva-ghrvb` | `r00010-s5435c4aabef83342` | `r00010` fa | `[62,63)` | `138c63799…` |
| `ziyarat-ghdyr` | `r00002-sb8a7c4ea61e1d0eb` | `r00002-se090ec1c15d74b91` fa | `[0,30)` | `58ab23eb7…` |

Files: `proposals/historical-row-links.json`, `proposals/historical-row-links-ghdyr.json`.

**Not applied.** The instructions say "the coordinator **may authorize** an author to
migrate". That authorization has not been given to me for either item, and my standing
instruction from the coordinator was to check the namaz case but "don't add it by hand".
Preview is read-only; `alias-migrate` writes `data/`, so it waits for an explicit go-ahead.

The second entry is a finding, not a request: `ziyarat-ghdyr` was not on anyone's list. Its
retired row's text is byte-identical to a whole current row, and it previews clean, so it is
a cheap recovery whenever the coordinator authorizes a batch.

## 4. What the preview does and does not prove

Proven: reachable history contains the ID; no observed version has different text,
attribution or frozen source lineage; the target reconstructs the exact old slice; the
proposal is bound to base, HEAD and current records.

**Not proven:** that no outside links exist, and no scholarly or rights approval. The tool
says so itself ("other histories are not assessed"), and I am not upgrading its guarantee.

## 5. Items still on hold

- The 23 reused IDs — live, ambiguous by construction, blocked by policy.
- The two agent-4 slot/role corrections (`ziyarat-aymh-bqya-alyhm`, `ziyarat-item-12`) —
  those are **not** retired-link migrations. They change a live row's slot and kind, which
  retires `r00001-s03773910ea46fc6e`. That is a re-split-class change, not an alias, and
  needs the coordinator's decision rather than this tool.
