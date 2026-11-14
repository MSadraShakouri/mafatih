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

The condition is not specific to one row. Counting every recorded occurrence whose current field is
longer than the recorded slice gives **75 occurrences across 9 Agent-4 items**:

| Item | Occurrences | Example merged row |
|---|---:|---|
| `amal-slvat-shaban` | 27 | m0a65bb84f22990a314437199 |
| `amal-aamal-arfh-2` | 18 | m7553b0a83167f086e7dc763c |
| `dua-mkhtsrtryn-daahay-shr` | 12 | m2755db25f9718c52d1ff2976 |
| `namaz-taqyb-sbh-nql` | 6 | m6f806b216ef2dc2747e63197 |
| `monajat-mnajat-dvm-raz` | 4 | m61e5472656670603f3bf8778 |
| `amal-slvat-shaban`, `dua-daa-zndh-shdn`, `item-asharh-6`, `khavas-ahkam-dfn-amvat`, `namaz-kyfyt-astkharh-tsbyh` | 2 each | as listed in the row-split records |

Every one of them is a V2 or V3 row that Agent-4 merged. The assertion is false for any merged row,
so the failure is a property of the consumer and of the corpus shape, not of the content of any
particular row: a reviewer on a corpus with no merged row sees a green test, and a reviewer on a
corpus with merged rows sees this one failure.

## Status

The same single failure is the only failure in the whole suite with the official toolset:

```
# tests 277
# pass 273
# fail 1
# skipped 3
```

The failing row is the merged row `m0a65bb84f22990a314437199` in `amal-slvat-shaban`.

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
