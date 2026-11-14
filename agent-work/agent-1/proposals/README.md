# Proposal: let the pinned reader test read merged rows

Status: **proposal only, not applied here.** `tests/runtime-audio.test.ts` and
`tests/helpers/row-split-history.ts` are pinned in
`docs/split-assignments/tool-info.json`, so changing them inside the round would
fail `split-agent.ts verify-tool-info`. This needs a coordinator commit on `main`
plus a re-pin; the round agents cannot apply it themselves.

## Symptom

agent-6 holds 45 prepared cross-row joins (22 items). Applying them makes
`tests/runtime-audio.test.ts` fail with
"generated reader, search, navigation and English data use the corrected canonical occurrences".

## Cause

Lines 156-158 of `tests/runtime-audio.test.ts` assert that a built reader row
field equals one piece:

```ts
assert.equal(built?.[piece.language], piece.text);
assert.equal(indexed?.text, piece.text);
assert.equal(indexed?.normalized, normalizeSearch(piece.text));
```

`currentPieces()` maps a historical row to slices of current fields. After a
reviewed merge, one current field holds the slices of several historical rows, so
the field is longer than the piece and the equality fails even though every slice
is intact and `currentPieces` still reconstructs each historical row exactly.

Measured on the branch that already holds 52 reviewed merges: **92 current fields
carry two mapped slices** (for example `amal-aamal-akhr-aashvra/mdd6139b558bed844843217b3/ar`,
53 code points over 2 slices). The guard does not fire today only because none of
the merges applied so far touches a row with a recorded punctuation normalisation;
all 5 tests in the file pass unmodified right now.

## Proposed change

`tests/helpers/row-split-history.ts`: return the mapped offset and length with each
piece (`start`, `length`).

`tests/runtime-audio.test.ts`: compare the mapped slice rather than the whole
field, and normalise the whole field:

```ts
const field = built?.[piece.language] ?? '';
assert.equal(slicePoints(field, piece.start, piece.start + piece.length), piece.text);
const indexedText = indexed?.text ?? '';
assert.equal(slicePoints(indexedText, piece.start, piece.start + piece.length), piece.text);
assert.equal(indexed?.normalized, normalizeSearch(field));
```

`slicePoints` is already exported by `src/text-ids.ts`; the test needs one import
line (`import {slicePoints} from '../src/text-ids.js';`).

The patch is `runtime-audio-merged-rows.diff` next to this file.

## Validation done here

- Applied to a clean worktree, `npm run build:data` rebuilt 686 items, and
  `npx tsx --test tests/runtime-audio.test.ts` passed **5/5**.
- Reverted afterwards, so the branch still pins the original files and
  `verify-tool-info` still reports `tool-version-matches`.
- The change is behaviour-preserving where a field holds a single slice (the whole
  field is then exactly that slice), and it is the only place that compares a
  built field with a mapped piece.
