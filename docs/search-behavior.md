# Search behavior and tests

This documents the current **development implementation**, not a claim that all search choices are final. The source corpus is never rewritten by search.

## Query words and results

- Search folds accents/diacritics, normalizes Arabic/Persian yeh and kaf and digits, and ignores tatweel and zero-width joining/non-joining characters. A half-space **inside** a query word does not create another term: `اهل‌بیت` and `اهلبیت` are one normalized term. A normal space or punctuation separates terms: `اهل بیت` is two terms. Repeated normalized terms count once as OR terms, but their repetitions are retained when checking query order.
- Terms remain independent **OR** searches inside a single TOC title or Arabic/Persian row field. Any one term is enough; a substring inside a word is a match. Thus a short word or a multiword query containing a common short word can legitimately return many results. A query is not a required phrase.
- TOC and text share **one ranked list**. Its first key is the displayed number of distinct query terms found in the anchor and any continuation rows; higher counts come first. The second key is the featured star: for an equal displayed count, a starred hit always comes before an unstarred hit, even if the starred hit is only a substring and the other is a whole-word or TOC match. Repeated query terms are counted once in this displayed count.
- Within equal count and star status, complete normalized words and compact, ordered sequences receive the strongest relevance boost. An ordered sequence can skip a query term and a nearby source word: for example, `الهی اشتباه البلا` can still favor a nearby `الهی عظم البلاء`. This is not character-level fuzzy matching or spell correction; a single misspelled term can still return no results.
- The current local sequence score adds 6 for a complete normalized word, 4 for the existing accepted joined/spaced equivalent, or 3 for a substring; each unmatched query or source word inside the sequence subtracts 2. Long scattered gaps do not acquire the same boost. This is a provisional, testable relevance heuristic, not a claim of semantic understanding. After displayed count, star, and sequence score, ties use sequence length, whole-word count, the prior coverage heuristic, TOC, Arabic, direct versus joined/spaced, then source order. Because count and star come first, a less-ordered starred passage can outrank a more exact unstarred passage with the same count.
- A compact sequence can continue through **immediately neighboring source rows of the same item and language**. The generated index links only immediate neighbors with text, never across an excluded audio row or an empty language field. It does not aggregate scattered words across the whole item, and one query word is not joined across a row boundary. Adjacent rows can nonetheless be unrelated: this is a discoverability heuristic, not proof that they form a passage. The hit stays anchored to the first matching row.
- The panel shows the first 30 combined results and can show more. Each result is labeled as TOC or Arabic/Persian text. Multiword hits list their found terms; a long source row can show up to eight separate contexts, and a cross-row match can show up to eight continuation rows. The original text and marks are displayed unchanged. Opening the result scrolls to a match without leaving a reader highlight.
- The same worker and per-word cache serve global and current-item search. The same count/star ordering is used for combined, per-kind, limited, and provisional results. TOC records arrive before text shards, and sequence scores are calculated in batches; provisional hits have a valid single-term lower-bound score and may reorder as more terms, continuations, or starred hits arrive. A not-yet-scanned hit cannot be ranked until it is found. The search stays in progress until both scans and ranking finish. Arabic and Persian filters affect text results, not TOC titles. English search is not yet implemented.

## Incremental work and previous results

- Each distinct normalized term is searched and cached independently; the worker combines the term hit sets locally as OR and applies relevance afterward. Adding a word does not rescan a completed earlier word. Editing back to a cached word or sequence can reuse its work, subject to bounded caches.
- When a word grows, checked records from an earlier prefix carry a **conservative compact candidate** flag. The longer word may skip a record only if the prefix was checked and could not occur even after spaces were removed. This is deliberately broader than confirmed hits: a previously unconfirmed `اهلبی` can become a valid `اهلبیت` match in `اهل بیتش`. Unknown records and newly loaded shards still need to be checked. The original-text matcher remains the final authority on joined forms.
- An item-scoped search scans only records belonging to that item, including any related TOC records; checked records are reused if the user later broadens to the library. Language filters still apply to text results. The worker yields between bounded batches and coalesces rapid input messages; typing does not have to stop before results can appear.
- The engine retains a bounded amount of sequence scoring and invalidates scores waiting for newly loaded adjacent rows. It selects the requested top results without fully sorting every hit, while maintaining the same comparator and exact counts. Identical normalized input and scope, such as an added trailing space or removed diacritic, does not start a new search.
- On a new query or filter, the previous hits remain visible, with a status identifying them as previous, until the new search has hits or finishes with zero results. An empty *provisional* snapshot does not erase them. The old page's “show more” control is disabled because it belongs to the previous query; its result links remain usable. A failed replacement retains the visible hits and offers retry. Clearing the input closes the results normally. Worker responses for superseded queries are still discarded.

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

The tests compare unaccented queries and deterministic sampled fragments against an independent full-corpus OR oracle, and compare 10,000 seeded short sequence cases with an exhaustive alignment oracle. Optimized results are also checked against full-result baseline digests, fresh scans, randomized cache/scope/shard transitions, and an independent full-sort comparison for bounded top results. Real-corpus and browser tests cover unified ordering, split rows, typos in a multiword query, filters, incremental loading, retained previous hits, no-op input, highlights, navigation, cancellation, and retry at root and Pages bases. They do not replace actual Android-device checks. The worker requires index and shards version 4 with `nfkd-search-v2`; older versions are rejected. Rebuild the data and web assets together rather than mixing versions.
