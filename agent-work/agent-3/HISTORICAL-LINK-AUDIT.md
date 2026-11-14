# Agent-3 historical-link audit

Scope: my 115 assigned items, base `ffa01da9`. Audited 2026-11-14.

## Summary

**28 prior row IDs across 14 items** have no current row and no redirect.
This **reproduces the coordinator's figure exactly**, and locates it precisely.

### What they are

They are **not** base-corpus row IDs. Every one of the 1,517 base row IDs in my
items is either still a live current row (1,502) or is covered by a redirect
entry in `data/row-splits/<item>.json` (295 — overlapping counts because a base
row can be both retained and re-mapped). Base-level coverage is **complete: 0
missing**.

The 28 are **prior-output child IDs**: rows that existed in my first published
snapshot `731bbd960c4161a7665f93745f43271fe6eadc7c` — the *outputs* of my first
pass, with suffixed IDs like `r00014-s30d7521ced3cc2a9` — which my later
revision retired.

### How they were orphaned

My first pass split base row `r00014` into four children. My later defect-fix
revision re-split that row *from the frozen original* into a different, smaller
set. The record's `rows[].original.id` still points at `r00014`, so an old link
addressed by the **base** ID still resolves — but a link addressed by a
**731bbd96 child ID** has nothing to resolve through, because the alias array
that would carry it does not exist.

### Why the tool could not have recorded them

My records are `format_version: 1`. The schema forbids aliases on V1
(`src/schema.ts`: "V1 mappings cannot have aliases"), and `aliases` is required
only for V2/V3. So **there is no field in which a V1 record could store these
redirects**. This is a tooling limitation, not an omission I could have fixed by
editing a file — and I did not bypass any guard to work around it.

## Proposed mappings

Recovered by locating each orphan's exact text in the current corpus
(code-point offsets, not fuzzy matching).

| Method | Count | Meaning |
|---|---:|---|
| exact-row | 14 | Orphan text is exactly one current row — redirect is lossless |
| unique-in-family | 13 | Orphan text is a unique substring of one current row in the same original-row family — redirect needs an offset |
| unresolved | 1 | Only a 1-character fragment; no safe target |

**27 of 28 are recoverable.** The single unresolved case is
`namaz-vqt-tlva-ghrvb / r00010-s5435c4aabef83342`, whose entire content is
`"."` — a lone full stop, the tail piece of a split. Its parent `r00010` still
exists as a live row with the full sentence, so a link to it is harmless but
cannot be offset-resolved. Recommend redirecting it to the parent row at the
sentence end rather than guessing.

### Per-item mapping


**amal-adab-vzv** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00004-sc37c134c2f2b5db5` | recitation | unique-in-family | `r00004-sa44b8f05e3e4e602` | ar | 109 |

**amal-akhr-shaban-rmzan** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00001-se6fd57e83707d7b7` | recitation | exact-row | `r00001-s5347c817c3599961` | ar | 0 |

**item-avl-taqybat-mshtrk** (6)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00014-s30d7521ced3cc2a9` | recitation | exact-row | `r00014-s6d3577567ca79464` | ar | 0 |
| `r00014-sdded2196be4783b3` | recitation | unique-in-family | `r00014-s6d3577567ca79464` | fa | 0 |
| `r00014-s49d7c00fe170069e` | recitation | unique-in-family | `r00014-s6d3577567ca79464` | fa | 7 |
| `r00018-se02ec69b33a9c37e` | recitation | exact-row | `r00018-scab5d97b50d26705` | ar | 0 |
| `r00018-s289ff99cb9655048` | recitation | unique-in-family | `r00018-scab5d97b50d26705` | fa | 0 |
| `r00018-sd8cfc4f37f15de8e` | recitation | unique-in-family | `r00018-scab5d97b50d26705` | fa | 24 |

**khavas-khvas-ql-hvallh** (2)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00001-s1fa9d92731f5fd90` | note | exact-row | `r00001-s8939275b275c817a` | fa | 0 |
| `r00001-s90136106b1b46f45` | note | exact-row | `r00001-sa021c793590ec5ab` | fa | 0 |

