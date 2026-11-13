# Arabic/Persian splitting: instructions for the six agents

Read `AGENTS.md`, `CONTENT_POLICY.md`, `docs/line-break-review.md` and this file. The overall checklist, findings and outstanding decisions are in `plan.md`, under **Arabic and Persian: splitting and independent checks**. This workflow is local and text/JSON-only; it does not call an AI service, open a visual editor or apply canonical splits.

**Do not start the full round until the coordinator confirms the common tool version and runs a representative, independently reviewed pilot.** The assignments are a starting estimate, not proof that the workload is equally difficult.

## Scope and absolute rules

- Examine every existing **Arabic and Persian item-row field occurrence** in your assigned items. This includes reciter labels, previously classified rows, historically manually split material and passages that do not need another cut. A stored language label may itself be wrong.
- Do not translate, create text, work on English, normalize Arabic/Persian letters or diacritics, delete repetitions, or move wording between language fields. Do not assume matching row numbers establish a translation alignment. AI must never translate an Arabic prayer, verse or quotation, even through Persian.
- Propose cuts at meaningful sentences, clauses and related boundaries. Use existing manual examples as a style reference, **not** as evidence that their cuts or explanatory tags are correct. The two languages can need different numbers of pieces.
- Preserve all source characters and their order, including spaces, diacritics, Quran markers and repeated passages. No physical newline or paragraph separator may occur inside a resulting text piece. The tool keeps each such separator as a separate, positioned token so that pieces **plus tokens** reconstruct the original exactly.
- Punctuation is the sole permitted text-change proposal. Record it separately as described below; do not silently change a plan's source text. All punctuation proposals remain unapplied and independently reviewable.
- Classify each proposed piece as `recitation`, `note`, `instruction`, `heading`, `quotation`, `audio-reciter`, `other` or `unknown`. Explanatory prose is generally a `note`; a direction is an `instruction`. Review existing classifications too. An empty Arabic side alone is not proof of an explanation. Preserve the distinction between a reciter label, heading, quotation, prayer and explanatory prose. If a field mixes kinds, propose meaningful pieces and roles; if uncertain, use `unknown` and raise an issue.
- Flag Arabic and Persian mixed inside a field for later adjudication. **Do not** add `<ar>` markup, move text to another field or decide the final representation. For example, `dua-iftitah/r00012/ar` contains Persian instruction with an Arabic quotation; `dua-jawshan-sagheer/r00002/ar` also needs mixed-language/role inspection. `item-abvhmzh-smaly/r00220/fa` is a separately documented Arabic passage in an `fa` field. These are starting flags, not an exhaustive search or approval. See `docs/explanation-classifications.md`.
- Treat shared text IDs as separate **occurrences**. Do not change `data/items`, `data/texts`, history, alignments or any other canonical file. Separate agents must never concurrently edit shared shards. Keep proposals and reviews in private files outside `data/`, not in an excluded cache or `/tmp`.

## Common version, assignments and layout

The coordinator saves and distributes one `tool-info.json` and one `assignments.json` for the current corpus. Before work, every agent runs `verify-tool-info` and `verify-partitions`; a changed source file, dependency, Node/ICU/Unicode version, corpus snapshot, item, history or reviewer assignment must be resolved by the coordinator—not silently bypassed. Tool-info pins the code and instructions plus Node and its Unicode/ICU version; it does not itself prove that a test passed. Run the documented tests on the agreed version.

```sh
# From the repository root. Example private work directory next to the checkout.
ROOT=../mafatih-split-preflight
WORK="$ROOT/work"
MANIFEST="$ROOT/assignments.json"
TOOL="$ROOT/tool-info.json"

# Coordinator: generate these only if they do not already exist.
node --import tsx scripts/split-agent.ts tool-info --output "$TOOL"
node --import tsx scripts/split-agent.ts inventory --output "$ROOT/inventory.json"
node --import tsx scripts/split-agent.ts partition --output "$MANIFEST"
node --import tsx scripts/split-agent.ts verify-partitions "$MANIFEST"

# Each agent, before beginning or resuming:
node --import tsx scripts/split-agent.ts verify-tool-info "$TOOL"
node --import tsx scripts/split-agent.ts verify-partitions "$MANIFEST"
```

