# Agent 5 findings: full pass in progress (not a review request)

Frozen base `ffa01da92fbba25731356e8158c295b3824763f0`; starting published head `211030da342c75b7de26d657d71af727893568dc`. The full outstanding queue has **not** been completed. Do not treat this as the final isolated snapshot; Agent 5 should wait for the final consolidated handoff. Earlier item-level triage and holds remain applicable except where explicitly superseded below. None of these author changes is independently accepted merely because a preview passed.

## Guarded live revisions

- `434ebe8211035d340b3e4a04fadc14202362690c` — `amal-aamal-rbya-alsany`, r00001/fa cuts 203, 253, 387, 646, 778; roles note/instruction/instruction/note/note/instruction; 4 prior fields checked.
- `cfbe17cb70684c579cd0664e28a046d09513a54e` — `namaz-anjam-daa-vst`, r00001/fa cut 30; heading/instruction; 10 prior fields checked.
- `60d6d4fe10bf7a3a50f91cb25b2554a8cd80d5f2` — `namaz-astkharh-sahb-jvahr`, r00001/fa cuts 187, 296, 734; note/instruction/instruction/note; 4 prior fields checked.
- `6877a8e4` — `amal-aamal-nvzdhm-rmzan`, pair r00005 Arabic and Persian parts 0 and 1 as two recitation rows. The plan was unchanged, the layout and two canonical records changed, and no new pooled text was required. Prior live and alias fields were checked before the commit.

All used formal guarded previews tied to the exact history head and confirmed by digest, followed by guarded application; old live/record fields were verified in current text or mapped target slices and existing pool values were preserved. All four need independent review of semantics and every relevant historical link.

## Guarded continuation corrections

| Commit | Item | Previous adjacent pair | New row | Proposed U+0020 offsets |
| --- | --- | --- | --- | --- |
| `12cde6d872e62c01a0ff022d4b8885d5d2962de9` | `dua-rsvl-s-aman` | `r00001-saa3ec3f116259495` / `r00002-s0b1d6d51987de706` | `m4d131af35395796d404f88a6` | fa 82 |
| `50c1c699048ceadae62ecf2c47b62fae9322c26a` | `monajat-mnajat-sfr` | `r00001-s36a52eb1dedee746` / `r00002-se78f6df715196b3d` | `m055aef95b60e2d4231233a63` | ar 23, fa 8 |
| `54ef213c77de616e790539ef4c7ba8025ac380b5` | `amal-fzylt-shaban` | `r00001-sd0076416ed435839` / `r00002` | `m482588e2d649f7d3f9e7c2f3` | fa 692 |
| same | same | `r00005` / `r00006-s6b2b0ff07b4b8ae2` | `m5a58a6a3120d8e333bb01a13` | fa 165 |
| `4abc261269c1971148e69aa1dfdaf45a7ca63096` | `amal-tkbyrat` | `r00001` / `r00002` | `m0e01b021fbc5169e6aecf901` | fa 538 |
| same | same | `r00005-s93affcc5f3ac5677` / `r00006` | `m47357f56b7327a5c2f8e755d` | ar 113, fa 113 |
| `03eb2ff89cfc5a1cb90ec6a5f32d2ac53cd4d7d2` | `namaz-fzylt` | `r00001-sd0076416ed435839` / `r00002` | `mdde319a5f530b82e81e2f297` | fa 300 |
| same | same | `r00005` / `r00006-s6b2b0ff07b4b8ae2` | `m5ca080d369fad4980c2d88d6` | fa 583 |
| same | same | `r00006-saa9b9be4b3d5606d` / `r00007` | `m2435feb219a57e8ba0fd9bfa` | fa 363 |

Offsets are Unicode code points. Each pair was previewed and applied using guarded tooling, prior live/record fields mapped exactly to current destination slices, old pooled values retained, and new text hashes verified. Preserve attributed claims and supplied variants. Each grouping, space and link still needs independent review.

## Checks and open work

`npm run check`: 304 passed, 0 failed, 3 skipped (optional generated review page, optional alignment candidates, approved lam-pair corpus comparison). Structural validation passed with 68 unreferenced pool warnings; generated audit completed. Browser tests not rerun: the previously used temporary Chromium 153 executable/config was unavailable after workspace restoration; pinned Chromium 156 also not verified in this pass. No APK built.

The remaining records in `AGENT-5-TRIAGE-INDEX.md` and its batches still need the requested full pass. In particular, `sura-rahman` has verse/audio metadata requiring separate evaluation; no edit was made. `dua-yamn-thl-hady` provisional candidate bindings remain stale and withheld pending independent review; see `DUA-YAMN-PROVISIONAL-LINEAGE-RECHECK.md`. Historical-link proposals remain provisional, not installed. Fetch latest main and peer again before finalization, run all required checks, build one isolated snapshot and publish one consolidated handoff only after completing the pass; do not call this progress record a final snapshot.
