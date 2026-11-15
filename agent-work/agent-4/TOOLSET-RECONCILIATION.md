# Agent-4 reconciliation with the coordinator's official toolset

## What I had been carrying, and why

Commit `f04b6f4d` ("Clarify review scope and support merged-row audio slices") added agent-2's
merge-aware consumer change and its regenerated pin to this branch:

- `tests/runtime-audio.test.ts` — replaced the whole-field equality assertions with offset-aware
  slice assertions, and imported `codePoints` / `slicePoints`.
- `tests/helpers/row-split-history.ts` — exposed `target_start` on each mapped piece.
- `docs/split-assignments/tool-info.json` — re-pinned the two changed files.

The reason was a main-side defect: at `b2756bb0` the test asserts that the whole built field equals
the recorded piece, which is false by construction once an occurrence maps to a slice of a row that
later merged with a neighbour.

That change is a change to **coordinator-owned pinned files**, which the shared instruction forbids
an agent from making independently. The coordinator has now asked for the self-repinned files to be
reconciled with the official toolset and for the known failure to be reported until the main fix
lands.

## What I did

The three files were restored verbatim from `b2756bb07e30087356ed981e5a50750290847cf0`:

| File | Blob restored |
|---|---|
| `docs/split-assignments/tool-info.json` | `f185519333f126bef2d430232cd0f588e6b6e4a2` |
| `tests/helpers/row-split-history.ts` | `35b72564f8f29893d1d1f23ef725d4a9cab28d6d` |
| `tests/runtime-audio.test.ts` | `7e214003cb0f95a42f19547549e057c40000e9a2` |

`git diff b2756bb0 -- <those three paths>` is now empty. `verify-tool-info` reports
`tool-version-matches` against the coordinator's official pin, and `verify-partitions` is unchanged.

No canonical data, row split, plan, layout, review record or source text was touched by this
reconciliation.

## The known failure, reproduced and reported

With the official toolset, the targeted runtime test fails exactly as the coordinator measured:

```
# tests 5
# pass 4
# fail 1
```

The failing assertion is `tests/runtime-audio.test.ts:156`, `assert.equal(built?.[piece.language],
piece.text)`. The actual value is the whole merged row; the expected value is the recorded
occurrence's slice of it.

The condition is not specific to one row. Two different counts describe it, and they are not
interchangeable.

**The screen.** Every recorded occurrence whose current field is longer than the recorded slice is
a candidate for the failure. Counting them over the whole corpus gives **104 occurrences across
14 items**: **54 in 9 Agent-4 items** and 50 in 5 Agent-5 items. The Agent-4 share is:

| Item | Occurrences | Example merged row |
|---|---:|---|
| `amal-aamal-arfh-2` | 16 | m7553b0a83167f086e7dc763c |
| `amal-slvat-shaban` | 14 | m0a65bb84f22990a314437199 |
| `dua-mkhtsrtryn-daahay-shr` | 10 | m2755db25f9718c52d1ff2976 |
| `namaz-taqyb-sbh-nql` | 4 | m6f806b216ef2dc2747e63197 |
| `monajat-mnajat-dvm-raz` | 4 | m61e5472656670603f3bf8778 |
| `khavas-ahkam-dfn-amvat` | 2 | m6dbfd6b323e414d0a8b2579f |
| `namaz-kyfyt-astkharh-tsbyh` | 2 | m194e5b45e984e2679dfd6ab0 |
| `dua-daa-zndh-shdn` | 1 | m25f8aba9778a65efac295c45 |
| `item-asharh-6` | 1 | m7aada489c3a8236a60d4132b |

The other 50 screen hits are in Agent-5's items: `dua-nudba` 18,
`ziyarat-aashvray-ghyr` 12, `ziyarat-amyralmvmnyn-alyh-alslam-2` 12, `dua-frj-zman-ajl` 4 and
`monajat-mnajat-astkharh` 4. They are listed for the coordinator's benefit only; they are read
here and not touched.

**The actual failures.** The assertion only fires where the built field differs from the
recorded slice *and* the occurrence is one that a punctuation normalisation points at. On this
corpus that is **3 occurrences across 2 Agent-4 items**: 2 in `amal-aamal-arfh-2`
(`m7553b0a83167f086e7dc763c`) and 1 in `namaz-taqyb-sbh-nql` (`m6f806b216ef2dc2747e63197`). The
test runner reports the first mismatch and stops there, so the failure the coordinator sees is
the `amal-aamal-arfh-2` row, not the `amal-slvat-shaban` row.

Every one of them is a V2 or V3 row that Agent-4 merged. The assertion is false for any merged row,
so the failure is a property of the consumer and of the corpus shape, not of the content of any
particular row: a reviewer on a corpus with no merged row sees a green test, and a reviewer on a
corpus with merged rows sees this one failure. The count of 54 is the size of the exposure; the
count of 3 is the size of the failure.

## Status

The same single failure is the only failure in the whole suite with the official toolset:

```
# tests 277
# pass 273
# fail 1
# skipped 3
```

The failing row is the merged row `m7553b0a83167f086e7dc763c` in `amal-aamal-arfh-2`, and
the whole field of that row is what the assertion compares against the recorded slice of
the occurrence it carries.

- The branch now carries the coordinator's official toolset with no self-repin.
- The known failure is reported here and in the coordination message, and is left visible rather
  than masked.
- The reviewed fix (agent-2's merge-aware consumer change plus its regenerated pin) is upstream and
  is the coordinator's to land on main; it is not carried here.
- After the main fix lands, `tests/runtime-audio.test.ts` and `tests/helpers/row-split-history.ts`
  are coordinator-pinned files and must move together with `docs/split-assignments/tool-info.json`.

## What is not claimed

This report is a build-and-test observation about the coordinator's pinned toolset and this
corpus's row shape. It is not a claim that any merged row is wrong, not a content, translation,
scholarly or rights judgement, and not an independent modification of the pinned tools.
