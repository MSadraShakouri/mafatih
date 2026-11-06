# Editing, adding, sources and IDs

## Edit an existing item

```sh
npm run edit:item -- export dua-kumayl
# edit generated/edit/dua-kumayl.json; retain existing row IDs
npm run edit:item -- apply generated/edit/dua-kumayl.json
npm run validate
```

The export is readable text, but is an ignored working copy—not a second canonical dataset. Applying it interns each exact string and changes only the edited item's references. An existing row ID must not be reused for different content. Row deletion needs `--allow-row-deletion`; changing or rearranging text with reviewed alignments needs `--invalidate-reviewed`, which explicitly removes affected reviews. Keep a backup and assess bookmark migrations before deleting or splitting published rows.

For an existing English document:

```sh
npm run edit:english -- export dua-kumayl
# edit generated/edit/dua-kumayl.english.json
npm run edit:english -- apply generated/edit/dua-kumayl.english.json
```

For documents with `display_title`, use that field for the current title; `source_metadata` records the imported historical title. If a punctuation-only correction ever changes a metadata title, its exact previous value and occurrence remain in punctuation history. Display overrides are unreviewed; changing one clears its old evidence reference unless you supply a different reference. Paragraph deletion needs `--allow-paragraph-deletion`. A changed reviewed paragraph needs `--invalidate-reviewed`; affected reviewed groups across items are removed rather than silently left valid. Re-run the matcher after changing text.

For an individual exact text value, an alternative is:

```sh
printf '%s' 'A corrected English title' > /tmp/title.txt
npm run edit:text -- item-title dua-kumayl en /tmp/title.txt
# Also supported: item-row, english-paragraph, english-title and intern.
```

The file is read exactly, including any final newline or BOM. See `npm run edit:text` for arguments. Do not edit the text-pool values directly: validation checks the content hash. For substantive corrections also record source, previous and new text IDs, reason and any inserted/classified row or retracted/proposed link in `data/editorial-history.json`; the ordinary edit commands do not automatically construct that full audit evidence. Audio-reciter labels are retained canonically but excluded from built devotional/search rows only after explicit classification. `show:item` prints resolved content for inspection:

```sh
npm run show:item -- dua-kumayl
```

## Punctuation spacing

The project has an explicitly requested, language-independent **canonical content** correction for horizontal whitespace immediately before closing and sentence punctuation. It covers item titles, tags and Arabic/Persian rows, navigation titles, and English document titles/metadata and paragraphs. It does not replace punctuation characters or edit source claims, licenses, source records or existing historical entries. It preserves letters, diacritics, half-spaces, line breaks, opening brackets/quotes and spaced dashes. Ambiguous quote glyphs that can introduce a quotation or a transliterated name are left alone.

```sh
npm run normalize:punctuation              # dry-run summary; writes nothing
npm run normalize:punctuation -- --check  # nonzero if content changes are needed
npm run normalize:punctuation -- --apply  # apply only after reviewing the summary
```

Each change is copy-on-write and adds the exact old/new text IDs and occurrence address to `punctuation_normalizations` in `data/editorial-history.json`. The old values remain in the pool, so the operation is auditable and reversible; a navigation path records its position at the time of correction. Repeating the command on normalized content is a no-op. The command refuses to change reviewed titles, text, documents or affected alignment spans; it never automatically removes or marks reviews. Review those cases separately rather than forcing the command. Punctuation-only changes can shift older character-offset links within a row, even though item, row and paragraph IDs remain stable. This is not a content, translation or rights review.

## Line breaks

The guard reports new or stale physical separators in active content; it does not change text. Review individual contexts and follow **[line-break review](line-break-review.md)** before changing an exception or editing a field that contains one. `npm run check:line-breaks -- --list` shows any retained locations, reasons and review states. The existing correction and marker-move history preserves the earlier exact values.

## Add an item

Create a **draft outside canonical data** (the ellipses here are placeholders, not actual religious text):

```json
{
  "id": "dua-example",
  "legacy_id": null,
  "title": {"fa": "عنوان", "ar": null, "en": "Example"},
  "category": "dua",
  "tags": [],
  "legacy_alignment": null,
  "rows": [
    {"id": "r00001", "ar": "…", "fa": "…"}
  ]
}
```

```sh
npm run add:item -- /path/to/draft.json
# Optional: --parent 0/2/1 (zero-based TOC child indexes), --featured
```

The command creates the source record, adds its default-order and TOC references, and interns the text. The default TOC placement is a root leaf; edit the curated navigation to move it if needed. New items have no legacy alignment claim. Add a manually checked `review` and sources only when justified.

## Add English

A draft uses literal paragraph text and stable paragraph IDs. `origin_claim` may be null when unknown; a source must still be investigated before publication.

```json
{
  "id": "example-english",
  "source_metadata": {
    "title": "Example", "title_ar": null, "section": null, "chapter": null,
    "translator_claim": null, "origin_claim": null, "method_claim": null, "note_claim": null
  },
  "coverage": "unknown",
  "paragraphs": [{"id": "p00001", "text": "…"}]
}
```

```sh
npm run add:english -- /path/to/draft.json --item dua-example
```

This creates a **proposed, unreviewed** relationship. To review a relationship, add a `review` object with `reviewer` and `date` to that entry in `data/relations.json`; leave its `kind` unchanged to preserve its history. Set a document's coverage and review only after assessing its actual content. Never reuse a retired `(document, paragraph)` ID; the validator reserves historical redirect keys. Any further paragraph migration must preserve an unambiguous destination and historical value without implying that an item link was approved.

## Add a source and verify rights

Original credits are retained as claims, not verified licenses. To create text IDs for a new source record, write each exact text to a file and run:

```sh
npm run edit:text -- intern /path/to/source-name.txt
```

Use the returned ID as `name` in a new `data/sources.json` entry. The schema in `src/schema.ts` supports author, edition, original URL, license status, license URL/evidence, allowed uses, attribution and notes. Intern and attach other text fields the same way. Attach source IDs to `item.sources.ar` / `item.sources.fa`, to a row's `sources` as an override, to `document.sources`, or to a paragraph's `sources` as an override. Explicit empty arrays mean no source is known at that level.

Example structure (replace all placeholders; do not assert permission without evidence):

```json
{
  "sources": {
    "edition-example": {
      "name": "t0123456789abcdef01234567",
      "url": "https://example.com/edition",
      "license": {"status": "unverified", "allowed_uses": []}
    }
  }
}
```

The placeholder text ID above is not real and will fail validation until replaced. Unattached pooled values are reported by `npm run validate`; attach them before committing.
