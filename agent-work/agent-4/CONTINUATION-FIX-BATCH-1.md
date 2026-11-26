# Continuation fix batch 1 — awaiting fresh independent review

Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`. Prospective parent: `846d77720b880a5c0378611487e5fd693430df82`. Main `985f226c4acc1241041b807c2cb4f4fc10d36734` is an ancestor. Agent 5's independently reviewed candidate decisions are at `891d3ed0b2e5ca2e92e3c91976913ad3048605d1`, `agent-work/agent-5/triage/agent-4-preview-decisions-1.md`.

This batch uses the coordinator's authorization for guarded, individually justified fixes. Each candidate was re-previewed on the prospective parent, and the proposed row ID, two insertion offsets, absence of boundary whitespace, and exact left + U+0020 + right content matched the independently reviewed candidate before `merge-rows` was applied. This is not an independent review of the resulting snapshot.

| Item | Prior adjacent rows | New row | Insertions, Unicode code points |
| --- | --- | --- | --- |
| `dua-saat-6` | `r00002-s85aa1380ba79f059` + `r00003` | `m17b844185e93c1acecd3a9a1` | ar 275; fa 231 |
| `dua-saat-8` | `r00002` + `r00003-s3a5c66537d9f28c5` | `ma435951125278b6836230b09` | ar 80; fa 84 |
| `dua-saat-9` | `r00002-s85aa1380ba79f059` + `r00003` | `m6a26264e84c7022fc3e4d0ef` | ar 53; fa 58 |

Each selected language has exactly one recorded U+0020. Source Arabic/Persian asymmetry in `dua-saat-9` is retained. The later `dua-saat-8` child remains separate. Prior live field text was independently checked against current fields or exact alias/source segments: seven fields per item, 21 total; no prior source field was dropped. The guarded operation maintained prior anchors. No historical-link candidate was approved or migrated, no translation was invented, and no line break was restored. `khavas-khvab-dydn-khvd` and its separate role concerns are outside this batch.

Checks before snapshot: tool pin matches; focused merge/revision/row-version tests 32/32; `npm run check` 304 passed, 0 failed, 3 skipped; `npm run validate` passed with 68 unreferenced pooled-text warnings; authored audit 115/115 mechanically complete; row-split and row-version browser tests 56/56 passed on Chromium 153.0.8010.0 (npm-packaged substitute; Playwright-pinned Chromium 156 was not available). Skips: optional generated review page, optional alignment candidates, and approved lam-pair corpus comparison.

All three previous reviews are stale for their changed results. Agent 5 must independently re-review the immutable result snapshot, each grouping, each insertion separately, every historical anchor and the unmodified remainder; no finding is considered closed until that review. Mechanical completeness is not scholarly, translation or rights approval.
