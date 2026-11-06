# Reader and UI design notes

These notes condense the useful ideas from the UI discussion; they are not a copy of the conversation or a finished specification. They sit alongside [plan.md](plan.md), not in place of it. Later reactions take precedence over earlier suggestions in the demo discussion.

**My idea** summarizes a direction I expressed, rather than quoting me. **AI feedback** is additional advice to accept, change, or reject. Questions are left open for me to comment on.

## The reader and its appearance

### 1. Freedom in the reader, shared infrastructure elsewhere

**My idea:** The reader is a place where people should have substantial freedom: reading styles, colors, fonts, and sizes. Plan for those choices from the beginning rather than hardcoding one look. That does not mean making separate settings pages, search systems, or parallel applications for each style or language.

**AI feedback:** The styles can be different presentations of the same content and reader behavior. Keep one shared settings system and one search system. A quick control inside the reader can change the same preference as the shared settings page; document search can use the same search system with its scope limited to the current item. Neither needs a second implementation or separate settings page. The precise controls and their placement are still design choices.

### 2. Several reading styles can coexist

**My idea:** I liked the bordered, card-like, and spacing-based reader treatments. I do not need to choose only one. Different styles can also give instructions their own matching treatment.

**AI feedback:** These are useful choices, not three different apps. A bordered style may make neighboring passages easy to distinguish; cards give stronger grouping; a spacing-based style can feel more like a continuous page. The demo's fourth variant was a size-control sheet shown over a reader, rather than a fourth row pattern. Test each actual style on a long prayer, many short rows, a long explanation, and a short item. A style should not change the underlying content or imply a relationship that the data does not establish. The library and search results do not have to copy the selected reader style.

### 3. Make instructions recognizable

**My idea:** Instructions should look distinct from text to be recited, and the treatment can fit the selected reading style.

**AI feedback:** A quiet fill, a labeled card, or an accent rule are all possibilities. Use more than color alone to communicate the distinction, and keep long instructions comfortable to read. A row with no Arabic is not automatically an instruction; it could be an explanation, heading, or something not yet classified. Use an explicit `kind` when available rather than guessing from an empty field. Unknown rows should not silently disappear.

### 4. Color choices and readable defaults

**My idea:** Reader color settings matter. The demo's warm background, dark text, and green accents are one possible starting point, not a mandatory palette.

**AI feedback:** Offer meaningful color choices while keeping good light and dark defaults. The exact extent and timing of a free-form theme editor remain open; custom themes and export were not priorities in [plan.md](plan.md). Check text against the actual background, not just whether the colors look pleasant together. For example, the demo's light gold `#B8925A` on `#FAF6EF` is about **2.67:1**; the darker `#7A5A2E` on that background is about **5.85:1**. The former is better suited to decoration than small text. [WCAG's text-contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) generally calls for 4.5:1 for normal text. Warnings for hard-to-read custom combinations could help without taking the user's choices away.

### 5. Offer all three fonts

**My idea:** Offer **Amiri**, **Noto Naskh Arabic**, and **Scheherazade New**. I may not personally prefer Noto Naskh, but other readers might. The additional bundle size is not a reason to remove it.

**AI feedback:** Compare the exact files on real passages, including vowel marks, Quranic marks, Persian letters, joins, and clipping. A previous scan found no missing Arabic-script code points in the current Arabic/Persian item rows for the tested Amiri Regular v1.002, Noto Naskh Arabic v2.021, and Scheherazade New v4.500. That is encouraging, but the scan did not prove good shaping or cover every character in titles and interface strings. Do not assume any particular font is best on small screens without testing it.

Bundle all three exact font files with the offline app and arrange for the website's offline cache to include them as well. Test an installed/offline session after the initial visit, not just an online font preview. Check the license and include required notices for the **exact files** shipped; the versions previously checked used the SIL Open Font License. Other app-used fonts can be considered separately after checking their actual permissions. The default face is still a choice to make.

