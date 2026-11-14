# agent-1 status

Round: six-agent AR/FA split, agent 1 (112 assigned items, 4,274 AR/FA field occurrences).
Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0` (preparation revision 2, see `base-history.md`).
Branch in use: `arena/411fca58-mafatih` (the platform-assigned session branch).

## Authored (plan + canonical layout, structurally verified)

112 of 112 items — the assignment is finished. Every plan marks each source
occurrence `checked: true`, gives one kind per text piece, and every layout places
each source piece exactly once, in order, with the text unchanged. Arabic and
Persian pieces are paired in one output row only when the source row aligns them
(the corpus stores most translations row-for-row); where the languages' row
boundaries cross, the pieces stay unpaired rather than being matched by position.
Persian headings, notes and ritual instructions that the source stores in the
Arabic field are moved into the Persian slot with their own kind; Arabic phrases
stored in the Persian field move the other way. Nothing is translated, merged,
re-ordered or invented.

Authoring is incremental and reversible: each item was written through
`split-agent.ts split` → `verify` → `six-agent.ts apply`, so every recorded split
has a plan, a canonical layout and a row-split record, and `validate` re-checks the
whole corpus after each batch.

## Recorded issues (147 across 43 items)

Totals by kind: `mixed-language` 81, `historical-line-break` 56,
`historical-marker-move` 6, `uncertain-classification` 3, `other` 1.

- amal-aamal-byst-vykm — mixed-language×2
- amal-aamal-lylh-alrghayb — mixed-language×2
- amal-aamal-rmzan — mixed-language×1
- amal-aamal-shbhay-qdr — mixed-language×2
- amal-byan-ankh-aashvra — mixed-language×2
- amal-fzylt-aamal-nymh — mixed-language×7
- amal-mkhtsr-rmzan — mixed-language×6
- dua-adylh — historical-line-break×2, mixed-language×1
- dua-esteghase — historical-line-break×2, mixed-language×1
- dua-jawshan-kabir — mixed-language×1, historical-line-break×39, historical-marker-move×6
- dua-sahar — historical-line-break×6
- dua-syfy-sghyr-marvf — uncertain-classification×1
- dua-tjrbh-shdh-mhfvz — historical-line-break×1
- item-adab-srdab-mthr — mixed-language×1
- item-astghfary-sbb-zyady — mixed-language×2
- item-drd-dndan — mixed-language×3
- item-mqdmh-adab-sfr — historical-line-break×1
- item-namh-yvshya-bn — mixed-language×3
- khavas-adab-dfn-myt — mixed-language×2
- khavas-aymny-dzd — mixed-language×1
- khavas-hrz-hady-alyh — mixed-language×1
- khavas-rvyt-jhvd-trsa — mixed-language×1
- namaz-aaraby — mixed-language×1
- namaz-adab-kyfyt — mixed-language×6
- namaz-adab-zhr — historical-line-break×1
- namaz-amyralmvmnyn-alyh-alslam — mixed-language×2
- namaz-chharm-adayh-qbl — mixed-language×5
- namaz-slman — mixed-language×2
- namaz-taqybat-mkhtsh-sbh — mixed-language×2
- namaz-zman-alyh-alslam — mixed-language×1
- sahifa-jmah — uncertain-classification×2
- ziyarat-amdn-zyn-alaabdyn — mixed-language×1
- ziyarat-amin-allah — historical-line-break×2, mixed-language×1
- ziyarat-amyralmvmnyn-alyh-alslam — mixed-language×1, historical-line-break×1, other×1
- ziyarat-avl-rjb-nymh — mixed-language×1
- ziyarat-bad-amaman-alyhma — mixed-language×3
- ziyarat-fzylt-hmzh-alyh — mixed-language×1
- ziyarat-item-5 — historical-line-break×1, mixed-language×4
- ziyarat-item-8 — mixed-language×3
- ziyarat-item — mixed-language×3
- ziyarat-jlalt-syd-mhmd — mixed-language×1
- ziyarat-qbvr-mvmnan — mixed-language×3
- ziyarat-vdaa-an — mixed-language×1

Notes on the kinds:
- `mixed-language` marks a piece whose words are written in the other language and
  which the layout therefore places in that language's slot; the wording is
  unchanged and the recorded finding tells the reviewer where it came from.
- `historical-line-break` / `historical-marker-move` mark fields whose earlier
  stored value differed by a physical separator or a moved Persian section number.
  No separator is restored and no marker is moved again; the current text stands.
- `uncertain-classification` marks three personal-name rows read as reciter labels
  in the same position and form as the corpus's other reciter rows. That is agent
  judgment, not a verified audio attribution.
- `other` marks the one piece left unpaired because the language rows cross.

## Mid-round tool upgrade

Coordinator commit `c75e50c6` was merged into this branch after the review work:
it adds reversible cross-row merging (`merge-preview`, `merge-rows`, V2 split
records) and prior-snapshot text-pool repair, and repins `tool-info.json`. The
frozen base, registration, assignments, plans and V1 results are untouched, and
`verify-tool-info` reports `tool-version-matches` (Node v22.22.3, ICU 78.2,
Unicode 17.0). The upgrade raised the suite from 263 to 271 tests.

The merge tool does not apply to anything left open here: it refuses rows of
different kinds (checked against `item-drd-dndan/r00001`, heading against note),
and my remaining short heading rows are headings by kind, not one-word rows that
were mistakenly cut out. Text-pool repair is likewise not needed: no value from
the parent snapshot is missing, only 79 extra values that arrived with the
agent-6 revision, which no tool prunes.

Snapshot re-published after the upgrade:
`8d9704b99508ab405017dc891844a38e99685b4a` (supersedes `9439f6a`, same 112
items, V1 results unchanged).

## Gates run at 112 items

- `npm run validate` — STRUCTURAL VALIDATION PASS (not a content/rights approval).
- `npm run check:line-breaks` — passed, 0 exact retained breaks (0 pending, 0 reviewed).
- `npm run check` — exit 0; 271 tests after the upgrade, 268 pass, 0 fail, 3 skipped.
- `six-agent.ts audit-authored --base ffa01da9… --agent agent-1` — `complete`,
  total_items 112, complete_items 112, findings [].

## Independent review of the neighbour and the merge

- Peer: agent-6, branch `arena/1a493a80-mafatih`.
- Early partial snapshot `941c7ad3…` (32 items) was reviewed first; when agent-6
  announced author-ready snapshot `561fdfb02c9a23002c5a2bcc098134c8c0bc6cc2`
  (115 of 115 items), every one of the 115 items was reviewed again against that
  exact snapshot, so no record is bound to the superseded partial one.
- Each record is `verify-review` → `agent-review-records-complete`, with all
  occurrences and kinds assessed, the recorded issues answered and the layout
  accepted; no revisions were requested. Records live in
  `agent-work/agent-1/reviews/` (115 files).
- The review was then deepened: every one of agent-6's sources now carries its own
  note built from its own cuts, kinds, pairing, sentence count and lengths, not a
  repeated sentence, and each item note states the row counts, the median piece
  and any polish point.
- Measured against the frozen corpus, agent-6's granularity is finer than the
  base, not coarser: base pieces sit at 417 code points at the p90 with 18% above
  220 and 6.8% holding more than one sentence; agent-6's set is at 86 at the p90,
  1.7% above 220 and 0.7% multi-sentence, in 10,261 pieces over 115 items. My own
  112 items are at 249/11.5%/4.6% — coarser than agent-6's work, not finer.
- Polish points found for a later revision, recorded in the item notes and not
  blocking: seven items keep a Persian section label fused with the passage it
  opens (`amal-aamal-hfdhm-mvlvd`, `amal-sayr-aamal-rjb`, `dua-mqatl-bn-slyman`,
  `item-mrvr-amyr-alyh`, `khavas-aday-qrz`, `namaz-kyfyt-hzar-rkat`,
  `sura-khvas-hmd-vbazy`).
- The same reading caught two defects of my own: `dua-hjt-alyh-alslam/r00001` and
  `dua-zman-ajl-allh/r00001` are reciter labels classed `other`; both are now
  `audio-reciter`, re-applied, and the corpus has no `other` piece left.
- Agent-6 then self-audited and published revised snapshot
  `36f89c8b3668b2b5e36d97300011bee13a0ba42a` (14 of 115 items changed: 39 bare
  ordinal markers rejoined with their passages, twelve long recitation rows split
  further, one issue note reworded). All 115 records were rebuilt against that
  exact snapshot, every one verifying again, and the snapshot is merged here.
- That revision corrected a judgement of mine: I had asked for detached ordinal
  labels, but the base corpus fuses a section label with its passage in 241 rows
  against 43 label-only rows, so rejoining is the house style. The suggestion is
  withdrawn and the records now say so.
- Agent-6's own duty — reviewing and merging agent-5 — is done on their branch;
  agent-5's corrected snapshot has since moved on (tip `aaa1ce8b` reports two
  further long-passage revisions to agent-6). That review belongs to agent-6's
  branch and cannot be written from this one.
- The snapshot, not the moving peer tip, is merged into this branch
  (`git merge --no-ff`), so the corpus now holds 227 authored items: 112 of mine
  and 115 of agent-6's, with both histories preserved.
- After the merge: `validate` PASS, line-break check pass, `audit-authored` for
  agent-1 still `complete` (112/112), `npm run check` 263 tests / 260 pass /
  0 fail / 3 skipped.

## Not done here

No APK was built, no publication or rights check is claimed, and no translation of
Arabic devotional text was introduced.
