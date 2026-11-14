# Proposal: merged-row reader assertion (agent-2 record)

Status: **proposal only.** Following agent-1's governance point and the
coordinator's shared instruction ("do not independently change the pinned
tools"), this branch has been reverted to the coordinator's frozen toolset at
main `b2756bb0`. The fix below is preserved here as a proposal; it is
semantically equivalent to agent-1's proposal in
`agent-work/agent-1/proposals/runtime-audio-merged-rows.diff` and the
coordinator should land **one** of them.

## Defect

`tests/runtime-audio.test.ts` (main `b2756bb0`) asserts that a built reader
field equals one mapped piece. Once a reviewed merge puts the slices of several
historical rows into one field, that is false by construction. Live evidence on
this branch: the reviewed V3 merge `amal-aamal-jmah/m4cfac1c5` absorbs
`r00031` — a row with a recorded punctuation normalisation — so the frozen
suite fails exactly one test here (273 pass / 1 fail / 3 skipped,
`runtime-audio.test.ts` "generated reader, search, navigation and English data
use the corrected canonical occurrences"). This is the same failure agent-6's
45 held joins would trip.

## Fix (this variant, previously applied as f7ce25f9)

`tests/helpers/row-split-history.ts` returns each piece's `target_start`;
`tests/runtime-audio.test.ts` slices the built field at the recorded offset and
compares it to the piece, then asserts the search record carries the whole
field text and its normalisation. Given `indexed.text === built field`, this is
equivalent in strength to agent-1's variant (which slices the indexed text
separately) and additionally pins built-to-index whole-row equality. Full diff:
`runtime-audio-merged-rows.diff` next to this file.

## Green-run evidence (recorded, reproducible)

Isolated snapshot `3bd51553e4d86313f484619a5dde52d7e20556a3` (parent
`844d104c`) carries this branch's data plus the applied fix with its
regenerated pin. A raw `git worktree` checkout of that commit, with only
`node_modules` symlinked, passed:

- `split-agent.ts verify-tool-info` → `tool-version-matches`
- `npm run validate` → STRUCTURAL VALIDATION PASS
- `node --import tsx --test tests/runtime-audio.test.ts` → **5/5 pass**

On a full-suite run of the applied state: 274 pass / 0 fail / 3 skipped.
The same two test files plus pin were also adopted byte-identically on
agent-3's branch with a green gate (274/0), before this revert.

## Current branch state after compliance

Frozen coordinator toolset (pin `tool-version-matches` against `b2756bb0`);
the single known failure above is expected and documented until the
coordinator lands the fix and everyone re-syncs. No data, plan or layout file
is affected by any of this.