### 6. Sizes, wrapping, and wide screens

**My idea:** Use separate size controls for Arabic, translations, and explanations. Justify Arabic when it wraps, but do not stretch a short single line across the screen. Do not insert forced line breaks to make the layout work.

**AI feedback:** Preserve source text and let it wrap naturally. A justified block with its last line aligned to the logical start is worth testing; the correct block direction is essential for that start to be on the right. The same numeric size can look different in different fonts, so choose readable defaults for Persian and English too, and allow enough line height for marks. Changing a size or font should keep the reader near the same content, not merely the same pixel offset.

For wide screens, adjustable overflow or another flowing arrangement is worth experimenting with, as discussed in [plan.md](plan.md). One possibility is basing the setting on the longest line in a document or source, but the measurement and behavior are not decided. Keep reading order understandable and offer the normal layout as well.

## Languages, direction, and the header

### 7. Persian and English: a choice, not a pile of translations

**My idea:** Persian and English should not be visible together in the reader. Use a language choice instead of hiding English in a collapsible block at the end of a long page. The exact placement is not decided.

**AI feedback:** Treat the choice as part of the same reader, not another app. Arabic visibility and the default language can be decided separately; do not assume Arabic must always be shown. If English is not available, say so quietly rather than presenting it as an error. An English introduction or related source is not automatically a translation of the prayer body. Show what is actually available and identify it honestly.

The current English documents are not generally aligned line by line with Arabic or Persian. A linked document, including one labeled `legacy-primary`, is not proof of a reviewed pairing. When a passage lacks reviewed alignment, an English reading presentation may need to follow its own paragraphs within the same reader instead of being placed below guessed Arabic rows. If reviewed groups exist later, they can express many-to-many relationships; one English paragraph may contribute to more than one group. Do not duplicate, split, or pair text merely by array position. Keep related or uncertain material available in an appropriate, clearly described form rather than silently discarding it.

**Open question:** When English is selected, how should Persian-only instructions or explanations be handled if no English explanation exists? That needs a deliberate fallback, without presenting Persian and English together or losing source material.

### 8. Persian numerals and correct direction

**My idea:** Persian numerals are important. A Persian-first, RTL-first interface is a reasonable direction to explore, but I have not settled every detail of the overall interface or future LTR support.

**AI feedback:** Use Persian digits such as `۰۱۲۳۴۵۶۷۸۹` where the Persian interface displays numbers, while keeping stable IDs and underlying source text unchanged. Decide how numbers appear in other interface languages separately. Make the interface direction respond appropriately to its language without turning LTR support into another application.

