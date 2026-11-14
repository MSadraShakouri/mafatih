# Agent-4 historical-link audit

Exact target: current author-ready snapshot `6bbdf5203769db86dd7ba9183eaafb9829ec31f1`; frozen base `ffa01da92fbba25731356e8158c295b3824763f0`.

Method: compare all Agent-4 item rows ever present in own-branch history with current live row IDs and all current redirect identities (`row-splits` originals, aliases, segment rows, and insertion source IDs). For each missing old row ID, recover its source slices from a historical split record and compose them with current V1/V2/V3 segment mappings. No source text is quoted, no unsafe re-split is applied, no link guard is bypassed, and no pinned tool file is changed.

- Affected items: **5**.
- Missing prior row IDs: **65**.
- IDs with a unique exact contiguous match in one current field: **51**. These can be recovered by explicit redirects alone.
- IDs with complete source-slice coverage through current mappings: **65**. These require a reviewed mapping-composition migration for old anchors, but do not require recreating retired rows.
- IDs needing exact-string continuity repair: **14** (editorial spaces or merged rows break a direct string match).
- Whether any intermediate link was actually used by a reader is unknown.

Full offset-by-offset proposals are in `agent-work/agent-4/historical-link-proposals.json`. The tables below list only IDs, recovery class and proposed current row IDs.

## amal-aamal-hrm-hsyn (5 IDs)

| Prior ID | Exact current-field match | Proposed current row(s) | Status |
|---|---|---|---|
| `r00014-s0b1f214527fc97a6` | yes | r00014 (first offset 643) | `compositional-safe` |
| `r00014-s7d7a2892a9dffe73` | yes | r00014 (first offset 864) | `compositional-safe` |
| `r00014-sdded2196be4783b3` | yes | r00014 (first offset 0) | `compositional-safe` |
| `r00014-sf3196e3d1d760387` | yes | r00014 (first offset 201) | `compositional-safe` |
| `r00014-sfb42bc8b046c1c61` | yes | r00014 (first offset 401) | `compositional-safe` |

## amal-slvat-shaban (17 IDs)

| Prior ID | Exact current-field match | Proposed current row(s) | Status |
|---|---|---|---|
| `r00003-sa800142d710dfc87` | no | m0a65bb84f22990a314437199, r00003-s1b27bb8c75bc48e1 (first offset 144) | `compositional-safe` |
| `r00003-sf4b2084d004db1f5` | yes | r00003-s277471b51abf8d01 (first offset 0) | `compositional-safe` |
| `r00004-s1c27c3072f6239a1` | yes | mfc62a9fa6de76a4527937b07 (first offset 0) | `compositional-safe` |
| `r00004-sa44b8f05e3e4e602` | yes | mfc62a9fa6de76a4527937b07 (first offset 0) | `compositional-safe` |
| `r00005-s091ecf41cca5cd79` | yes | r00005-s26cb4356b4155a1c (first offset 0) | `compositional-safe` |
| `r00005-saba56576a8f4a2e8` | no | mfc62a9fa6de76a4527937b07, r00005-s26cb4356b4155a1c, r00005-sef34cc78c3ba2c3e (first offset 270) | `compositional-safe` |
| `r00005-sbf827ad20eeda70b` | yes | r00005-s26cb4356b4155a1c (first offset 7) | `compositional-safe` |
| `r00005-sc40cef633ca48d09` | no | mc3133c28659a89e4debe9223, r00005-sbd99c92550db078e (first offset 0) | `compositional-safe` |
| `r00005-sd923aced91424bab` | no | mfc62a9fa6de76a4527937b07, r00005-sef34cc78c3ba2c3e (first offset 345) | `compositional-safe` |
| `r00005-sfc8c0739f3d3693c` | no | mc3133c28659a89e4debe9223, r00005-sbd99c92550db078e (first offset 0) | `compositional-safe` |
| `r00006-sac7cfe4397cd2200` | no | mc3133c28659a89e4debe9223, mfaa6f3934de456f96fcd3edf (first offset 146) | `compositional-safe` |
| `r00006-sd441b11af7c6fc50` | yes | mc3133c28659a89e4debe9223 (first offset 177) | `compositional-safe` |
| `r00006-sffb0fbe94541cff2` | yes | mfaa6f3934de456f96fcd3edf (first offset 0) | `compositional-safe` |
| `r00007-s207e67823f746577` | no | mfaa6f3934de456f96fcd3edf, r00007-s4a2aa7f2dd56d14a (first offset 145) | `compositional-safe` |
| `r00007-s5d4f270b5482bc7d` | no | mfaa6f3934de456f96fcd3edf, r00007-s4a2aa7f2dd56d14a (first offset 204) | `compositional-safe` |
| `r00007-sb71241a8316ab2ec` | no | r00007-s09ad0225f00818de, r00007-s4a2aa7f2dd56d14a (first offset 0) | `compositional-safe` |
| `r00007-sd40ca7b7f73b78f7` | yes | r00007-s09ad0225f00818de (first offset 0) | `compositional-safe` |

