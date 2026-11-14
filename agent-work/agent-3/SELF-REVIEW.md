# Agent-3 self-review — handoff to agent-4

Revised after the read-through and the four pairing fixes. Supersedes every earlier
snapshot including `d10ce632`.

## What changed since d10ce632
Four items had a real defect that my own screening and the earlier review both missed:
`item-avl-taqybat-mshtrk` (r00014, r00018), `namaz-item-3` (r00001),
`ziyarat-bad-rza-alyh` (r00017).

In each, the Persian field holds the complete translation of a single Arabic prayer, and
I had inserted a `fa` cut in the middle of that translation — splitting «خدایا! درود فرست
بر…» after «خدایا!». The Arabic stayed whole, so the orphaned Persian fragment had to be
given its own row. Both languages are now paired in one row.

## Numbers after the fix
- 3,173 / 3,173 original occurrences character-exact (all 115 items)
- 0 mid-word cuts; 0 unpaired parallel ar/fa pieces
- `audit-authored` 115 / 115 complete, 0 findings
- `npm run check` 277 tests, 274 pass, 0 fail; `validate` PASS
- `validate` notes 26 unreferenced pooled text values. Re-application retires old text
  values; 18 were already unreferenced before this change. Not an error.

## Where I am most likely still wrong
1. **Kind labels.** 185 `instruction` rows are judgement calls; rows opening with
   «بدانکه» could be `note`. I judged each individually during the read-through, but the
   boundary is fuzzy and reasonable reviewers will disagree.
2. **The 154 pieces I moved between ar and fa.** Each move was checked against the source,
   but a wrong move is invisible once the text renders in the other language.
3. **`unpaired_languages` rows.** Where piece counts genuinely differ I left them unpaired
   rather than invent a translation. Those are honest but they are also where a reader
   notices ragged facing pages.
4. **Rows I merged by hand vs. left split.** I did not use the new `merge-rows` tool on my
   own items, because the defects I had were cut problems, not adjacency problems. If a
   reviewer thinks two adjacent rows should be one, that is a fresh decision.

## Scope
Structural and linguistic-structure review only. No scholarly, translation-provenance,
rights or human approval is claimed by any of this.
