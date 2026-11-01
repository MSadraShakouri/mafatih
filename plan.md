# UI ideas

This is just brainstorming. Nothing here is final, and the AI feedback is there to help think things through, not make decisions for me.

The current split is good enough for now. I've checked redistribution and will document it later. The existing content rules still apply.

## Main menu and search

### 1. A search pill on the main menu

**My idea:** Pulling down on the main menu opens a search pill right there, not a separate screen. The regular table of contents should still be easy to browse without making the menu crowded.

**AI feedback:** Keep the table of contents visible when search is closed or empty. A search button as another way to open the pill would make it easier to discover and use without a gesture. Check that pulling down doesn't interfere with scrolling the menu or the browser's refresh gesture.

### 2. Search the table of contents and the text together

**My idea:** One live search should search both. Show table-of-contents results first, then text results. If an entry has a star, show it next to its name.

**AI feedback:** Two small sections in the same result list could make the order clear. Include both headings and individual items, with a little context about where they are in the table of contents. The existing `featured` list has the stars; keep them separate from personal bookmarks unless I decide otherwise.

### 3. Search each word on its own

**My idea:** Search every word separately. Results don't need to contain every word: even one matching word is enough. Search inside individual strings or lines, not one huge string for an entire file. Sort results partly by how many words they match.

**AI feedback:** This is an **OR** search, with the number of different query words matched as a relevance signal. For example, a line matching two words generally ranks above a line matching one, but the one-word match still appears. Count words within the same title, row or paragraph, not across unrelated parts of a file. Match inside words too, not only at the beginning or on whole-word boundaries.

### 4. Give some results a head start

**My idea:** Prioritize table-of-contents results and Arabic. Persian and English should be available through toggles or modes. Search starred items before the rest.

**AI feedback:** Start the table of contents and starred items early so their results can appear quickly. Arabic can be favored over the other languages, while Persian and English remain easy to reach. The exact ranking is still open—for example, should a starred result matching one word be above a non-starred result matching three? The table-of-contents section should stay above the text section either way.

### 5. Show results as soon as they arrive

**My idea:** Search should be live and fast. Don't wait for every word or every part of the search to finish before showing results. Use threads when useful, and keep updating the list as more matches come in.

**AI feedback:** Background workers can keep typing and scrolling responsive. Give each query an ID so late results from an old search don't show up under a new one. Show a small indication that more results are coming, and try to keep the list from jumping around while I'm reading or tapping a result. Keep valid results already shown for the current query.

### 6. Remember work that's already been done

**My idea:** If I've already searched a word, don't start that same search over just because I added another word. I can keep typing while searches are still running.

**AI feedback:** Cache each word's results and reuse work that's still in progress. For example, if the query changes from `first` to `first second`, keep the work for `first` and start work on `second`. Cancel stale display updates without unnecessarily cancelling a word the new query still needs. Use a reasonable cache limit and clear or update it if the content or language scope changes.

### 7. Open a match at the right line

**My idea:** Highlight matches in the search results. When I tap a text result, open the reader at the line containing that match, but don't highlight the text in the reader.

**AI feedback:** Store the item, row or paragraph, and the position of each match. Even a long English paragraph should open at the actual matching line, not just its beginning. Don't flash, select or leave a highlight in the reader after opening it. A table-of-contents result can instead open the item or expand its section. If in-document search gets temporary highlights while it's open, that behavior can be decided separately; they shouldn't remain after opening a result.

### 8. Make the search fast without changing the text

**My idea:** Search the whole collection quickly, with partial results appearing while other work is still going on.

**AI feedback:** The current search is only a starting point: it checks the whole query against joined item-level fields. It doesn't yet do separate-word, individual-string searches. A generated index of titles and individual text strings could make the new search faster; a character n-gram index is one option for finding matches inside words. Very short queries still need a correct fallback rather than silently becoming prefix-only searches. Build indexes as needed instead of committing generated copies of the data.

Normalize text **for searching only**. Keep a way to map matches back to the original text and avoid breaking Arabic joining or separating letters from their marks in result highlights. Test diacritics, Arabic/Persian yeh and kaf, half-spaces, joined and spaced forms, numbers, repeated words, right-to-left snippets, language toggles and very short queries. Hazm was used earlier for Persian normalization, but its word list isn't complete; an unfamiliar word isn't automatically wrong. Try the search on real phones and watch memory use too.

