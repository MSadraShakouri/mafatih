# Long-term plan

This is the practical to-do list for turning the current data foundation into a usable, trustworthy app. It is deliberately separate from the completed work.

## Where things stand

- [x] Rebuild the foundation: structured, version-controlled JSON data; stable item, row and paragraph IDs; separate source and English records; a generated SQLite database; validators and basic command-line editing tools.
- [x] Support alignment groups that can link parts of Arabic, Persian and English text in one-to-one, one-to-many or many-to-many arrangements. The English paragraph does **not** have to be physically split to link two separate parts of it to different Arabic/Persian rows.
- [x] Keep original item IDs, record targeted corrections and moved English paragraphs, and provide redirects for the 37 paragraph locations retired during the audit.
- [x] Research obvious rights questions and record what is known and unknown; keep the publication gate closed.
- [ ] Review the content and alignments; the existing row pairings and machine-generated candidates are **not** verified. No alignment groups have been reviewed yet.
- [x] Provide a text/JSON split-planning tool for AI agents: export existing text, validate exact Unicode-safe cuts, and output lossless segments plus optional unreviewed alignment proposals. It makes no model/API calls and never generates a translation.
- [x] Add a minimal shared Vite reader and Capacitor shell, with version-tag APK and Pages workflows. The workflows do not enforce the publication gate; content and rights remain unreviewed. This is a starter, not the finished website or app; no visual data-editing tool is planned.
- [ ] Extend the agent workflow into a safe canonical split-and-merge operation with automatic migration previews. Today's planner does not physically rewrite source rows, synchronize translations, preserve newly retired row/paragraph addresses, or migrate reviewed groups for you.

## Non-negotiable rule

Follow [CONTENT_POLICY.md](CONTENT_POLICY.md): **no AI translation of Arabic text**, including indirectly translating devotional Arabic through an intermediate Persian rendition. AI may translate Persian explanatory prose with clear provenance and review; it may not translate Arabic prayers or quotations. Use licensed human translations for missing devotional text, or leave it missing. Imported material with unknown creation methods needs review; a validator cannot determine whether AI was used.

## 1. Split and synchronize carefully

- [x] Give AI agents a text-based export and lossless split-plan validator. Use `npm run split:plan`; see [docs/ai-splitting.md](docs/ai-splitting.md). Agents choose boundaries, while the tool checks exact source hashes and Unicode grapheme boundaries. It can output proposed cross-language groups without pretending they are reviewed.
- [ ] Keep source wording, diacritics, punctuation, line breaks and meaningful repeated recitations. Splitting must not silently rewrite or translate anything. Distinguish display wrapping from a real content boundary.
- [ ] Allow each language to have a different number of segments. One long English paragraph may map to several Arabic/Persian rows; one paragraph can also correspond to a group of multiple rows. See [docs/segmentation.md](docs/segmentation.md).
- [ ] Preserve stable IDs and build explicit **one-to-many migration mappings** for physical splits, merges and old bookmarks. The current 37 redirects cover the earlier English record moves only; they are not a general split/merge system.
- [ ] Extend the existing planner with an atomic, reversible canonical split/merge command: verify exact reconstruction, output machine-readable changed-ID and affected-link reports, and support safe application by an AI agent. Store a change record and tests. Do not silently delete or reinterpret old text.
- [ ] When a reviewed span changes, explicitly invalidate or migrate it after review. Never approve alignments simply because the same line numbers, lengths or common words match.
- [ ] Support unaligned portions and incomplete English gracefully instead of displaying an introduction or a guessed translation as if it were the prayer body.

## 2. Review Arabic, Persian and English alignments

- [ ] Have AI agents work in small batches against trusted editions, starting with the prayers most used. Use separate verification passes and, where needed for reliable publication, a qualified human reviewer; this does not require manually splitting every line. Confirm wording and meaning/context, not just line breaks.
- [ ] Resolve the existing coarse rows and the **14 potential split Quran verse sequences** before accepting their alignments. Check whether instructions, headings and reciter menus are separate from recitation.
- [ ] Examine machine triage candidates and source differences as leads, not verdicts. The current review bundle's 9,396 candidates are all unreviewed; no automatic match is scholarly approval.
- [ ] Record reviewer, date, evidence, text edition and exact spans. Flag stale review when text changes. Record uncertainty and allow partial AR–FA or AR–EN review when a third language is missing.
- [ ] Check confusing English document associations and the remaining mixed/duplicate paragraphs. A duplicate can be legitimate; a no-match is not necessarily an error.
- [ ] Revisit the earlier Hazm-assisted Persian normalization where useful. Some suggestions remain unapplied and its word list does not contain every valid word; investigate context rather than treating every unknown word as an error. Record the original version/settings if they become available. See [docs/persian-normalization.md](docs/persian-normalization.md).