## dua-yamn-thl-hady (26 IDs)

| Prior ID | Exact current-field match | Proposed current row(s) | Status |
|---|---|---|---|
| `r00002-s33d1515313a177c7` | yes | r00002-se78f6df715196b3d (first offset 0) | `compositional-safe` |
| `r00002-s6071f8cab4ce366d` | yes | r00002-s3068e95733fdcf18 (first offset 0) | `compositional-safe` |
| `r00002-s7aaedf514143adf4` | yes | r00002-s5846264aa24491de (first offset 0) | `compositional-safe` |
| `r00002-s8ecaa140884abf64` | yes | r00002-s5846264aa24491de (first offset 0) | `compositional-safe` |
| `r00002-s93ed69e2ceaad8b5` | yes | r00002-s85aa1380ba79f059 (first offset 0) | `compositional-safe` |
| `r00002-sa6349511538646ee` | yes | r00002-s85aa1380ba79f059 (first offset 0) | `compositional-safe` |
| `r00002-sad77f8f4f1752667` | yes | r00002-s3068e95733fdcf18 (first offset 0) | `compositional-safe` |
| `r00002-sb4c2bfb77eb89124` | yes | r00002-se78f6df715196b3d (first offset 0) | `compositional-safe` |
| `r00002-scc6dd1324a57a846` | yes | r00002-sf16aa75451512e5d (first offset 0) | `compositional-safe` |
| `r00002-seb6222a3827d90b5` | yes | r00002-sf16aa75451512e5d (first offset 0) | `compositional-safe` |
| `r00003-s17ee679a21196393` | yes | r00003-sf9cbb0785d5f5447 (first offset 0) | `compositional-safe` |
| `r00003-s246e32d857da5bce` | yes | r00003-sfc5f463082467697 (first offset 0) | `compositional-safe` |
| `r00003-s4ced2172db710711` | yes | r00003-sfc5f463082467697 (first offset 0) | `compositional-safe` |
| `r00003-s90ce2cbb3805f148` | yes | r00003-s3a5c66537d9f28c5 (first offset 0) | `compositional-safe` |
| `r00003-sa800142d710dfc87` | yes | r00003-s3a5c66537d9f28c5 (first offset 0) | `compositional-safe` |
| `r00003-se283c95e6594ac46` | yes | r00003-sf9cbb0785d5f5447 (first offset 0) | `compositional-safe` |
| `r00004-s0243d87b86c35021` | yes | r00004-s2d6fcdaf315ab02c (first offset 0) | `compositional-safe` |
| `r00004-s2ebb995e928e18cc` | yes | r00004-s0c09de98ea6e555d (first offset 0) | `compositional-safe` |
| `r00004-s2ffaaeb4efc239ef` | yes | r00004-s5491631f3a310ff6 (first offset 0) | `compositional-safe` |
| `r00004-s6365177411d0e83c` | yes | r00004-s5491631f3a310ff6 (first offset 0) | `compositional-safe` |
| `r00004-s8cd93268f2b72979` | yes | r00004-s97745e24b1ee5388 (first offset 0) | `compositional-safe` |
| `r00004-s9613cff30f5a060a` | yes | r00004-se68534127bdf303b (first offset 0) | `compositional-safe` |
| `r00004-s9c2358c254c1b677` | yes | r00004-se68534127bdf303b (first offset 0) | `compositional-safe` |
| `r00004-sa44b8f05e3e4e602` | yes | r00004-s97745e24b1ee5388 (first offset 0) | `compositional-safe` |
| `r00004-sa48f69d269a72791` | yes | r00004-s2d6fcdaf315ab02c (first offset 0) | `compositional-safe` |
| `r00004-sc37c134c2f2b5db5` | yes | r00004-s0c09de98ea6e555d (first offset 0) | `compositional-safe` |

