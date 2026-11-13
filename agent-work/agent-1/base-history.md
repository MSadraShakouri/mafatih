# agent-1 base history

The round preparation was updated after this agent had already authored its first
items. This file records the explicit base change; it is not a silent migration.

| preparation | base | launch protocol | corfile snapshot |
|---|---|---|---|
| revision 1 | `0585cec8de34d885752cf40216d3634ab61a3a67` | `six-agent-parallel-ring-v1` | `5a7213e7…` |
| revision 2 | `ffa01da92fbba25731356e8158c295b3824763f0` | `six-agent-parallel-ring-v2` | `5a7213e7…` |

Checks performed before changing `base.txt`:

- `git diff 0585cec… ffa01da… -- data/` is empty: the canonical corpus is byte-identical.
- `docs/split-assignments/launch.json` keeps the same `corpus_snapshot_sha256`
  (`5a7213e7185863d49836ce5a94c9456099e459a70eb4326596e8e20939cbb69b`) and the same
  assignment manifest hash.
- Every authored plan was re-exported at the new base: all 32 `item_sha256` values and
  all recorded `source_sha256` values still match, so no plan is stale and none was rewritten.
- The revision-1 difference is tooling and documentation only (session-branch
  registration, neighbor discovery, Node 22 pin, historical hints).

The revision-1 base was `ffa01da`'s parent, so the update is a fast-forward-shaped
preparation change, not a new corpus snapshot. If a future preparation changes the
corpus or the assignment manifest, stop instead of repeating this update.
