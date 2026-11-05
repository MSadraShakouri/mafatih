# How different line breaks can work

## The short answer

Yes: the foundation can represent different amounts of Arabic, Persian and English without forcing their line breaks to match. The text-only [AI split-planning tool](ai-splitting.md) lets agents propose and validate exact, lossless segments and optional unreviewed links without modifying the original data. It does not itself call an AI or certify meaning. There is not yet an automatic tool to apply physical splits to canonical data.

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
3. The current planner outputs a lossless proposal **without** modifying canonical rows. The regular editor can change or insert rows and paragraphs, but it does **not** automatically make safe split/merge migrations, record a general one-to-many redirect, synchronize another language or preserve all prior review. Row and paragraph IDs must not be reused for unrelated content. Document the old-to-new mapping and changes; keep the previous version in Git.
4. Extend the text-based workflow with a reversible canonical split/merge operation and bookmark migration reports, as planned in [ROADMAP.md](../ROADMAP.md). Until then, agents should not bulk-replace canonical text merely to implement their proposals.
5. Once an exact relationship has genuinely been reviewed, see [alignment.md](alignment.md) for the exact-quote import tool. It can produce spans inside an existing English paragraph. Spans use Unicode code points and hashes so stale reviewed text is detected. A machine proposal must not be labeled expert-reviewed.

**No AI translation of the Arabic text:** see [CONTENT_POLICY.md](../CONTENT_POLICY.md). Alignment and splitting must preserve the original wording and must never generate a missing devotional translation.
