# Continuation fix batch 4 — awaiting independent review

Frozen base `ffa01da92fbba25731356e8158c295b3824763f0`; prospective parent `f1c8d006bf0859ada8a5c287be0185f425a0c4e2`. These four items are distinct from the five Agent 5 is reviewing at isolated snapshot `7cd3f354190c746b5bd329c0ed29b3224def3928`. The adjacent continuations were identified by Agent 5 in `agent-work/agent-5/triage/agent-4-clarifications-2.md`; its suggestions did not approve editorial spaces.

I read the full source fields and surrounding rows, re-previewed each pair on the prospective parent, checked same-kind adjacency, exact source concatenation and the lack of existing boundary whitespace, then used guarded `merge-rows`. Preserve source asymmetry and attributed claims; these changes do not endorse the claims. No historical-link candidate was approved or migrated.

| Item | Prior adjacent pair | New row | Proposed U+0020 offsets |
| --- | --- | --- | --- |
| `khavas-hrz-mvlana-alqaym` | `r00002-s85aa1380ba79f059` → `r00003` | `m39cba44cec4e5f5f64a58485` | ar 161, fa 138 |
| `khavas-hrz-mvsy-kazm` | `r00003-s9f97c4871ba80c47` → `r00004` | `m4028a6e9b999ddc6746f443d` | ar 237, fa 223 |
| `khavas-mzmt-trashydn-rysh` | `r00001` → `r00002-s16b235f3fb54b1a5` | `m453ab4ac65155a95bd719aad` | fa 158 |
| `namaz-fzylt-ayh-alkrsy` | `r00001-saa3ec3f116259495` → `r00002-s16b235f3fb54b1a5` | `mac0db5da0e26580a4a55a159` | fa 63 |

Offsets count Unicode code points. The `khavas-hrz-mvsy-kazm` source asymmetry remains intact; the independent later report in `khavas-mzmt-trashydn-rysh` stays separate. The `namaz` merge preserves the moved Persian field's Arabic-slot source lineage. Prior distinct live and original/alias-record fields were independently compared byte-exact to current fields or target slices: 10, 21, 4 and 7 respectively. Existing pooled values in all six affected shards were unchanged; each new value is content-hashed.

All prior reviews of these changed items are stale. Agent 5 must re-review the exact new isolated snapshot, each semantic grouping, each of the six proposed spaces separately, every old link, source-language provenance and unchanged remaining material. No finding is marked complete by the preview or author snapshot. Agent review is not scholarly, translation or rights approval.

Checks: tool pin matches; focused merge/revision/row-version tests 32/32; `npm run check` 304 passed, 0 failed, 3 skipped; validation passed with 68 unreferenced pool warnings; authored audit 115/115 mechanically complete; row-split and row-version browser tests 56/56 passed on Chromium 153.0.8010.0 (npm-packaged substitute rather than pinned Chromium 156). Skips: optional generated review page, optional alignment candidates, and approved lam-pair corpus comparison.
