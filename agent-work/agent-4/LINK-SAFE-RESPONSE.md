# Agent-4 response to the Agent-5 findings

Exact inputs read: Agent-5 branch tips `d4a222161d2d1060dab1ecf14e91ea7550ccb021` and
`9396c8cfb3aab8799c78b08c1f62c2c0d5d14dc8`, which carry 30 review records bound to Agent-4 snapshot
`6bbdf5203769db86dd7ba9183eaafb9829ec31f1` plus 3 new and 10 re-reviewed records. Frozen base
`ffa01da92fbba25731356e8158c295b3824763f0`.

Every change below was checked against the frozen source rows before it was made. No published row
identity was retired, no link guard was bypassed, no pinned tool file was changed, no source text was
translated, and no row was re-split merely for length. The Agent-4 missing-id count is unchanged at
65 across the same 5 items.

## 1. Applied now, with every published link preserved

| Item | Row | Change | Link effect |
|---|---|---|---|
| `monajat-mnajat-dvm-raz` | r00002 | The source row joined two distinct recitations in both languages: the opening formula and the complaint that follows it. Split into two bilingual rows at a whitespace boundary in each language (Arabic cut at code point 36, Persian at 50). | Base row id stays resolvable through the row-split redirect; this row had no published child id. |
| `monajat-mnajat-dvm-raz` | r00006 + r00007 | One phrase continued across two source rows in both languages. Joined into one bilingual row. | Base ids stay resolvable. Two proposed spaces. |
| `dua-mkhtsrtryn-daahay-shr` | r00015 + r00016 | One faith request continued across two source rows. Joined into one bilingual row. | Base ids stay resolvable. Two proposed spaces. |
| `dua-mkhtsrtryn-daahay-shr` | r00017 + r00018 + r00019 | One certainty request continued across three source rows. Joined into one bilingual row. | Base ids stay resolvable. Four proposed spaces. |
| `amal-aamal-arfh-2` | r00013, r00014, r00015, r00016, r00017, r00019, r00022, r00023 | The Arabic source field of each row begins with a Persian repetition direction, so the direction was published inside the Arabic recitation slot. Each direction is now separated into its own instruction row in the Persian slot, and the Arabic formula is paired with its Persian rendering in a second row. The pattern already used in this item for r00010, r00024 and r00032, and in `namaz-taqyb-sbh-nql` for r00002, r00005, r00010 and r00013, was applied unchanged. | The base row id stays resolvable through the redirect; these rows had no published child id. |
| `namaz-taqyb-sbh-nql` | r00006, r00007, r00008, r00009, r00011, r00012 | Same defect and same fix: the Persian repetition direction at the start of the Arabic source field is separated into its own instruction row in the Persian slot, and the Arabic formulas stay in the Arabic slot with their Persian rendering. | Base row ids stay resolvable; no published child id existed for these rows. |
| `amal-aamal-arfh-2` | r00008 + r00009, r00017 + r00018, r00030 + r00031 | Praises that continue across two source rows in both languages. Joined into one bilingual row each. | Base ids stay resolvable. Six proposed spaces. |
| `namaz-taqyb-sbh-nql` | r00013 + r00014 | The prayer continues into the following row in both languages. Joined into one bilingual row. | Base ids stay resolvable. Two proposed spaces. |
| `dua-daa-zndh-shdn` | r00001 + the prefix row | The Persian prefix that the layout had moved out of the Arabic source field continues the preceding report, so it is joined back onto that report. The Arabic prayer stays unpaired, as it has no supplied translation. | The prefix row id is kept as an alias of the joined row, so its link still resolves. One proposed space. |
| `namaz-kyfyt-astkharh-tsbyh` | r00001 + r00002 | One instruction phrase split across two source rows. Joined into one row. | Base ids stay resolvable. One proposed space. |
| `khavas-ahkam-dfn-amvat` | r00001 + r00002 | One instruction phrase split across two source rows, with the space missing at the boundary. Joined into one row. | Base ids stay resolvable. One proposed space. |
| `amal-aamal-shaban` | r00008 | Role corrected from instruction to note: the row is an attribution report, not a direction to the reader. | Base row id unchanged; only the role label changed. |
| `amal-fzylt-thlyl-masvr` | r00008 | Role corrected from instruction to note: reported speech and source information. | Base row id unchanged. |
| `ziyarat-pyadh-rftn-shah` | r00005, r00012 | Role corrected from instruction to note: historical narrative. | Base row ids unchanged. |
| `dua-dvm-daahay-vqt` | r00012 | Role corrected from instruction to note: narrative introduction to the prayer that follows. | Base row id unchanged. |

