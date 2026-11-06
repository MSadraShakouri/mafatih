# Persian normalization and Hazm

## Historical use

Project notes report that [Hazm](https://github.com/roshan-research/hazm), a Persian NLP toolkit, was used during earlier Persian-text normalization. **Not every suggested change was applied.** Its available word list is limited and does not recognize every valid word, name, religious expression, inflection or spelling; an unrecognized word or suggestion is not by itself evidence that the corpus is wrong.

The old tracked repository does not record the exact Hazm version, configuration, original input, output or complete accepted/rejected suggestion list. Those details remain **unknown**; do not claim a particular version or pretend the previous run is reproducible from this repository. Preserve the existing Persian wording unless a specific change is supported and recorded.

## Distinguish text from search

- **Canonical Persian text** is stored exactly as imported or subsequently corrected, with meaningful spelling, punctuation characters and zero-width non-joiners preserved. One explicit, reversible correction removes horizontal whitespace before closing/sentence punctuation; its occurrence-level old and new values are recorded in editorial history. It does not use Hazm or claim content review. Original historical claims and targeted corrections remain recorded.
- The current application/search build uses the project's own `src/normalize.ts` search-only folding. It does **not** call Hazm and is not an implementation of Hazm. Search folding may ignore diacritics, unify Arabic/Persian character variants and use a more permissive joined/spaced fallback; those changes affect the index and queries, not displayed source text.
- Hazm is not presently a dependency of the build or a live normalization step in this repository. It may be used separately in future as a source of suggestions, but adding it to a reproducible pipeline requires documenting the exact version, options, resources and input checksums.

## Future use

1. Generate candidate normalization changes separately; do not overwrite canonical data with all suggestions. Retain the source text and exact before/after values.
2. Have an AI agent or qualified reviewer investigate proposals in context, including the source edition and actual Persian usage. A word absent from a lexicon is not automatically misspelled, and a dictionary suggestion is not automatically the correct word. Track accepted, rejected and unresolved proposals where evidence exists.
3. Be careful with half-spaces, Arabic/Persian yeh and kaf variants, punctuation, names, devotional language and legitimate edition-specific spelling. Do not apply a search index's aggressive folding to display text.
4. Use Git, editorial history and regression tests to make accepted changes reversible. A normalization change can invalidate reviewed spans or split plans; revalidate them. No normalization tool should generate translations of Arabic text; see [CONTENT_POLICY.md](../CONTENT_POLICY.md).
