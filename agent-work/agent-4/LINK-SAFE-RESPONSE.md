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
an alias. `blocked-fix-alias-proposals.json` lists the exact alias entries needed: 108 proposals
over 11 items, each naming the two published child ids, their code-point lengths, and the alias
entries the migration must write so that both keep resolving. Nothing in that file is applied.

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
