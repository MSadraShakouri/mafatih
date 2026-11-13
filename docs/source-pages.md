# Source-page metadata

## What was corrected

`data/navigation.json` stores page numbers for the compared edition of **مفاتیح الجنان جدید (نگارش آسان)**, not a universal page reference. The matching-title [Ghaemiyeh HTML](https://download.ghbook.ir/downloads.php?id=13714&file=13714-f-13970229-mafati-ol-janan-asan.htm&packagename=ir.ghbook.new-reader&platform=new-site) has trailing `ص: n` page markers: a marker follows the page it numbers. The front matter ends at 20 and the main text starts again at 1. The imported fields generally recorded the *preceding* marker rather than the page containing a heading; the semantics of the unavailable original parser are not established.

A machine-assisted comparison aligned all 741 source headings and levels, in order, with the original TOC. For the 738 paginated headings it used the next footer after the heading for its start, and, where applicable, the footer following the last substantive paragraph before the next heading for each previously recorded end. Standalone `صوت`, `***` and page markers were not counted as substantive paragraphs. The 82 previously missing grouping ends are **inferred extents of the existing TOC subtrees**: each last-subtree-paragraph footer agreed with the maximum recorded descendant end. They are not a scholarly judgment about the scope of a religious work.

A few independent spot checks support the footer interpretation: printed [main page 1](https://download.ghbook.ir/downloads/BookScanned/13800/13714/1_1_1.jpg), [main page 2](https://download.ghbook.ir/downloads/BookScanned/13800/13714/1_1_2.jpg) and the [reader view containing printed page 224](https://ghaemiyeh.com/ebook-reader/346065?page=223&section=1) (the reader URL uses `page=223`). They do not constitute a manual review of every page or item.

| TOC entry | Previous values | Current values |
| --- | --- | --- |
| Virtue of Surah Yasin | 20–1 | main 1–2 |
| Surah Yasin | 1–8 | main 2–9 |
| Front-matter contents | 0–15 | front matter 1–16 |
| Introduction | 16–19 | front matter 17–20 |
| Quran grouping | 20, no end | main 1–34, subtree extent |
| Main book grouping | 34, no end | main 35–1442, subtree extent |

The result has 774 TOC nodes, 738 known starts and 736 known ends. The 33 added nodes did not match headings in the compared HTML, so their starts and ends are unknown. The mixed-series root, unnumbered bibliographic metadata and unpaginated «درباره مركز» also have unknown starts. Two non-item headings, «هفتم:زیارت عاشورا» and «هشتم:زیارت اربعین», have known starts but no independently established ends. An absent end and an explicit `null` end both mean unknown; their original distinction is retained. The four added 0–0 ranges and the unnumbered metadata's 0–0 range become explicit nulls, not page 1.

**Do not blindly add one to legacy numbers.** The compared HTML omits the footer `ص: 1398`, although [reader page 1398](https://ghaemiyeh.com/ebook-reader/346065?page=1398&section=1) and page-1398 footnote anchors exist. No audited heading or end witness depends on assigning a page inside that missing-marker gap. The second Eid al-Fitr sermon spans main pages 1396–1403.

## Model and history

`source_page` is a positive page number or `null`; `source_page_end` is optional, a positive page number or `null`; `source_page_series` is `front-matter`, `main` or `null`. A numeric start requires a series, a numeric end requires a start, and an end cannot precede its start. The page fields are edition-specific metadata; the web reader currently does not display or use them. Nothing here changes titles, text, IDs, ordering, review flags or rights claims.

The `heading-trailing-footers-v1` batch in `data/editorial-history.json` records each historical TOC path, title ID, item, level, exact prior and replacement values, and the relevant marker observations. Optional-key presence is part of the record, so the prior navigation can be reconstructed, including the previously reversed range and missing versus explicit ends. Paths describe positions **at the time of the edit**, not permanent IDs. The source hash `2b5222eb7c85b744c06b33faa53236e07db34be49cff246eb38b06627e5fe178` identifies the specific UTF-8 HTML response retrieved via a Google Translate proxy, including its URL rewriting; it is not a claim about the publisher's unmodified bytes. The source itself is not redistributed here.

The generated catalog contains the current page fields and series. The default web build does not expose editorial page history. For local analysis only, `buildData` can emit a separate `navigation-page-history.json` with the exact batches and their evidence when `includePageHistory: true` and an explicit `write` sink are provided; do not stage or publish that analysis output inadvertently. The generated SQLite database has `navigation_page_batch` and `navigation_page_correction` tables, plus `source_page_series` and `source_page_end_present` on `navigation_node`. Its `PRAGMA user_version` is 3 (version 3 adds split-row identities and mappings). SQLite is regenerated, not migrated in place; the presence bits distinguish absent and explicit null fields.

The one-time legacy importer still checks that the original navigation round-trips. Because raw legacy pages have no verified numbering series and can be zero or reversed, it now puts them in a `legacy-unmapped-v1` history batch and writes unknown current page values. Re-import is not a substitute for the curated corpus or this source-specific comparison.

## Independent recheck

If you have the exact retrieved HTML snapshot matching the recorded hash, run:

```sh
python3 tools/verify_source_pages.py /path/to/retrieved-source.html
node --import tsx --test tests/source-pages.test.ts
```

The first command is read-only and checks the hash, matched heading titles and levels, trailing markers, and inferred subtree ends. It refuses a missing-marker gap when a heading or last-paragraph witness would depend on that gap. A publisher response or a later proxy response can have different bytes even if it looks similar; investigate and re-audit rather than treating a hash mismatch as verification. The second command checks all recorded observations against pinned fingerprints, reconstructs the pre-correction TOC from history, and checks unknowns, validation, catalog export, SQLite and the legacy importer without needing network access.

These are indexing and consistency checks, not expert verification of the text, page interpretation, translation, provenance or permission to redistribute the source. Rights and content review remain outstanding.
