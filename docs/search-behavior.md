# Search behavior and tests

This documents the current **development implementation**, not a claim that all search choices are final. The source corpus is never rewritten by search.

## Query words and results

- Search folds accents/diacritics, normalizes Arabic/Persian yeh and kaf and digits, and ignores tatweel and zero-width joining/non-joining characters. A half-space **inside** a query word does not create another term: `اهل‌بیت` and `اهلبیت` are one normalized term. A normal space or punctuation separates terms: `اهل بیت` is two terms. Repeated identical normalized terms count once.
- Terms are independent **OR** searches inside a single TOC title or Arabic/Persian row field. Any one term is enough; a substring inside a word is a match. Thus a short word or a multiword query containing a common short word can legitimately return many results. A query is not treated as a required phrase.
- The TOC and text sections are separate, TOC first. In each section the order is: more distinct matching terms, then featured star, then Arabic text, then direct normalized matches ahead of the joined/spaced fallback, then original order. Stars never outrank a result matching more terms.
- The search panel lists matching normalized terms for a multiword hit. Its excerpt can show up to eight separate first-match contexts, joined with ellipses, so distant terms in one long row do not silently disappear from the explanation. The original source is displayed, including marks; opening a result scrolls to a match without highlighting the reader.
- The same worker and per-word cache serve global and current-item search. Arabic and Persian filters affect text results, not TOC titles. English search is not yet implemented.

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

The probe reports query terms, separate TOC/text counts, the distribution of how many words each text result matched, and a few source-derived examples. Counts depend on the corpus revision and are not permanent correctness targets.

```bash
npm run check
npm run test:browser
```

The search tests compare unaccented queries and deterministic sampled fragments against an independent full-corpus oracle, check ordering and filters, and exercise browser loading, typing, highlights, and navigation at root and Pages bases. They do not replace actual Android-device checks. An index made with the old `nfkd-search-v1` rules is rejected by the current worker; rebuild the data and web assets together rather than mixing versions.
