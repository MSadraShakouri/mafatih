# Agent-4 deep cut/pairing review of Agent-3

Exact target: Agent-3 author-ready snapshot `680317220f161994082132d8fb9aeb8dcc4d48e1`; frozen base `ffa01da92fbba25731356e8158c295b3824763f0`.

This pass read all 115 Agent-3 plans, layouts, canonical items and split records at the exact snapshot, and checked each planned cut boundary against the frozen source fields. It also counted paired/unpaired output rows, language moves, piece usage, and bilingual source rows with unequal Arabic/Persian piece counts. It is a structural and linguistic-structure review of cuts/pairings, not a word-by-word semantic, scholarly, human, translation-provenance or rights approval.

## Aggregate findings

- `items`: 115
- `sources`: 3188
- `cuts`: 525
- `pieces`: 3713
- `midword`: 0
- `punctuationFree`: 0
- `pairedOutputs`: 1326
- `unpairedOutputs`: 1061
- `languageMoves`: 154
- `bilingualRows`: 1376
- `unequalPieceRows`: 85
- `instruction`: 185
- `note`: 605
- `recitation`: 2919
- `heading`: 1
- `audio_reciter`: 3
- `quotation`: 0

No cut is mid-word, no cut lacks a punctuation/whitespace boundary, and every planned part is used exactly once. The 154 language moves and 85 unequal-piece bilingual rows are recorded explicitly; they are not automatically defects, but they are the places where a future reviewer should read facing languages.

**These counts are not the review.** They are a screen, not a conclusion. Every one of the 49 flagged items has since been read case by case, with the pairing evidence, the role evidence and the uncertainty recorded per flagged source row in `DEEP-REVIEW-EVIDENCE.md`, and the same fields in machine-readable form in `deep-review-evidence.json`. The flagged set expands to 134 source rows, and the reading changed the picture in three ways: 107 of the 134 rows are explained by a direction or report that legitimately has no counterpart, 78 rows publish the Arabic prayer and its Persian rendering in separate rows, and three rows publish content in the wrong destination slot. The 134 rows partition into five disjoint classes — 65 detached one-to-one, 13 detached multi-recitation, 4 already paired, 34 one-sided and 18 note-only — and the class of every row is recorded per row in `deep-review-evidence.json`.

All 115 `agent-work/agent-4/reviews/*.json` records now have row/language-specific notes with cut offsets, piece counts, kind distribution, part usage, and item-level pairing/move counts. Full machine-readable findings are in `agent-work/agent-4/deep-review-findings.json`.

## Items with language moves or unequal bilingual piece counts

49 of 115 items have at least one flagged structural category. The full per-row list is in the JSON report.

| Item | Language moves | Unequal bilingual rows | Paired outputs | Unpaired outputs |
|---|---:|---:|---:|---:|
| `namaz-hajt-nvh-alyh` | 11 | 7 | 4 | 34 |
| `amal-aamal-jmah-2` | 11 | 4 | 5 | 65 |
| `amal-adab-vzv` | 10 | 10 | 1 | 33 |
| `namaz-adab-mghrb-naflh` | 8 | 3 | 1 | 23 |
| `item-avl-taqybat-mshtrk` | 7 | 6 | 20 | 42 |
| `dua-hsyn-alyh-alslam` | 7 | 1 | 6 | 22 |
| `amal-aamal-msjd-kvfh` | 6 | 5 | 6 | 20 |
| `dua-aafyt` | 5 | 3 | 1 | 13 |
| `dua-svm-daahay-vqt` | 5 | 3 | 3 | 22 |
| `namaz-sayr-adab` | 5 | 3 | 3 | 18 |
| `ziyarat-aymh-bqya-alyhm` | 5 | 3 | 5 | 20 |
| `ziyarat-kyfyt-rza-alyh` | 5 | 3 | 22 | 30 |
| `dua-hshtm-daahay-vardh` | 5 | 0 | 0 | 17 |
| `amal-aamal-stvn-3` | 4 | 3 | 6 | 27 |
| `amal-aamal-mkhsvsh-byst` | 4 | 2 | 5 | 30 |
| `amal-aamal-stvn` | 3 | 3 | 8 | 19 |
| `namaz-adab` | 3 | 3 | 0 | 11 |
| `amal-syghh-astghfar-fzylt` | 3 | 2 | 2 | 15 |
| `namaz-astkharh-zat-alrqaa` | 3 | 2 | 1 | 12 |
| `namaz-vqt-tlva-ghrvb` | 3 | 2 | 5 | 13 |
| `ziyarat-abdalazym-alyh-alslam` | 3 | 1 | 9 | 14 |
| `ziyarat-vrvd-an-qm` | 3 | 1 | 0 | 12 |
| `khavas-rfa-framvshy` | 3 | 0 | 0 | 6 |
| `ziyarat-adab-mkhsvs-hsyn` | 2 | 2 | 6 | 63 |
| `ziyarat-chharm-shbhay-qdr` | 2 | 2 | 6 | 14 |
| `khavas-aqyqh` | 2 | 1 | 0 | 11 |
| `ziyarat-rsvl-sly-allh` | 2 | 1 | 4 | 12 |
| `namaz-mhmat` | 2 | 0 | 0 | 7 |
| `namaz-valdyn-avlad-amvat` | 2 | 0 | 2 | 4 |
| `amal-adab-vqt-khvab` | 1 | 1 | 1 | 9 |
| `amal-akhr-shaban-rmzan` | 1 | 1 | 5 | 8 |
| `dua-ayza-daahay-aafyt` | 1 | 1 | 1 | 4 |
| `khavas-tfal-qran-mjyd` | 1 | 1 | 0 | 5 |
| `namaz-astghash-fatmh-alyha` | 1 | 1 | 2 | 5 |
| `namaz-item-3` | 1 | 1 | 2 | 2 |
| `namaz-khvf-zalm` | 1 | 1 | 1 | 4 |
| `ziyarat-bad-rza-alyh` | 1 | 1 | 12 | 10 |
| `ziyarat-jamea-kabira` | 1 | 1 | 390 | 13 |
| `amal-aaddt-lkl-hvl` | 1 | 0 | 4 | 16 |
| `amal-daahay-rjb` | 1 | 0 | 12 | 8 |
| `dua-saat-12` | 1 | 0 | 2 | 1 |
| `item-abrt-grftn-amvat` | 1 | 0 | 1 | 14 |
| `item-nhm-baz-ahraz` | 1 | 0 | 3 | 7 |
| `item-srfh-drd-shkm` | 1 | 0 | 2 | 6 |
| `khavas-hrz-hsn-asgry` | 1 | 0 | 1 | 1 |
| `monajat-mnajat-hshtm-raz` | 1 | 0 | 56 | 2 |
| `namaz-rfa-asr-skhty` | 1 | 0 | 0 | 2 |
| `ziyarat-byan-anchh-vars` | 1 | 0 | 0 | 12 |
| `ziyarat-item-12` | 1 | 0 | 2 | 3 |