Arabic and Persian content need RTL direction; English content needs LTR direction, regardless of the surrounding interface. Set both language and base direction in the markup, use logical start/end spacing, and isolate mixed-script fragments where necessary. The demo omitted direction on its Arabic/Persian blocks, so its short-line alignment could be wrong. Correct direction helps, but does not by itself guarantee good font shaping or diacritic placement. Test mixed punctuation, numbers, Latin names, and search input in both directions. See [W3C's direction guidance](https://www.w3.org/International/questions/qa-html-dir).

### 9. The header is still mine to design

**My idea:** The demo headers need work, and I do not want to adopt the proposed header arrangements. I will design the header. The plan calls for a visible search button and play/pause in the header.

**AI feedback:** Keep those controls available while exploring the visual balance, title alignment, and button placement. Test long titles, asymmetric button groups, narrow phones, RTL/LTR, large text, and accessible tap targets. Do not hide search or replace it with play/pause merely to imitate one of the rejected arrangements. Double-tap and long-press are conveniences, not the only way to reach their actions. No text selection is planned.

### 10. One search, different scopes

**My idea:** Main search and search within the current document should not become separate search systems. The main search still needs to cover both the contents and the text.

**AI feedback:** Reuse the same search behavior and data infrastructure, with a scope for the current item when needed. The desired search matches words independently, including substrings, and counts matched words within an individual result. A featured star breaks ties in matched-word count; it does not outrank a result matching more words. Reuse valid per-word work when the query or language scope changes rather than generally clearing the cache. Normalize search keys separately from any reviewed normalization of new translations; neither should silently rewrite existing displayed text.

**Later search-relevance decision:** The earlier TOC-first and word-count-first ordering above was reconsidered. The current [`src/search.ts`](src/search.ts) keeps independent OR/substring matching but ranks TOC and text together, strongly favoring complete words and nearby ordered sequences, including sequences with a mistyped intervening query word. TOC and stars break comparable ties. Compact sequences may cross immediately adjacent rows of the same item/language; the result opens at the first matching row, without leaving a reader highlight. After seeing the real-data tradeoff, the user also chose to permit a partial final source word when a joined query matches across an ordinary space, even though that can also match `یاعلی` against `یا علیم`. [Search behavior and tests](docs/search-behavior.md) documents these safeguards and limitations. English search and in-document highlight behavior remain for later.

## Scrolling and data that can evolve

### 11. Auto-scroll should not disturb reading

**My idea:** Keep play/pause in the header and make smart speed a setting that is on by default. When smart speed is off, show a compact temporary faster/slower control under the header after a touch, rather than a permanent full-width bar. Stop at the bottom and pause when the reader is off-screen.

**AI feedback:** Float the temporary control without resizing the reading area when it appears or disappears. A touch-hold stops the actual scrolling; resume after the last finger lifts unless explicitly paused, and do not fight a manual swipe's momentum. When smart speed is on, a stationary hold can mean the speed is too fast and must be allowed to train it slower. The expected-position ghost keeps advancing during that hold; an explicit pause instead stops and hides it. This corrects the older feedback in [plan.md](plan.md) that said a motionless hold should not affect speed.

A roughly 30-second checkpoint is only a possible implementation detail: it must not discard accumulated prediction/error or the elapsed-time basis needed to interpret it. Do not learn from time spent off-screen or from a font/layout reflow. The final formula, limits, and visual details remain open and should be tested rather than assumed.

### 12. Work with today's data, leave room for better alignment

**My idea:** The current Arabic/Persian split is good enough to start building the UI. Finer splits and reviewed alignment can come later; they should not require redesigning the whole reader.

**AI feedback:** A small presentation layer between the data and the reader styles could help: it can describe a current row, an instruction, an independently structured English passage, or a reviewed group. That is a design option, not a required type name or schema. Keep the existing reading order and occurrence IDs; do not invent breaks or translations to fill a visual template. A chapter number is not automatically a verse number for every row, and a verse can span rows.

The transcript raised a useful question about the data build. In the actual repository, `npm run build:data` **already** emits resolved item-row text, English documents with resolved paragraphs, `reviewed_alignment_groups`, and paragraph redirects under `generated/web-data/`. Item files refer to English documents; they do not inline all English paragraphs. The builder already excludes rows explicitly classified as `audio-reciter` from reader rows and search while retaining them in canonical data. The UI still needs to consume these artifacts correctly; these facts do not mean all links or alignments have been reviewed. See [docs/data-model.md](docs/data-model.md) and [docs/alignment.md](docs/alignment.md).

### 13. Stable reading positions and future splits

**My idea:** Changes to fonts, sizes, and eventually the split data should not lose the reader's place or break saved references.

**AI feedback:** Share an anchor concept between last-read positions, search results, and any future exact-position bookmarks. An Arabic/Persian anchor needs its item, row, language, and possibly a text offset; an English anchor needs its document and paragraph, not just a paragraph ID. Repeated identical text can still be different occurrences. Whether a personal bookmark saves an item or an exact position remains open.

For a future split, do not send every old position to the first replacement row. If an old position falls in the second segment, a range-aware mapping should take it there and adjust the offset. Consider merges, redirect chains, content versions, and a clear fallback when an exact location cannot be recovered. The existing **37 English paragraph redirects** preserve retired paragraph references, but they do not restore an incorrect item–document link or constitute a general row-split migration system.

The project's reviewed spans use zero-based Unicode **code-point** offsets; browser string and DOM offsets often use UTF-16 code units. Convert deliberately and test supplementary characters and combining marks. See [docs/data-model.md](docs/data-model.md) and [docs/segmentation.md](docs/segmentation.md).

### 14. Content and permissions stay separate from presentation

**My idea:** I have checked redistribution and will document it later. The content rules still apply; missing or uncertain material should not be invented.

**AI feedback:** Follow [CONTENT_POLICY.md](CONTENT_POLICY.md): no AI translation of Arabic text, including devotional Arabic indirectly through a Persian rendition. Use an appropriately permitted human translation with source details, or leave it missing. AI may assist with ordinary Persian explanatory prose only when the work is labeled AI-assisted, the source is identified, and a person reviews it; that exception does not cover an Arabic quotation inside it. Existing claims and unreviewed relationships are not proof of provenance, permission, or alignment. Document the checked permissions and attribution and satisfy the existing release gate before publication; do not silently discard uncertain historical material or change canonical wording to suit a layout.

## How to check the ideas

### 15. Automated tests are part of the design

**My idea:** Use tests to see how the ideas actually work, rather than relying only on manual inspection.

**AI feedback:** Build automated checks around the decisions above, using representative real-data cases without inventing content:

- **Reader styles:** long and short rows, explicit instructions, unclassified Persian-only rows, natural wrapping, large sizes, narrow/wide screens, and light/dark color contrast. Check that changing style, size, or font preserves the reading position.
- **Fonts and direction:** offline loading and fallback for all three fonts; Arabic/Persian RTL, English LTR, Persian numerals, mixed punctuation, and marks. Screenshot or rendering tests can catch regressions, but they cannot by themselves certify readability or translation accuracy.
- **Language and data:** Persian and English are not shown together; unaligned English is not paired by position; introductions and missing translations are labeled honestly; reviewed many-to-many groups and unreviewed content are both handled without dropping text.
- **Search:** individual-word and substring matches, exact/nearby ordered relevance across TOC and text, adjacent-row and mistyped-middle-word cases, incremental/stale worker results, reusable word caches, direction and normalization, and opening the correct location without a lingering reader highlight.
- **Anchors:** old English paragraph redirects, repeated text with distinct occurrences, second-segment split offsets, merge/redirect chains, missing mappings, and code-point/UTF-16 conversions.
- **Auto-scroll:** stationary hold trains slower, explicit pause hides/stops the ghost, a hold spanning a checkpoint preserves the calculation, multiple fingers, momentum, off-screen pause, bottom stopping, and reflow without false learning. Confirm the temporary speed control does not make text jump.

Real-device and human visual checks can supplement these tests, especially for font rendering; they do not replace them.

## Questions to revisit

- What should the default reader style and font be, once the options have been tested on real content? ==Plain raw without any formatting, the C of the proposed==
- How much color customization belongs in the first version, and what can wait for a custom-theme editor? ==Nothing at the start, it's long term==
- What are the default interface and translation languages, and what is the fallback for Persian-only instructions when English is selected? ==For now default lang Persian and show the Persian fallback for now, we're going to only design the Persian right now and English is later==
- Across contents and text results, does a three-word text match outrank a one-word contents match? ==Contents is top, text below it, they should be separate rather than competing==
- How should wide-screen overflow be measured and controlled? Should a bookmark save an item or a precise place? ==Wide screen overflow is simple to see how much it is, I don't know the details but I've never seen it as something difficult, doesn't css do in vanilla? For bookmarks it's the topic==

These are questions for later feedback, not prerequisites for accepting the ideas above.
