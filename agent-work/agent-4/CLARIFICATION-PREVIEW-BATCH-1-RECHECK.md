# Continuation preview batch 1: Agent-5 decisions and recheck

Read Agent 5's `agent-work/agent-5/triage/agent-4-preview-decisions-1.md` directly from commit `891d3ed0b2e5ca2e92e3c91976913ad3048605d1`, without merging or pulling its branch. Its decisions refer to author snapshot `c9fa191acade1f72ab36e05f39ea931d4cb9cb5d` and our earlier report at `67a3dea9036d47aed7a15984a550a15da8e7f036`. Agent 5 accepted the four specified local groupings and individually accepted the seven specified U+0020 insertions. The `dua-saat-9` Arabic/Persian honorific asymmetry is retained as a source difference; no translation or normalization is proposed.

Re-ran the four guarded `merge-preview` commands with the same source rows, spacing modes and reasons on our actual parent `67a3dea9036d47aed7a15984a550a15da8e7f036`. All returned successfully. The proposed merged IDs and insertion offsets match Agent 5's exact candidates:

| Item | Spacing mode | Proposed merged ID | Confirmed U+0020 offsets |
| --- | --- | --- | --- |
| `dua-saat-6` | `both-space` | `m17b844185e93c1acecd3a9a1` | ar 275; fa 231 |
| `dua-saat-8` | `both-space` | `ma435951125278b6836230b09` | ar 80; fa 84 |
| `dua-saat-9` | `both-space` | `m6a26264e84c7022fc3e4d0ef` | ar 53; fa 58 |
| `khavas-khvab-dydn-khvd` | `fa-space` | `m5cf533cd9573fd0434e142dd` | fa 83 |

For each selected language, the preview reported no boundary whitespace, one U+0020, and the expected source-left length as the insertion offset. The proposed field was checked to equal the left field plus one space plus the right field. The tool checked the current anchors, adjacency and matching kinds; the previews made no file changes. The tool pin reports `tool-version-matches`.

**Scope:** In `khavas-khvab-dydn-khvd`, accepting the local continuation does not resolve its other role findings. Agent 5's separate `agent-4-clarifications-2.md` proposes inspecting attribution within the left child, and reported outcome and experience claims later in the right row; those remain open and require link-safe independent treatment. The preview acceptance does not authorize any retired-ID migration, live-ID correction, or other spacing or historical editorial change.

No join or migration was applied. If a change is later authorized, rerun its preview on the actual prospective parent, apply only the authorized operation, publish a new immutable authored snapshot, and request fresh independent review of the actual resulting text, roles, links and each insertion. A proposed ID or a prior preview is not a completed fix.
