# Agent-5 clarification and read-only preview batch 1

Author snapshot `c9fa191acade1f72ab36e05f39ea931d4cb9cb5d`; previews run on branch HEAD `8969178825705ad4df9655840e7848549e415a5e` with main tool fix `2163b5e7aa43fe9cb72ac681e6a62dc0f4936fe4` merged. These four records are from the 46 record-level clarification dispositions, not four completed fixes. Nothing below was applied; all questions are open. A preview shows the tool accepts the operation and its anchor guards, not that the semantic grouping or editorial spaces have been independently accepted.

## Adjacent continuations

For each row, both exact and the listed spacing mode passed `merge-preview`. The IDs shown are the tool's proposed merged IDs, not existing published rows. Offsets are zero-based Unicode code points in the proposed merged field, where the inserted U+0020 would occur. The exact previews insert nothing and, in every listed nonempty language, concatenate two source fields with no whitespace at their boundary. Do not interpret a successful exact preview as evidence that a word boundary should lack a space. Spacing remains an editorial insertion requiring an independent decision for **each** language.

| Item | Adjacent left + right | Exact proposed ID | Spacing proposed ID and offsets | Specific question for Agent 5 |
| --- | --- | --- | --- | --- |
| `dua-saat-6` | `r00002-s85aa1380ba79f059` + `r00003` | `m6d3c12cfba2b531c2668dac0` | `m17b844185e93c1acecd3a9a1`; ar 275, fa 231 (`both-space`) | Do the Arabic and Persian completions form one coherent paired request, and do you independently accept a single proposed space at **each** of these two boundaries? |
| `dua-saat-8` | `r00002` + `r00003-s3a5c66537d9f28c5` | `m73d281babc1699060aa767cc` | `ma435951125278b6836230b09`; ar 80, fa 84 (`both-space`) | Does grouping the interrupted vocative preserve the paired meanings, and do you independently accept each of the two proposed spaces? The following r00003 child is not part of this proposed merge. |
| `dua-saat-9` | `r00002-s85aa1380ba79f059` + `r00003` | `m5c5b84810047f073de650382` | `m6a26264e84c7022fc3e4d0ef`; ar 53, fa 58 (`both-space`) | Arabic completes the honorific in the right row while Persian gives it in the left. Does the whole bilingual result remain coherent without implying a missing translation, and do you independently accept each proposed space? |
| `khavas-khvab-dydn-khvd` | `r00001-sa3fbdb6fa458720f` + `r00002` | `ma8b5f92f2355839a572e3b3c` | `m5cf533cd9573fd0434e142dd`; fa 83 (`fa-space`) | Does the right-hand instruction complete the same direction, and do you independently accept the proposed Persian space? There is no Arabic field in either row. |

The tool preview compiles both candidates and verifies current prior anchors, source order, adjacent rows and matching kinds. It does not write the layout, row-splits, items or pooled text. Any future application must be re-previewed against the then-current data and followed by a new authored snapshot and fresh independent review; the spaces are not approved by the previews or by this report.

## Already-retired historical IDs: separate proposals

Three one-alias, metadata-only bundles were prepared from the historical source records and `historical-link-proposals.json`, and each passed `alias-preview` at the HEAD above. Their original rows occur at `262f027d36f0c1d2286ad36f584c529aa14fc2ff`. Paths below contain existing pooled IDs and spans, not source passages. The target snapshot is `c9fa191a`. The preview checks the source-occurrence lineage in history reachable from that base through the tested HEAD; it does not rule out meaning conflicts in other history.

| Proposal file under `agent-work/agent-4/proposals/` | Retired ID | Proposed mapping | Preview |
| --- | --- | --- | --- |
| `retired-amal-aamal-hrm-hsyn-r00014-sf3196e3d1d760387.json` | `r00014-sf3196e3d1d760387` | fa [0,200) → `r00014/fa` at 201 | passed, one alias |
| `retired-amal-slvat-shaban-r00004-sa44b8f05e3e4e602.json` | `r00004-sa44b8f05e3e4e602` | ar [0,344) → `mfc62a9fa6de76a4527937b07/ar` at 0 | passed, one alias |
| `retired-amal-slvat-shaban-r00005-sbf827ad20eeda70b.json` | `r00005-sbf827ad20eeda70b` | fa [0,169) → `r00005-s26cb4356b4155a1c/fa` at 7 | passed, one alias |

Passing means the preview accepted these specific proposals at the tested HEAD, not that migration was applied or authorized. A new commit changes HEAD and invalidates the preview confirmation hash; rerun preview before any future authorized migration. A changed row-split record would need a fresh independent review. These retired links are not substitutes for resolving the prospective live-row role changes, reused `item-asharh-6` ID, mismatched roles or nonadjacent pairings described in `MAIN-MIGRATION-TEST.md`.