**namaz-item-3** (3)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00001-sccd769a9e29adea8` | recitation | exact-row | `r00001-s3e4b70ad1b9cb544` | ar | 0 |
| `r00001-s633a7c61dc1b47ae` | recitation | unique-in-family | `r00001-s3e4b70ad1b9cb544` | fa | 0 |
| `r00001-s8877147e145d3e46` | recitation | unique-in-family | `r00001-s3e4b70ad1b9cb544` | fa | 77 |

**namaz-vqt-tlva-ghrvb** (2)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00010-seb219ae3b3f3af47` | note | unique-in-family | `r00010` | fa | 0 |
| `r00010-s5435c4aabef83342` | note | unresolved | — | — | — |

**ziyarat-adab-mkhsvs-hsyn** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00013-s546cab427d40aec8` | note | exact-row | `r00013-s892a5505605738ea` | fa | 0 |

**ziyarat-aymh-bqya-alyhm** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00012-sb2130a49d3b9105e` | recitation | unique-in-family | `r00012-se62b3f362c1c151a` | ar | 260 |

**ziyarat-bad-rza-alyh** (3)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00017-sa19d7be45dbbf8e9` | recitation | exact-row | `r00017-s18f0993006f44169` | ar | 0 |
| `r00017-sd42c966b7129bb5a` | recitation | unique-in-family | `r00017-s18f0993006f44169` | fa | 0 |
| `r00017-s4d37c13dc36e80dc` | recitation | unique-in-family | `r00017-s18f0993006f44169` | fa | 69 |

**ziyarat-byan-anchh-vars** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00001-s90136106b1b46f45` | note | exact-row | `r00001-s1fa9d92731f5fd90` | fa | 0 |

**ziyarat-chharm-shbhay-qdr** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00001-sa021c793590ec5ab` | note | unique-in-family | `r00001-s8939275b275c817a` | fa | 414 |

**ziyarat-fvayd-mdavmt-aashvra** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00001-s8939275b275c817a` | note | exact-row | `r00001-sd0076416ed435839` | fa | 0 |

**ziyarat-fzylt-rza-alyh** (4)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00003-s2fd8d78ba1da248f` | note | unique-in-family | `r00003-s1828851db03b603e` | fa | 10 |
| `r00003-s24d9ff99a70ac6b6` | recitation | exact-row | `r00003-s246e32d857da5bce` | fa | 0 |
| `r00003-s587ae8bab0215fbf` | note | exact-row | `r00003-sd8fe963a13fe0305` | fa | 0 |
| `r00003-sba0e23531a0bd45e` | note | exact-row | `r00003-sb355d8466a6ab016` | fa | 0 |

**ziyarat-ghdyr** (1)

| prior ID | kind | method | target row | lang | offset |
|---|---|---|---|---|---:|
| `r00002-sb8a7c4ea61e1d0eb` | note | exact-row | `r00002-se090ec1c15d74b91` | fa | 0 |

## Safety

- No re-split was applied, no guard bypassed, no text translated.
- **All 27 offsets were verified byte-exact**: the slice of the current row at
  the proposed offset, of the orphan's length, equals the orphan's original text
  in every case (`verified: 27, failed: 0`).
- Every target was verified to exist as a live current row.
- Offsets are Unicode code points, matching `resolveLegacyRowAnchor`.
- These mappings are **proposals**. Applying them requires the format upgrade
  described below; I have not written them into `data/`.

## What is needed from the tool maintainer

1. A supported way to carry prior-output aliases into a **V1 → V2** upgrade, so
   `aliases[]` can hold these 27 redirects. V1 records cannot express them.
2. Per the coordinator's own note, this belongs with the wider
   historical-anchor preservation + migration work, not as an ad-hoc patch.

## Whether the links were ever used

Unknown from the repository alone. These IDs exist only inside
`data/row-splits/` and my earlier snapshots; no committed client, route or
bookmark references them. `resolveLegacyRowAnchor` is the only consumer, and it
handles multi-piece redirects correctly when a redirect entry exists.
