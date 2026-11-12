# Character and field audit

This is an occurrence audit, not a correction list or a language, religious,
translation or rights review. It describes the corpus based on `c4f9df7c`;
the subsequent selected-explanation classification changes row kinds only,
not text, references or row order. No corpus wording was changed for this audit.

## Scope and method

The corpus has 686 items and 11,820 canonical rows. Excluding the 28 rows
already marked `audio-reciter` leaves 11,792 runtime rows; 9,449 have nonempty
Arabic-designated (`ar`) text. For each runtime row, the exact stored `ar`
text was scanned for the code points below, without normalizing it. Occurrences
are counted per row occurrence, including repeated uses of a pooled text;
rows and items count presence at least once. Arabic-designated item-title
fields were checked separately.

| Character | Code point | Occurrences in `ar` rows | Rows | Items |
|---|---:|---:|---:|---:|
| ک (Persian kaf) | U+06A9 | 4,365 | 1,717 | 341 |
| ك (Arabic kaf) | U+0643 | 16,170 | 4,578 | 460 |
| ی (Persian yeh) | U+06CC | 13,354 | 3,226 | 395 |
| ي (Arabic yeh) | U+064A | 31,475 | 5,510 | 490 |
| ى (alef maksura) | U+0649 | 8,868 | 3,339 | 435 |
| پ | U+067E | 373 | 260 | 145 |
| چ | U+0686 | 201 | 156 | 112 |
| ژ | U+0698 | 2 | 2 | 2 |
| گ | U+06AF | 781 | 433 | 186 |

Persian ک occurs in two Arabic-designated item titles and Persian ی in six.
At least one of پ، چ، ژ، گ occurs in 489 `ar` rows across 208 items; 447 of
those rows also contain Persian ک or ی. These figures overlap and do **not**
prove that a row is wholly Persian or that a character is wrong. Search
already folds the kaf and yeh variants for matching; stored and displayed
characters remain unchanged.

## Field and classification cautions

There are 2,343 runtime rows in 586 items with nonempty Persian-designated
text and no Arabic-designated text. At the baseline, 2,338 had no explicit
kind; the remaining five were instructions. These rows include introductions,
explanations, translations, titles and reciter labels, so the absence of `ar`
cannot identify explanations automatically. The separately documented manual
pass classifies only 91 individually selected rows; many others remain open.

Some Persian prose is stored in `ar`, including `dua-jawshan-kabir/r00010`,
`dua-iftitah/r00012` and `ziyarat-warith/r00148`. Mixed explanatory prose and
prayer also occur in `dua-iftitah/r00003`, `r00007` and `r00024`. Conversely,
`item-abvhmzh-smaly/r00220` contains an Arabic prayer in `fa`, followed by a
Persian translation at `r00221`. `hadith-kisa/r00006` is a reciter label, and
`dua-ahd/r00053` is an Arabic prayer. These examples are reasons for
contextual review, not instructions to split, rewrite or reassign fields.
