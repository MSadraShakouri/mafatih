# The provisional row-version register, measured on this branch

Target: `docs/split-assignments/row-version-findings.json` from coordinator commit
`985f226c` ("Add guarded provisional historical link support"), merged here as
`291080e2`. Frozen base unchanged: `ffa01da92fbba25731356e8158c295b3824763f0`.
Tool pin verified (`tool-version-matches`, Node v22.22.3, ICU 78.2, Unicode 17.0).

The register is metadata-only safety evidence: 467 candidate IDs in 94 items, each
group bound by SHA-256 to the exact item and split record it was checked against, all
explicitly `provisional-unreviewed`. This note records what I could *measure* about it,
not an approval of it. Two read-only tools reproduce every number below:
`agent-work/agent-1/tools/register-audit.ts` and `agent-work/agent-1/tools/guard-effect.ts`.

## 1. Which bindings are actually fresh here

The register's own rule is that a changed item or record disables its candidate
targets while keeping the warning. Recomputing `itemVersionBinding` for all 94 items at
my HEAD:

| | items | candidates |
|---|---:|---:|
| fresh binding (targets usable) | 9 | 93 |
| stale — no authored split record on this branch | 85 | 374 |
| stale — record exists but differs from the register | **0** | 0 |

All nine fresh items are agent-6's: `amal-slvat-abvalhsn-zrab`, `dua-aml-am-davd`,
`dua-samat`, `item-adayh-vqt-tlva`, `item-dvm-khtbh-ayd`, `khavas-khvas-angshtr-aqyq`,
`namaz-rsvl-sly-allh`, `ziyarat-hshtm-adab-nyabt`, `ziyarat-rjybyh-alhmd-allh`. The other
85 items belong to agents 2–5 and have **no authored split record on my branch at all**,
so their staleness here says nothing about those branches; it must be re-measured there.

The zero "record differs" count is the useful negative: nothing on my branch silently
changed a record the register was checked against. I ran the same audit at agent-6's
published snapshot `f8dca07b` and got identical results — 9 fresh, 93 candidates, no
problems — so my merge of their snapshot did not move a bound record.

## 2. Do the fresh targets still reconstruct the old text?

For the 9 fresh items I re-ran the register's own check on all 93 candidates: every
candidate's recorded old pooled value exists, the mapping is contiguous from 0, and each
target slice reproduces that old text exactly in the recorded field.

- **93 candidates, 186 field reconstructions** (one per non-null `ar`/`fa` reference per
  candidate; 62 + 22 + 4 + 8 + 16 + 2 + 22 + 4 + 46), **0 failures**.
- The project compiler accepts the register unchanged at HEAD and at `f8dca07b`
  (`compileRowVersionFindings` returns without throwing): 92 candidates are live rows, 1
  is an installed split alias, 0 are neither.

That 92 + 1 split is the same class split my independent audit of agent-6's 93 reused
IDs found, recomputed here from the register instead of from their proposal. Two
independent paths, same answer.

## 3. My own assignment

**No item I authored appears in the register**: 0 of 94. My 112 items therefore have no
guarded or unroutable ID to answer for under this register.

The ID strings still recur across items, which is the known consequence of the piece-ID
input (local row reference + source-and-part references + kind, never the item). 116
register IDs also occur as rows of my items; for example
`amal-aamal-msjd-kvfh/r00007-s437311542faefd68` is also a row of five of my items
(`amal-aamal-lylh-alrghayb`, `amal-aamal-shbhay-qdr`, `namaz-adab-kyfyt`,
`ziyarat-bad-amaman-alyhma`, `ziyarat-item-8`). Every reader, alias or migration must key
on **(item, ID)**; a lookup by ID alone would find the wrong item's row.

## 4. What the guard does to links on agent-6's items

Since the nine fresh items are the ones I review, I measured the actual link behavior
change rather than reading it off the documentation. For each of the 93 candidates I
resolved the same unversioned anchor twice: with the pre-upgrade split/alias resolver
and with the new versioned resolver.

| before | after | count |
|---|---|---:|
| resolved to the current row | `ambiguous` | 92 |
| resolved through the installed alias | `ambiguous` | 1 |

So on these items **every unversioned link to a guarded ID now opens a choice instead of
a row**. That is the documented fail-closed behavior, and for 92 live rows it is exactly
what "never guess which published meaning an unversioned link meant" requires; the current
meaning is offered as a non-provisional choice, so the reader can still get there.

The one alias case is the ID I already knew about,
`ziyarat-rjybyh-alhmd-allh/r00004-s2d6fcdaf315ab02c`. Measured:

- the guard's **current** meaning is the installed, reviewed alias — its content identity
  is the alias original's, so the official migration is not masked or contradicted;
- its **historical** identity is a different content identity, so the register entry is
  legitimately retained rather than removed ("remove its provisional entry only after
  confirming that it does not mask a distinct historical meaning" — here it does mask one);
- the consequence is that this one reviewed alias no longer resolves **unversioned**; it
  is reachable by choosing its version.

That is a real, user-visible change on an item agent-6 holds, so I am reporting it rather
than leaving it implicit. It is not a defect I can fix on my branch, and it is not a
decision an author or reviewer makes: if the item is ever released, someone has to decide
whether a held item's reviewed alias should stay behind a version choice.

### The bundle guard is item-scoped, so my own items are not caught by it

The compact guard index in the app bundle (`vite.config.ts` builds
`__MAFATIH_ROW_VERSION_GUARDS__`) maps **item ID → its guarded row IDs**, and the reader
tests membership with `__MAFATIH_ROW_VERSION_GUARDS__[item.id]?.includes(row)`. Since 116
register IDs are also rows of my items, the index had to be item-scoped for those links to
keep working; I checked that it is, and a guarded ID of another item cannot suppress a
valid link inside one of my items. A plain ID-only index would have broken them.

## 5. What this is not

This is not an independent review of the register's candidates, not an author
confirmation, and not a semantic, scholarly or rights approval. It does not convert any
provisional candidate into an alias, and it installs nothing in `data/`. The 85 stale
items and the 374 withheld targets remain exactly as the register documents them.

## Limits of this measurement

The browser specs could not be run in this sandbox: Playwright's browser binaries are
absent and `npx playwright install chromium-headless-shell` fails to download here
(restricted network), so `tests/browser/row-version-links.spec.ts` errors at
`browserType.launch` before any page loads — an environment limitation, not a result
about the guard. Everything above is Node-level measurement against the real corpus
(`npm run check` itself is green: 307 tests, 304 pass, 0 fail, 3 skipped).

## Reproduction

```bash
npx tsx agent-work/agent-1/tools/register-audit.ts            # HEAD
npx tsx agent-work/agent-1/tools/register-audit.ts f8dca07be7536bf19ea17c869bf098385002099a
npx tsx agent-work/agent-1/tools/guard-effect.ts
```
