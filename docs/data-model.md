# Data model

## Source of truth

The canonical data is `data/`, validated against `src/schema.ts`. There is no hand-maintained catalog, row count, search index or generated database in source control. `data/relations.json` and `data/navigation.json` contain *curated relationships and order*, which cannot safely be inferred from a category field. The original default order and original TOC order differ, so both represent distinct source facts. Featured membership and order appear only in `navigation.json`.

All content-like strings are interned by exact UTF-8 value in `data/texts/<first-two-hash-characters>.json`. IDs are `t` plus the first 24 hex digits of SHA-256. The builder checks both hash and shard and refuses collisions. There is one empty-string entry because the old English metadata distinguished an empty string from null. Strings are not normalized for storage. Occurrences may share a text ID while retaining independent document/row IDs, sources and reviews. A change to one occurrence uses copy-on-write: it cannot silently change every other occurrence.

A literal reference is not a duplicated text. Repeated recitations and identical phrases can still appear multiple times as *occurrences* in their original order; this is necessary to represent the content faithfully. Do not remove an occurrence just because its text ID appears elsewhere.

The targeted audit retired 37 English paragraph locations after preserving their exact text in another document. Their old `(document, paragraph)` keys are reserved, not recycled. `data/editorial-history.json` maps each to its preserved destination and historical text ID; `resolveEnglishParagraph` follows that mapping in TypeScript. The web-data build emits `paragraph-redirects.json` and `paragraph_redirects` in each affected English document; SQLite exposes the same mapping as the `paragraph_redirect` view. Clients must explicitly follow these redirects for old bookmarks; there is no website/router yet. A redirect preserves a paragraph reference, **not** an incorrect item–document link or an approval of a proposed link.

## Items, rows, English documents and links

- `items/<slug>.json`: a stable slug from its filename; optional legacy ID; title references, category, tag references, ordered rows, optional source IDs and reviews. Whole-surah items can carry a structured Quran chapter number. A row has a stable ID and optional Arabic and Persian text references. Both empty is invalid. An empty Arabic field does not necessarily mean a note. `kind` can be supplied after classification.
- `english/<id>.json`: stable document ID, original metadata/claims, optional editorial display-title override, coverage status and ordered paragraph occurrences. The override, when present, is the display title; `source_metadata` preserves the historical title and is not a second current value. A paragraph has its own stable ID even when its text is shared. Document-level sources can be overridden at paragraph level.
- `relations.json`: the item–document relationship exists in one place. `legacy-primary`, `legacy-primary-only`, `legacy-coverage`, `proposed-quran` and `proposed` describe how a link arose; a separate reviewer/date marks a link as reviewed without erasing its history. A document may link to more than one item and an item may link to more than one document.
- `editorial-history.json`: auditable corrections, row insertions/classifications, paragraph detachments, source-document splits, retracted and proposed links, and supporting evidence. Previous and replacement values are pooled text references. Current item/row/document values remain authoritative. The metadata evidence also records the chapter-number cross-check.
- `claims.json`: preserved statements from the old provenance ledger; a claim is not proof of accuracy or permission. Old document-level claims may cover mixed-source paragraphs. The original per-paragraph claims and source notes are retained where present.
- `sources.json`: structured source, edition, attribution, license, evidence and allowed-use records. Six comparison-source records exist, all `unverified`; a match to a reference is not proof of the corpus's original source or a permission. Source IDs can be assigned separately to Arabic and Persian at item or row level, or to English at document or paragraph level.

Do not assume `coverage: "unknown"` means a body translation exists. Do not align or display an English introduction as if it translated a prayer. The old `manual-v1` flag is retained in `legacy_alignment`, but means only that the previous dataset asserted manual AR/FA alignment.

## Fine and coarse alignment

`data/alignments/<item>.json` holds reviewed groups with arrays of AR, FA and EN spans. Each Arabic/Persian span names a row ID; each English span names a document and paragraph ID. Spans use zero-based, half-open **Unicode code-point** offsets, not byte offsets or JavaScript UTF-16 code units. A group can contain multiple spans per language and can represent 1:1, 1:N, N:1, N:M, or an AR–EN link without an asserted FA sub-span.

A SHA-256 fingerprint records the exact reviewed span. Validation rejects a stale span if the source changes. Row/paragraph IDs are stable; if a row is split, retire IDs deliberately and decide how to migrate bookmarks and reviews. Never reuse an old ID for unrelated content. Reviews are human assertions and must identify a reviewer and date; automatic matching is never labelled reviewed.

## Artifacts and storage

The TypeScript build generates resolved, lazy-loadable JSON and a normalized search artifact. The original text remains untouched; the same `normalizeSearch` function handles indexing and queries. The version 3 search manifest contains TOC records and paths to generated Arabic/Persian row-field shards; search normalization is tagged `nfkd-search-v2`. Within each section, results rank by matched-word count, featured status, Arabic, direct matches, and source order, in that order. Join controls do not split a search word. A constrained ordinary-space fallback supports some joined/spaced spellings without joining arbitrary word fragments, but it is still a heuristic and can conflate different phrases. See [search behavior and tests](search-behavior.md). English search is not implemented yet.

`npm run build:sqlite` generates a normalized SQLite database with foreign keys and editorial-history tables. Its `text_value` table stores each exact text once; row and paragraph occurrences reference it. It includes all canonical rows, including 28 currently classified `kind = 'audio-reciter'` rows. By contrast the development web-data builder omits those rows from item content and search and records `excluded_audio_rows` on each item. It has no FTS promise: the website search index is a separate generated JSON artifact. Use it only if a future client chooses an appropriate SQLite adapter.

Example SQL after building the database:

```sql
SELECT r.row_id, ar.value AS arabic, fa.value AS persian
FROM item_row AS r
LEFT JOIN text_value AS ar ON ar.id = r.ar_text_id
LEFT JOIN text_value AS fa ON fa.id = r.fa_text_id
WHERE r.item_id = 'dua-kumayl'
ORDER BY r.position;
```