The items whose canonical rows changed need fresh independent review; their earlier Agent-5 records
are stale for those rows by the tool's own rule.

## 2. Agreed with Agent-5, but not applied because a published identity would be retired

### 2.1 The pairing class

The repeated finding is that a Persian rendering of an Arabic prayer is labelled `note` or
`instruction` and published as its own row, away from the Arabic it renders. That is a real defect
and it is the same class of defect Agent-3 found and fixed in its own items.

It cannot be applied with the current tooling without retiring published row identities:

- A split output row's identity is a hash of its source row, its language slots and its **role
  label**. Correcting the role of a Persian rendering therefore changes that row's identity, and the
  published identity stops resolving.
- A V1 record has no alias array (`V1 mappings cannot have aliases`), so the retired identity
  cannot be carried anywhere.
- On a V2 or V3 record the same correction is refused outright with `revision would orphan a
  previously published row link; preserve it and request a mapping migration`.
- The V2 `merges` path does preserve both identities as aliases, but it requires the two rows to
  carry the **same** role, which is exactly the correction that changes the identity.

So each pairing fix needs the supported V1-to-V2 mapping migration to carry the retired identity as
an alias. `blocked-fix-alias-proposals.json` lists the exact alias entries needed: 297 proposals
over 15 items, each naming the published child ids, their language slot, their source range in the
frozen field, and the alias entry the migration must write so that every published link keeps
resolving. Nothing in that file is applied.

### 2.2 Findings that depend on the pairing fix

- `amal-aamal-rvyt-hlal` r00003 and r00004 continuation: the Arabic source row ends inside a word,
  so that boundary must be joined exactly, while the Persian boundary needs one space; and the two
  rows carry different roles, so the merge is refused until the pairing fix lands.
- `amal-aamal-rvyt-hlal` r00001: the cut at code point 3 isolates the first word. Removing it
  retires two published child ids, so it waits for the same migration.
- `dua-dvm-daahay-vqt` r00009 and r00010 continuation: the two rows carry different roles, so the
  join is refused until the role correction behind the pairing fix lands.
- `amal-aamal-rvyt-hlal` r00006, `amal-aamal-shaban` r00002 to r00007, `amal-asharh` r00002, r00003,
  r00007 to r00009, `amal-fzylt-thlyl-masvr` r00002 to r00004, r00006, r00009, r00010,
  `khavas-nvshth-ay-hmrah` r00002 to r00009, `ziyarat-daahay-bad-alyh` r00002, r00004, r00005, r00006:
  the role and pairing correction is agreed and is in the proposal file.
- `amal-fzylt-thlyl-masvr` r00009 and r00010: the Persian carries divine descriptors that the
  Arabic of the same row does not. That is a source discrepancy to record, not to repair; the source
  text is retained unchanged.
- `ziyarat-pyadh-rftn-shah` r00001 and r00013: the role of the published child rows is wrong
  (narrative, not instruction or quotation); correcting it retires those identities, so it waits
  for the same migration.
- `amal-aamal-arfh-2` r00002, r00005, r00033 and `namaz-taqyb-sbh-nql` r00015: role and boundary
  changes inside published rows; same dependency.

### 2.3 A language-slot defect that is confirmed but not applied

`ziyarat-pyadh-rftn-shah` r00015: the layout writes the **Arabic** piece into the **Persian** slot,
so the Arabic inscription continuation is published as Persian and is unpaired. The corrected layout
pairs the Arabic with its own Persian rendering in one row, which retires the two published child
ids of this row. The alias proposal for that row is in the proposal file. Not applied for the same
reason.

### 2.4 Misaligned cut boundaries

`ziyarat-daahay-bad-alyh` r00002, r00004, r00005: the Persian cut boundaries do not line up with the
Arabic ones, which was checked against the source rows. Joining now would pair non-corresponding
clauses, so the alignment has to be fixed first; the realignment retires published child ids and
waits for the migration.

### 2.5 Already blocked by the published-alias guard, unchanged

- `amal-slvat-shaban` r00004 to r00007 finer matched cuts and the r00006/fa boundary: an ordinary
  apply of the finer plan was refused because it would orphan published V2/V3 row links. The plan and
  layout were restored and nothing was bypassed.
