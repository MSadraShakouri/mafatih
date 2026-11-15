# Agent-5 individual triage, batch 5

Author snapshot `c9fa191acade1f72ab36e05f39ea931d4cb9cb5d`; review records from Agent-5 commit `daa3391` (also unchanged at `fdf5776`). Reviewer observations below are evidence from the individual record, not independent claims of scholarly approval. Dispositions are provisional and do not close the review; clarification means no safe operation has yet been demonstrated, not that the finding is rejected. No canonical changes are made in this batch.

## `ziyarat-abas-alyh-alslam` — needs clarification

**Review evidence:** Most existing Arabic/Persian prayers are paired, but r00006/07, r00008/09, r00014/15 and r00016/17 interrupt identifiable paired phrases at source boundaries. r00002 mixes attribution and reader directions; r00010 mixes compiler comments, directions and an untranslated excerpt in the original Arabic field. Keep the excerpt untranslated and preserve published identities; do not split merely for length.

**Flagged source decisions** (split/kind): r00002/fa (revise/revise), r00006/ar (revise/accept), r00006/fa (revise/accept), r00007/ar (revise/accept), r00007/fa (revise/accept), r00008/ar (revise/accept), r00008/fa (revise/accept), r00009/ar (revise/accept), r00009/fa (revise/accept), r00010/ar (revise/revise), r00010/fa (revise/revise), r00014/ar (revise/accept), r00014/fa (revise/accept), r00015/ar (revise/accept), r00015/fa (revise/accept), r00016/ar (revise/accept), r00016/fa (revise/accept), r00017/ar (revise/accept), r00017/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002:note, r00006:recitation, r00007:recitation, r00008:recitation, r00009:recitation, r00010-s2aee4e8f2bc4648d:note, r00010-s68bc5adb439ddf26:recitation, r00010-se9612352da760772:note, r00010-s7a8a674ed9b1e961:recitation, r00014:recitation, r00015:recitation, r00016-se08bae56212cb410:instruction, r00016-s8439aeaccefac974:recitation, r00017:recitation

**Assessment / next step:** Inspect each named paired boundary, the attribution/direction cut in r00002 and mixed r00010 excerpt; keep the untranslated excerpt and verify mapping before edits.

## `ziyarat-aly-alnqy-alyh` — blocked by link migration or tool limitation

**Review evidence:** The existing Persian renderings in r00002-r00004, r00006-r00010 are detached or misclassified as notes/instructions. r00008/fa crosses the boundary between two prayers, while its Arabic source has a separate Persian instruction between them. r00002/r00003, r00003/r00004 and r00005-r00008 contain source-row continuations. Align corresponding pieces and distinguish the final narrated report from instruction, preserving published IDs; these are semantic findings, not length-only cuts.

