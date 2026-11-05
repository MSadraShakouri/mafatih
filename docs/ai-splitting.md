# Text-only split planning for AI agents

This tool is designed for an AI service or other program to operate; manual line-by-line splitting is not required. It uses local files only, makes **no AI or network calls**, and requires no graphical interface.

**Hard rule:** do not use AI to translate Arabic text, or devotional Arabic through Persian. Split and align existing text only. Explanatory prose may be translated from Persian under [CONTENT_POLICY.md](../CONTENT_POLICY.md), with provenance. Never invent a missing devotional English translation.

## What it does now

1. Exports an item's existing Arabic/Persian rows, linked English paragraphs and exact SHA-256 hashes as JSON.
2. An AI agent proposes boundaries and, optionally, cross-language groups in a separate JSON plan.
3. The validator checks that sources still match their hashes, cut points are ordered and do not divide Unicode graphemes (including Arabic letters with diacritics), English documents are already linked to the item, and all proposed segment references exist.
4. It emits exact text slices and Unicode-code-point spans. Concatenating the pieces for each source reproduces that source exactly—including spaces, punctuation, line breaks and repeated recitations. Group status is `proposed-unreviewed`, never expert-reviewed.

The original rows, paragraphs, links and reviewed alignments are **not changed**. This is useful for generating and checking actual segment proposals; it is **not yet** a physical canonical split/merge command or bookmark-migration tool. The remaining work is in [ROADMAP.md](../ROADMAP.md).

## Commands

```sh
npm ci
npm run split:plan -- export dua-kumayl
# Give generated/split-plans/dua-kumayl.input.json and this file to an AI agent.
# The agent writes a separate plan, for example /tmp/dua-kumayl-plan.json.
npm run split:plan -- validate /tmp/dua-kumayl-plan.json
# Read generated/split-plans/dua-kumayl.validated.json.
```

Both commands accept `--output /path/to/file`. They refuse to write output into canonical `data/`; validation also refuses to overwrite its input plan. Output under `generated/` is ignored by Git. Save useful plans in an appropriate working location and retain backups. The export excludes classified audio-reciter menus rather than treating them as prayer text.

## Plan format for agents

The following is a **template**, not a valid plan until the agent copies real IDs, hashes and exact excerpts from the export. It does not contain a translation.

```json
{
  "format_version": 1,
  "item": "dua-kumayl",
  "sources": [
    {"language": "ar", "row": "row-id", "source_sha256": "copy-64-character-hash", "cut_after": ["exact unique excerpt ending at the desired cut"]},
    {"language": "fa", "row": "row-id", "source_sha256": "copy-64-character-hash", "cut_after": ["exact unique excerpt ending at the desired cut"]},
    {"language": "en", "document": "linked-document-id", "paragraph": "paragraph-id", "source_sha256": "copy-64-character-hash", "cut_after": ["exact unique excerpt ending at the desired cut"]}
  ],
  "groups": [
    {"id": "candidate-one", "ar": [{"row": "row-id", "part": 0}], "fa": [{"row": "row-id", "part": 0}], "en": [{"document": "linked-document-id", "paragraph": "paragraph-id", "part": 0}]},
    {"id": "candidate-two", "ar": [{"row": "row-id", "part": 1}], "fa": [{"row": "row-id", "part": 1}], "en": [{"document": "linked-document-id", "paragraph": "paragraph-id", "part": 1}]}
  ]
}
```

- Include only source rows/paragraphs the agent is working on. `sources` must contain at least one entry; `groups` may be empty. A group must refer to at least two languages.
- `cut_after` excerpts must each occur **exactly once** in that source and be listed in order. The cut is immediately after each excerpt; include trailing spaces in the excerpt when desired. If a phrase repeats, use more context.
- Alternatively use `"cuts": [12, 30]` for strictly increasing **Unicode-code-point** offsets. Do not supply both `cuts` and `cut_after` for the same source. Omit both to leave a source as one whole part. Indices are not JavaScript UTF-16 indexes or UTF-8 byte positions.
- Parts are numbered from zero. Languages may have different numbers of parts. To associate several Arabic/Persian pieces with one unsplit English paragraph, put several AR/FA references and the single English part in a group. Or split the English paragraph into exact parts and refer to different parts in separate groups.
- A group reference requires the corresponding source and part in `sources`. The English document must already have an item relationship, though that relationship can itself be unreviewed. The validator checks structure and exact text preservation—not meaning, translator provenance, quality of line breaks or rights.
- `source_sha256` protects against stale plans. Re-export if text changes. Do not normalize, correct, reword or translate source text inside a split operation.

## Suggested handoff to an AI service

> Read `CONTENT_POLICY.md` and `docs/ai-splitting.md`. Run the export command for the requested item. Propose meaningful boundaries in the existing Arabic, Persian and linked English only; never produce a new translation of Arabic. Prepare JSON using the exported hashes and exact unique anchors, then run the validator and repair any structural errors. Leave uncertain associations out or explicitly unreviewed. Report missing English and rights/source gaps separately. Do not modify `data/` or mark machine proposals as human-reviewed.

This gives an agent a repeatable starting point without a visual editor. For eventual publication, independent textual and rights review is still needed; it need not all be performed by a single person.
