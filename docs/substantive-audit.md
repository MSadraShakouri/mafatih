# Substantive translation and alignment audit

**Snapshot: 1 November 2026. This is a targeted audit and triage, not a certification of the entire corpus.** Automated textual matches do not prove a translation is faithful, that two phrases are semantically aligned, that a source is authoritative, or that redistribution is allowed. A qualified Arabic/Persian/English editor must review the texts and proposed alignments; see [rights-review.md](rights-review.md) before publication.

## What changed

All changes are recorded in `data/editorial-history.json`, including old and replacement text IDs, evidence URLs and reasons. The old values remain in the exact-text pool. Existing prayer-row IDs were retained; five new, explicitly typed Persian instruction rows precede the affected recitations. Counts below refer to this audit, not the earlier Quran title work.

- **45 row-field corrections**: the largest class is 17 repeated Quran opening prefixes and one encoding marker. The others include the four-row Persian rotation and truncated/typo text in Dua al-Mujir; a duplicated Persian word in Dua al-Tawassul; the missing “wali” in Ziyarat Warith; an extra Arabic letter and misplaced Persian greetings in the seventh ziyarat of Imam Ali; a salawat whose Persian omitted souls and bodies; and 11 occurrences of a blessing formula whose Arabic had been replaced by a parenthesized honorific. Five of the 45 changes separated Persian instructions from Arabic recitation, with five corresponding instruction-row insertions.
- **Four item-English titles** were corrected for the Medina mosques, Dua Faraj (release from grief), the last ten Ramadan nights, and Dua Sayfi al-Saghir. Previous titles and the supporting English document are retained in history.
- **28 isolated audio-reciter menu labels** were classified, not deleted: eight in Kumayl, three in Tawassul, one in Mujir, and 16 isolated `پرهیزکار` labels. The web-data builder excludes classified audio rows from displayed and searchable prayer content. Canonical JSON and SQLite retain the rows with `kind: audio-reciter`. Other potential menu artifacts remain unclassified.
- **Seven misleading legacy item–English links** were retracted, including the Medina mosques → Rajab prayer. The original documents remain. Eighteen imported English introduction paragraphs were detached only when their exact pooled text was already retained in a separate document; every old document/paragraph reference and retained destination is in history.
- **Nineteen complete English source records** were found embedded in differently numbered `tr` documents. Each paragraph matched the entire English text of one unique record in the pinned AhlulBayt Treasures file after whitespace folding. Each was separated into its own document without changing its pooled text, and a **proposed**, unreviewed link was added to an item with multiple corresponding Arabic source clauses. For example, `tr54` now proposes the last-ten-nights prayer, `tr357` Dua Sayfi al-Saghir, and `tr114` the Prophet's visitation. These are not approvals of translation or rights. The old paragraph locations are retained in history.

The `retracted_links`, `paragraph_removals`, `created_documents`, `proposed_links`, `row_corrections`, `row_insertions`, and `row_classifications` history is also exported to normalized SQLite tables. All 37 retired English paragraph keys resolve to their preserved destinations through a TypeScript helper, generated web-data redirects and the SQLite `paragraph_redirect` view; consumers must implement redirect handling. This preserves old references without restoring an unrelated item–document link. Six comparison-source records were added with **unverified** rights status. A text match is evidence of similarity to an edition, not proof of its original provenance.

### Primary references for the targeted changes