**Flagged source decisions** (split/kind): r00002/ar (revise/accept), r00002/fa (revise/revise), r00003/ar (revise/accept), r00003/fa (revise/revise), r00004/ar (revise/accept), r00004/fa (revise/revise), r00006/ar (revise/accept), r00006/fa (revise/revise), r00007/ar (revise/accept), r00007/fa (revise/revise), r00008/ar (revise/accept), r00008/fa (revise/revise), r00009/ar (revise/accept), r00009/fa (revise/revise), r00010/fa (accept/revise), r00011/fa (revise/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002-sb4c2bfb77eb89124:recitation, r00002-s93ed69e2ceaad8b5:recitation, r00002-sad77f8f4f1752667:recitation, r00002-s16b235f3fb54b1a5:note, r00002-s7912db66cde98eb8:note, r00003-s90ce2cbb3805f148:recitation, r00003-se283c95e6594ac46:recitation, r00003-s4ced2172db710711:recitation, r00003-s75f171481d1693e0:recitation, r00003-s1828851db03b603e:note, r00003-s1b27bb8c75bc48e1:note, r00003-s2fd8d78ba1da248f:note, r00004-sa48f69d269a72791:recitation, r00004-sa44b8f05e3e4e602:recitation, r00004-sc37c134c2f2b5db5:recitation, r00004-saabe6c8229b130ea:note, r00004-s6781612fc75b6e23:note, r00004-s1eea81343f83a892:note, r00006-sd441b11af7c6fc50:recitation, r00006-sffb0fbe94541cff2:recitation, r00006-s6b2b0ff07b4b8ae2:note, r00006-s99b2880b659f859b:note, r00007-s5d4f270b5482bc7d:recitation, r00007-sd40ca7b7f73b78f7:recitation, r00007-sf848cac367ea6573:recitation, r00007-s5227989a1cf80a5b:note, r00007-s5b62bfa785d14038:note, r00008-s6bbb477ed900eaea:recitation, r00008-sfb7b0e5283577dc9:instruction, r00008-s4da1f08cb6cd941f:recitation, r00008-s88eba61461dcd450:note, r00008-s2f5bd89c3a0e4775:instruction, r00008-sb0e122eb6ec43e0e:note, r00009-s3b3375cb23a6131d:recitation, r00009-s7e35f20e21823632:recitation, r00009-s7c5fe2c2c368bd12:recitation, r00009-s76c801584b3d5980:recitation, r00009-sace04f5552303cc5:note, r00009-sf7cef5d6daa9e7b3:note, r00009-s0e2f47428da34cf4:instruction, r00010-s70dfccf5c0fc10de:instruction, r00010-s68bc5adb439ddf26:recitation, r00010-s422466e378436746:instruction, r00011:instruction

**Assessment / next step:** r00002–04 and r00006–10 have detached/misclassified Persian children with unequal semantic boundaries; correcting them requires mapping composition and cannot force cross-row pairing.

## `ziyarat-amamyn-askryyn-alyhma` — blocked by link migration or tool limitation

**Review evidence:** Existing Persian recitation renderings r00002-r00004 and r00008-r00009 are detached and often misclassified as note/instruction. Cross-row r00002/r00003 and r00007/r00008 cut incomplete phrases, including the book title. r00001 and r00006-r00008 mix headings, narrative and instructions. Align matching material and classify on content while preserving published child IDs; request migration where necessary.

**Flagged source decisions** (split/kind): r00001/fa (revise/revise), r00002/ar (revise/accept), r00002/fa (revise/revise), r00003/ar (revise/accept), r00003/fa (revise/revise), r00004/ar (revise/accept), r00004/fa (revise/revise), r00006/fa (revise/revise), r00007/fa (revise/revise), r00008/ar (revise/revise), r00008/fa (revise/revise), r00009/fa (accept/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00001-s87a4572572fe3091:instruction, r00001-sa3fbdb6fa458720f:instruction, r00002-sb4c2bfb77eb89124:recitation, r00002-s93ed69e2ceaad8b5:recitation, r00002-s16b235f3fb54b1a5:note, r00002-s7912db66cde98eb8:note, r00003-s90ce2cbb3805f148:recitation, r00003-se283c95e6594ac46:recitation, r00003-sa84854240323e3e5:instruction, r00004-sa48f69d269a72791:recitation, r00004-sa44b8f05e3e4e602:recitation, r00004-sc37c134c2f2b5db5:recitation, r00004-s1c27c3072f6239a1:instruction, r00004-s2be99374d16bcc7b:instruction, r00006-sac7cfe4397cd2200:instruction, r00006-s34abe30a2fd8c1a9:instruction, r00006-sd51f781dcd3aeb5a:instruction, r00006-sd6ff84aa3ecaa3b3:instruction, r00006-s8215c63cb8abc975:instruction, r00007-s207e67823f746577:instruction, r00007-sb71241a8316ab2ec:instruction, r00007-s85c1e173b0ba86f1:note, r00007-s7e520a6eaef99ee0:instruction, r00007-s1cb45f118a3853df:note, r00008-s2c6a015796faa033:instruction, r00008-s32a6f39eb1428d59:recitation, r00008-s88eba61461dcd450:note, r00008-s11595099cc5bf85e:recitation, r00009-s3b3375cb23a6131d:recitation, r00009-sace04f5552303cc5:note

**Assessment / next step:** r00002–04 and r00008–09 have Persian note/instruction children detached from recitation. The concrete link and nonadjacency blockers are documented in round-5-alias-proposals.json; it is not applied.

## `ziyarat-amamzadh-hmzh-alyh` — blocked by link migration or tool limitation

**Review evidence:** Read all output rows against their source context. Specific role and/or interrupted cross-row phrase findings are recorded per source above. These are not length-only cut requests; do not orphan published IDs, and escalate changes that need mapping migration.

**Flagged source decisions** (split/kind): r00001/fa (revise/accept), r00002/fa (revise/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00001:note, r00002-s16b235f3fb54b1a5:note, r00002-s7912db66cde98eb8:note

**Assessment / next step:** r00002 has two published note children mixing historical account and practical directions. Separating those roles requires preserving each child ID; preview the r00001 continuation separately.

## `ziyarat-avl-fzylt-hsyn` — blocked by link migration or tool limitation

**Review evidence:** Group the interrupted prose r00002/03, 03/04, 04/05 and 07/08; Persian devotional prayer in r00004–07 is interwoven with the report and misclassified as note. Preserve the Arabic quotation without inventing an absent rendering and retain reported claims and IDs.

**Flagged source decisions** (split/kind): r00002/fa (revise/accept), r00003/fa (revise/accept), r00004/fa (revise/revise), r00005/ar (revise/revise), r00005/fa (revise/revise), r00006/fa (revise/revise), r00007/fa (revise/revise), r00008/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002:note, r00003-s1828851db03b603e:note, r00003-s1b27bb8c75bc48e1:note, r00004-saabe6c8229b130ea:note, r00004-s1aae3487509d641a:quotation, r00004-s1eea81343f83a892:note, r00005-s27c9c493bd8f7f6a:note, r00005-s07589039be45be65:quotation, r00006:note, r00007:note, r00008-s88eba61461dcd450:note, r00008-sb553e7372366eba9:note

**Assessment / next step:** r00004–07 interweave devotional Persian with reports under note roles, including split note children in r00004. Reclassification and resegmentation need link mapping; do not invent a translation.

## `ziyarat-daahay-bad-alyh` — blocked by link migration or tool limitation

**Review evidence:** r00002, r00004-r00006 leave existing Persian prayer renderings unpaired, with several wrongly marked note or instruction. Align nonmatching clause boundaries in r00002 and r00005 before pairing. r00003/r00004 continue across rows in both languages; inspect a safe join. r00007 moves its mixed-language quotation correctly. Preserve prior links and separately review proposed spaces.

**Flagged source decisions** (split/kind): r00002/ar (revise/accept), r00002/fa (revise/revise), r00004/fa (accept/revise), r00005/ar (revise/accept), r00005/fa (revise/revise), r00006/fa (accept/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002-sb4c2bfb77eb89124:recitation, r00002-s93ed69e2ceaad8b5:recitation, r00002-sad77f8f4f1752667:recitation, r00002-s16b235f3fb54b1a5:note, r00002-s7912db66cde98eb8:note, r00002-s6071f8cab4ce366d:recitation, r00004-sa48f69d269a72791:recitation, r00004-sa44b8f05e3e4e602:recitation, r00004-s0243d87b86c35021:recitation, r00004-s2be99374d16bcc7b:instruction, r00005-sd923aced91424bab:recitation, r00005-s091ecf41cca5cd79:recitation, r00005-s123f647288df4b56:recitation, r00005-sbf827ad20eeda70b:note, r00006-sd441b11af7c6fc50:recitation, r00006-sac7cfe4397cd2200:instruction

**Assessment / next step:** r00002 and r00005 have nonmatching Arabic/Persian boundaries and note/instruction Persian children. Supported alignment and link migration are prerequisites; see LINK-SAFE-RESPONSE.md.

## `ziyarat-dvm-nymh-rjb` — blocked by link migration or tool limitation

**Review evidence:** Persian renderings r00002-r00005, r00008-r00009 are detached and variously classified as note/instruction instead of recitation. r00003/r00004 split the final greeting and r00004/r00005 split the testimony. r00006/r00007 and r00010/r00011 interrupt Persian instructions. r00001 attribution and entry instruction share a role. Reconcile matching passages without changing source text or retiring published child IDs; use supported migration where required.

**Flagged source decisions** (split/kind): r00001/fa (revise/revise), r00002/ar (revise/accept), r00002/fa (revise/revise), r00003/ar (revise/accept), r00003/fa (revise/revise), r00004/ar (revise/accept), r00004/fa (revise/revise), r00005/ar (revise/accept), r00005/fa (revise/revise), r00008/fa (accept/revise), r00009/fa (revise/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00001:instruction, r00002-sb4c2bfb77eb89124:recitation, r00002-s93ed69e2ceaad8b5:recitation, r00002-sad77f8f4f1752667:recitation, r00002-s16b235f3fb54b1a5:note, r00002-s7912db66cde98eb8:note, r00003-s90ce2cbb3805f148:recitation, r00003-s1828851db03b603e:note, r00004-sa48f69d269a72791:recitation, r00004-sa44b8f05e3e4e602:recitation, r00004-saabe6c8229b130ea:note, r00004-s2be99374d16bcc7b:instruction, r00005-sd923aced91424bab:recitation, r00005-s091ecf41cca5cd79:recitation, r00005-saba56576a8f4a2e8:note, r00005-s7f8fe392f228390a:instruction, r00008-s6bbb477ed900eaea:recitation, r00008-s945091e310589eb0:instruction, r00009-sc64421e6669ebe6d:instruction, r00009-s7e35f20e21823632:recitation, r00009-sace04f5552303cc5:note, r00009-sf7cef5d6daa9e7b3:note

**Assessment / next step:** r00002–05 and r00008–09 have detached Persian note/instruction children and unequal cuts; role correction and matching alignment need link-preserving migration.

## `ziyarat-item-9` — blocked by link migration or tool limitation

**Review evidence:** Pair corresponding existing Arabic/Persian salutations in r00004/05 and group the interrupted paired address. Group reported prose r00002/03 and r00006/07; distinguish narration from instructions and claims. Preserve differing source epithet, untranslated greeting and links.

**Flagged source decisions** (split/kind): r00002/fa (revise/accept), r00003/fa (revise/revise), r00004/ar (revise/accept), r00004/fa (revise/accept), r00005/ar (revise/accept), r00005/fa (revise/accept), r00006/fa (revise/revise), r00007/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002:note, r00003-s1828851db03b603e:note, r00003-sf4b2084d004db1f5:instruction, r00004-sa48f69d269a72791:recitation, r00004-sa44b8f05e3e4e602:recitation, r00004-s0243d87b86c35021:recitation, r00004-s8cd93268f2b72979:recitation, r00005-sd923aced91424bab:recitation, r00005-s091ecf41cca5cd79:recitation, r00005-sc40cef633ca48d09:recitation, r00005-s123f647288df4b56:recitation, r00005-sd769183f8bafa0c5:recitation, r00005-s3f2927aa9377e011:recitation, r00006-sac7cfe4397cd2200:instruction, r00006-s607f491d5e7bd839:recitation, r00006-sd51f781dcd3aeb5a:instruction, r00006-s301ee66f47674098:note, r00007:note

**Assessment / next step:** r00004/05 each contain multiple Arabic and Persian recitation children in separate runs, so matching pairs are nonadjacent. Preserve differences and child IDs in supported composition.

## `ziyarat-jnab-hany-bn` — blocked by link migration or tool limitation

**Review evidence:** Corresponding salutation and testimony passages in r00002/03 are emitted in separate language-only rows. Pair existing texts and group the interrupted testimony. Keep the directions and preserve links; no new translation.

**Flagged source decisions** (split/kind): r00002/ar (revise/accept), r00002/fa (revise/accept), r00003/ar (revise/accept), r00003/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002-sb4c2bfb77eb89124:recitation, r00002-s93ed69e2ceaad8b5:recitation, r00002-s33d1515313a177c7:recitation, r00002-sa6349511538646ee:recitation, r00003-s90ce2cbb3805f148:recitation, r00003-se283c95e6594ac46:recitation, r00003-s4ced2172db710711:recitation, r00003-s75f171481d1693e0:recitation, r00003-sa800142d710dfc87:recitation, r00003-s17ee679a21196393:recitation, r00003-s246e32d857da5bce:recitation, r00003-s18b87c54f5bf9640:recitation

**Assessment / next step:** r00002 and r00003 contain corresponding language-only children in separate runs; first matching pairs are nonadjacent. Do not force a join or invent missing wording.

## `ziyarat-klamy-znha-mzmt` — blocked by link migration or tool limitation

**Review evidence:** Pair the five corresponding Arabic/Persian quotation and attribution segments in r00003, preserving quoted roles and differing source wording. Split the numbered heading from the direction and group the author note across r00004/05. Retain the author’s views as attributed; preserve links.

**Flagged source decisions** (split/kind): r00003/ar (revise/accept), r00003/fa (revise/accept), r00004/fa (revise/revise), r00005/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00003-sc6b0b67395b28e70:quotation, r00003-s474e6d840c51537f:note, r00003-s92d18d27542138b0:quotation, r00003-s502cf3455c314dfd:note, r00003-sf7f9f61851bf4d49:quotation, r00003-sae81cdb90707c16d:quotation, r00003-s1b27bb8c75bc48e1:note, r00003-s76d44687e6529b65:quotation, r00003-sd8fe963a13fe0305:note, r00003-saf774bf8d0a0c57c:quotation, r00004-s1c27c3072f6239a1:instruction, r00004-s6781612fc75b6e23:note, r00005:note

**Assessment / next step:** r00003 has ten language-only quotation/note children in separate runs. Pairing corresponding witnesses requires nonadjacent composition while preserving roles and every child link.

## `ziyarat-mkhts-mhmd-tqy` — needs clarification

**Review evidence:** The paired prayers and short relocated directions are largely sound. Repair incomplete paired boundaries r00002/03 and r00010/11, and consider the continued titles r00012/13. Separate heading, attribution and directions at r00001, r00008/09, r00016/17, and the joined direction and commentary at r00019/20. No translation should be invented. Preserve row links and escalate if supported migration or nonadjacent joining is unavailable.

**Flagged source decisions** (split/kind): r00001/fa (revise/revise), r00002/ar (revise/accept), r00002/fa (revise/accept), r00003/ar (revise/accept), r00003/fa (revise/accept), r00008/fa (revise/revise), r00009/fa (accept/revise), r00010/ar (revise/accept), r00010/fa (revise/accept), r00011/ar (revise/accept), r00011/fa (revise/accept), r00012/ar (revise/accept), r00012/fa (revise/accept), r00013/ar (revise/accept), r00013/fa (revise/accept), r00016/fa (revise/revise), r00017/fa (revise/accept), r00019/fa (revise/accept), r00020/fa (revise/revise). Historical issue escalations: 1.

**Current implicated row IDs and kinds:** r00001:instruction, r00002:recitation, r00003:recitation, r00008:heading, r00009:note, r00010:recitation, r00011:recitation, r00012-s70b98bd76381fe37:instruction, r00012-scce7b1135e7d7ce0:recitation, r00013:recitation, r00016:note, r00017:instruction, r00019:instruction, r00020:note

**Assessment / next step:** Preview r00002/03 and r00010/11 and specify the several heading/report/direction transitions; inspect titles separately and do not invent missing translations.

## `ziyarat-mtlqh-amyrmvmnyn-alyh` — needs clarification

**Review evidence:** The directions are generally moved to Persian and prayers paired. However unfinished paired phrases cross r00004/05, 08/09, 13/14, 17/18, 19/20, 22/23, 23/24/25, 26/27, 28/29, 30/31, 36/37 and 41/42; the short instruction r00033 also continues into r00034. Separate r00045 directions from explanations. Keep source imperfections and bracketed variants, preserve published IDs and escalate unsupported migration.

**Flagged source decisions** (split/kind): r00004/ar (revise/accept), r00004/fa (revise/accept), r00005/ar (revise/accept), r00005/fa (revise/accept), r00008/ar (revise/accept), r00008/fa (revise/accept), r00009/ar (revise/accept), r00009/fa (revise/accept), r00013/ar (revise/accept), r00013/fa (revise/accept), r00014/ar (revise/accept), r00014/fa (revise/accept), r00017/ar (revise/accept), r00017/fa (revise/accept), r00018/ar (revise/accept), r00018/fa (revise/accept), r00019/ar (revise/accept), r00019/fa (revise/accept), r00020/ar (revise/accept), r00020/fa (revise/accept), r00022/ar (revise/accept), r00022/fa (revise/accept), r00023/ar (revise/accept), r00023/fa (revise/accept), r00024/ar (revise/accept), r00024/fa (revise/accept), r00025/ar (revise/accept), r00025/fa (revise/accept), r00026/ar (revise/accept), r00026/fa (revise/accept), r00027/ar (revise/accept), r00027/fa (revise/accept), r00028/ar (revise/accept), r00028/fa (revise/accept), r00029/ar (revise/accept), r00029/fa (revise/accept), r00030/ar (revise/accept), r00030/fa (revise/accept), r00031/ar (revise/accept), r00031/fa (revise/accept), r00033/fa (revise/accept), r00034/ar (revise/accept), r00034/fa (revise/accept), r00036/ar (revise/accept), r00036/fa (revise/accept), r00037/ar (revise/accept), r00037/fa (revise/accept), r00041/ar (revise/accept), r00041/fa (revise/accept), r00042/ar (revise/accept), r00042/fa (revise/accept), r00045/fa (revise/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00004-s84d9644081c0182c:instruction, r00004-se656eb44999bf14d:recitation, r00005:recitation, r00008-s2c6a015796faa033:instruction, r00008-s4726693f173a10fd:recitation, r00009:recitation, r00013:recitation, r00014:recitation, r00017-sed440b03898ae131:instruction, r00017-s18f0993006f44169:recitation, r00018:recitation, r00019:recitation, r00020:recitation, r00022-se39ffb87a7fa027f:instruction, r00022-sf075bf57489fa6f3:recitation, r00023:recitation, r00024:recitation, r00025:recitation, r00026-s3d84d2748946a2f6:instruction, r00026-sb0bf64cdb72daaec:recitation, r00027:recitation, r00028:recitation, r00029:recitation, r00030-scee2525336edf34c:instruction, r00030-sf908733d811d4379:recitation, r00031:recitation, r00033:instruction, r00034-sc677689db9f1656c:instruction, r00034-sfcdd8c809134f4ad:recitation, r00036:recitation, r00037:recitation, r00041-s118d3111a0fb0ff2:instruction, r00041-s7207e2a91378de76:recitation, r00042:recitation, r00045:instruction

**Assessment / next step:** Inspect the named paired phrase boundaries individually, including r00033/34 instruction and r00045 explanation. Some may be adjacent, but each needs its own link/spacing preview.

## `ziyarat-pnjm-an-ayd` — needs clarification

**Review evidence:** The prayer pairings and language transfers are generally sound, but r00007/08 and r00021/22 isolate Arabic lead-ins from the full Persian renderings; bilingual phrases also cross r00010/11, r00013/14, r00019/20 and r00028/29. Prose is interrupted at r00001/02/03 and directions at r00017/18 and r00025/26. Separate r00003 and r00032 report/direction roles, and correct r00025’s kind. Preserve source omissions and row links; do not invent translations.

**Flagged source decisions** (split/kind): r00001/fa (revise/accept), r00002/fa (revise/accept), r00003/fa (revise/revise), r00007/fa (revise/accept), r00008/ar (revise/accept), r00008/fa (revise/accept), r00010/ar (revise/accept), r00010/fa (revise/accept), r00011/ar (revise/accept), r00011/fa (revise/accept), r00013/ar (revise/accept), r00013/fa (revise/accept), r00014/ar (revise/accept), r00014/fa (revise/accept), r00017/fa (revise/accept), r00018/ar (revise/accept), r00018/fa (revise/accept), r00019/ar (revise/accept), r00019/fa (revise/accept), r00020/ar (revise/accept), r00020/fa (revise/accept), r00021/fa (revise/accept), r00022/ar (revise/accept), r00022/fa (revise/accept), r00025/fa (revise/revise), r00026/ar (revise/accept), r00026/fa (revise/accept), r00028/ar (revise/accept), r00028/fa (revise/accept), r00029/ar (revise/accept), r00029/fa (revise/accept), r00032/fa (revise/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00001:note, r00002:note, r00003:instruction, r00007-s207e67823f746577:instruction, r00007-sbd47d389958800f8:recitation, r00008:recitation, r00010:recitation, r00011:recitation, r00013:recitation, r00014:recitation, r00017:instruction, r00018-s4322d97801b3ff23:instruction, r00018-scab5d97b50d26705:recitation, r00019-sbc654b657e88a431:instruction, r00019-s2a227bae9469067c:recitation, r00020:recitation, r00021-sf0193a0b6e01f768:instruction, r00021-sb1806a51a3722a14:recitation, r00022:recitation, r00025:note, r00026-s3d84d2748946a2f6:instruction, r00026-sb0bf64cdb72daaec:recitation, r00028:recitation, r00029:recitation, r00032:note

**Assessment / next step:** Inspect the Arabic lead-ins r00007/08 and r00021/22 with their whole Persian renderings, plus the r00025 role and prose/direction transitions; do not assume all can be merged together.

## `ziyarat-pyadh-rftn-shah` — blocked by link migration or tool limitation

**Review evidence:** r00005 and r00012 narrative roles are now corrected, but r00001/r00013 historical narrative is still misclassified and interrupted, and r00015/ar is still in the Persian slot, unpaired with its rendering. The author reports this requires a link-preserving mapping migration.

**Flagged source decisions** (split/kind): r00001/fa (revise/revise), r00013/fa (revise/revise), r00015/ar (accept/revise). Historical issue escalations: 1.

**Current implicated row IDs and kinds:** r00001-sc5e9d9539705078a:note, r00001-sa3fbdb6fa458720f:instruction, r00013-s96dd8ca70a0636e5:quotation, r00013-s0f742e17d4e21e88:quotation, r00015-sad231d5ea719cca1:quotation, r00015-sd760fea7c38647a2:quotation

**Assessment / next step:** r00001 and r00013 published children have incorrect narrative roles and r00015 Arabic occupies the Persian slot. Both role and slot changes retire IDs; see LINK-SAFE-RESPONSE.md.

## `ziyarat-rsvl-sly-allh-2` — needs clarification

**Review evidence:** Most Arabic/Persian texts are already paired and the directions in r00003, r00009 and r00015 are correctly moved, but interrupted phrases cross r00004/05/06, r00007/08, r00009/10, r00011/12, r00013/14, r00015/16/17, r00018/19, r00020/21 and r00023/24. Distinguish attribution from instructions in r00001. Historical LF corrections are individually escalated. Preserve row links and source wording; do not invent translations or bypass migration guards.

**Flagged source decisions** (split/kind): r00001/fa (revise/revise), r00004/ar (revise/accept), r00004/fa (revise/accept), r00005/ar (revise/accept), r00005/fa (revise/accept), r00006/ar (revise/accept), r00006/fa (revise/accept), r00007/ar (revise/accept), r00007/fa (revise/accept), r00008/ar (revise/accept), r00008/fa (revise/accept), r00009/ar (revise/accept), r00009/fa (revise/accept), r00010/ar (revise/accept), r00010/fa (revise/accept), r00011/ar (revise/accept), r00011/fa (revise/accept), r00012/ar (revise/accept), r00012/fa (revise/accept), r00013/ar (revise/accept), r00013/fa (revise/accept), r00014/ar (revise/accept), r00014/fa (revise/accept), r00015/ar (revise/accept), r00015/fa (revise/accept), r00016/ar (revise/accept), r00016/fa (revise/accept), r00017/ar (revise/accept), r00017/fa (revise/accept), r00018/ar (revise/accept), r00018/fa (revise/accept), r00019/ar (revise/accept), r00019/fa (revise/accept), r00020/ar (revise/accept), r00020/fa (revise/accept), r00021/ar (revise/accept), r00021/fa (revise/accept), r00023/ar (revise/accept), r00023/fa (revise/accept), r00024/ar (revise/accept), r00024/fa (revise/accept). Historical issue escalations: 4.

**Current implicated row IDs and kinds:** r00001:instruction, r00004:recitation, r00005:recitation, r00006:recitation, r00007:recitation, r00008:recitation, r00009-sc64421e6669ebe6d:instruction, r00009-s94f3428995dfd8af:recitation, r00010:recitation, r00011:recitation, r00012:recitation, r00013:recitation, r00014:recitation, r00015-s19fb38e858599e1d:instruction, r00015-s81f1199c2466c644:recitation, r00016:recitation, r00017:recitation, r00018:recitation, r00019:recitation, r00020:recitation, r00021:recitation, r00023:recitation, r00024:recitation

**Assessment / next step:** Preview each named paired continuation and identify the r00001 attribution boundary. Historical LF corrections remain independent editorial escalations.

## `ziyarat-shhday-ahd` — blocked by link migration or tool limitation

**Review evidence:** Pair corresponding existing Arabic/Persian parts of r00002/03 and group interrupted paired constructions r00001/02, 02/03 and 03/04. Keep the moved instruction and distinguish closing directions from attribution. Preserve text, variants and links.

**Flagged source decisions** (split/kind): r00001/ar (revise/accept), r00001/fa (revise/accept), r00002/ar (revise/accept), r00002/fa (revise/accept), r00003/ar (revise/accept), r00003/fa (revise/accept), r00004/ar (revise/accept), r00004/fa (revise/accept), r00005/fa (revise/revise). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00001-s3db48b9cdceccaca:instruction, r00001-s3e4b70ad1b9cb544:recitation, r00001-sa329ad2c5a367a28:recitation, r00002-sb4c2bfb77eb89124:recitation, r00002-s93ed69e2ceaad8b5:recitation, r00002-s33d1515313a177c7:recitation, r00002-sa6349511538646ee:recitation, r00003-s90ce2cbb3805f148:recitation, r00003-se283c95e6594ac46:recitation, r00003-sa800142d710dfc87:recitation, r00003-s17ee679a21196393:recitation, r00004:recitation, r00005:instruction

**Assessment / next step:** r00002/03 each contain separate runs of Arabic and Persian recitation children; corresponding pairs are nonadjacent and require link-preserving composition.

## `ziyarat-shykh-klyny-alrhmh` — needs clarification

**Review evidence:** Read all output rows against their source context. Specific role and/or interrupted cross-row phrase findings are recorded per source above. These are not length-only cut requests; do not orphan published IDs, and escalate changes that need mapping migration.

**Flagged source decisions** (split/kind): r00001/fa (revise/accept), r00002/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00001:note, r00002:note

**Assessment / next step:** Both r00001 and r00002 are base note rows. Determine the recommendation/biography boundary and preview the interrupted report join with link and spacing checks.

## `ziyarat-warith` — needs clarification

**Review evidence:** Most short invocations and renderings are paired. Complete broken bilingual phrases r00005/06, r00029/30, r00074/75, r00098/99 and r00115/16; reunite r00053 Arabic greeting with its full Persian in r00054; align Persian anticipation r00133/34. Other dependent continuations and mixed directions/report noted per source, including r00147/48. Two pairs of closely parallel Persian direction witnesses now appear consecutively at r00014 and r00030: preserve each witness but avoid presenting a repeated instruction as two sequential actions. Historical Arabic LF is escalated. Respect all published anchors and no invented text.

**Flagged source decisions** (split/kind): r00003/fa (revise/revise), r00005/ar (revise/accept), r00005/fa (revise/accept), r00006/ar (revise/accept), r00006/fa (revise/accept), r00010/fa (revise/revise), r00014/ar (revise/accept), r00014/fa (revise/accept), r00029/ar (revise/accept), r00029/fa (revise/accept), r00030/ar (revise/accept), r00030/fa (revise/accept), r00053/fa (revise/accept), r00054/ar (revise/accept), r00054/fa (revise/accept), r00074/ar (revise/accept), r00074/fa (revise/accept), r00075/ar (revise/accept), r00075/fa (revise/accept), r00077/ar (revise/accept), r00077/fa (revise/accept), r00078/ar (revise/accept), r00078/fa (revise/accept), r00084/ar (revise/accept), r00084/fa (revise/accept), r00085/ar (revise/accept), r00085/fa (revise/accept), r00090/ar (revise/accept), r00090/fa (revise/accept), r00091/ar (revise/accept), r00091/fa (revise/accept), r00092/ar (revise/accept), r00092/fa (revise/accept), r00093/ar (revise/accept), r00093/fa (revise/accept), r00094/ar (revise/accept), r00094/fa (revise/accept), r00098/ar (revise/accept), r00098/fa (revise/accept), r00099/ar (revise/accept), r00099/fa (revise/accept), r00104/ar (revise/accept), r00104/fa (revise/accept), r00105/ar (revise/accept), r00105/fa (revise/accept), r00106/ar (revise/accept), r00106/fa (revise/accept), r00115/ar (revise/accept), r00115/fa (revise/accept), r00116/ar (revise/accept), r00116/fa (revise/accept), r00133/ar (revise/accept), r00133/fa (revise/accept), r00134/ar (revise/accept), r00134/fa (revise/accept), r00147/fa (revise/revise), r00148/ar (revise/revise). Historical issue escalations: 1.

**Current implicated row IDs and kinds:** r00003:note, r00005:recitation, r00006:recitation, r00010:instruction, r00014-sa839c43f8232dd91:recitation, r00014-s9a4ab3fe55fb4971:instruction, r00014-sf3196e3d1d760387:instruction, r00029:recitation, r00030-sda0e2b38f6c307a6:recitation, r00030-s81a75d445db1f026:instruction, r00030-s93adeda0869ecfdd:instruction, r00053-s36521e921f17bbad:instruction, r00053-seb517417eb3bc12e:recitation, r00054:recitation, r00074:recitation, r00075:recitation, r00077:recitation, r00078:recitation, r00084:recitation, r00085:recitation, r00090:recitation, r00091:recitation, r00092:recitation, r00093:recitation, r00094:recitation, r00098:recitation, r00099:recitation, r00104:recitation, r00105:recitation, r00106:recitation, r00115:recitation, r00116:recitation, r00133:recitation, r00134:recitation, r00147:instruction, r00148-s8946eea1f6a2cdb4:instruction

**Assessment / next step:** Review the named paired phrase joins individually and separately adjudicate the repeated-direction witnesses and historical Arabic LF; preserve both witnesses rather than deduplicating.

## `ziyarat-zkrmsajd-mazmh-mdynh` — blocked by link migration or tool limitation

**Review evidence:** Distinguish the cross-reference from visitor directions in r00002, and pair the corresponding Arabic/Persian prayer sections in r00004. Keep the intentionally omitted long prayer omitted, retain source claims and preserve links.

**Flagged source decisions** (split/kind): r00002/fa (revise/revise), r00004/ar (revise/accept), r00004/fa (revise/accept). Historical issue escalations: 0.

**Current implicated row IDs and kinds:** r00002:instruction, r00004-sa48f69d269a72791:recitation, r00004-sa44b8f05e3e4e602:recitation, r00004-s0243d87b86c35021:recitation, r00004-s8cd93268f2b72979:recitation

**Assessment / next step:** r00004 has two Arabic and two Persian recitation children in separate runs; corresponding pairs are nonadjacent, requiring supported mapping rather than a forced merge.

## Guardrails

These are record-level dispositions; other subfindings within a blocked record may be independently addressable. A proposed fix is not a completed review. A safe fix must use supported guards, preserve all published IDs, respect source order, and separately review every proposed inserted space. Never split solely for length, force a nonadjacent join, prune historic text, or treat historical editorial changes as approved.
