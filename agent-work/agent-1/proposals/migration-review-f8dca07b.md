# Re-review of agent-6's migrated snapshot `f8dca07b`

The snapshot carries the 142 retired-id aliases in 16 mapping records. Merged here
as `91417646`; analysed before any record of mine was rebound to it. **Nothing in
the corpus was changed by me.**

## The migration is metadata-only, as claimed

| check | result |
|---|---|
| `data/items`, `data/texts`, `data/editorial-history.json` changed | **0 files** |
| `data/row-splits` changed | 16 files |
| canonical rows identical to `3e35f4ca` | **all 16 items** |
| mapping `rows[]` entries added or removed | **none** |
| insertions changed | **none** |
| `plan_sha256` / `layout_sha256` changed | **none** |
| mapping segments whose only change is an explicit `"target_start": 0` | 153 |
| mapping segments with any other change | **0** |

## The 142 aliases

- **142 of 142 retired ids now resolve.** Before this snapshot all 142 were
  unreachable; now each one has an alias entry.
- **Every applied alias is byte-identical to the proposal I audited.** No alias was
  adjusted on the way in.
- **Every applied alias rebuilds its retired text exactly** from the current rows at
  the offsets it names (142 of 142), including the multi-row mappings.

Aliases added per record, with the record's alias count before → after:

| item | added | aliases | rows |
|---|---:|---|---:|
| `amal-aamal-daahay-rvzhay` | 2 | 10 → 12 | 259 |
| `amal-aamal-hfdhm-mvlvd` | 1 | 0 → 1 | 21 |
| `amal-aamal-mabyn-altlvayn` | 4 | 2 → 6 | 43 |
| `amal-aamal-mbas` | 2 | 0 → 2 | 23 |
| `amal-aamal-msjd-sasah` | 1 | 0 → 1 | 12 |
| `amal-aamal-zval-jmah` | 1 | 0 → 1 | 53 |
| `amal-arbayn` | 1 | 0 → 1 | 5 |
| `amal-tsbyhat-slvat-rmzan` | 17 | 22 → 39 | 424 |
| `dua-aml-am-davd` | 3 | 16 → 19 | 261 |
| `dua-samat` | 1 | 0 → 1 | 159 |
| `item-adayh-vqt-tlva` | 49 | 1 → 50 | 100 |
| `item-avl-adayh-sbh` | 35 | 4 → 39 | 176 |
| `item-dvm-khtbh-ayd` | 19 | 10 → 29 | 160 |
| `khavas-khvas-angshtr-aqyq` | 1 | 0 → 1 | 7 |
| `monajat-mnajat-aymh-alyhm` | 2 | 1 → 3 | 132 |
| `ziyarat-svm-jamah-aymh` | 3 | 22 → 25 | 346 |

## The 93 reused ids were not redirected

- **92 are still live rows with unchanged text and kind.**
- **1 is not a live row and should not be counted as one.**
  `ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcdaf315ab02c` was retired by the reviewed
  joins of `3e35f4ca`, before this migration. Its alias exists in both snapshots
  and is **byte-identical across the migration**, so the migration did not redirect
  it either. The reused-id map's `resolves_through: alias-or-original` describes it
  correctly.
- **0 live ids gained an alias** in this migration.

## Reviews

- All **115** records rebuilt against `f8dca07b` and verified (`verify-review` per
  item, 0 failures), with the same **178** individual space decisions. The 16
  migrated items are re-reviewed here; the other 99 were re-verified against the
  snapshot, and their content is unchanged since `3e35f4ca`.
- Gates on this branch after the merge: `verify-tool-info`
  `tool-version-matches`, runtime-audio 6/6, `npm run validate` PASS,
  `npm run check` 283 tests / 280 pass / 0 fail / 3 skipped, `audit-authored`
  complete 112/112.

## Conclusion

The 16 migrated mapping records are accepted: the change is exactly the 142 aliases
plus an explicit `target_start: 0` on 153 segments, no row, text, insertion or plan
moved, no live id was redirected, and every alias reproduces the text it claims.
This is an agent review of metadata consistency; it is not scholarly, human or
rights approval of the texts themselves.