## item-asharh-6 (16 IDs)

| Prior ID | Exact current-field match | Proposed current row(s) | Status |
|---|---|---|---|
| `r00002-sb122fdb543464f4c` | no | m4bf42ef11547f4388f4a32ba, r00002-s35a4887b4dbd274f (first offset 0) | `compositional-safe` |
| `r00002-sb4c2bfb77eb89124` | yes | r00002-s35a4887b4dbd274f (first offset 0) | `compositional-safe` |
| `r00003-sa84854240323e3e5` | yes | r00003 (first offset 0) | `compositional-safe` |
| `r00003-sf4b2084d004db1f5` | yes | r00003 (first offset 253) | `compositional-safe` |
| `r00004-s1c27c3072f6239a1` | yes | r00004-s1786b621a7e04471 (first offset 0) | `compositional-safe` |
| `r00005-s27c9c493bd8f7f6a` | yes | r00005-sb3a1d983248f0a7c (first offset 0) | `compositional-safe` |
| `r00006-s906df66ffda3b7f7` | yes | r00006-sf793fe842b07432f (first offset 0) | `compositional-safe` |
| `r00009-sace04f5552303cc5` | no | r00009 (first offset 0) | `compositional-safe` |
| `r00009-sdafcc936ea2a4f02` | yes | r00009 (first offset 4) | `compositional-safe` |
| `r00010-s0df7b38f9b05a58b` | yes | r00010 (first offset 4) | `compositional-safe` |
| `r00010-seb219ae3b3f3af47` | no | r00010 (first offset 0) | `compositional-safe` |
| `r00011-sd0acd38d458f476f` | yes | r00011 (first offset 4) | `compositional-safe` |
| `r00011-sff3d5cac0f1b50db` | no | r00011 (first offset 0) | `compositional-safe` |
| `r00012-s233dd7da462b3635` | no | m7aada489c3a8236a60d4132b (first offset 0) | `compositional-safe` |
| `r00012-s4ac36a604ee8f876` | yes | m7aada489c3a8236a60d4132b (first offset 4) | `compositional-safe` |
| `r00013-sf57720f41b6d243f` | yes | m7aada489c3a8236a60d4132b (first offset 51) | `compositional-safe` |

## namaz-ayza-hajt-sndhay (1 IDs)

| Prior ID | Exact current-field match | Proposed current row(s) | Status |
|---|---|---|---|
| `r00007-sc7d0d25677eb440a` | yes | r00007-s437311542faefd68 (first offset 0) | `compositional-safe` |

## Recovery classes

- **Exact current-field match yes:** the old field text remains a contiguous slice of exactly one current row field; an explicit redirect with the recorded offset is safe if the coordinator chooses to add it.
- **Exact current-field match no:** a V3 proposed space or cross-row merge means the old field is no longer one contiguous string. The JSON proposal maps its source ranges to current row IDs and `target_start` offsets; this is a mapping-composition task, not a reason to re-split or invent text.
- **No canonical changes in this audit:** all 65 old IDs remain retired; no row was restored, no alias was added, and no spacing proposal was created.
