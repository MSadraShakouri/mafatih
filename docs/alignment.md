# Alignment and review

## What is and is not done

Original AR/FA occurrence IDs remain, and earlier text values are retained in the pool and editorial history; five instruction rows were inserted and 28 audio labels classified during the targeted audit. The old `manual-v1` flag is an imported assertion, not a fresh expert review. Other rows may contain multiple clauses or lines. Some English paragraph locations were detached or separated into new source-specific documents with exact text and previous locations preserved in `editorial-history.json`; none of these changes approves an alignment.

The optional matcher uses the original line-paired AhlulBayt_Treasures source for `tr<number>-…` documents: it looks for a **unique folded Arabic match** in an item and the **exact existing English line** in that document. It also proposes matches for 18 Quran chapter links using explicit verse numbers. No English is generated or paraphrased. A match can still be contextually wrong or a poor translation, and a source can itself contain errors.

For upstream source-row matches, if an Arabic match covers only part of a coarse row, the tool does **not** guess which part of the Persian row belongs to it; those candidates have no Persian span. For Quran verse candidates, a partial Arabic row may be paired with a whole Persian row only when its explicit verse number matches; this still requires review. A reviewer can accept an AR–EN link, but it is not a three-language alignment. Weak overall document matches are flagged. Repeated or ambiguous phrases are deliberately skipped. Candidate count is not coverage or accuracy.

The proposed Quran links and all legacy item–English links are unverified. The targeted audit removed 17 duplicated opening prefixes while retaining the separate opening; verify the edition and boundaries before accepting links. Fourteen numbered Quran verses elsewhere span more than one source row. Candidate generation conservatively skips an apparently split verse rather than aligning its English to the final fragment; this safeguard is not a substitute for verse-boundary review.

## Generate the review files

The upstream source is pinned and its SHA-256 checked. This one-time download is **not committed** and is not needed for normal builds. Inspect its terms and the underlying translations independently.

```sh
curl -fL \
  'https://raw.githubusercontent.com/KazTronics/AhlulBayt_Treasures/a59bd5f8fe078532622a08ea60c19d164fb425cb/duas_data.jsonl' \
  -o /tmp/duas_data.jsonl
npm run suggest:alignments -- --treasures /tmp/duas_data.jsonl
npm run audit
```

`generated/review/alignment-candidates.json` is machine-readable. An AI agent can inspect it and use the text-only [split planning workflow](ai-splitting.md) to propose exact segments and groups; the owner does not need to split lines by hand. Both workflows produce **unreviewed** proposals. The existing optional HTML review artifact is legacy and is not required.

When a relationship has genuinely received the required review, a reviewer or authorized agent can prepare a reviewed import JSON and run:

```sh
npm run alignment:import -- /path/to/reviewed-item.json
npm run validate
```

The importer **merges** reviewed groups with existing groups, rejects conflicting IDs, checks all referenced rows/paragraphs, Unicode spans and hashes, and never silently overwrites earlier reviews. It does not mark a relationship, translation or source license as verified merely because one span was accepted. A model's proposal must not be attributed to a human reviewer or marked expert-reviewed automatically.

`generated/audit/source-match-summary.csv` reports source rows that matched, did not match or were ambiguous. `generated/audit/title-comparison.csv` is a review list, not a list of proven errors. Re-run the commands after editing content; old suggestions can have stale offsets and their import will be rejected.

## Manual alignment beyond suggestions

Use an alignment group with arrays of `ar`, `fa` and `en` spans as described in `data-model.md`; offsets are Unicode code points, end-exclusive. Record a reviewer/date and evidence. Do not split a translation just by word count, position or an assumption that English paragraphs match Arabic rows. If a coarse Arabic/Persian row needs finer three-way alignment, determine the appropriate FA span from the trusted edition or split the source row carefully while keeping occurrence IDs and review invalidation in mind.

### Make a group from exact excerpts

For items without suggestions, `alignment:manual` computes code-point offsets and hashes from **exact, unique excerpts** you have selected after review. It does not compare translations or certify them. Export the item and English document first if needed; keep your draft outside `data/`:

```sh
npm run edit:item -- export dua-kumayl
npm run edit:english -- export dua-kumayl
```

Make a JSON draft such as the following, replacing every placeholder with an actual existing ID, exact excerpt, reviewer, date and evidence. An empty language array is allowed if you are only reviewing a pair; at least two languages must have excerpts. You may include multiple excerpts per language.

```json
{
  "item": "dua-kumayl",
  "id": "g-manual-001",
  "reviewer": "Your name",
  "date": "2026-11-01",
  "evidence": {"note": "Edition and pages used for this review"},
  "ar": [{"row": "r00001", "quote": "exact Arabic excerpt"}],
  "fa": [{"row": "r00001", "quote": "exact Persian excerpt"}],
  "en": [{"document": "dua-kumayl", "paragraph": "p00001", "quote": "exact English excerpt"}]
}
```

```sh
npm run alignment:manual -- /path/to/draft.json --confirm-reviewed --output /tmp/reviewed-group.json
npm run alignment:import -- /tmp/reviewed-group.json
```

Quotes must occur exactly once within their specified row or paragraph; use a longer excerpt if ambiguous. The output is a reviewed-import file, not canonical source until explicitly imported. Review the item–document link and license separately.
