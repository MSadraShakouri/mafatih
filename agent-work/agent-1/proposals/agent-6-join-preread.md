# Pre-read of agent-6's 45 held joins

Scope: the 45 pairs listed in the message of agent-6's commit `e699d173`
(22 items). Read against `df85a685`, their last data change, where all pairs are
adjacent in mapping order. This is a **pre-read, not the binding review**: the
binding decisions are per pair and per language on their next isolated snapshot.

## Verdict in one line

**All 45 joins are justified** — in every pair the left row ends mid-phrase and
the right row continues the same syntactic unit, in both languages. **No pair
should be dropped.** The correction is in the *mode*: five pairs marked `(ar)`
would glue Persian words, because an Arabic-only space leaves the Persian
junction with no separator at all.

## The five that must be `both-space`, not `(ar)`

For a pair marked `(ar)`, `src/split-canonical.ts` computes
`space = mode === 'both-space' || mode === '<lang>-space'`, so the unselected
language is concatenated raw: `fields[fa] = a + b`. Where both sides carry
Persian, that produces a missing space at the junction. Five of the six `(ar)`
pairs have Persian on both sides:

| item | pair | Persian junction as it would land |
|---|---|---|
| `amal-aamal-daahay-rvzhay` | `r00017|r00018` | `…بر من منّت گذار.` + `از خدای پروردگارم…` → `گذار.از` |
| `amal-slvat-abvalhsn-zrab` | `r00007|r00008` | `…جهانیان، درود فرست،` + `و بر محمّد…` → `فرست،و` |
| `ziyarat-hsn-asgry-alyh` | `r00015|r00016` | `…از جایگاهش منحرف کردند،` + `و بندگانت را…` → `کردند،و` |
| `ziyarat-item-7` | `r00008|r00009` | `…و به شما ببندد،` + `و به شما آنچه…` → `ببندد،و` |
| `ziyarat-svm-jamah-aymh` | `r00017|r00018` | `…اسلام را فرا گرفت،` + `و در دل اهل آن…` → `گرفت،و` |

Each of those five needs one U+0020 in **both** languages: the Arabic junction is
a genuine sentence cut, and the Persian junction is a word boundary that the
source split across rows.

The sixth, `amal-sayr-aamal-rjb r00032|r00033`, is **correctly `(ar)`**: the left
row has no Persian field at all (`0` code points), so the Persian side is the
right row's text alone and nothing is glued.

So the mode split of the 45 is **44 `both-space` + 1 `ar-space`**, not
39 + 6.

## Joins I checked and accept as they stand

All 39 pairs marked for both languages continue a single phrase, for example
`… وَ أَکْرَمْتَهُ` / `أَحَداً مِمَّنْ بَلَّغْتَهُ` (a case ending with its
governed noun), `… وَصَلِّ` / `عَلىٰ مُحَمَّدِ بْنِ عَلِيّ`, `… فِي` /
`قُلُوبِ أَهْلِهَا`, `… رِداءَ` / `الْعِصْمَةِ`. The Persian sides continue in the
same way (`… روزی کردی` / `یکی از کسانیکه او را به آن روزی رساندی`).

Nothing in the list is a new invocation starting after a completed one, and no
right-hand field opens with punctuation, so no pair should be refused.

## Two practical notes for applying them

1. **Chains must be applied in order and re-referenced.** Three items have
   consecutive pairs: `amal-aamal-daahay-rvzhay` (`r00016|r00017` then
   `r00017|r00018`), `dua-marvf-ystshyr` (`r00006|r00007` then `r00007|r00008`)
   and `ziyarat-fzylt-kyfyt-masvmh` (`r00005|r00006` then `r00006|r00007`). After
   the first merge the middle row no longer exists as a separate current row, so
   the second merge has to name the merged row on its left. The first merge is
   always the leftmost pair.
2. **One join lands Persian prose inside an Arabic field.**
   `amal-aamal-daahay-rvzhay r00017|r00018`: the right-hand Arabic field reads
   `وَ الدُّنْیَا سپس سه مرتبه بگوید: أَسْتَغْفِرُ…`, i.e. it continues in Arabic,
   then switches to Persian instruction, then back to an Arabic formula. The join
   itself is right (`… لِلْآخِرَةِ` + `وَ الدُّنْیَا`), but the merged field will be
   mixed-language, so it needs a mixed-language finding on the review record
   rather than a silent acceptance. That is a note for the review, not a reason to
   drop the pair.

## What this does not cover

The spacing decisions themselves are one character per selected language and each
one still needs its own accept/reject decision on the snapshot where it is
proposed. My pre-read says which pairs are worth applying and in which mode; it
does not pre-approve any inserted character.