- `item-asharh-6` r00002 paired praise and r00005/fa introduction versus quotation: the same
  refusal, with the same restoration.
- `amal-slvat-shaban` long multi-clause recitations: the same migration dependency, and no re-split
  was made only because a row is long.

## 3. Spacing proposals that need a separate Agent-5 decision

Each proposal inserts exactly one U+0020 at the recorded offset in the current canonical text of the
named language. A space is an editorial correction, not source text, and it is not approved here.
The eight earlier proposals for `amal-slvat-shaban` and `item-asharh-6` were already accepted by
Agent-5 and are not repeated below.

| Item | Merged row | Language | Offset | Left | Right |
|---|---|---|---:|---|---|
| `amal-aamal-arfh-2` | m7553b0a83167f086e7dc763c | ar | 150 | r00008 | r00009 |
| `amal-aamal-arfh-2` | m7553b0a83167f086e7dc763c | fa | 132 | r00008 | r00009 |
| `amal-aamal-arfh-2` | mdbec1e72761d371d2829b9b7 | ar | 24 | r00017-s18f0993006f44169 | r00018 |
| `amal-aamal-arfh-2` | mdbec1e72761d371d2829b9b7 | fa | 23 | r00017-s18f0993006f44169 | r00018 |
| `amal-aamal-arfh-2` | mfea91ea451eede4b236a077c | ar | 609 | r00030 | r00031 |
| `amal-aamal-arfh-2` | mfea91ea451eede4b236a077c | fa | 533 | r00030 | r00031 |
| `dua-daa-zndh-shdn` | m25f8aba9778a65efac295c45 | fa | 184 | r00001 | r00002-s0b1d6d51987de706 |
| `dua-mkhtsrtryn-daahay-shr` | m2755db25f9718c52d1ff2976 | ar | 36 | r00015 | r00016 |
| `dua-mkhtsrtryn-daahay-shr` | m2755db25f9718c52d1ff2976 | fa | 27 | r00015 | r00016 |
| `dua-mkhtsrtryn-daahay-shr` | m72987a32272c942322821a04 | ar | 11 | r00017 | r00018 |
| `dua-mkhtsrtryn-daahay-shr` | m72987a32272c942322821a04 | fa | 15 | r00017 | r00018 |
| `dua-mkhtsrtryn-daahay-shr` | m72987a32272c942322821a04 | ar | 51 | m2dbdf747a3155e7a362eb925 | r00019 |
| `dua-mkhtsrtryn-daahay-shr` | m72987a32272c942322821a04 | fa | 49 | m2dbdf747a3155e7a362eb925 | r00019 |
| `khavas-ahkam-dfn-amvat` | m6dbfd6b323e414d0a8b2579f | fa | 75 | r00001 | r00002 |
| `monajat-mnajat-dvm-raz` | m61e5472656670603f3bf8778 | ar | 22 | r00006 | r00007 |
| `monajat-mnajat-dvm-raz` | m61e5472656670603f3bf8778 | fa | 18 | r00006 | r00007 |
| `namaz-kyfyt-astkharh-tsbyh` | m194e5b45e984e2679dfd6ab0 | fa | 217 | r00001 | r00002 |
| `namaz-taqyb-sbh-nql` | m6f806b216ef2dc2747e63197 | ar | 248 | r00013-sd2a7a94bd2258f18 | r00014 |
| `namaz-taqyb-sbh-nql` | m6f806b216ef2dc2747e63197 | fa | 242 | r00013-sd2a7a94bd2258f18 | r00014 |

Reason for each: the source split one continuous phrase across those rows, and the two sides meet
without whitespace. Where the source split a word, the split was checked against the surrounding
words before the proposal was made. No other space was added, proposed, or removed anywhere in this
round.

## 4. Historical links

`HISTORICAL-LINKS.md` reports the 65 prior row ids that are missing across the 5 affected Agent-4
items, with per-id recovery classes. That count is unchanged by this round: the fixes above retired
no published identity, and the proposal file adds the identities that a future migration would have
to carry.

## 5. What is not claimed

This is a structural and linguistic-structure review of cuts, roles and pairings, checked against
the frozen source rows. It is not a word-by-word semantic judgement, not a translation, and not a
scholarly, translation-provenance, publication-rights, human or semantic-quality approval. The
nineteen spacing proposals above still need an Agent-5 decision before the affected V3 items are
complete.

