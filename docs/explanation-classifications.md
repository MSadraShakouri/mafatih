# Selected explanatory passages in familiar items

The reader's explanation size applies to rows explicitly marked `note` or
`instruction`. A missing Arabic field alone is **not** such a mark. For this
small first pass an agent read the existing text and its immediate context in
familiar prayers and ziyarat, selecting 91 specific rows in 28 items. These are
presentation classifications, not a human, scholarly, religious or rights
review. The exact occurrence IDs, intended roles and original text references
are recorded in `tests/fixtures/manual-explanations.json` and checked by
`tests/explanation-classification.test.ts`; a source-reference change requires
reinspection. No text, row order, text reference or ID was changed.

The selection includes introductions and concluding commentary (notes), and
reading/practice directions (instructions), including directions between prayer
lines. It covers items such as دعای کمیل، دعای توسل، دعای ندبه، دعای عهد،
دعای جوشن کبیر، زیارت عاشورا، زیارت وارث and زیارت جامعه کبیره. Three
selected Persian explanatory fragments happen to be stored in the `ar` field;
their stored field and wording are unchanged. They use the explanation role,
but their original field/language metadata has not been corrected.

Titles, numerical section markers, apparent reciter labels and mixed rows
containing both instructions and devotional text were deliberately left alone.
In particular, Abu Hamza Thumali has an Arabic prayer stored in an `fa`-only
row followed by its Persian translation in another `fa`-only row; neither is
classified as an explanation. Many other items, ambiguities and mixed passages
remain unclassified. Do not infer that this partial pass exhausts the corpus or
establishes religious accuracy, translation alignment or content rights.
