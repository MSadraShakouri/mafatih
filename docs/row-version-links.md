# Version-aware row links: safety and current limits

This is a reader/tooling change, not a completed six-agent round. It does not
change canonical `data/`, install retired-row aliases, approve a translation,
reclassify a passage, rebind a review, or determine source rights.

## URL and reader behavior

Existing `#/item/ITEM?row=ROW&lang=ar|fa&offset=N` URLs remain valid. `N` is a
Unicode code-point offset, not a UTF-16 index. New search links add a full
`version` parameter:

- 64 lowercase hexadecimal characters: a deterministic row-content identity
  used by newly generated search links. It hashes the item ID, row ID, pooled
  Arabic/Persian references and row-level source-attribution lists. The content
  identity of a recorded older row is also recognized as its **provisional**
  historical meaning. This is not a complete Git snapshot or proof of
  source-occurrence lineage. If the current and historical meanings have the
  same identity, both fail closed rather than being silently conflated.
- 40 lowercase hexadecimal characters: an explicitly recorded Git snapshot.
  Only exact observed labels are recognized; the reader does not extrapolate
  from a commit to its parents, descendants, or similarly named branches.

Ordinary unversioned legacy links retain the existing split/alias resolver.
Guarded reused IDs and historically unroutable retired IDs do **not**: an
unversioned link shows a warning and any available choices rather than silently
choosing a destination. A single retired-ID candidate is still explicitly
unreviewed, and selecting its version does not open it without a separate user
action. A versioned link with an unknown version, missing field, invalid offset,
absent destination, or stale proposal also warns instead of guessing or
clamping. A missing legacy destination now produces a visible warning. Other
legacy unversioned offsets retain their existing clamping behavior.

An unambiguous current-row link opens normally. Retired unambiguous rows can
still resolve through their validated split/alias record when its original
content identity matches. Historical candidates in the current safety register
are **provisional and unreviewed**. Even with an exact known snapshot or the
old row's content identity, the reader shows that status and requires a
separate user action to view a candidate; it does not convert that action into
an author/reviewer decision. Unavailable candidates are not clickable. Search
links with an old index and a changed item never silently select a target. A
compact list of guarded IDs is also embedded in the app bundle, so an older
cached item missing the per-item register cannot bypass the warning.

## The provisional register

`split-assignments/row-version-findings.json` is metadata-only safety evidence,
not canonical corpus content or an agent-approved migration. It records **467
IDs in 94 items** observed in reachable history through
`0cbcdf7f854a798f0e387bff2a649e1a5157b053`, relative to frozen base
`ffa01da92fbba25731356e8158c295b3824763f0`:

- **146 reused IDs** in 30 items: 1,142 older-row observations in 254
  item/snapshot pairs, covering 22,702 old code points.
- **321 unroutable retired IDs** in 78 items: one recorded historical variant
  per ID, 1,591 observations in 403 item/snapshot pairs, covering 52,432 old
  code points. Existing agent proposals were checked against every recorded
  occurrence; the 65 Agent 4 candidates were converted by the coordinator from
  an older proposal and have not been authored or installed on that branch.

The categories overlap by item. Together they cover 2,733 observations in 540
unique item/snapshot pairs and 75,134 old code points. Their proposed targets
were checked against source-occurrence lineage and exact target text. All remain
**provisional and unreviewed**: coordinator technical analysis is not an author
confirmation, independent agent review, semantic ruling, proof of rights, or
evidence of actual link usage. This covers recorded reachable snapshots only;
outside or unavailable history remains unknown. A further same-field scan found
no lineage mismatches in its separate accessible inventory, but excluded these
guarded and unroutable IDs and was not exhaustive.

For one known example, `ziyarat-byan-anchh-vars/r00001-sa021c793590ec5ab`,
the source-lineage candidate for the two old Persian-field code points is an
Arabic-field slice of `r00001-s909b8a58b8018daa` at `[109,111)`. Five other
same-text positions did not match the frozen lineage. An existing agent
proposal differs or is incomplete; the candidate still requires the author and
reviewer to decide. It is intentionally shown as provisional, never as a
single-key alias or a settled semantic fact.

The build checks the strict metadata shape, duplicate IDs/snapshots, contiguous
code-point coverage, non-audio targets and exact target text slices. Each group
is bound by SHA-256 to the parsed target item and split record. **Any change**
to either record disables the old physical targets while retaining the warning.
All 467 bindings are stale on published main `2163b5e7aa43fe9cb72ac681e6a62dc0f4936fe4`;
there, the candidate targets are unavailable rather than guessed. Do not simply
update a hash to suppress the warning: rerun the source-lineage and available
history checks against the new data and obtain the required branch-owned author
action and independent review. A text match alone is not a lineage proof. The
register is not presumed to contain every historical label. Once an official
alias has been installed and reviewed, remove its provisional entry only after
confirming that it does not mask a distinct historical meaning; do not leave a
stale or colliding guard to override a valid reviewed alias.

The register sits outside `data/`, and `ensureRoundScope` has not been relaxed.
The extended `tool-info.json` pins the reader, build, safety register and
relevant tests so agents can detect mismatched tooling. This change does not
waive any of the six-agent preview, migration, review, audit or replay gates.
The 321 retired-ID candidates now have consent-gated reader suggestions, not
installed aliases. They and the outstanding review findings still need their
own guarded, branch-owned workflow and fresh independent review.