One whole item belongs to one author group. The reviewer listed for that group is a **different** agent: group 1→2, 2→3, 3→4, 4→5, 5→6, 6→1. The tool checks the stated identifiers and assignment, but cannot prove who operated an account or prevent impersonation. Each group has an estimated weight equal to its Arabic/Persian code points + 100 per field occurrence + 300 per item. Compare actual effort in the pilot and rebalance by producing a new agreed, checked manifest if necessary; no agent may switch silently.

Use this exact layout so the coordinator can audit **all** assigned items:

```text
work/agent-N/inputs/ITEM.json       author export; useful reference
work/agent-N/plans/ITEM.json        author plan, including all source occurrences
work/agent-N/previews/ITEM.json     generated final preview of that plan
work/agent-M/reviews/ITEM.json      different assigned reviewer's decisions
```

All commands print JSON unless `--output` is supplied. An output file must be **new**, outside canonical `data/` (including symlinks), and is created privately without overwriting another file. When revising a finalized proposal, preserve the old plan, preview, review and reports in a uniquely named private archive first; create the revised files in the layout above. A new preview fingerprint requires a fresh independent review. Never discard disagreements or previous versions.

## Author: export, examine, propose

Set the following variables to the **actual** item and author/reviewer from the manifest. For the prepared snapshot, `dua-kumayl` is an example in group 6, reviewed by group 1; confirm against your own manifest rather than assuming that will always remain true.

```sh
ITEM=dua-kumayl
AUTHOR=agent-6
REVIEWER=agent-1
node --import tsx scripts/split-agent.ts export "$ITEM" --output "$WORK/$AUTHOR/inputs/$ITEM.json"
node --import tsx scripts/split-agent.ts template "$ITEM" --author "$AUTHOR" --manifest "$MANIFEST" --output "$WORK/$AUTHOR/plans/$ITEM.json"
# Inspect each source and edit this plan as described below.
node --import tsx scripts/split-agent.ts split "$WORK/$AUTHOR/plans/$ITEM.json" --manifest "$MANIFEST" --output "$WORK/$AUTHOR/previews/$ITEM.json"
node --import tsx scripts/split-agent.ts verify "$WORK/$AUTHOR/previews/$ITEM.json" --manifest "$MANIFEST"
```

The generated template lists every AR/FA occurrence in original row order. It starts with `checked: false`, no proposed cuts and `unknown` kinds; **this is not completed work**. Mark an occurrence `checked: true` only after actually inspecting it and its context. An empty `cuts` array is an explicit no-cut proposal. Work in manageable chunks for large items but keep the **complete single-item plan** and all occurrence entries intact. For example, this prints 40 rows starting at zero-based row 80 without altering the file:

```sh
node -e 'const f=require(process.argv[1]); console.log(JSON.stringify(f.rows.slice(80,120),null,2))' "$WORK/$AUTHOR/inputs/$ITEM.json"
```

Include neighboring rows when judging a boundary. Exported `historical_line_break_corrections` contain recorded older text, break offsets, references and evidence; `historical_marker_moves` identify recorded moves to or from neighboring rows. Corresponding `historical-line-break` and `historical-marker-move` issues are inserted automatically and cannot be silently removed from a valid plan. Inspect and review them, but do not restore old separators or move markers merely because history mentions them. Earlier AI-assisted joins are not evidence that the old formatting was accidental or intentional.

For each source, specify either strictly increasing zero-based Unicode **code-point** `cuts`, or a `cut_after` array of exact, unique excerpts ending at the desired boundaries. If using `cut_after`, delete the template's `cuts` key; never provide both. Repeated excerpts require more context. A cut must be inside the source, on a grapheme boundary, and outside a protected `﴿…﴾` marker. Code-point offsets are not JavaScript UTF-16 indexes or UTF-8 byte offsets.

The tool adds boundaries for all physical separator kinds. List one `kinds` entry for each resulting **text** piece, not for the separate separator tokens. Review whitespace-only pieces and separator-only or empty sources instead of discarding them. The compiler shows an error if the piece count and kinds disagree.

A minimal illustrative shape follows. It omits other required occurrences, so it is **not** a valid complete plan; use the generated template. The placeholder values are not real IDs or hashes.

```json
{
  "format_version": 1,
  "protocol": "ar-fa-split-preflight-v1",
  "item": "example-item",
  "item_sha256": "copy-the-item-fingerprint-from-the-template",
  "author": "agent-1",
  "sources": [
    {"row": "example-row", "language": "ar", "source_sha256": "copy-the-source-hash", "checked": true, "cuts": [], "kinds": ["recitation"]},
    {"row": "example-row", "language": "fa", "source_sha256": "copy-the-source-hash", "checked": true, "cuts": [], "kinds": ["recitation"]}
  ],
  "punctuation_suggestions": [],
  "issues": []
}
```

