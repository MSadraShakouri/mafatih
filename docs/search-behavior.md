# Search behavior and tests

The home field and reader search icon use one lazy worker. Global search loads the generated library index; in-text search prepares a separate current-item engine from the already-loaded reader data without downloading library shards. Both start with Arabic text enabled and Persian text disabled; users can enable Persian in either view. The choice is shared for the current session and resets on reload. Language switches affect text fields, not TOC titles. Search never rewrites the source corpus. The old panel and browser specs under `tests/deferred/` are retained as historical references, not the current interface.

## Query words and results

- Search applies Unicode NFKD compatibility decomposition and lowercase, removes combining marks, tatweel and zero-width joining/non-joining characters, folds Arabic/Persian yeh and kaf, several alef/hamza and heh forms, and converts Arabic/Persian digits to the same digits. Non-letter/non-number characters become spaces. This is a search-only representation: original text and its display are unchanged. A half-space **inside** a query word does not create another term: `اهل‌بیت` and `اهلبیت` are one normalized term. A normal space or punctuation separates terms: `اهل بیت` is two terms. Repeated normalized terms count once as OR terms, but their repetitions are retained when checking query order.
- Terms remain independent **OR** searches inside a single TOC title or Arabic/Persian row field. Any one term is enough; a substring inside a word is a match. Thus a short word or a multiword query containing a common short word can legitimately return many results. A query is not a required phrase.
- TOC and text share **one ranked list**. Its first key is the displayed number of distinct query terms found in the anchor and any continuation rows; higher counts come first. The second key is the featured star: for an equal displayed count, a starred hit always comes before an unstarred hit, even if the starred hit is only a substring and the other is a whole-word or TOC match. Repeated query terms are counted once in this displayed count.
- Within equal count and star status, complete normalized words and compact, ordered sequences receive the strongest relevance boost. An ordered sequence can skip a query term and a nearby source word: for example, `الهی اشتباه البلا` can still favor a nearby `الهی عظم البلاء`. This is not character-level fuzzy matching or spell correction; a single misspelled term can still return no results.
- The current local sequence score adds 6 for a complete normalized word, 4 for the existing accepted joined/spaced equivalent, or 3 for a substring; each unmatched query or source word inside the sequence subtracts 2. Long scattered gaps do not acquire the same boost. This is a provisional, testable relevance heuristic, not a claim of semantic understanding. After displayed count, star, and sequence score, ties use sequence length, whole-word count, the prior coverage heuristic, TOC, Arabic, direct versus joined/spaced, then source order. Because count and star come first, a less-ordered starred passage can outrank a more exact unstarred passage with the same count.
- A compact sequence can continue through **immediately neighboring source rows of the same item and language**. The generated index links only immediate neighbors with text, never across an excluded audio row or an empty language field. It does not aggregate scattered words across the whole item, and one query word is not joined across a row boundary. Adjacent rows can nonetheless be unrelated: this is a discoverability heuristic, not proof that they form a passage. The hit stays anchored to the first matching row.
- Global search shows 50 ranked results at a time and can show more. Its compact rows identify the item and use screen-reader labels for result kind and matched-term counts. A long source row can show up to eight separate contexts and up to eight continuation rows. In-text search uses a compact single-line list, truncating with a same-line ellipsis, and shows up to two continuation rows. Marks highlight only the matching original substring, including Arabic combining marks. A global hit opens the original row/code-point anchor. An in-text hit scrolls the same reader DOM and briefly highlights the match when CSS Highlight is supported; otherwise it still scrolls. No source text is changed.
- The same worker hosts separate bounded per-word caches for global and current-item search. The same count/star ordering is used for combined, per-kind, limited, and provisional results. TOC records arrive before text shards, and sequence scores are calculated in batches; provisional hits have a valid single-term lower-bound score and may reorder as more terms, continuations, or starred hits arrive. A not-yet-scanned hit cannot be ranked until it is found. The search stays in progress until both scans and ranking finish. Arabic and Persian filters affect text results, not TOC titles. English search is not yet implemented.

## Incremental work and previous results

