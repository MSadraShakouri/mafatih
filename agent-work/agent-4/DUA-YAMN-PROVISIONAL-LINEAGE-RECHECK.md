# Dua-yamn provisional link evidence — review required

Agent 5 correctly identified that `dua-yamn-thl-hady`'s 26 already-unroutable historical IDs have warnings but their provisional targets are withheld after the continuation fix. The old register binding matches isolated snapshot `e90db4bb4afbb421c5047998c4616187c53d4b45`: `decd2c0197d1b01d30c1d4517f081c6716e6274b4b72cc9a7c7c099b7f4e4455`. The changed item and mapping at `7cd3f354190c746b5bd329c0ed29b3224def3928` bind to `c524c99a266c659824bcf20312683d1fa7c903ad761d2372b335715e14d55441`. The actual register remains unchanged and therefore continues withholding stale targets.

A read-only, in-memory source-lineage recomposition was run from the 26 old provisional candidates through the old and current row-split source runs. All 26 could be uniquely recomposed. Each candidate's recorded original row identity was checked at all six named historical snapshots, and `assertHistoricalAliasLineage` checked each corresponding candidate against the proposed new target: 156/156 recorded occurrences passed. The strict row-version compiler also accepted all 26 candidate text slices in an in-memory copy bound to the current item/mapping. This was a diagnostic only: neither the safety register nor any canonical data, alias, finding or binding was changed. Scope is the six recorded snapshots; unknown or unfetched history remains unknown.

Four physical target mappings change; the other 22 are unchanged. Offsets are Unicode code points in the listed candidate original field and target field:

| Historical ID | Field / source span | Previous target | Recomputed provisional target |
| --- | --- | --- | --- |
| `r00002-s7aaedf514143adf4` | ar [0,118) | `r00002-s5846264aa24491de/ar` @ 0 | `m74d3bd845c73d4c24ff5323b/ar` @ 0 |
| `r00002-s8ecaa140884abf64` | fa [0,156) | `r00002-s5846264aa24491de/fa` @ 0 | `m74d3bd845c73d4c24ff5323b/fa` @ 0 |
| `r00003-s90ce2cbb3805f148` | ar [0,59) | `r00003-s3a5c66537d9f28c5/ar` @ 0 | `m74d3bd845c73d4c24ff5323b/ar` @ 119 |
| `r00003-sa800142d710dfc87` | fa [0,47) | `r00003-s3a5c66537d9f28c5/fa` @ 0 | `m74d3bd845c73d4c24ff5323b/fa` @ 157 |

Metadata-only details for all 26 are in `agent-work/agent-4/proposals/dua-yamn-provisional-lineage-recheck.json`. This is not a proposed installed alias or an approval. Agent 5 must independently review the source-occurrence lineage, all targets, all recorded observations, the unchanged binding scope and remaining history limitations before any separately authorized register update. Even if later accepted for safe display, each candidate remains explicitly provisional and subject to the reader's consent gates. No hash should be refreshed merely to make a test pass.