## Reading and layout

### 9. Arabic fonts

**My idea:** Look into good Arabic fonts and offer a choice.

**AI feedback:** Three worth trying are **Amiri**, a traditional reading face [1](https://github.com/aliftype/amiri); **Noto Naskh Arabic** [1](https://github.com/notofonts/arabic/releases); and **Scheherazade New**, which has broad Arabic-script coverage [1](https://software.sil.org/scheherazade/). Amiri also has a Quran variant, but its smaller character set means it should be tested separately rather than assumed suitable for every prayer [2](https://github.com/aliftype/amiri/blob/main/NEWS.md).

The checked versions use the SIL Open Font License 1.1. If a font is bundled, include its copyright and license notice and check the license for the exact version. Scheherazade has reserved font names that matter for modified versions. The original license files are here: [Amiri](https://raw.githubusercontent.com/aliftype/amiri/main/OFL.txt), [Noto](https://raw.githubusercontent.com/notofonts/arabic/main/OFL.txt), [Scheherazade](https://raw.githubusercontent.com/silnrsi/font-scheherazade/master/OFL.txt). No font needs to be picked yet. Compare real passages on phones and browsers, especially vowel marks, Quranic marks, Persian letters, ligatures, clipping and correct shaping. Make sure the chosen fonts or fallbacks work offline.

### 10. Separate text sizes

**My idea:** Have separate size controls for Arabic, translations and explanations.

**AI feedback:** Three controls are a good starting point. Individual Persian and English overrides could be considered later. Changing a size or font should keep the reader in roughly the same place, and the controls should work with system accessibility settings.

### 11. Justify wrapped Arabic, not short lines

**My idea:** Justify Arabic text when it wraps, but don't stretch a short single line across the whole screen. This matters especially on wide screens or with a small font.

**AI feedback:** A first experiment could use justified text with the last line aligned to the start; that also keeps a one-line block at its natural width. Forced line breaks and different browsers need testing [1](https://developer.mozilla.org/en-US/docs/Web/CSS/text-align-last). Check that justification looks natural with each font and doesn't disturb the marks or joins.

### 12. A wide-screen layout

**My idea:** On a wide screen, maybe fit more than one logical “line” across the available space, with a little overflow. The exact behavior needs more thought.

**AI feedback:** Try a flowing layout and a layout that groups short lines side by side, then see which feels better. Keep the reading order clear and preserve the relationship between Arabic, translation and explanation. Test how much overflow feels okay at different screen widths and font sizes. The usual layout should remain available.

## Reader controls and auto-scroll

### 13. Reader header

**My idea:** Double-tap the header to go to the top. Long-press it to search within the current document. There should also be a search button.

**AI feedback:** The document search can use the same word-by-word search idea, limited to the current item. A visible button helps when the long-press isn't obvious or practical. Make sure header gestures don't interfere with selecting text or scrolling, and that a header double-tap can't also toggle auto-scroll.

### 14. Pause auto-scroll while touching the screen

**My idea:** Auto-scroll should pause whenever a finger is touching the screen and resume when I lift it, unless I've explicitly paused it.

**AI feedback:** Wait until the last finger is lifted if there's more than one. Don't fight the normal momentum of a manual swipe. Also think about what happens when the app goes into the background, the screen locks, a touch is cancelled, or the end of the document is reached.

### 15. Double-tap and speed controls

**My idea:** Double-tapping the reader screen toggles auto-scroll. Smart speed should be a setting that's on by default. When it's off, I still need an easy way to change the speed, but its design can come later.

**AI feedback:** A visible pause/play control gives another option for people who can't or don't want to use the gesture. A small speed slider or plus/minus buttons might work when smart speed is off, but there's no need to settle that yet. Keep the header's double-tap-to-top action separate from the body gesture.

### 16. Adjust speed based on where I realign the text

**My idea:** Remember the current speed and where the text was expected to be as time passes. When I manually move it to the position I want, compare that position with the expected one. Use the difference in height over time to add or subtract from the speed. I'll explain the details later.

**AI feedback:** Here's one way to illustrate the idea, not a final algorithm:

```text
p0 = starting position
v0 = current speed
t  = time since a chosen starting point
pE = p0 + v0 × t              (expected position)
pA = actual position after realignment
v1 = v0 + (pA − pE) / t      (adjusted speed)
```

For example, at 20 pixels/second over 10 seconds, the expected position advances 200 pixels. If I realign 50 pixels farther down than expected, that example gives 25 pixels/second; 50 pixels behind gives 15. Exactly when `t` starts, which pauses count and how to handle extreme values are still open. Use a steady elapsed-time clock rather than the wall clock.

### 17. Show the current and expected positions

**My idea:** When auto-scroll pauses, a pointer can show where I am or where I was expected to be. While I'm touching the screen, keep a pointer at the current screen position and show a differently colored ghost pointer moving at the previous speed. The gap can help show the adjustment.

**AI feedback:** One option is a fixed marker on the screen and a moving ghost for the expected position. Give them labels as well as colors. Track their positions relative to the document so manual scrolling doesn't throw off the calculation; keep the difference even if a pointer moves off-screen. Whether an explicit pause advances the ghost is still up for discussion.

### 18. Don't learn from accidental touches

**My idea:** Touching and holding the screen pauses scrolling; smart speed should respond to an actual manual realignment.

**AI feedback:** A motionless hold should just pause and resume, not change the speed. Ignore ordinary taps, text selection, header gestures and programmatic jumps. Tiny time intervals or huge jumps can produce extreme values, so test a minimum interval and safe limits; any smoothing or other changes to the formula are just options for discussion. Reset the reference after a font or layout change, and don't learn from time spent in the background.

## Saving things

### 19. Personal bookmarks

**My idea:** Let me save items for myself, perhaps with a ribbon in the header or beside their names.

**AI feedback:** Save bookmarks locally using stable item IDs. Whether a ribbon saves the whole item or an exact reading position can be decided later. Keep these personal ribbons distinct from the existing featured stars.

### 20. Things that can wait

**My idea:** Exporting settings, custom themes and similar extras aren't priorities right now. All of these ideas can change.

**AI feedback:** Focus first on search, reading, navigation and auto-scroll. Leave room for backup, themes or syncing later, but don't make them prerequisites for the main experience.

## More ideas from AI

- **Build a little at a time.** One possible order: combined search and its index, opening an exact match, reading layout and fonts, basic auto-scroll, then experiments with smart speed and the pointers. This is only a suggestion.
- **Measure on a real phone.** Check how quickly the first result appears, how smoothly later results arrive, and how much memory and battery search uses. Set actual speed targets after measuring, rather than guessing.
- **Test the tricky search cases.** Try one of three words matching, two words matching one line, stars, all three languages, very short words, editing a query while workers are still busy, and opening a result without highlighting the reader. Don't let a result limit hide better matches that arrive later.
- **Keep gestures optional.** Provide accessible buttons or keyboard alternatives for pull-down, long-press and double-tap. Don't rely on color alone for the scroll pointers.
- **Keep my place when things change.** Stable item/row IDs and text offsets are more reliable than raw pixel positions after a font, size, orientation or layout change. Reset the speed calculation after reflow instead of learning from the jump.
- **Don't force translations into matching line counts.** Some material isn't aligned one-to-one. Show what's actually available without inventing pairings; preserve the relationship between passages where it is known.
- **Test smart speed before tuning it.** Try positive and negative corrections, no movement, a very short or zero time interval, explicit pause versus touch-hold, multiple fingers, swipe momentum, backgrounding and reflow. A simple hold shouldn't train the speed.
- **Keep the open questions open.** Which languages are on by default? How much should a star affect ranking? What time interval should smart speed use? How much overflow feels good? Does a bookmark save an item or a position? These can be decided after trying things.
- **Keep the content rules.** Don't use AI to translate Arabic prayers, verses or other Arabic text, including indirectly through Persian; use a properly sourced, permissioned human translation or leave it missing. AI can help translate Persian explanatory prose under `CONTENT_POLICY.md`, with source details and human review. Existing provenance claims aren't proof, and uncertain material shouldn't be silently discarded. Keep generated search files out of Git.