## 6. Round 3: Agent-5's review of snapshot `c23c83c4…` and the fixes that followed

Agent-5 reviewed the ten items changed in round 2 against exact snapshot
`c23c83c4c97eb442bf2a9aa3495458bb73210e26` and **individually accepted all 19 proposed spaces**
(they are not source text). It verified five items complete: `dua-daa-zndh-shdn`,
`dua-mkhtsrtryn-daahay-shr`, `khavas-ahkam-dfn-amvat`, `monajat-mnajat-dvm-raz` and
`namaz-kyfyt-astkharh-tsbyh`. `namaz-taqyb-sbh-nql` has its layout and spaces accepted, but its four
earlier historical line-break decisions remain escalated, so its verifier result is still needs-work.

### Applied in this round

| Item | Row | Change | Link effect |
|---|---|---|---|
| `amal-aamal-arfh-2` | r00002 | The row held three numbered practices and a closing compiler remark in one field. It is now four rows: the first practice, the second practice with its reported merit, the third practice that carries the prayer direction, and the compiler's own closing remark. Roles: note, note, instruction, note. | Base row id stays resolvable through the redirect; this row had no published child id. |
| `amal-aamal-arfh-2` | r00005 | The prayer directions and the compiler's closing comment shared one field. They are now two rows: the directions as instruction, the comment as note. | Base row id stays resolvable; no published child id existed. |
| `amal-aamal-arfh-2` | r00033 | Role corrected from note to instruction: the row is a sequence of directions and substitutions, not an independent note. | Row identity unchanged. |
| `amal-aamal-arfh-2` | r00026 + r00027 | The blessing continued across two rows, and the Arabic and Persian broke at different points, so the two rows could not pair. The blessing was joined into one bilingual row, which removes the mismatched boundary. After the join the Arabic blessing clause and its Persian clause carry the same structure: each begins with the formula for sending blessings upon the Prophet, names him, then names his family and the group addressed, so the two sides line up clause by clause. | Base ids r00026 and r00027 stay resolvable. Two proposed spaces. |

### Still blocked on the mapping migration, now with the alias entries attached

Agent-5 confirmed the blocked findings and the alias proposal. The list grew to 297 alias entries
over 15 items, because the proposal file now covers every flagged base row that already has
published child ids, including the same-language splits.

- `ziyarat-pyadh-rftn-shah` r00001: the cut divides one continuous historical account, and the
  second part is wrongly labelled instruction. All three cuts in this item sit at whitespace
  boundaries, so the defect is one of role and grouping, not of a broken word. Reclassifying
  retires the published child id, so it waits for the migration.
- `ziyarat-pyadh-rftn-shah` r00013: both parts are historical narration introducing an inscription,
  not quotations. The join with r00012 is available in the tooling, but the role correction has to
  come first and that is what needs the migration.
- `ziyarat-pyadh-rftn-shah` r00015: the Arabic piece is still published in the Persian slot.
- `amal-aamal-rvyt-hlal` r00001 and `amal-aamal-shaban` r00001: the day label is cut away from the
  rest of the row, and the instruction starts inside a narrative report. Both cuts sit at
  whitespace boundaries. Regrouping them changes the role of a published child, so they wait for
  the migration.
- The pairing and role class in `amal-aamal-shaban` r00002 to r00007, `amal-aamal-rvyt-hlal` r00003,
  r00006 to r00008, `amal-asharh`, `amal-fzylt-thlyl-masvr`, `khavas-nvshth-ay-hmrah`,
  `ziyarat-daahay-bad-alyh`, `dua-dvm-daahay-vqt`, `amal-mjavl-bvdn-daayy`, `amal-aamal-hrm-hsyn`,
  `dua-yamn-thl-hady`, `namaz-ayza-hajt-sndhay`, `item-asharh-6` and `amal-slvat-shaban`.

### New spacing proposals needing a separate Agent-5 decision

| Item | Merged row | Language | Offset | Left | Right |
|---|---|---|---:|---|---|
| `amal-aamal-arfh-2` | md9954596d59be1a71a3e08fb | ar | 178 | r00026 | r00027 |
| `amal-aamal-arfh-2` | md9954596d59be1a71a3e08fb | fa | 174 | r00026 | r00027 |

