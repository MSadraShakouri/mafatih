# Review and publication

The package is a development foundation, not a statement that any imported text is accurate or licensed for distribution. Some existing labels and links are incorrect or suspicious, and an ancient source's public-domain status does not automatically cover a modern translation or edition. Verify rights before putting the text in a public repository as well as before distributing a website or APK. Read the [substantive audit](substantive-audit.md) and [independent rights review](rights-review.md): the current six comparison-source records are unverified and are not permission grants.

## Review order

1. Read `generated/audit/audit.md`, `title-comparison.csv`, `unlinked-english.csv`, `row-granularity.csv`, `editorial-corrections.csv`, and `document-display-overrides.csv`. After running the matcher, also read `source-match-summary.csv`. A comparison is a lead, not an automatic correction.
2. Check Arabic and Persian wording, row pairing, apparent reciter names and Quran basmala/verse boundaries against the specific edition. Correct via the editable export/apply workflow. Keep intentional variants and repeats.
3. Check each English document's actual scope, translator, association with the item and rights. Introductory text is not automatically a body translation. Preserve distinct source and paragraph attribution.
4. Review Arabic/English candidates and Persian spans where appropriate. The review tool does not invent missing text. Mark item-level AR/FA and text review, document review/coverage, and each relationship review only when the relevant work is complete.
5. Add source/license evidence and permitted uses to `data/sources.json` and attach the relevant source IDs at the correct item/row/document/paragraph scope. Check share-alike, non-commercial and attribution requirements as applicable.

`npm run check:publication` is a **conservative mechanical checklist for every item and English document in the generated corpus**. It currently fails by design. `-- --commercial` also requires explicitly recorded commercial use. `npm run build:release` invokes this gate before producing web data. If you want to ship only a verified subset, implement and review an explicit subset release policy rather than bypassing the gate or accidentally publishing unlinked documents. Passing the gate is not a legal opinion or proof that a translation, complete alignment, or religious wording is correct.

## New repository

The fresh Git-enabled ZIP already has an initial commit on `main` and no remote. Generated audit JSON, review pages, web data, SQLite and downloaded reference datasets are not in source control.

```sh
npm ci
npm run check
npm run audit
# Optional: npm run build:sqlite

git status --short
git remote -v  # empty until you choose a remote
```

Only after you independently confirm you may keep and distribute the data should you create a remote, configure it and push. Do not upload generated review pages, search indexes, SQLite, audit outputs or downloaded upstream datasets as source files. Decide separately whether a GitHub repository should be private while you investigate rights; privacy alone does not grant permission. See [repository-setup.md](repository-setup.md).
