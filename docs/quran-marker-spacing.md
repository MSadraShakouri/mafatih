# Quran marker spacing audit

The user requested a canonical correction, not a display-only gap. At base `f1c9ee3`, a scan of current Arabic row occurrences found **946** numeric `﴿digits﴾` end-of-ayah markers: 941 already had one preceding space and five touched the preceding word. The five occurrences corrected in this batch are:

- `sura-jumua/r00001/ar`
- `sura-mulk/r00002/ar`
- `sura-rahman/r00003/ar`
- `sura-svrh-alvaqah/r00003/ar`
- `sura-yasin/r00003/ar`

Each correction inserts one ordinary space immediately before the marker and changes no letters, marks, marker digits or row IDs. The current Arabic-row audit also found two ornate bracket pairs containing Quran quotation text rather than digits, 15 `۞` section ornaments, and two `۩` prostration symbols. They are not numeric end-of-ayah markers and this rule leaves them alone. This is a scoped mechanical audit, not a verification of every possible Quranic punctuation convention or the wording and numbering.

Each occurrence's exact previous and replacement text IDs are stored in the `quran-verse-marker-spacing-v1` batch of `data/editorial-history.json`. Both exact values remain in the pool, and claims, existing history, sources, review records, other occurrences and stable IDs are not changed. SQLite export retains this batch in the existing punctuation history tables. The rule accepts only Arabic item rows, refuses reviewed text and affected reviewed alignment spans, validates all edits and collisions before mutating anything, and checks that search normalization stays unchanged. Older deep links whose offsets fall after the inserted space can move by one code point; newly generated search links use the corrected content.

## Recheck or apply a future batch

```sh
npm run normalize:quran-markers             # list occurrences and plan SHA-256; no writes
npm run normalize:quran-markers -- --check  # exit nonzero if changes are needed
# After reviewing the printed occurrence list, substitute its SHA-256:
npm run normalize:quran-markers -- --apply --expect-plan=THE_REVIEWED_SHA256
```

The hash covers the ordered locations and their previous and replacement IDs. If the plan changes after review, application is refused until the new plan is inspected. The normalizer never automatically clears review or alignment status. `--date=YYYY-MM-DD` can supply the batch date when a documented date is needed; without it the UTC date is used. A fresh `--check` on this batch reports zero pending edits. Display Persian-digit conversion and marker font weight are separate presentation changes and do not rewrite the source numbers. Rights, transcription, translation and content review remain outstanding.
