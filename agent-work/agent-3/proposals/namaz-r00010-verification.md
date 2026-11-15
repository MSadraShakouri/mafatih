# Verification — namaz-vqt-tlva-ghrvb / r00010-s5435c4aabef83342

**Coordinator's claim:** the recorded source mapping identifies `r00010`, Persian,
code-point offset 62, and the proposed alias was validated in memory.

**Verdict: the claim verifies on every point.** Not applied — per instruction, and because
the record is V1 and cannot hold an alias.

## Every number checks out

| claim | verified value | agree |
|---|---|:--:|
| source row | `r00010` | ✓ |
| language | `fa` | ✓ |
| offset | code point **62** | ✓ |

Recorded mapping in `data/row-splits/namaz-vqt-tlva-ghrvb.json`:

```json
{ "original": { "id": "r00010", "ar": null, "fa": "t98a7e6ee879c5c4da4eb4dd2" },
  "results": ["r00010"],
  "fa": [{ "row": "r00010", "language": "fa", "start": 0, "end": 63, "target_start": 0 }] }
```

The live field is **63 code points**, matching `end: 63`. Code point at index 62 — zero-based,
the final one — is `"."`.

## Why offset 62 is right, and it is not arbitrary

In the superseded snapshot `731bbd96`, `r00010` was cut into exactly two pieces:

- `r00010-seb219ae3b3f3af47` — the sentence, ending `…که خواهد آمد.` (62 code points)
- `r00010-s5435c4aabef83342` — a lone `"."` (1 code point)

So the original text ended in `".."` and the revision collapsed both periods back into one
row. **62 + 1 = 63.** The offset is the boundary where the old cut fell, and it lands exactly
on the second period. That is internally consistent: the mapping is not a guess about where
the fragment "probably" was.

The orphan's content is fully determined — `textId(".") = tcdb4ee2aea69cc6a83331bbe`, and
that entry **is present** in the pool at `data/texts/cd.json`. So an alias could reference
real, existing pooled text; nothing would need inventing.

## The one thing that makes this case different from the other 27

The orphan is **not live** — `r00010-s5435c4aabef83342` is absent from current rows. So this
is the *only* one of the 28 that could take a normal alias without first retiring anything.
It is blocked purely by the V1 format.

Contrast the 23 reused ids: all 23 are still live, so for them even a V2/V3 migration is not
enough (`src/row-splits.ts:171`). **This case and those 23 need different fixes.** Grouping
them as "historical links" will produce the wrong remedy for one group or the other.

## Disagreement I am recording, not resolving

My earlier recommendation was to point at the parent `r00010`, on the grounds that a lone
`"."` is not meaningful content worth its own redirect. The coordinator's mapping instead
targets offset 62, preserving the exact fragment.

**The coordinator's version is more defensible than mine** and I am withdrawing my
recommendation. Reason: an alias pointing at the parent would silently redirect a reader who
anchored to the fragment *backwards* into a 63-code-point sentence, which is a
different-text outcome — the same failure mode as the 23 reused ids. Pointing at offset 62
preserves the byte-exact content the reader actually saw. It also keeps the recovery rule
uniform: all 28 map to byte-exact content, rather than 27 exact plus one approximation.

## What must happen for it to be applied

1. V1→V2/V3 migration for this item, so an `aliases` array is legal at all
   (`src/schema.ts:237-245`).
2. The alias entry, in the V2/V3 segment shape, referencing `tcdb4ee2aea69cc6a83331bbe`
   with `target_start` computed the same way as the other recovered links.
3. It goes through the item mapping tooling — **not** by hand, per the coordinator's
   instruction. My hand-written shape would be unverified by construction.
