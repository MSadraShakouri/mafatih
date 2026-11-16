# Retired row ID preview — not a migration

The metadata-only proposal and read-only preview cover the 16 retired IDs in the historical anchor audit across 12 Agent 5 items, targeting snapshot `d0fb57659675c25d0dbbe878a7ec9e9e6b7056d3`. The proposal was reconstructed from the audit's frozen-source intervals against the current mapping; the guarded tool checked reachable history, source lineage and all target slices. The preview passed on history HEAD `6acc8758e6fe2a46419af739c6ae6766df7ebaa5`, and did not write `data/`.

The recorded confirmation hash is evidence of that exact preview only, not authorization. This document's commit and any other HEAD change make it stale; run a new preview before any later authorized migration. A passing preview does not prove outside histories or saved links absent, validate a live-row correction, or constitute independent, scholarly or rights approval.

The 11 reused-ID historical variants documented in `../historical-anchor-audit.json` are excluded and remain unresolved. They require version-aware handling or independent provenance adjudication, not unversioned aliases. All affected items remain held from final release. No migration has been run.
