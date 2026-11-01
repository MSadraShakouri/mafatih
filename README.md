# Mafatih content foundation

## The short answer

**The data-structure rebuild is done.** The project contains the imported items in structured, version-controlled JSON, plus tools to edit/validate them and generate a SQLite database. The JSON in `data/` is the source of truth; SQLite and search files are generated from it.

**The content work is not finished.** Line-by-line alignment, missing English, independent rights clearance, a website and an APK are still to do. Some rows remain long. English is stored independently, so parts of one English paragraph can later be associated with multiple Arabic/Persian rows without inventing a translation. A text-only AI-agent tool can propose and validate lossless split points; it does not yet physically split the canonical data. See [how segmentation works](docs/segmentation.md), [the AI splitting workflow](docs/ai-splitting.md), and [the long-term plan](ROADMAP.md).

**Hard rule: no AI translation of Arabic text.** AI may help with permitted Persian explanatory prose; see [CONTENT_POLICY.md](CONTENT_POLICY.md). Existing provenance and permissions need review; this is not publication-ready.

The 686 original items, ordered Arabic/Persian rows, English documents, navigation and provenance claims were migrated from the commit recorded in `data/corpus.json`; the baseline importer checked a round trip before subsequent edits. A targeted 2026 audit corrected specific transcription, alignment, title and mixed-document issues while preserving previous values and stable occurrence references in history. Thirty-four whole-surah items have chapter numbers. These checks do **not** verify the whole corpus or grant publication rights; independent expert and rights review remains necessary. See [the substantive audit](docs/substantive-audit.md) and [rights review](docs/rights-review.md).

The Git-enabled delivery is a **fresh repository** with one initial commit on `main` and no configured remote. It does not carry over the old Git history; see [repository setup](docs/repository-setup.md). The dataset still records its historical provenance. Do not push uncleared text to a public repository.

## Start here

Requirements: Node.js 20+, npm; Python 3 with SQLite 3.37+ only for the optional SQLite export and legacy re-import.

```sh
npm ci
npm run check            # types, tests, tracked-artifact check, validation, development build
npm run audit            # generated/audit/audit.md and review CSVs
npm run build:sqlite     # optional: generated/corpus.sqlite
```

`npm run build` and `generated/` are for **development**. The conservative `npm run build:release` first runs `check:publication`; it is intentionally expected to **fail today**. Do not deploy or redistribute the corpus until the text, links, translations, source permissions and attribution have been reviewed. A private repo is not a substitute for permission.

## What's in the repository

```text
data/
  corpus.json              format and legacy import provenance
  texts/00.json … ff.json  exact text values, each stored once
  items/<slug>.json        item metadata and ordered AR/FA row references
  english/<id>.json        English paragraph occurrences and provenance claims
  relations.json           item ↔ English links, once, with review state
  editorial-history.json   recorded row, title, document and link changes with evidence
  navigation.json          curated order, featured shelf and original TOC
  claims.json              original source / attribution claims (unverified)
  sources.json             comparison-source records; permissions unverified
  legacy-attribution.md    the original credits and their claims
  alignments/              human-reviewed many-to-many span groups, if any
src/                       shared TypeScript schemas, search and validation
ROADMAP.md                 next steps and what is/isn't finished
CONTENT_POLICY.md          no AI translation of Arabic text
AGENTS.md                  instructions for future AI coding/content agents
scripts/                   editing, AI split planning, audits and artifact builders
tools/schema.sql           schema for the optional generated SQLite database
tests/                     validation, normalization and editing tests
```

The filename is the item's or document's stable ID. Text IDs are hashes of **exact** Unicode strings; row and paragraph IDs are separate occurrence IDs. Repeated content points to the same text, but each occurrence retains its own context and source. When editing one occurrence, the tools use copy-on-write so unrelated occurrences do not change. The 37 retired English paragraph locations have explicit redirects to preserved text; clients must follow them as described in [the data model](docs/data-model.md). Retired item–document links are not automatically restored.

## One source of truth, generated outputs

Exact content values are stored once in the text pool; rows and paragraphs reference them. Intentional repeated recitations remain separate occurrences without duplicating the pooled value. Editorial history retains references to previous values for provenance.

