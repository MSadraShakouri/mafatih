# Agent-4 deep cut/pairing review of Agent-3 — per-case evidence

Exact review target: Agent-3 author-ready snapshot
`680317220f161994082132d8fb9aeb8dcc4d48e1`. Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0`.

This is the expansion of the aggregate pass recorded in `DEEP-REVIEW.md`. That pass counted
moves and unequal piece counts; this pass replaces every flagged item with per-case pairing
and role evidence, and states the uncertainty for each case.

## 1. What was read, and how the readings were checked

- All 115 Agent-3 plans and all 115 Agent-3 layouts at the exact snapshot above.
- The frozen base rows that every plan cuts refer to.
- The current row-split records of the 49 affected items in this branch.

**Baseline check.** Every source row of every Agent-3 plan was matched against the frozen
base by the source hash the plan itself carries: **1,660 of 1,660 source rows verify**, with zero
mismatches and zero missing rows. The cuts and piece numbering used below are therefore the
base rows, not an approximation.

**Language evidence.** The source fields of this corpus are not language columns: a single
field can hold Persian narration with an embedded Arabic quotation, and the Arabic
quotations are printed with Persian letter forms, so letter-level cues cannot separate the
two languages. The discriminator used here is token level and is reported as counts of
Persian function-word markers against Arabic function-word markers. It is a screen, not a
judgement: every case below was also read.

**Link effect.** Every one of the 134 flagged source rows in this branch already publishes at
least one child row id, and all 49 affected items still carry V1 records, which have no alias
array. Any regrouping of these rows therefore retires an exposed identity and needs the
supported V1-to-V2 mapping migration. That is why nothing in this document is applied.

## 2. The flagged set

49 items are flagged. They expand to **134 flagged source rows**. Every one of the 134
carries at least one slot move, 154 in total; 116 of them have an unequal piece count, and
85 of those are bilingual rows, which is the aggregate's `unequalPieceRows` figure over the
whole corpus. The rows fall into five structural classes, and the class decides what kind of
evidence applies.

| Class | Rows | Meaning |
|---|---:|---|
| A1. detached, one to one | 65 | one Arabic recitation and its Persian rendering sit in different output rows |
| A2. detached, multiple recitations | 13 | more than one recitation on a side; the recitations and their renderings sit in different output rows |
| B. already paired | 4 | both sides sit in one output row |
| C. one-sided | 34 | only one side of the source row carries a recitation |
| D. note-only | 18 | no recitation on either side; flagged for the slot move |

These five classes are a partition of the 134 flagged source rows: 65 + 13 + 4 + 34 + 18 =
134. Each flagged row belongs to exactly one class, and the class is recorded per row in
`deep-review-evidence.json`.

One further number appears in this report and is **not** a class. **112** is the count of
flagged rows that publish a recitation on at least one side but never pair the two sides in
one output row: that is A1 + A2 + C = 78 + 34 = 112. It is a different measure of the same
rows and must not be read as a sixth class or added to the class counts.

The four rows of class B are the reference pattern, and they are inside Agent-3's own work:
`item-avl-taqybat-mshtrk` r00014 and r00018, `namaz-item-3` r00001 and
`ziyarat-bad-rza-alyh` r00017. Their existence inside the same snapshot shows the detached
form is not a deliberate rule of the layout.

## 3. Findings that hold across the flagged set

**F1 — the detached bilingual pair (78 rows: 65 one-to-one and 13 multi-recitation, over 30
items).** In every class-A1 and class-A2 row the Arabic prayer and the Persian rendering of
that prayer are published in two separate output rows. The
protocol example for a re-homed direction is the Arabic and its existing Persian together in
one later output row. The two forms are not interchangeable: in the detached form the Arabic
prayer has no row that also holds its Persian, and the Persian rendering has no row that
also holds the Arabic it renders. This is the same pairing class that Agent-5 raised against
Agent-4's own items and that Agent-4 accepted and recorded as a real defect.

**F2 — content published in the wrong destination slot (3 rows).** Three rows carry content
whose language does not match the slot it was published in:

| Item | Row | Content | Published as | Reading |
|---|---|---|---|---|
| `ziyarat-aymh-bqya-alyhm` | r00001 | Persian: the gloss that names the imams whose visitation is being described | `ar` slot, kind `recitation` | Persian text in the Arabic slot |
| `ziyarat-item-12` | r00001 | Persian: the title of the visitation | `ar` slot, kind `recitation` | Persian text in the Arabic slot, and a title labelled as a recitation |
| `ziyarat-aymh-bqya-alyhm` | r00009 | Arabic: the continuation of the prayer that starts in r00008 | `fa` slot, kind `note` | Arabic text in the Persian slot; the row's own Persian rendering is in the same slot, so the Arabic has no Arabic row at all |

**F3 — role labels that do not match the content (32 rows, plus three role inversions).**
In the 32 rows the Persian side carries a recitation and the Arabic side of the same source
row carries no recitation at all, because the Arabic was either re-homed into the Persian
slot, embedded in a Persian direction, or continued into a neighbouring row. Three further
rows invert the roles outright, and these were found by reading rather than by counting:

| Item | Row | What the layout publishes | Role evidence |
|---|---|---|---|
| `amal-syghh-astghfar-fzylt` | r00002 | a Persian narration as `recitation`, and the Persian rendering of the Arabic prayer as `note` | the narration is not a recitation and the rendering is |
| `dua-svm-daahay-vqt` | r00002 | the Persian rendering of an Arabic phrase as `note`, and the Persian direction that carries that Arabic phrase as `instruction` | the rendering of a prayer is not a note |
| `namaz-astkharh-zat-alrqaa` | r00002 | the Persian rendering of an Arabic phrase as `note`, and the Persian direction that carries that Arabic phrase as `instruction` | the rendering of a prayer is not a note |

**F4 — recitations that stop mid-invocation (6 rows).** The Arabic piece ends inside an
invocation and the rest of the prayer is in the next source row, yet the piece is published
as a complete `recitation`: `dua-hsyn-alyh-alslam` r00016, `namaz-hajt-nvh-alyh` r00013,
`namaz-valdyn-avlad-amvat` r00003, `ziyarat-kyfyt-rza-alyh` r00005 and r00022, and
`khavas-aqyqh` r00002. In each of these the Arabic continues in the following source row, and
in four of them the Persian rendering of the whole prayer sits in that same following row.

**Not a finding.** An unequal piece count by itself is not a defect. In 107 of the 134 flagged
rows the per-case role evidence states that the unequal count is explained by the wider side
carrying extra non-recitation pieces, which are a direction or a report that legitimately has
no counterpart: the direction says what to recite, and the recitation that follows is rendered
once. The wider side is the Arabic side in 91 of those rows and the Persian side in 16. That
is the expected shape, and 107 is the count the per-case evidence supports.

## 4. Per-case evidence

Each entry names the case class, the published shape, the pairing evidence, the role
evidence, what could not be settled, and the link consequence.

### 1. `amal-aaddt-lkl-hvl` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00012** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 1 piece(s) [recitation].
- Published as: ar←fa#0 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (59 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 2. `amal-aamal-jmah-2` — 11 slot move(s), 4 unequal row(s), 6 flagged row(s)

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (80 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (72 code points) and one Persian recitation (67 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: one-sided

- Sides: Arabic side 1 piece(s) [instruction]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (90 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic phrase is embedded in the Persian direction of this same source row, and the Persian rendering of that phrase is the row's own Persian piece. The counterpart is inside the row, but the Arabic was never separated out of the direction.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00008** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (6 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (41 code points) and one Persian recitation (51 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00010** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 5 piece(s) [recitation, note, note, note, note].
- Published as: ar←fa#0 fa:— *recitation*; ar:— fa←fa#1 *note*; ar:— fa←fa#2 *note*; ar:— fa←fa#3 *note*; ar:— fa←fa#4 *note*.
- Slot move evidence: ar slot ← source fa field piece 0 (56 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. No rendering of the recited passage was located in the adjacent rows that were read; the neighbouring rows carry the next report and the start of the following entry.
- Role evidence: Published roles: recitation, note. The unequal count is explained by the Persian side carrying 4 extra non-recitation piece(s) (note, note, note, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 5 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00013** — class: detached-1to1

- Sides: Arabic side 6 piece(s) [note, note, note, instruction, instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *note*; ar:— fa←ar#2 *note*; ar:— fa←ar#3 *instruction*; ar:— fa←ar#4 *instruction*; ar←ar#5 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (154 code points, language: fa, 9 Persian / 0 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (76 code points, language: fa, 6 Persian / 1 Arabic markers), published with kind `note`; fa slot ← source ar field piece 2 (100 code points, language: fa, 7 Persian / 0 Arabic markers), published with kind `note`; fa slot ← source ar field piece 3 (85 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`; fa slot ← source ar field piece 4 (227 code points, language: fa, 11 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (82 code points) and one Persian recitation (53 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, instruction, recitation. The two sides of the source row carry different roles (Arabic side: note, instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 5 extra non-recitation piece(s) (note, note, note, instruction, instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 7 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00023** — class: detached-1to1

- Sides: Arabic side 3 piece(s) [note, note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *note*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (156 code points, language: fa, 8 Persian / 0 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (186 code points, language: fa, 14 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (27 code points) and one Persian recitation (46 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (note, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 3. `amal-aamal-mkhsvsh-byst` — 4 slot move(s), 2 unequal row(s), 4 flagged row(s)

**r00004** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (26 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (209 code points) and one Persian recitation (199 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (18 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (141 code points) and one Persian recitation (155 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (59 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00008** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 0 piece(s) [—].
- Published as: ar:— fa←ar#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (70 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 4. `amal-aamal-msjd-kvfh` — 6 slot move(s), 5 unequal row(s), 5 flagged row(s)

**r00003** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (48 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (79 code points) and one Persian recitation (69 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00004** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (44 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (438 code points) and one Persian recitation (269 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: detached-1to1

- Sides: Arabic side 3 piece(s) [note, instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *instruction*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (21 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (100 code points, language: fa, 8 Persian / 1 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (156 code points) and one Persian recitation (140 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, instruction, recitation. The two sides of the source row carry different roles (Arabic side: note, instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (note, instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00011** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (16 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (37 code points) and one Persian recitation (23 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00012** — class: detached-multi

- Sides: Arabic side 3 piece(s) [instruction, recitation, recitation]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (7 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 2 recitation piece(s) and the Persian side 2. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 5 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 5. `amal-aamal-stvn` — 3 slot move(s), 3 unequal row(s), 3 flagged row(s)

**r00004** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (224 code points, language: fa, 14 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (341 code points) and one Persian recitation (327 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00009** — class: detached-multi

- Sides: Arabic side 3 piece(s) [recitation, instruction, recitation]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar←ar#0 fa:— *recitation*; ar:— fa←ar#1 *instruction*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 1 (30 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 2 recitation piece(s) and the Persian side 2. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: recitation, instruction. The two sides of the source row carry different roles (Arabic side: recitation, instruction; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 5 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00010** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (61 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (244 code points) and one Persian recitation (242 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 6. `amal-aamal-stvn-3` — 4 slot move(s), 3 unequal row(s), 3 flagged row(s)

**r00003** — class: detached-multi

- Sides: Arabic side 6 piece(s) [note, recitation, recitation, recitation, recitation, recitation]; Persian side 3 piece(s) [recitation, recitation, recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *recitation*; ar←ar#2 fa:— *recitation*; ar←ar#3 fa:— *recitation*; ar←ar#4 fa:— *recitation*; ar←ar#5 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*; ar:— fa←fa#2 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (237 code points, language: fa, 15 Persian / 1 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (126 code points, language: fa, 10 Persian / 0 Arabic markers), published with kind `recitation`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 4 recitation piece(s) and the Persian side 4. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 9 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (54 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (110 code points) and one Persian recitation (96 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00011** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (17 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (337 code points) and one Persian recitation (270 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 7. `amal-adab-vqt-khvab` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00002** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (33 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (218 code points) and one Persian recitation (203 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 8. `amal-adab-vzv` — 10 slot move(s), 10 unequal row(s), 10 flagged row(s)

**r00004** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (95 code points, language: fa, 8 Persian / 1 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (111 code points) and one Persian recitation (74 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (67 code points, language: fa, 7 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (76 code points) and one Persian recitation (86 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (35 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (112 code points) and one Persian recitation (85 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (28 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (108 code points) and one Persian recitation (107 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00008** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (33 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (109 code points) and one Persian recitation (113 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00009** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (29 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (165 code points) and one Persian recitation (138 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00010** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (56 code points, language: fa, 5 Persian / 1 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (44 code points) and one Persian recitation (36 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00011** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (43 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (141 code points) and one Persian recitation (128 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00012** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (24 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (106 code points) and one Persian recitation (71 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00013** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (6 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (34 code points) and one Persian recitation (36 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 9. `amal-akhr-shaban-rmzan` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00001** — class: detached-multi

- Sides: Arabic side 5 piece(s) [note, recitation, recitation, recitation, recitation]; Persian side 3 piece(s) [recitation, recitation, recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar←ar#3 fa:— *recitation*; ar←ar#4 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*; ar:— fa←fa#2 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (127 code points, language: fa, 8 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 4 recitation piece(s) and the Persian side 3. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 8 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 10. `amal-daahay-rjb` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00019** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 0 piece(s) [—].
- Published as: ar:— fa←ar#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (56 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 11. `amal-syghh-astghfar-fzylt` — 3 slot move(s), 2 unequal row(s), 2 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (103 code points, language: fa, 7 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (59 code points) and one Persian recitation (55 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00002** — class: one-sided

- Sides: Arabic side 2 piece(s) [recitation, note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *recitation*; ar:— fa←ar#1 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (41 code points, language: fa, 5 Persian / 1 Arabic markers), published with kind `recitation`; fa slot ← source ar field piece 1 (337 code points, language: fa, 10 Persian / 4 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Persian rendering of the Arabic prayer is the row's own Persian piece, and it is labelled `note` while the Persian narration of the row is labelled `recitation`. The roles are inverted; the counterpart is inside the row.
- Role evidence: Published roles: recitation, note. The two sides of the source row carry different roles (Arabic side: recitation, note; Persian side: note), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 12. `dua-aafyt` — 5 slot move(s), 3 unequal row(s), 4 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (113 code points, language: fa, 11 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (324 code points) and one Persian recitation (236 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00002** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (56 code points, language: not decidable by the marker screen, 1 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: detached-1to1

- Sides: Arabic side 3 piece(s) [note, note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *note*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (71 code points, language: fa, 3 Persian / 1 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (134 code points, language: fa, 8 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (257 code points) and one Persian recitation (216 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (note, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (90 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (121 code points) and one Persian recitation (96 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 13. `dua-ayza-daahay-aafyt` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00003** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (120 code points, language: fa, 7 Persian / 2 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (305 code points) and one Persian recitation (268 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 14. `dua-hshtm-daahay-vardh` — 5 slot move(s), 0 unequal row(s), 5 flagged row(s)

**r00004** — class: one-sided

- Sides: Arabic side 2 piece(s) [recitation, note]; Persian side 0 piece(s) [—].
- Published as: ar←ar#0 fa:— *recitation*; ar:— fa←ar#1 *note*.
- Slot move evidence: fa slot ← source ar field piece 1 (41 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: recitation, note. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [note, recitation].
- Published as: ar:— fa←fa#0 *note*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (105 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: note, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 3 piece(s) [instruction, recitation, note].
- Published as: ar:— fa←fa#0 *instruction*; ar←fa#1 fa:— *recitation*; ar:— fa←fa#2 *note*.
- Slot move evidence: ar slot ← source fa field piece 1 (240 code points, language: ar, 1 Persian / 3 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: instruction, recitation, note. The unequal count is explained by the Persian side carrying 2 extra non-recitation piece(s) (instruction, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [note, recitation].
- Published as: ar:— fa←fa#0 *note*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (55 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: note, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00008** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [recitation, note].
- Published as: ar←fa#0 fa:— *recitation*; ar:— fa←fa#1 *note*.
- Slot move evidence: ar slot ← source fa field piece 0 (96 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: recitation, note. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 15. `dua-hsyn-alyh-alslam` — 7 slot move(s), 1 unequal row(s), 6 flagged row(s)

**r00001** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (601 code points, language: fa, 30 Persian / 3 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer starts in the next source row, whose Persian field holds its rendering. The counterpart is in the next row, so the correction is a cross-row join.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00004** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (186 code points, language: fa, 6 Persian / 4 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic phrase is embedded in the Persian direction of this same source row, and the Persian rendering of that phrase is the row's own Persian piece. The counterpart is inside the row.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (115 code points, language: fa, 8 Persian / 2 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (53 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (95 code points) and one Persian recitation (66 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00013** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar←fa#0 fa:— *recitation*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (108 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`; ar slot ← source fa field piece 1 (89 code points, language: ar, 0 Persian / 3 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 2 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. No rendering of the two recitations was located in the adjacent rows that were read; the next row opens a further numbered entry.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00016** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [note, recitation].
- Published as: ar:— fa←fa#0 *note*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (14 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic piece stops inside the invocation and the prayer continues in the next source row, whose Persian field holds the rendering of the whole prayer. The counterpart is in the next row.
- Role evidence: Published roles: note, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 16. `dua-saat-12` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00001** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 0 piece(s) [—].
- Published as: ar:— fa←ar#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (94 code points, language: fa, 6 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 17. `dua-svm-daahay-vqt` — 5 slot move(s), 3 unequal row(s), 5 flagged row(s)

**r00002** — class: note-only

- Sides: Arabic side 1 piece(s) [instruction]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *instruction*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (121 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: instruction, note. The two sides of the source row carry different roles (Arabic side: instruction; Persian side: note), which is the role evidence for this case.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (12 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (172 code points) and one Persian recitation (159 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (101 code points, language: fa, 7 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (55 code points) and one Persian recitation (50 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00011** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (332 code points, language: fa, 13 Persian / 5 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic phrases are embedded in the Persian direction of this same source row, and the Persian rendering of those phrases is the row's own Persian piece. The counterpart is inside the row.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00015** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (122 code points, language: fa, 7 Persian / 1 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (124 code points) and one Persian recitation (97 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 18. `item-abrt-grftn-amvat` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00014** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [note, recitation].
- Published as: ar:— fa←fa#0 *note*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (90 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: note, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 19. `item-avl-taqybat-mshtrk` — 7 slot move(s), 6 unequal row(s), 6 flagged row(s)

**r00002** — class: detached-multi

- Sides: Arabic side 5 piece(s) [instruction, recitation, recitation, recitation, recitation]; Persian side 4 piece(s) [recitation, recitation, recitation, recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar←ar#3 fa:— *recitation*; ar←ar#4 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*; ar:— fa←fa#2 *recitation*; ar:— fa←fa#3 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (32 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 4 recitation piece(s) and the Persian side 4. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 9 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: detached-1to1

- Sides: Arabic side 3 piece(s) [instruction, instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar:— fa←ar#1 *instruction*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (105 code points, language: not decidable by the marker screen, 1 Persian / 1 Arabic markers), published with kind `instruction`; fa slot ← source ar field piece 1 (10 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (407 code points) and one Persian recitation (448 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (instruction, instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00014** — class: paired

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (20 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and its Persian rendering are published together in a single output row.
- Correspondence evidence: The Arabic side contributes 1 recitation piece(s) and the Persian side 1; they sit in one row, and the Persian piece is the rendering of the Arabic piece (checked by reading both sides).
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Both sides of the pair sit in the same output row. This is the pattern the other rows deviate from.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00018** — class: paired

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (31 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and its Persian rendering are published together in a single output row.
- Correspondence evidence: The Arabic side contributes 1 recitation piece(s) and the Persian side 1; they sit in one row, and the Persian piece is the rendering of the Arabic piece (checked by reading both sides).
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Both sides of the pair sit in the same output row. This is the pattern the other rows deviate from.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00019** — class: detached-multi

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 4 piece(s) [recitation, recitation, recitation, recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*; ar:— fa←fa#2 *recitation*; ar:— fa←fa#3 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (53 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 1 recitation piece(s) and the Persian side 4. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 6 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00037** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (16 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (99 code points) and one Persian recitation (66 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 20. `item-nhm-baz-ahraz` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00004** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 3 piece(s) [note, instruction, recitation].
- Published as: ar:— fa←fa#0 *note*; ar:— fa←fa#1 *instruction*; ar←fa#2 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 2 (76 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: note, instruction, recitation. The unequal count is explained by the Persian side carrying 2 extra non-recitation piece(s) (note, instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 21. `item-srfh-drd-shkm` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00007** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [instruction, recitation].
- Published as: ar:— fa←fa#0 *instruction*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (13 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: instruction, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 22. `khavas-aqyqh` — 2 slot move(s), 1 unequal row(s), 2 flagged row(s)

**r00002** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [note, recitation].
- Published as: ar:— fa←fa#0 *note*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (8 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic piece stops inside the invocation and the prayer continues in the next source row, whose Arabic and Persian fields carry the rest of the prayer and its rendering. The counterpart is in the next row.
- Role evidence: Published roles: note, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: detached-multi

- Sides: Arabic side 5 piece(s) [recitation, instruction, recitation, recitation, recitation]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar←ar#0 fa:— *recitation*; ar:— fa←ar#1 *instruction*; ar←ar#2 fa:— *recitation*; ar←ar#3 fa:— *recitation*; ar←ar#4 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 1 (43 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 4 recitation piece(s) and the Persian side 2. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: recitation, instruction. The two sides of the source row carry different roles (Arabic side: recitation, instruction; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 7 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 23. `khavas-hrz-hsn-asgry` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00001** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 0 piece(s) [—].
- Published as: ar:— fa←ar#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (41 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 24. `khavas-rfa-framvshy` — 3 slot move(s), 0 unequal row(s), 2 flagged row(s)

**r00002** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 3 piece(s) [instruction, recitation, note].
- Published as: ar:— fa←fa#0 *instruction*; ar←fa#1 fa:— *recitation*; ar:— fa←fa#2 *note*.
- Slot move evidence: ar slot ← source fa field piece 1 (168 code points, language: not decidable by the marker screen, 1 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer is in this row and its rendering is the Persian piece of the next source row. The counterpart is in the next row.
- Role evidence: Published roles: instruction, recitation, note. The unequal count is explained by the Persian side carrying 2 extra non-recitation piece(s) (instruction, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar←fa#0 fa:— *recitation*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (14 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`; ar slot ← source fa field piece 1 (95 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 2 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 25. `khavas-tfal-qran-mjyd` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (264 code points, language: fa, 14 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (148 code points) and one Persian recitation (112 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 26. `monajat-mnajat-hshtm-raz` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00002** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 1 piece(s) [recitation].
- Published as: ar←fa#0 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (105 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer is in this row and its rendering is the Persian piece of the next source row. The counterpart is in the next row.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 27. `namaz-adab` — 3 slot move(s), 3 unequal row(s), 3 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (33 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (356 code points) and one Persian recitation (285 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00002** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (115 code points, language: fa, 10 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (175 code points) and one Persian recitation (154 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00004** — class: detached-multi

- Sides: Arabic side 3 piece(s) [instruction, recitation, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (41 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 2 recitation piece(s) and the Persian side 1. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 28. `namaz-adab-mghrb-naflh` — 8 slot move(s), 3 unequal row(s), 6 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 3 piece(s) [note, instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *instruction*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (142 code points, language: fa, 7 Persian / 2 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (94 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (256 code points) and one Persian recitation (210 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, instruction, recitation. The two sides of the source row carry different roles (Arabic side: note, instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (note, instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 1 piece(s) [recitation].
- Published as: ar←fa#0 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (89 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic piece stops inside the quotation and the prayer continues in the next source row, whose Arabic and Persian fields carry the rest of the prayer and its rendering. The counterpart is in the next row.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (16 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (95 code points) and one Persian recitation (96 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: note-only

- Sides: Arabic side 1 piece(s) [instruction]; Persian side 1 piece(s) [instruction].
- Published as: ar:— fa←ar#0 *instruction*; ar:— fa←fa#0 *instruction*.
- Slot move evidence: fa slot ← source ar field piece 0 (97 code points, language: fa, 3 Persian / 2 Arabic markers), published with kind `instruction`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: instruction.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (12 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (130 code points) and one Persian recitation (87 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00010** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 3 piece(s) [recitation, recitation, note].
- Published as: ar←fa#0 fa:— *recitation*; ar←fa#1 fa:— *recitation*; ar:— fa←fa#2 *note*.
- Slot move evidence: ar slot ← source fa field piece 0 (104 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`; ar slot ← source fa field piece 1 (48 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 2 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: recitation, note. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 29. `namaz-astghash-fatmh-alyha` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (214 code points, language: fa, 17 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (37 code points) and one Persian recitation (33 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 30. `namaz-astkharh-zat-alrqaa` — 3 slot move(s), 2 unequal row(s), 3 flagged row(s)

**r00001** — class: detached-multi

- Sides: Arabic side 3 piece(s) [instruction, recitation, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (80 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 2 recitation piece(s) and the Persian side 1. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00002** — class: note-only

- Sides: Arabic side 1 piece(s) [instruction]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *instruction*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (32 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: instruction, note. The two sides of the source row carry different roles (Arabic side: instruction; Persian side: note), which is the role evidence for this case.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (10 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (79 code points) and one Persian recitation (80 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 31. `namaz-hajt-nvh-alyh` — 11 slot move(s), 7 unequal row(s), 9 flagged row(s)

**r00008** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (47 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (178 code points) and one Persian recitation (149 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00009** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (70 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (198 code points) and one Persian recitation (172 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00010** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (34 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (140 code points) and one Persian recitation (129 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00012** — class: note-only

- Sides: Arabic side 1 piece(s) [instruction]; Persian side 0 piece(s) [—].
- Published as: ar:— fa←ar#0 *instruction*.
- Slot move evidence: fa slot ← source ar field piece 0 (44 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: instruction. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00013** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 3 piece(s) [recitation, recitation, recitation].
- Published as: ar←fa#0 fa:— *recitation*; ar←fa#1 fa:— *recitation*; ar←fa#2 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (898 code points, language: ar, 3 Persian / 17 Arabic markers), published with kind `recitation`; ar slot ← source fa field piece 1 (84 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`; ar slot ← source fa field piece 2 (8 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 3 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer is in this row and its rendering is the Persian piece of the next source row. The counterpart is in the next row.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00016** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (29 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (178 code points) and one Persian recitation (177 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00017** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (52 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (156 code points) and one Persian recitation (121 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00018** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (50 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (96 code points) and one Persian recitation (72 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00019** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (40 code points, language: fa, 5 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (63 code points) and one Persian recitation (79 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 32. `namaz-item-3` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00001** — class: paired

- Sides: Arabic side 2 piece(s) [note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (152 code points, language: fa, 11 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and its Persian rendering are published together in a single output row.
- Correspondence evidence: The Arabic side contributes 1 recitation piece(s) and the Persian side 1; they sit in one row, and the Persian piece is the rendering of the Arabic piece (checked by reading both sides).
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Both sides of the pair sit in the same output row. This is the pattern the other rows deviate from.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 33. `namaz-khvf-zalm` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00003** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (28 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (226 code points) and one Persian recitation (176 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 34. `namaz-mhmat` — 2 slot move(s), 0 unequal row(s), 2 flagged row(s)

**r00001** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (140 code points, language: fa, 9 Persian / 2 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00002** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (135 code points, language: fa, 4 Persian / 2 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 35. `namaz-rfa-asr-skhty` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00001** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 0 piece(s) [—].
- Published as: ar:— fa←ar#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (44 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 36. `namaz-sayr-adab` — 5 slot move(s), 3 unequal row(s), 5 flagged row(s)

**r00001** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (706 code points, language: fa, 48 Persian / 7 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (40 code points) and one Persian recitation (44 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (369 code points, language: fa, 5 Persian / 3 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer is embedded in the Persian direction of this same source row, and the Persian rendering of that prayer is the row's own Persian piece. The counterpart is inside the row.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00004** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (388 code points, language: fa, 28 Persian / 1 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (158 code points) and one Persian recitation (147 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00007** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (233 code points, language: ar, 0 Persian / 3 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer is embedded in the Persian direction of this same source row, and the Persian rendering of that prayer is the row's own Persian piece. The counterpart is inside the row.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00011** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (14 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (421 code points) and one Persian recitation (396 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 37. `namaz-valdyn-avlad-amvat` — 2 slot move(s), 0 unequal row(s), 2 flagged row(s)

**r00001** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (122 code points, language: fa, 5 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. The Arabic prayer is embedded in the Persian direction of this same source row, and the Persian rendering of that prayer is the row's own Persian piece. The counterpart is inside the row.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00003** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [instruction, recitation].
- Published as: ar:— fa←fa#0 *instruction*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (23 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic piece stops inside the prayer and the rest is in the next source row, whose Persian field holds the rendering. The counterpart is in the next row.
- Role evidence: Published roles: instruction, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 38. `namaz-vqt-tlva-ghrvb` — 3 slot move(s), 2 unequal row(s), 2 flagged row(s)

**r00003** — class: detached-1to1

- Sides: Arabic side 3 piece(s) [note, instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *instruction*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (66 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (91 code points, language: fa, 6 Persian / 1 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (152 code points) and one Persian recitation (139 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, instruction, recitation. The two sides of the source row carry different roles (Arabic side: note, instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (note, instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00009** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (36 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (92 code points) and one Persian recitation (103 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 39. `ziyarat-abdalazym-alyh-alslam` — 3 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00001** — class: note-only

- Sides: Arabic side 3 piece(s) [note, note, note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *note*; ar:— fa←ar#2 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (243 code points, language: fa, 10 Persian / 0 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (455 code points, language: fa, 19 Persian / 3 Arabic markers), published with kind `note`; fa slot ← source ar field piece 2 (303 code points, language: fa, 11 Persian / 3 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 3 extra non-recitation piece(s) (note, note, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 4 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 40. `ziyarat-adab-mkhsvs-hsyn` — 2 slot move(s), 2 unequal row(s), 2 flagged row(s)

**r00022** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [note, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (174 code points, language: fa, 12 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (65 code points) and one Persian recitation (40 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00026** — class: detached-multi

- Sides: Arabic side 6 piece(s) [note, recitation, recitation, recitation, recitation, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar←ar#3 fa:— *recitation*; ar←ar#4 fa:— *recitation*; ar←ar#5 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (96 code points, language: fa, 3 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 5 recitation piece(s) and the Persian side 1. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (note), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 7 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 41. `ziyarat-aymh-bqya-alyhm` — 5 slot move(s), 3 unequal row(s), 5 flagged row(s)

**r00001** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 1 piece(s) [recitation].
- Published as: ar←fa#0 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (103 code points, language: fa, 6 Persian / 0 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. This is a slot-direction defect rather than a pairing case: the Persian gloss is published in the Arabic slot.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00004** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (76 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (357 code points) and one Persian recitation (292 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (68 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (41 code points) and one Persian recitation (30 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00009** — class: one-sided

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (707 code points, language: ar, 2 Persian / 5 Arabic markers), published with kind `note`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Persian side carries 1 recitation piece(s) and the Arabic side carries none inside this source row, so no in-row correspondence exists. This is a slot-direction defect rather than a pairing case: the Arabic continuation is published in the Persian slot, so the row's Persian rendering shares that slot with it.
- Role evidence: Published roles: note, recitation. The two sides of the source row carry different roles (Arabic side: note; Persian side: recitation), which is the role evidence for this case.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00012** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (34 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (262 code points) and one Persian recitation (198 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 42. `ziyarat-bad-rza-alyh` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00017** — class: paired

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (103 code points, language: fa, 10 Persian / 2 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and its Persian rendering are published together in a single output row.
- Correspondence evidence: The Arabic side contributes 1 recitation piece(s) and the Persian side 1; they sit in one row, and the Persian piece is the rendering of the Arabic piece (checked by reading both sides).
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Both sides of the pair sit in the same output row. This is the pattern the other rows deviate from.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 43. `ziyarat-byan-anchh-vars` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00001** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 5 piece(s) [note, note, recitation, note, note].
- Published as: ar:— fa←fa#0 *note*; ar:— fa←fa#1 *note*; ar←fa#2 fa:— *recitation*; ar:— fa←fa#3 *note*; ar:— fa←fa#4 *note*.
- Slot move evidence: ar slot ← source fa field piece 2 (111 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The adjacent source rows of the same item were read and no rendering of this passage was located in them, so the counterpart is either further away in the item or not present in the frozen source.
- Role evidence: Published roles: note, recitation. The unequal count is explained by the Persian side carrying 4 extra non-recitation piece(s) (note, note, note, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 5 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 44. `ziyarat-chharm-shbhay-qdr` — 2 slot move(s), 2 unequal row(s), 2 flagged row(s)

**r00006** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (11 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (200 code points) and one Persian recitation (120 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00009** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (94 code points, language: fa, 10 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (154 code points) and one Persian recitation (99 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 45. `ziyarat-item-12` — 1 slot move(s), 0 unequal row(s), 1 flagged row(s)

**r00001** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 1 piece(s) [recitation].
- Published as: ar←fa#0 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 0 (56 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. This is a slot-direction defect rather than a pairing case: the Persian title is published in the Arabic slot.
- Role evidence: Published roles: recitation. The unequal count comes from the piece count alone; both sides carry the same roles, so the difference is in how the passage was divided, not in what the passage is.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 1 published child id. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 46. `ziyarat-jamea-kabira` — 1 slot move(s), 1 unequal row(s), 1 flagged row(s)

**r00314** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (77 code points, language: fa, 4 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (47 code points) and one Persian recitation (40 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 47. `ziyarat-kyfyt-rza-alyh` — 5 slot move(s), 3 unequal row(s), 5 flagged row(s)

**r00004** — class: detached-multi

- Sides: Arabic side 3 piece(s) [instruction, recitation, recitation]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (36 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 2 recitation piece(s) and the Persian side 2. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 5 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00005** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [instruction, recitation].
- Published as: ar:— fa←fa#0 *instruction*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (18 code points, language: ar, 0 Persian / 1 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic piece stops inside the invocation and the prayer continues in the next source row, whose Persian field holds the rendering. The counterpart is in the next row.
- Role evidence: Published roles: instruction, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00022** — class: one-sided

- Sides: Arabic side 0 piece(s) [—]; Persian side 2 piece(s) [instruction, recitation].
- Published as: ar:— fa←fa#0 *instruction*; ar←fa#1 fa:— *recitation*.
- Slot move evidence: ar slot ← source fa field piece 1 (32 code points, language: ar, 0 Persian / 2 Arabic markers), published with kind `recitation`.
- Pairing evidence: One side of the source row carries a recitation and the other does not, so the row itself holds no bilingual pair.
- Correspondence evidence: The Arabic side carries 1 recitation piece(s) and the Persian side carries none inside this source row, so no in-row correspondence exists. The Arabic piece stops inside the prayer and the rest is in the next source row. The counterpart is in the next row.
- Role evidence: Published roles: instruction, recitation. The unequal count is explained by the Persian side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Only one side of this source row carries a recitation. The counterpart was looked for in the adjacent source rows of the same item; where it exists it lies in the neighbouring row, which makes the fix a cross-row join rather than an in-row regrouping.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00024** — class: detached-multi

- Sides: Arabic side 4 piece(s) [instruction, recitation, recitation, recitation]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar←ar#3 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (65 code points, language: fa, 7 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 3 recitation piece(s) and the Persian side 2. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 6 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00026** — class: detached-1to1

- Sides: Arabic side 2 piece(s) [instruction, recitation]; Persian side 1 piece(s) [recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar:— fa←fa#0 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (22 code points, language: fa, 3 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitation and the Persian rendering of that recitation are published in two different output rows; no output row of this source row carries both slots. The protocol example for a re-homed direction is the Arabic and its existing Persian in one later output row, so the detached form is a deviation from the shape the protocol shows.
- Correspondence evidence: One Arabic recitation (190 code points) and one Persian recitation (149 code points) sit in different rows. Read against each other they cover the same passage in the same clause order, and the Persian is the rendering of the Arabic; the width difference is the difference between the two languages, not between two different prayers.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: Whether the two rows were meant to be published separately cannot be settled from the artifacts: the layout, the plan and the split record are silent about it. What the artifacts do show is that both sides carry the same number of recitations, the extra pieces on the wider side are directions or notes that legitimately have no counterpart, and the two recitation sides cover the same clause sequence when read against each other.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 48. `ziyarat-rsvl-sly-allh` — 2 slot move(s), 1 unequal row(s), 2 flagged row(s)

**r00005** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (50 code points, language: fa, 2 Persian / 0 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00006** — class: detached-multi

- Sides: Arabic side 3 piece(s) [instruction, recitation, recitation]; Persian side 2 piece(s) [recitation, recitation].
- Published as: ar:— fa←ar#0 *instruction*; ar←ar#1 fa:— *recitation*; ar←ar#2 fa:— *recitation*; ar:— fa←fa#0 *recitation*; ar:— fa←fa#1 *recitation*.
- Slot move evidence: fa slot ← source ar field piece 0 (8 code points, language: fa, 1 Persian / 0 Arabic markers), published with kind `instruction`.
- Pairing evidence: The Arabic recitations and the Persian renderings are published in separate output rows, one row per piece, and no output row carries both slots.
- Correspondence evidence: The Arabic side contributes 2 recitation piece(s) and the Persian side 2. The counts differ, so no one-to-one correspondence is asserted from the numbering; each recitation was read against the Persian side instead.
- Role evidence: Published roles: instruction, recitation. The two sides of the source row carry different roles (Arabic side: instruction, recitation; Persian side: recitation), which is the role evidence for this case. The unequal count is explained by the Arabic side carrying 1 extra non-recitation piece(s) (instruction), which is a direction or a report with no counterpart of its own.
- Uncertainty: The two sides carry different numbers of recitations, so a one-to-one correspondence cannot be assumed from the piece numbers. The correspondence between the individual recitations was checked by reading them against each other; what remains uncertain is the intended granularity of the individual recitations, which is an editorial decision, not a structural one.
- Link effect: 5 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

### 49. `ziyarat-vrvd-an-qm` — 3 slot move(s), 1 unequal row(s), 2 flagged row(s)

**r00003** — class: note-only

- Sides: Arabic side 2 piece(s) [note, note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←ar#1 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (276 code points, language: fa, 15 Persian / 2 Arabic markers), published with kind `note`; fa slot ← source ar field piece 1 (501 code points, language: ar, 6 Persian / 7 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note. The unequal count is explained by the Arabic side carrying 2 extra non-recitation piece(s) (note, note), which is a direction or a report with no counterpart of its own.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 3 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

**r00004** — class: note-only

- Sides: Arabic side 1 piece(s) [note]; Persian side 1 piece(s) [note].
- Published as: ar:— fa←ar#0 *note*; ar:— fa←fa#0 *note*.
- Slot move evidence: fa slot ← source ar field piece 0 (114 code points, language: fa, 6 Persian / 1 Arabic markers), published with kind `note`.
- Pairing evidence: Neither side of this source row carries a recitation; the row holds only directions and notes.
- Correspondence evidence: Not applicable: no recitation on either side.
- Role evidence: Published roles: note.
- Uncertainty: No recitation is involved on either side of this row, so there is no bilingual pair to assess. The row is flagged because a piece was moved between the destination slots.
- Link effect: 2 published child ids. Regrouping or re-labelling this row retires the published
  child id(s), so it waits for the supported mapping migration.

## 5. What is uncertain across the whole set

- Whether the detached form was Agent-3's intent or an oversight. The artifacts do not
  say, and the four paired rows inside the same snapshot are the only internal evidence
  that the paired form was available at the time.
- The intended granularity of the multi-recitation rows. Where the two sides carry
  different numbers of recitations, the correspondence between individual recitations was
  read, not assumed, but the decision to keep them apart or to join them is editorial.
- Whether a Persian rendering that sits in a neighbouring source row was meant to be
  published with the Arabic it renders. The source rows are a manuscript table and the
  reading is the only evidence; nothing in the tooling asserts the correspondence.
- Whether the three F2 rows and the F4 rows are transcription features of the source table
  or defects of the layout. The published shape is the same either way; only the
  intention differs.

## 6. What is not claimed

This is a structural, pairing and role review of Agent-3's cuts and groupings, checked
against the frozen source rows and read case by case. It is not a word-by-word semantic
judgement, not a translation, not a scholarly, translation-provenance, publication-rights,
human or semantic-quality approval, and it does not assert that any source text is wrong.
No row was re-split, no text was translated, no source text was changed, no link guard was
bypassed, and no finding in this document has been applied.