For a newly discovered concern, add an `issues` entry with `row`, `language`, `kind` (`mixed-language`, `ambiguous-boundary`, `uncertain-classification` or `other`) and a clear `note`. Keep the automatically generated historical issue entries too. Record suspected mixed-language cases even if you do not know how to represent them.

A punctuation entry has `row`, `language`, `source_sha256`, the complete proposed `replacement` for that source, and a `reason`. Use at most one entry per occurrence. The compiler checks that only Unicode punctuation differs and that protected Quran markers remain intact; it emits exact code-point offsets and before/after punctuation edits. It does **not** apply the replacement. The reviewer checks each suggestion separately, including whether it should be rejected. If anything other than punctuation must change, flag it for a separate decision.

## Different agent: independent review

The assigned reviewer—not the author—reads the source, its context, the plan, the generated preview and historical hints. The reviewer checks **every** split and no-split decision, all kinds (including old labels), mixed-language flags and punctuation proposals. A structural pass cannot tell whether a cut, explanation tag, language or pairing is semantically correct.

```sh
# The assigned reviewer creates a separate decision template.
node --import tsx scripts/split-agent.ts review-template "$WORK/$AUTHOR/previews/$ITEM.json" --reviewer "$REVIEWER" --manifest "$MANIFEST" --output "$WORK/$REVIEWER/reviews/$ITEM.json"
# Reviewer edits the new review file, not the author's plan or preview.
node --import tsx scripts/split-agent.ts verify-review "$WORK/$AUTHOR/previews/$ITEM.json" "$WORK/$REVIEWER/reviews/$ITEM.json" --manifest "$MANIFEST"
```

For every source, set both `split` and `kind` to `accept`, `revise` or `uncertain` after independently checking them; `pending` means not yet checked. Explain every `revise` or `uncertain` finding in `note`, including the relevant part/offset and suggested action. Independently choose a `decision` for each punctuation suggestion (`accept`, `reject`, `revise`, `uncertain` or `pending`); rejection, revision and uncertainty need a note. For each issue, choose `addressed` or `escalate` and explain why; leave it `pending` if not yet checked. An actual mixed-language representation question is **escalated**, not treated as settled. The author and reviewer retain disagreements for adjudication.

The reviewer verifies source references/hashes, occurrence coverage and ordering; exact slices and full reconstruction; Unicode and marker boundaries; explicit separator tokens; roles; punctuation logs; and the preview fingerprint. The review file covers every source, issue and punctuation suggestion and is tied to that exact preview. Fingerprints of whole JSON artifacts are SHA-256 of their compact `JSON.stringify` representation in stored property order, not the pretty-printed file bytes; text hashes are SHA-256 of exact UTF-8 text. Checked flags, accepted classifications and reviewer identity are **assertions**, not machine-verified meaning.

## Coordinator: coverage and adjudication

```sh
# Reports missing, invalid, incomplete, unresolved and complete agent records.
# Exits nonzero while anything remains missing or unresolved.
node --import tsx scripts/split-agent.ts audit-batch "$MANIFEST" --work-dir "$WORK"
```

The batch audit checks that each assigned item has its author's plan and matching generated preview plus its assigned different reviewer's complete review; it recompiles the plan, verifies the preview and checks review coverage. It also flags unexpected files in live `plans`, `previews` and `reviews` directories; it does not scan `inputs` or archived versions. It cannot establish that an agent really read a passage or that a decision is correct. `agent-review-records-complete` is not human, scholarly, religious, translation, alignment or rights approval.

Pilot representative items first: include long and already split material, existing explanations and instructions, mixed/mislabeled fields, shared/repeated text and documented historical line-break/marker cases. Resolve examples and adjust the common tools/instructions before bulk work. After the two agent passes, adjudicate disagreements and unresolved cases, retain every decision, and rerun the mechanical and batch checks. Do not publish or mark rights, translations or alignments reviewed without appropriate evidence and authorized review.

**There is no canonical split/apply or bookmark/ID migration command in this workflow.** Per-piece proposed roles do not automatically fit the current row-level kind. A separate reversible, copy-on-write migration design and tests must handle shared text, ordered per-language pieces, old-to-new occurrence IDs, bookmarks, links, source references, prior reviews, history and rollback before canonical application is even considered. The general item editor is not that migration.