`generated/`, `reports/`, `dist/`, `node_modules/`, databases, APKs and Capacitor's copied web assets are ignored. Catalogs, counts, search indexes, audit reports, review pages and SQLite files are build artifacts—not source-controlled duplicates. `npm run check:repository` also flags common build outputs accidentally staged in Git; it cannot recognize every possible duplicate file.

The owner reports that Hazm was used during earlier Persian normalization, but not all suggestions were applied and its word list is incomplete. The current search normalizer is separate and does not call Hazm. See [Persian normalization](docs/persian-normalization.md); do not apply suggestions blindly.

## Alignment status

The original `manual-v1` label is preserved **as a historical claim**, not as independent verification. Other imported rows can be long, mixed-granularity passages. English was not row-aligned in the original dataset. The new model supports one-to-one, one-to-many and many-to-many relationships, including spans inside a coarse row or English paragraph. No generated suggestion has been promoted to a reviewed alignment.

A text-only agent can export the existing content and propose lossless splits using `npm run split:plan`; see **[docs/ai-splitting.md](docs/ai-splitting.md)**. The tool does not call an AI service, translate, modify canonical data or mark proposals reviewed. Another optional source-matching tool produces candidates without inventing or paraphrasing translation; see **[docs/alignment.md](docs/alignment.md)** for limitations and eventual review/import. No visual editing tool is required.

Generated audit reports under `generated/audit/` identify possible mixed-source English paragraphs, coarse or unmatched parallel texts, split Quran verses, empty documents and provenance gaps. They are build artifacts, not tracked source data. A targeted set of evidenced corrections, separated source documents, and retracted/proposed links is recorded explicitly in editorial history. All remaining candidates require review.

## Editing and adding content

Do not directly edit the values in `data/texts/`: their IDs are checked against their contents. Export an editable, readable working copy, edit it, then apply it:

```sh
npm run edit:item -- export dua-kumayl
# Edit generated/edit/dua-kumayl.json in a text editor.
npm run edit:item -- apply generated/edit/dua-kumayl.json

npm run edit:english -- export dua-kumayl
# Edit generated/edit/dua-kumayl.english.json.
npm run edit:english -- apply generated/edit/dua-kumayl.english.json

npm run validate
```

Working copies are ignored build files, not canonical source. Existing row and paragraph IDs must remain stable. Reviewed span hashes cause stale reviews to fail validation; changing reviewed text requires explicit review invalidation. Adding items, English documents, sources and individual text edits are documented in **[docs/editing.md](docs/editing.md)**.

## Website and Capacitor integration

`npm run build:data` generates `generated/web-data/` with a catalog, lazy-loadable item and English JSON, attribution/source records, and a multilingual search index. Rows explicitly classified `audio-reciter` remain in canonical data/SQLite but are omitted from runtime prayer rows and search; each item reports the number excluded. After publication approval, copy that directory into your website build (for example `dist/data/`), configure the website's base path for its hosting location, and use relative/base-aware URLs. Use each English document’s `display_title` for display; `source_metadata` preserves historical titles, which can be wrong. The same `src/normalize.ts` function is used at index build and query time.

When you later create the Capacitor project, set its `webDir` to your website output, build the website, and then run `npx cap sync android`. Track your native Android project as needed, but not the copied generated web assets. The APK can bundle the corpus offline; a website needs a service worker/cache strategy for offline use.

The optional normalized SQLite file is useful for SQL analysis or a future native adapter; it is generated from the same source, not checked into Git. The website does not need SQLite or an Android-specific database plugin.

Read **[docs/data-model.md](docs/data-model.md)** and **[docs/publishing.md](docs/publishing.md)** before building a public app.

## Legacy importer

The shipped `data/` is already imported and curated; do not run the importer over it. `tools/import_legacy.py` is included only to reproduce a **baseline** in a new, empty destination. It requires the original checkout (or an explicit commit SHA) and checks that imported source wording and order round-trip. The baseline will not include the later chapter-number annotations, proposed links, title corrections or any future reviews. Do not substitute it for the delivered canonical data.

```sh
python3 tools/import_legacy.py --source /path/to/original-checkout --destination /tmp/mafatih-baseline
```