## 3. Complete missing English without AI-translating Arabic

- [ ] Inventory actual coverage item by item: complete body, partial body, introduction only, explanatory note or none. There are eight empty English documents and many unlinked or mixed documents; neither count alone tells the full story.
- [ ] The 16 older whole-Quran chapters have English introductions but no complete English verse bodies. Select and verify a suitable human translation and its exact edition/permissions before importing anything.
- [ ] For prayers and other Arabic devotional content, obtain a human translation with suitable permission or commission/obtain one from a human translator. Never synthesize missing Arabic translations with AI.
- [ ] AI-assisted translation may be used only for permitted explanatory prose under the policy above. Keep that work distinguishable from the devotional text and review its accuracy.
- [ ] Add fine-grained human/AI/unknown method, source-language, translator, edition, evidence and license metadata for each applicable text segment; do not invent the provenance of existing paragraphs.

## 4. Rights, attribution and responsible publication

- [ ] Recheck the exact edition, translator and rightsholder for each Arabic transcription, Persian and English translation, explanatory text, image, font and audio file. Record evidence and required attribution at the appropriate item/row/paragraph scope.
- [ ] Obtain permission for the actual uses: website, offline Android app, corrections, modifications, territories and any advertising or commercial use. A site's free viewing, a repository label or attribution is not a blanket grant.
- [ ] Resolve the Pickthall digital-edition lineage and the sources of the older Quran Persian chapters; check jurisdiction and modern-edition rights. See [docs/rights-review.md](docs/rights-review.md).
- [ ] Decide what can be kept in a private development repository and what can be published. A private repository is not itself a license. Do not put uncleared content into a public GitHub branch, website or APK.
- [ ] Only after documented content, relationship and rights review, satisfy `npm run check:publication`. Passing it is a checklist, not a legal opinion.

## 5. Build the website and app

- [ ] Finish the Persian-first library, search, navigation and item pages. Keep visible search and play/pause in the header when its design is decided. English UI comes later; display the correct English title/coverage and use Persian fallback for a missing needed explanation.
- [ ] Offer reader styles, font size and all three planned font families, with suitable licenses and offline files. Arabic/Persian and later English need their proper directions. Select Persian or English translations rather than normally showing both full translations simultaneously.
- [ ] Use reviewed alignment groups where available. For unreviewed or incomplete passages, show the full sources honestly instead of making a false line-by-line pairing.
- [ ] Complete shared settings, bookmarks, accessible auto-scroll, offline website caching and backup/export. The starter Android shell bundles the website build; device/offline validation and a finished APK remain to do.
- [ ] Keep data editing and review agent-friendly and text-based, with reversible changes, provenance entry and conflict handling. No visual data-editing tool is requested. Keep canonical data independent from website/app presentation.

## 6. Keep the repository healthy

- [x] Keep source JSON and editorial history in Git; generate SQLite, search indexes, reports, dependencies and app builds rather than committing duplicate artifacts. `.gitignore` and `npm run check:repository` guard common artifacts.
- [x] Provide local typecheck, tests, the repository-artifact guard, structural validation and root/subpath browser smoke tests. There is no per-commit CI; `v*` tags trigger separate build and Pages workflows.
- [ ] Extend local checks with data migration/SQLite integrity, accessibility and reproducible-build coverage. Keep size/backup checks and restore tests.
- [ ] Add an explicit schema-version/migration policy before introducing breaking structural changes. Preserve old IDs, redirects, source claims and a way to roll back.
- [ ] Resolve the retained reversed TOC page range, legacy page-number mapping, remaining source/permission gaps and other audit findings; do not silently guess values.
- [ ] Decide how audio/reciter metadata and licensed media should work; the 28 known audio-menu rows are currently retained for audit but excluded from prayer/search output.
- [ ] Keep this plan and `CONTENT_POLICY.md` current as decisions are made. Review changes on a branch, keep backups and avoid force-pushing.
