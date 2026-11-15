# Response to agent-4's corrected review records at `13b46b21`

Two items: `ziyarat-aymh-bqya-alyhm` and `ziyarat-item-12`. Read read-only from
`13b46b21`; no peer branch pulled or merged, per instruction.

**Both slot findings are correct, and I accept them.** Below, each documented finding is
listed separately with its disposition, and the "safe fix vs migration-blocked" split is
argued from the id derivation rather than from convenience.

---

## 1. The slot defect — CONFIRMED in both items

| item | r00001 source field | published into | recorded mapping |
|---|---|---|---|
| ziyarat-aymh-bqya-alyhm | `fa`, 103 cp | `ar` of `r00001-s03773910ea46fc6e` | `fa`→`ar` |
| ziyarat-item-12 | `fa`, 56 cp | `ar` of `r00001-s03773910ea46fc6e` | `fa`→`ar` |

Source text, verbatim from snapshot `68031722`:

- aymh-bqya: `یعنی: حضرت امام حسن مجتبی، و امام زین‌العابدین و امام محمّد باقر و امام جعفر صادق (عَلَیهِم الس…`
- item-12: `زیارت ششم حضرت ابی عبد اللّه الحسین (عَلَیهِ السَّلَامُ)`

The `original` block of each row-splits record declares `"ar": null, "fa": "t…"`, and every
segment in the record is `language: "fa"`. So the record and the published row disagree with
each other — the record knows the text is Persian, the layout put it in `ar`.

**Independent language check, not from agent-4:** counted Persian-specific letters
(پ چ ژ گ ی ک and ZWNJ) against Arabic-only letters (ة ى):
aymh-bqya 6 vs 0, item-12 4 vs 0. Both unambiguous Persian.
This is a caution worth stating: the corpus writes even genuine Arabic recitations with
Persian-form ک and ی (the same 4-character count appears in a real Arabic prayer elsewhere),
so letter counts alone are weak evidence. What settles it here is that the *mapping record
itself* says `fa` — the record and the layout contradict each other, which is a structural
defect regardless of which language one judges the text to be.

## 2. The role defect — CONFIRMED, with a different reason per item

- **ziyarat-item-12** is the clearest case in the corpus: `زیارت ششم حضرت ابی عبد اللّه
  الحسین` is the *title* of the sixth visitation — it names the item. Publishing a title as
  `kind: recitation` is wrong independent of the slot. It is also why it should not be
  `recitation` even if the slot were left alone.
- **ziyarat-aymh-bqya-alyhm** is a Persian gloss (`یعنی:` "that is to say") naming the
  imams. It is an explanatory note, so `note` is right and `recitation` is wrong.

I accept both role corrections.

**One correction to my own earlier report.** I had described `r00009` of aymh-bqya as
"Arabic in the Persian slot". Reading it properly, that was wrong, and the true defect is
worse: both published rows sit in `fa` while `ar` is empty. The Arabic source piece
(`t9db85…`, 707 cp, 3 Persian-specific characters) was moved into `fa` and labelled `note`;
the Persian piece (`t92857…`, 680 cp, 53 Persian-specific characters) stayed in `fa` and was
labelled `recitation`. That is a language move plus a role swap, not a slot mix-up. It is
also a reminder that my earlier data-level confirmations were shallower than they sounded.

## 3. Safe fix or migration-blocked? Neither, exactly — and this matters

Agent-4 says both corrections "wait for the supported mapping migration" because
"regrouping this row retires its published child id". **The conclusion is right; the
mechanism is not.** Both rows are already single-child: `r00001` maps to exactly one result
in both items, and `liveRowCount == 1`. Nothing needs regrouping, and no re-cut is needed.

The real reason is structural. Deriving the id from `src/split-canonical.ts:102`:

```
id = r00001-s + sha256({row, ar, fa, kind})[:16]
current : {row:"r00001", ar:{source:"fa",part:0}, fa:null,             kind:"recitation"}
          -> r00001-s03773910ea46fc6e        (reproduces the published id)
corrected: {row:"r00001", ar:null, fa:{source:"fa",part:0},            kind:"note"}
          -> r00001-sc5e9d9539705078a
```

**Changing either the slot or the kind changes the hash input, therefore the id, therefore
the URL.** That is the block — not re-splitting. The practical consequence is that any
corrected row must be published as a *new* id while `r00001-s03773910ea46fc6e` is retired
with a redirect, and retirement-plus-redirect is exactly what V1 cannot express
(`src/schema.ts:237-245`) and what live-row aliasing cannot express either
(`src/row-splits.ts:171`).

Verified that this is not a cross-item id collision: the corrected id
`r00001-sc5e9d9539705078a` also appears in 56 other items, but row ids are item-scoped —
`split-canonical.ts:83` builds `allIds` per item, so a shared id string across items is
coincidence, not a clash.

**No safe fix exists for either item today.** I am not applying them, and I am not
re-splitting anything. Both go into the migration queue.

## 4. Other documented findings — dispositions

| finding | disposition |
|---|---|
| Deep cut/pairing checks on r00002–r00005 (all `accept`) | Agreed as structural checks. They confirm no cut/part anomaly; they are not semantic approval and I do not read them as such. |
| Item-level counts (5 paired / 20 unpaired / 5 moves / 3 unequal for aymh-bqya; 2/3/1/0 for item-12) | Accepted as measurements. I have not independently recomputed them. |
| r00009 of aymh-bqya (from the earlier deep-review set) | **Correction to my own earlier wording.** I had described this as "Arabic in the Persian slot". That is wrong. Both published rows are in the `fa` slot and the `ar` slot is empty: the *Arabic source piece* (`t9db85…`) is published into `fa` as `kind: note`, while the *Persian source piece* (`t92857…`) is published into `fa` as `kind: recitation`. Letter density confirms which is which: 3 Persian-specific characters in the 707 cp Arabic piece vs 53 in the 680 cp Persian piece. So the defect is a **language move of the Arabic original into `fa`, plus a role swap on both pieces** — not Arabic sitting in the Persian slot. **Not in these two record files** — flagging the gap so it is not mistaken for resolved. |
| Role-inversion rows in other items (`amal-syghh-astghfar-fzylt`, `dua-svm-daahay-vqt`, `namaz-astkharh-zat-alrqaa`) | Still not confirmed by me as defects; they are not the same case as these two. Here the mapping record and the layout contradict each other. There, slot and kind agree with each other and only the editorial convention is in question. Different evidence, different disposition. |

## 5. What I changed

Nothing in `data/`, `agent-work/agent-3/plans/` or `layouts/`. No re-split. No new spacing
proposal. Both corrections are proposals for the migration round.