- Each distinct normalized term is searched and cached independently; the worker combines the term hit sets locally as OR and applies relevance afterward. Adding a word does not rescan a completed earlier word. Editing back to a cached word or sequence can reuse its work, subject to bounded caches.
- When a word grows, checked records from an earlier prefix carry a **conservative compact candidate** flag. The longer word may skip a record only if the prefix was checked and could not occur even after spaces were removed. This is deliberately broader than confirmed hits: a previously unconfirmed `اهلبی` can become a valid `اهلبیت` match in `اهل بیتش`. A compact bitset is built only when a global prefix can be reused, so known negative ranges can be skipped rather than revisited one record at a time. It includes unconfirmed candidates and grows as the prefix scan progresses. Unknown records and newly loaded shards still need to be checked; alias reuse is permitted only when every alternative is covered. The original-text matcher remains the final authority on joined forms.
- An in-text search builds and scans only the current item's Arabic/Persian fields from reader data; it does not need TOC records or global shards. Preparation folds each distinct source string once per item, reusing it for continuation checks without changing the original field. Its source adjacency is generated before audio rows are excluded, so continuation cannot cross an omitted row. Its per-word cache is separate from the library cache. Language filters still apply to text results. The worker yields between bounded batches and coalesces rapid input messages; typing does not have to stop before results can appear.
- The engine retains a bounded amount of sequence scoring and invalidates scores waiting for newly loaded adjacent rows. It selects the requested top results without fully sorting every hit, while maintaining the same comparator and exact counts. Identical normalized input and scope, such as an added trailing space or removed diacritic, does not start a new search.
- A new normalized query or filter retains the previous results without adding a visible previous-query label while searching. New matches stream above them as they arrive; duplicate rows are not repeated. The first current hits and the completed answer can appear immediately, while subsequent intermediate updates are coalesced. A completed result replaces the retained page, including when there are no matches. Previous results remain selectable and lead to the original prior match, until they are replaced. Failed loading retains the visible results and offers retry. Clearing the input resets the results; responses for superseded queries are discarded. Unchanged keyed rows are reused rather than rebuilding the entire list. Updates wait while a result is being touched or focused, preventing a moving target.

## Approved lam alternatives

The exact 47 A and 11 short-B pairs are recorded in `src/lam-aliases.ts` and apply bidirectionally to a **complete normalized query word**, not by changing the source or the typed query. An alternative is one logical term, not an additional term; results are deduplicated and normal count/star/relevance ranking remains. The approved list includes `اللهای`/`الهای`, `االلهم`/`االهم`, and the anomalous-looking `باللعب`/`بالعب` exactly as approved, without correcting source wording.

`اله` is **not** expanded to `الله`, and the 24 protected Allah-name-containing B pairs are not installed. Existing literal substring and joined/spaced matching remain; an independently approved short root can still match inside a longer source word. Prefix-cache reuse checks every alternative conservatively so completing an approved word cannot lose an alternate form.

## Reader interaction

A global text hit, an in-text hit and an ordinary anchored deep link all align the original line with the reader's selected pointer height, rather than moving the pointer in the ordinary case. If the top or bottom of the document prevents that scroll, the pointer moves to the reachable line instead. An in-text selection closes the results list but leaves the search bar and its query open and briefly flashes the match when CSS Highlight is supported. The paused pointer and guide stay visible and adjustable throughout search; selecting a hit does not restart auto-scroll. The query is kept when the bar is closed and reopened in the same item during the current session, but is cleared on reload or when another item is opened. The reader text itself is not wrapped or rewritten.