- [Dar al-Erfan: Dua al-Mujir](https://erfan.ir/mafatih46amp), [Tawassul](https://erfan.ir/mafatih52amp), and [Warith](https://erfan.ir/mafatih259amp): comparison, not permission. The live Mujir edition and the legacy one differ in wording, so the corrections are narrow.
- [Seventh ziyarat of Imam Ali](https://alseraj.net/مفاتيح_الجنان/الزيارة-السابعة-المطلقة-لأميرالمؤمن/) and [another Arabic version](https://research.rafed.net/الدعاء-والزيارة/373-الزيارات/3063-الزيارة-السابعة-لأمير-المؤمنين-عليه-السلام): check the greeting order and separate instructions.
- [Classical Arabic salawat text](https://ar.lib.eshia.ir/71664/4/491), [Dua al-Asharat](https://hmomen.com/content/dua/9), [Abu Hamza](https://hmomen.com/content/dua/22), [Imam Hasan visitation](https://almaaref.org.lb/post/3026/), and [mid-Shaban greeting](https://imamhussain.org/6754): check the blessing formula. Specific evidence IDs appear in the history.
- [Al-Hassanain Mafatih](https://alhassanain.org/english/?com=book&id=928): title comparison, not a reuse grant. [Duas.org's Rajab prayer](https://duas.org/mobile/rajab-everyday.html) confirms the unrelated content in the formerly mixed Medina document.
- The referenced source record file is pinned to [KazTronics/AhlulBayt_Treasures commit `a59bd5f8fe078532622a08ea60c19d164fb425cb`](https://raw.githubusercontent.com/KazTronics/AhlulBayt_Treasures/a59bd5f8fe078532622a08ea60c19d164fb425cb/duas_data.jsonl), SHA-256 `e9bc183509323dd85b0a32c43901ca23eaabe660e68abe37bcb314dcba37e65f`.

## Quran comparison

The generated `quran-comparison.json` report covers all **34** whole-chapter items and their **946** numbered verses. The comparison used AlQuran Cloud `quran-simple`, `fa.ansarian` and `en.pickthall` reference files. Their SHA-256 values for this audit were respectively `84889f681086b9d5a94222fbe4358cef77e15183c10baefda24f8f9ab9449402`, `fb33420e65cef48caf50da811f0cf6f75eb79bc97874bab6597d3822e70d1010`, and `e731d9bce22575faba22b1f3de21c18b647711c33de074b89fe8d6f8384b01c5`. The API and its editions may change and its availability is not a license.

- Arabic: **598 exact**, **347 equal after lossy normalization**, and **one different**. The one is Yasin 36:23, `الرحمان` versus the reference's `الرَّحْمَٰنُ`; this appears to be an orthographic variant and was not changed. The normalizer deliberately ignores diacritics, punctuation, whitespace and some letter differences, so these results do **not** verify every letter or reading.
- **14 verses span two imported rows.** The comparison tries to group them before comparing. A proposed English verse must not be aligned solely to the numbered final fragment. Candidate generation conservatively skips a numbered verse when its preceding Arabic row could be an unnumbered fragment; the skip list is in its generated output. A specialist still has to confirm actual boundaries.
- For the **18 added chapters**, all **526** numbered Persian verse strings match the API's Ansarian edition after lossy folding, and all **526** English verse paragraphs match its Pickthall edition exactly after removing the corpus-added verse numbers. This identifies strong comparison candidates, not copying lineage, full translation accuracy or rights. The 17 added chapters other than al-Fatiha had the opening twice; the separate bilingual opening is retained and only the duplicate prefix on verse 1 was removed.
- The other **16 original** whole-chapter items have English introductory/virtue documents, not complete English verse bodies. Their Persian is not uniformly Ansarian. A few sampled phrases resemble Meshkini or Fooladvand, but those samples cannot establish the origin or license of a whole chapter. No additional verse bodies were imported merely because an API exposes them.
- Across all 34 items, 173 Persian verses match Ansarian exactly and 361 after lossy folding; **412 differ**. “Different” is not an error verdict: different legitimate translations and paraphrases are expected.

## Wider parallel-text triage

The generated `parallel-comparison.json` report scans all **686** items against **611** separately obtained reference documents. The 54 legacy `manual-v1` items comprise 40 candidate references, seven weak/ambiguous candidates and seven without a reference match. Across all items, 154 have a candidate reference, 149 are weak or ambiguous, and 383 have no reference match. Of the compared pairs, 2,967 have exact folded Arabic/Persian strings in the same coarse reference paragraph; six fall in different reference paragraphs and four have a large relative-position difference.

These are **triage signals only**. The reference's own Arabic/Persian paragraph boundaries sometimes differ, several source indexes/titles are wrong, short common phrases recur, and the reference may share a source tradition with the corpus. A same-paragraph match is not clause-level verification. A no-match or different-paragraph result is not proof of error. The referenced repository has no identified redistribution license, is not bundled, and was used only for comparison.

The generated `english-provenance.json` report identifies **206** paragraph occurrences in **90** current `tr` documents whose exact text also appears in a non-`tr` document. Some may be legitimate reused introductions; others may be mixed-source metadata. Another **328** `tr` paragraph occurrences did not match a complete pinned upstream record after whitespace folding; this includes introductions and partial material and is not an error count. Inspect them individually. Eight English documents remain empty and 151 are unlinked. Do not delete them without review.

The current offline review contains **9,396 unverified candidates** for 128 items. None was imported as a reviewed alignment. Partial Arabic source-row candidates do not infer a Persian subspan. The 16 original Quran items still lack complete English verse bodies and have no automatic verse candidates; align their split verses only after edition and rights review.

## Reproduce

Python 3.10+ and Node 20+ are required. The reference datasets are intentionally **not** included in the project archive; obtain and use them only under their applicable terms.

```bash
npm ci
# Builds/refreshes sources into ignored generated/quran-reference/; API changes alter hashes.
python3 tools/audit_quran.py --download

# Obtain a local comparison checkout separately; pin and verify it:
git clone https://github.com/kazemcodes/mafatih_db /path/to/reference
git -C /path/to/reference checkout 881c6edcc7efaf5f3975cd6aa4e9c7771426995d
python3 tools/audit_parallel.py --reference-dir '/path/to/reference/type 4/Babs' --all

# Supply the pinned Treasures JSONL from the URL above:
python3 tools/audit_english.py --treasures /path/to/duas_data.jsonl
npm run suggest:alignments -- --treasures /path/to/duas_data.jsonl
npm run audit
npm run check
npm run build:sqlite
npm run check:publication   # expected to fail until rights and expert reviews are complete
```

The generated JSON reports contain item/row/paragraph IDs and method limitations. Reruns write to ignored `generated/audit/`; generated snapshots are not tracked in the repository. The dated audit's detailed outputs are available separately in the earlier review archive. `data/editorial-history.json` is the authoritative change log, not the generated report. Do not treat the reference checkout, `manual-v1` label, an exact match, or a structural test as scholarly or legal approval.