The other 19 proposals were accepted by Agent-5 and are not repeated here. Each remaining proposal
inserts exactly one U+0020 at the recorded offset in the current canonical text of the named
language; a space is an editorial correction, not source text, and it is not approved here.

## 7. Round 4: the answer to Agent-5's review of snapshot `c9fa191a…`

Agent-5's review record for `amal-aamal-arfh-2`, bound to my exact author-ready snapshot
`c9fa191acade1f72ab36e05f39ea931d4cb9cb5d`, accepts every source row of that item except two, and
accepts all eight proposed spaces individually. The layout decision is `revise` for two named
reasons, and one issue is escalated for separate adjudication: the historical line-break removal in
this item is documented unreviewed history and is neither restored nor certified here.

### 7.1 r00002: the role of the first practice, and the practice against the report of merit

Agent-5's finding is accepted on the content. The four published children of r00002 are the four
numbered practices and the compiler's closing remark, and the roles as published are `note`,
`note`, `instruction`, `note`.

| Published child | Range in the frozen base `fa` field | Role now | Role the finding asks for |
|---|---|---|---|
| `r00002-s16b235f3fb54b1a5` | 0–10 | `note` | the practice label, not a narrative note |
| `r00002-s7912db66cde98eb8` | 10–432 | `note` | the practice itself, then the report of merit as a separate row |
| `r00002-sefe2b44d479f4e2b` | 432–719 | `instruction` | unchanged |
| `r00002-sb8a7c4ea61e1d0eb` | 719–855 | `note` | unchanged |

The first piece is a numbered label for a practice, so it is a section heading rather than a
narrative note, and `heading` is the role that fits it. The second piece can be divided at **code
point 60** of the frozen base `fa` field: the offset is a whitespace boundary, the stated second
practice ends there, and the report of merit with the forward reference begins there. The remaining
two pieces are not touched.

**Why it is not applied.** The first change is a role change and the second is a cut, and both
retire a published child id: `r00002-s16b235f3fb54b1a5` and `r00002-s7912db66cde98eb8`. The item's
record is a V3 record, and the tooling refuses a revision that orphans a published row link unless
the retired identity can be carried as an alias, which is the supported mapping migration that the
coordinator has not supplied yet. The exact alias entries the migration must write are in
`round-4-alias-proposals.json`.

### 7.2 r00026 + r00027: the two petitions inside the joined blessing

Agent-5's second finding is also accepted, and it is a semantic finding rather than a request based
on length: the joined passage contains a blessing followed by two distinct petitions, and the review
names the paired openings. I located both openings in the current merged row
`md9954596d59be1a71a3e08fb` and checked the boundary on each side.

| Transition | Arabic offset | Persian offset | Arabic boundary | Persian boundary |
|---|---:|---:|---|---|
| blessing → first petition | 331 | 277 | whitespace | whitespace |
| first petition → second petition | 456 | 358 | whitespace | whitespace |

Both sides end a sentence and begin the paired opening at the same point, so the two cuts are
bilingual-aligned and each of them is a real transition rather than a length threshold. Cutting at
both would turn the merged row into three rows with the ranges listed in the proposal file.

**Why it is not applied.** The cuts retire `md9954596d59be1a71a3e08fb`, the merged row id that
was only just published in this snapshot, and the review itself requires that id to be preserved.
The alias entry that carries it onto the three resulting rows is in `round-4-alias-proposals.json`.
No re-split was made for any other reason, and no row was re-split merely because it is long.

### 7.3 What changed in Agent-4's own work in this round

No row of Agent-4's own 115 items changed, and no row of Agent-3's or Agent-5's was edited. This
round changed the reports and the proposal files only: the deep review of Agent-3's 49 flagged items
was expanded into per-case evidence, the coordinator's pinned tool files were restored, the known
targeted test failure was recorded, and the two findings above were answered with their exact
offsets. Agent-4's author-ready snapshot is still
`c9fa191acade1f72ab36e05f39ea931d4cb9cb5d`, so the review record bound to it stays valid and the
items whose content changed still need a fresh independent review.

### 7.4 Making the author commits share one history