In-text search keeps the article mounted. Its header retains the functioning personal bookmark button and the search icon's normal position without increasing its 49px outer height. Opening search stops auto-scroll until the reader explicitly restarts it; a deliberate body double-tap can restart or pause it without closing the search field or discarding the query and results. Enabling search immediately opens a floating, independently scrollable panel with a simple prompt; its label/count is not repeated in the header. A completed outside tap or an actual reader scroll dismisses the results or language overlay without preventing the tapped action; a cancelled system-Back gesture does not. Touching the search row leaves results open, and pending worker snapshots do not reopen a dismissed list. The list icon reopens the panel without focusing the input. Touching outside a focused search field dismisses the keyboard; the keyboard Search/Enter key blurs the input and reveals the panel, including after dismissal. Like Satr, Android handles Back while its IME is visible; the Capacitor Back callback then closes the top search or navigates, regardless of whether the input kept focus. At the library root a second Back within five seconds minimizes the app. These mocked-bridge browser tests are not proof of actual Android IME/Back behavior. Arabic source text and Arabic previews are bold, while Persian remains at its previous weight. Numeric Quran end-of-ayah markers alone are normal weight. Persian digits are a one-for-one display conversion in Arabic/Persian text and the Persian UI; English text remains unchanged. Numeric search accepts all three digit sets and reader anchors map source offsets across marker spans. Search suggestions/examples were removed; the requested font and size previews remain.

## Joined and spaced spellings

Ignoring an actual zero-width joiner or half-space is unambiguous for this search. A **normal space** is harder: joining arbitrary fragments can manufacture matches. For example, the old fallback incorrectly matched `کمیل` against `یک میل`, and `کلام` against `کل امر`.

The current, still provisional ordinary-space fallback for one joined query term:

1. starts at the beginning of the first source word;
2. bridges horizontal whitespace only, never punctuation or line breaks;
3. may start with a one-character source word (so `والله` can find `و الله`), but includes at least two characters from each subsequent source word; and
4. if it ends partway through the last source word, includes at least three characters of that word, except after the complete first word `یا` or `و`, where two are enough (so `یارب` can find `یا ربی`).

For example, `اهلبیت` can find `اهل بیت` and `اهل بیتش`. It can still conflate different phrases: `یاعلی` can find `یا علیم`, because the latter begins with the query's last three characters. This is an explicit precision/recall tradeoff, **not a dictionary or a guarantee of semantic equivalence**. After reviewing those examples, the user chose to allow a partial final source word rather than require it to be complete. The length and boundary checks above remain safeguards against particularly short accidental joins; the two short-prefix exceptions cover common Arabic forms observed in the real corpus.

## Reproduce searches and tests locally

Build the derived data, then run the diagnostic probe with any query arguments. Its examples omit combining marks **only in terminal output** to make unaccented matching easy to inspect; neither stored text nor app rendering is changed.

```bash
npm ci
npm run build:data
node --import tsx scripts/probe-search.ts 'کمیل' 'الهی ربی' 'اهل‌بیت' 'اهلبیت' 'اهل بیت'
# With no arguments it runs several illustrative queries.
node --import tsx scripts/probe-search.ts
```

The probe reports query terms, TOC/text counts, the distribution of how many words each anchor row matched, and the top combined results with relevance scores and any continuation row IDs. Counts depend on the corpus revision and are not permanent correctness targets.

```bash
npm run check
npm run test:browser
```

The tests compare unaccented queries and deterministic sampled fragments against an independent full-corpus OR oracle, and compare 10,000 seeded short sequence cases with an exhaustive alignment oracle. Optimized results are checked against baseline digests, fresh scans, randomized cache/scope/shard transitions, and an independent full-sort comparator. `tests/browser/search.spec.ts`, `search-no-flash.spec.ts`, `search-qol.spec.ts`, `search-pointer-alignment.spec.ts`, `search-visible-pointer.spec.ts` and `search-progress-speed.spec.ts` exercise the current UI, retained/progressive results, worker loading, dismissal, filters, highlighting, source anchors, pointer visibility and adjustment, guarded updates, touch and retry at root and Pages bases. The older `tests/deferred/` specs target a prior panel and are not active.

Run the slower, independent full-corpus alias/protection oracle explicitly:

```bash
MAFATIH_FULL_LAM_ORACLE=1 node --import tsx --test --test-name-pattern='all approved lam pairs' tests/search-corpus-oracle.test.ts
```

Neither browser emulation nor the mocked native bridge replaces actual Android-device IME/Back, shaping, memory or offline checks. The worker requires index and shards version 4 with `nfkd-search-v2`; rebuild the data and web assets together rather than mixing versions. Rights and content review remain outstanding.
