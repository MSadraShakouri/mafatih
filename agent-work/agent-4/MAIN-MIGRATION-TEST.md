# Main migration-tool test

Tested official main commit `2163b5e7aa43fe9cb72ac681e6a62dc0f4936fe4`, merged into this branch at `5e87a4c0faa1563dd419f3b662b299ea4687f4ac`, against the existing Agent-4 data and author snapshot `c9fa191acade1f72ab36e05f39ea931d4cb9cb5d`. The tool pin reports `tool-version-matches`.

## Concrete previews (no canonical writes)

- **Previously retired historical ID:** `alias-preview` succeeded for `amal-aamal-hrm-hsyn/r00014-sdded2196be4783b3`, using its original row at `262f027d36f0c1d2286ad36f584c529aa14fc2ff` and the existing provenance proposal mapping its Persian code points 0–201 to `r00014/fa` at offset 0. Preview returned `alias-migration-preview`, one alias and a confirmation hash. This demonstrates that this one historical-link repair is eligible for preview against reachable history, **not** that it was applied or that its review or independent authorization is complete. Preview does not assess histories outside current reachable ancestry.
- **Reused meaning:** preview of the existing current alias for `item-asharh-6/r00002-s33d1515313a177c7` failed with `different historical meanings require version-aware handling, not an ordinary alias`. The guard correctly detects the known reused historical identity; this still needs version-aware handling.
- **Prospective live child:** preview of `namaz-ayd-ftr/r00002-s16b235f3fb54b1a5` failed because the historical alias identity is already live. The command is for already-retired identities; it cannot pre-install an alias for this live child as tested. This does not prove every possible workflow is blocked, but the preview alone does not perform the proposed role correction or establish a safe re-split.
- **Mismatched roles:** a `merge-preview` of `namaz-ayd-ftr` Arabic recitation child `r00002-sb4c2bfb77eb89124` with Persian note child `r00002-s16b235f3fb54b1a5` failed with `Merge requires matching reviewed row kinds`.
- **Nonadjacent pairing:** a `merge-preview` of the first Arabic and first Persian `namaz-ayd-ftr/r00005` children failed with `Merge requires two adjacent current rows in source order`.

Thus the new feature recovers some **already retired, unambiguous** historical links; it does not by itself demonstrate fixes for live role changes, nonadjacent pairings, or the reused-ID conflict. Prior blanket blocker descriptions should be interpreted in light of this distinction. No migration, split, row merge, or deletion was applied; previews and confirmation hashes are not independent review. Changed records would require fresh independent review if migration is later authorized and performed.

## Automated tests

The targeted official CLI and row-merge suites (`tests/six-agent-cli.test.ts`, `tests/six-agent-merge-cli.test.ts`, `tests/six-agent-row-merge.test.ts`) passed **17/17**. They include V1-to-V2 historical alias promotion, alias preservation through recompilation, and adjacency/kind checks. Full `npm run check` was started separately; consult the follow-up result rather than assuming it completed from these targeted tests.