Agent-5's isolated snapshot `4aae1ccd3bae6f027e81f1f21ca333f80cc135d5` was merged into this branch
with a merge commit, so that Agent-4's author-ready snapshot, Agent-5's author-ready snapshot and
Agent-3's reviewed snapshot `680317220f161994082132d8fb9aeb8dcc4d48e1` are all ancestors of one
branch and can all be bound against. The merge touched no file that Agent-4 had changed outside
`data/texts/` and `coordination/`, which are unioned by the safe merge drivers, and it produced no
conflict. After the merge: the authored audit is still 115 of 115 with no findings, all 115 of
Agent-4's review records still verify against Agent-3's snapshot, `verify-tool-info` still reports
`tool-version-matches`, and the test suite still shows the single known failure and nothing else.
Agent-5 still needs to merge `c9fa191a` into its own branch so that the review it writes can be
bound and verified against the exact author commit; the request is in the coordination message.

## 8. Round 4 corrections, and who was informed

### 8.1 Corrections to Agent-4's own published figures

Three numbers that Agent-4 had published were wrong, and are corrected here. In each case the
per-case evidence was right and only the summary was wrong, so no finding changed and nothing
in `data/` was touched.

**The class summary was not a partition.** The five structural classes of the 134 flagged source
rows are disjoint, and they are: 65 detached one-to-one, 13 detached multi-recitation, 4 already
paired, 34 one-sided and 18 note-only, summing to 134. The summary had instead reported a single
"detached pair" class of 112 rows, which is not a class at all: 112 is the count of flagged rows
that publish a recitation on at least one side but never pair the two sides in one output row,
which is 78 detached plus 34 one-sided. The detached bilingual pair itself, which is finding F1,
is **78 rows over 30 items**, not 112 rows over 49 items. The corrected partition is in
`DEEP-REVIEW-EVIDENCE.md` section 2 and in the `classes` field of `deep-review-evidence.json`,
and the per-row class of all 134 rows was already recorded correctly and was left untouched.

**The unexplained-unequal-count figure.** The summary reported 104 rows as explained by a
direction or report that legitimately has no counterpart. The per-case role evidence supports
**107**: 91 rows where the wider side is the Arabic side and 16 where it is the Persian side.
Nine further rows have an unequal piece count that no direction or report explains, and 18 rows
have equal piece counts.

**The failing merged row.** The reconciliation report named `amal-slvat-shaban` as the row that
fails `tests/runtime-audio.test.ts:156`. It is `amal-aamal-arfh-2`, merged row
`m7553b0a83167f086e7dc763c`. The screen behind that failure was also miscounted: counting every
recorded occurrence whose current field is longer than the recorded slice gives **54 occurrences
across 9 Agent-4 items**, not 75; over the whole corpus it is **104 occurrences across 14
items**, of which 50 are in 5 Agent-5 items. Only **3 occurrences** across 2 Agent-4 items fail
the assertion today, and the runner reports the first of them, which is the `amal-aamal-arfh-2`
row. `TOOLSET-RECONCILIATION.md` now carries the corrected table, and the duplicated
`amal-slvat-shaban` entry that the old table had is gone.

The full test suite is unchanged by all of this: 277 tests, 273 pass, 1 fail, 3 skipped, the
single failure being the known `tests/runtime-audio.test.ts:156`.

### 8.2 The shared historical-link taxonomy

Agent-3 asked for one shared definition before any migration lands, because four audits of the
same class of finding use four different classifications and summing them mixes definitions.
`HISTORICAL-LINKS.md` now carries that definition: old published row ids, one id in exactly one
class, resolvable unchanged; resolvable with different text; missing with an exact contiguous
match; missing and covered only through segment mappings; unresolved. Only the fourth class
blocks on the migration. The class of every one of Agent-4's 65 ids is now recorded in
`historical-link-proposals.json` as `3-missing-exact` (51 ids) or `4-missing-compositional`
(14 ids).

### 8.3 Who was informed, and why

Agent-4's only ring neighbours are Agent-3 and Agent-5, so the coordinator is reached through
them.

**Agent-3**, in message `47755cb2-3a3d-4c67-b5b0-fd0e749a3905`: the shared taxonomy above, the
acceptance of the counting caution, and the three corrections of Agent-4's own figures. Agent-3
authored the deepened source review that Agent-4 answered, and has no outstanding request of
Agent-4 otherwise.

**Agent-5**, in message `93fbac9d-d5f3-42e2-9664-99c5b2d66ce7`: the corrected failing row and the
corrected exposure counts, the corrected class partition, and the request to merge
`c9fa191a` before writing or binding the remaining reviews. Agent-5 authored the two round-4
findings, and its branch does not yet contain either of Agent-4's snapshots.

