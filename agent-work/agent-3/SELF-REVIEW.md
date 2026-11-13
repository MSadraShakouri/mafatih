# Agent 3 self-review before handing work to agent 4

This note has no authority. It is my own check of the 115 items I authored, written so the
independent reviewer spends their time on real problems instead of re-deriving basics.
Agent assertions are not human, scholarly or rights approval.

## What I changed during this self-review

I found and fixed one real defect class in my own output: **14 orphan pieces of 1-3 characters**
that consisted only of a repeated separator (`!!`, `..`) or a fragment word. My engine had been
treating the *second* character of a doubled mark as a cut boundary, so a reader saw a row
containing just `!` or `..`. Eleven source fields across 10 items were repaired by removing the
offending cut so the separator stays with the sentence it belongs to, then rebuilding the layout
output for the affected rows. Two further spots (`ziyarat-chharm-shbhay-qdr/r00001` ending on the
word «ابن», `ziyarat-fzylt-rza-alyh/r00003` opening with «پذیرفته؟!») come from the *source*
itself splitting a sentence across original rows; I merged the trailing fragment into its
neighbouring piece rather than leaving it as its own row.

One tiny row remains and is correct: `dua-hsyn-alyh-alslam/r00007` contains only «.» because that
is the entire original source field, not something my split produced.

## Numbers the reviewer can check

- 115 items, 2,395 rows (was 2,409 before the merge; 14 orphan rows removed).
- 1,797 original occurrences; **all 1,797 preserve their exact character content**. A row that
  moved text between `ar` and `fa` still reconstructs character-for-character.
- Kinds: recitation 1601, note 605, instruction 185, audio-reciter 3, heading 1.
- 529 internal cuts: 82.8% after sentence punctuation, 17.2% after a clause mark (، ؛ :),
  **0 mid-word, 0 with no punctuation at all**.
- The 3 `audio-reciter` rows inherited from the base corpus are preserved as `audio-reciter`;
  none were downgraded to a kind that would put a reciter label back into reader content.
- `npm run check` 263 tests / 260 pass / 0 fail / 3 skipped; `npm run validate` PASS;
  `check:line-breaks` PASS; `audit-authored` complete 115/115 with 0 findings.

## Where to look hardest

1. **`instruction` labels (185 rows).** The visible label is «راهنما». I only used it when the
   opening clause carries an explicit imperative from a closed list, everything else is `note`
   («توضیح»). Rows that open with «بدانکه» are labelled `instruction`; that is a judgement call
   and the most likely place to disagree with me.
2. **Pairs where the Arabic continues but the Persian completes** (19 of 1,431 bilingual pieces).
   Most are the translation ending its sentence where the Arabic uses a comma. Twelve are
   legitimate clause breaks; about 7 have the Arabic break with no punctuation at all, which I
   verified against the source is how the source is written (fragment rows like «وَ إِلىٰ جَدِّكُمْ»).
3. **154 pieces I moved between `ar` and `fa`** because the source had the wrong language in the
   field. Each is character-exact, but you may disagree with an individual language call.
4. **Partial pairing** in rows where the Arabic and Persian piece counts differ. Per the protocol
   I paired only where meaning and count warrant it and left the rest single-language rather than
   inventing a translation. I did not force equal counts.

## Not done

I did not read all 115 items word by word. Structural, character and boundary checks are complete
and were run on every item; the kind judgements and my splitting choices deserve independent
reading. No device, emulator or rights verification is implied by anything above.
