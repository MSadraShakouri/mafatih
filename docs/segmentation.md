# How different line breaks can work

## The short answer

Yes: the foundation can represent different amounts of Arabic, Persian and English without forcing their line breaks to match. The text-only [AI split-planning tool](ai-splitting.md) proposes exact, lossless segments without modifying data. For the current Arabic/Persian round, the separate [six-agent workflow](split-agent-instructions.md) can apply a checked physical per-item split while preserving exact text and reversible old-row mappings. Neither tool calls an AI or certifies meaning. General row merging, punctuation changes and migration of human-reviewed spans remain separate work.

An item currently stores ordered Arabic/Persian rows. A row can contain one or both languages; a single row may contain several sentences. English is stored separately as ordered document paragraphs. An alignment group points to any number of exact spans in those rows and paragraphs. A span is part or all of one existing text value.

For example, imagine these are placeholders, not religious text:

```text
Arabic:    [row A: part 1]    [row B: part 2]
Persian:   [row A: part 1]    [row C: part 2]
English:   [one paragraph: first sentence. second sentence.]
```

After the meaning is checked, two groups can say: a text-based AI agent can propose these, but an automatic proposal is not a reviewed alignment.

```text
Group 1: Arabic A  ↔ Persian A ↔ first sentence of the English paragraph
Group 2: Arabic B  ↔ Persian C ↔ second sentence of the SAME English paragraph
```

The English paragraph does not have to be copied or physically split to do this. Alternatively, one group can contain both Arabic rows, both Persian rows and the whole English paragraph; that is a many-to-one relationship. The structure allows AR–FA or AR–EN groups when the third language is missing. Multiple spans in a language are supported. A group must not be created just because pieces occupy the same visual position.

This capability is tested with synthetic placeholder text in `tests/segmentation.test.ts`. The test does not translate any devotional text or add a reviewed group to the real corpus.

## When you want to split the actual data

1. Distinguish a website's display wrapping from a meaningful content boundary. Wrapping needs no text change or database split.
2. Give an AI agent the instructions in [ai-splitting.md](ai-splitting.md). The tool exports existing text and checks its proposed cuts; the agent can work in batches without hand-splitting every line. It emits exact spans, not new translations.
3. The general planner outputs a lossless proposal **without** modifying canonical rows. For the current six-agent round, `scripts/six-agent.ts` can apply a checked per-item plan and explicit row layout, retain original source references in `data/row-splits/`, and redirect old reading URLs. It refuses existing human-reviewed spans, physical line separators, punctuation edits and unsupported prior migrations rather than silently damaging them.
4. Keep item IDs and previous values; personal bookmarks are item-level. The regular item editor is not the special split migration. General one-to-many/many-to-one merging, reviewed-span migration and other clients that do not follow the recorded row redirects still require separate work.
5. Once an exact relationship has genuinely been reviewed, see [alignment.md](alignment.md) for the exact-quote import tool. It can produce spans inside an existing English paragraph. Spans use Unicode code points and hashes so stale reviewed text is detected. A machine proposal must not be labeled expert-reviewed.

**No AI translation of the Arabic text:** see [CONTENT_POLICY.md](../CONTENT_POLICY.md). Alignment and splitting must preserve the original wording and must never generate a missing devotional translation.