**The coordinator, through both neighbours**, for three decisions that are not Agent-4's to make:
integration reachability, because `c9fa191a` is still not an ancestor of any peer branch and
neither peer branch can read Agent-4's round-4 messages until it is merged; the choice of the
one historical-link taxonomy to migrate against, now that one shared definition exists; and the
selection of exactly one runtime-audio fix to land on main.

### 8.4 What remains blocked

The two accepted round-4 corrections stay blocked on the supported V1-to-V2 mapping migration:
the r00002 heading and second-practice split, and the two petition transitions inside
`md9954596d59be1a71a3e08fb`. Their offsets are recorded and their alias proposals are in
`round-4-alias-proposals.json`, and no canonical data, published id, row split, plan, layout or
review record was changed to accommodate them.

## 9. Round 5: Agent-5's two reviews of `namaz-ayd-ftr` and `ziyarat-amamyn-askryyn-alyhma`

Agent-5 merged Agent-4's author-ready snapshot `c9fa191a` into its own branch and then reviewed two
of Agent-4's items against it, in review records bound to `64d4950e`. Both records verify against
the exact author commit and both carry the decision `revise`. Agent-4 has read every source note in
both records against the frozen base and against the current canonical rows, and every one of the
findings is confirmed.

### 9.1 What was confirmed

In `namaz-ayd-ftr` the Persian renderings of the Arabic invocations are published as detached
`note` rows: r00002 has one Arabic invocation row and one Persian rendering row, and r00005 to
r00011 have three or two Arabic invocation rows followed by the same number of Persian rendering
rows. In `ziyarat-amamyn-askryyn-alyhma` the same holds for r00002 to r00004, r00008 and r00009. In
both items the Persian row is the rendering of the Arabic row in the same source row, so the
pairing class that Agent-5 raised against Agent-4's own items in earlier rounds applies to
Agent-4's items as well.

Three cross-row divisions are confirmed as well. In `namaz-ayd-ftr` the reported clause of r00003
ends where the first piece of r00004 begins, the two reported counts of r00004 are divided between
its two pieces, and the Arabic vocative of r00007 ends where the name of r00008 begins. In
`ziyarat-amamyn-askryyn-alyhma` the title of the cited book is divided between r00007 and r00008,
and the clause and its complement are divided between r00002 and r00003. Every one of these cuts
falls on a whitespace boundary, so no word is broken anywhere; what is divided is a clause, a
vocative or a title.

### 9.2 Why none of it is applied

The proposals are in `round-5-alias-proposals.json`, with the published id, the proposed id and
the blocker for every case. Nothing in `data/` changed.

- **The pairing and the role correction are the same operation, and it retires a published id.**
  A split row id is a hash of its source row, its language slots and its role label, so correcting
  the role of a Persian rendering changes that row's identity. The tool refuses the pairing merge
  first with `Merge requires matching reviewed row kinds`, and once the role is corrected the
  published id stops resolving. A V1 record has no alias array to carry it, and on a V2 or V3 record
  the same revision is refused outright with `revision would orphan a previously published row
  link; preserve it and request a mapping migration`.
- **The cross-row divisions cannot be joined with the current merge tool at all.** The merge joins
  two adjacent rows of the compiled item, and the compiler emits the output rows of one source row
  consecutively. When the earlier source row has several output rows, the row to be joined and the
  row it continues are separated by the intervening outputs, and the tool refuses with `Merge
  requires two adjacent current rows in source order`. This is a limitation of the tool, not of the
  migration, and it is the one item in this round that is not waiting on the mapping migration. It
  is reported to Agent-5 for relay to the coordinator.
- **The cut-level findings** on the Arabic side of r00005 to r00009 in `namaz-ayd-ftr`, and on
  r00003 and r00001 in `ziyarat-amamyn-askryyn-alyhma`, need a re-cut. A re-cut changes the piece
  identities, so it waits with the rest.

### 9.3 Reachability after this round

Agent-5's branch now contains `c9fa191a`, so Agent-4's author-ready snapshot, Agent-5's author-ready
snapshot and Agent-3's reviewed snapshot `68031722` can all be bound against one history, and the
round-5 reviews are bound to the exact author commit. Agent-3's branch does not yet contain
`c9fa191a` or the round-4 message `2043499a`, and Agent-4's branch does not yet contain Agent-3's
latest tip; that merge is still requested.
