# Agent-5 review triage — partial, not a completed disposition

Reviews are bound to author snapshot `c9fa191acade1f72ab36e05f39ea931d4cb9cb5d`; the source records are on `origin/arena/95716a81-mafatih`. Verification identified 89 needs-work records and 26 complete records. The following are individual preliminary dispositions, not a classification of all 89. No canonical data was changed for this triage.

| Item | Disposition | Evidence and limitation |
| --- | --- | --- |
| `amal-aamal-arfh-2` | `migration-blocked` | The practice role and split retire published r00002 child IDs; the two substantive matched petition boundaries would retire merged row `md9954596d59be1a71a3e08fb`. Detailed proposed boundaries and mappings are in `round-4-alias-proposals.json`. The earlier line-break decision is separately escalated, not resolved by a mapping. |
| `amal-aamal-nvzdhm-rmzan` | `migration-blocked` | The two Arabic followed by two Persian r00005 child rows are not adjacent matching pairs. Re-pairing them by revising the layout would retire published child IDs. Do not force a non-adjacent merge; a supported link-preserving composition is needed. |
| `item-asharh-6` | `migration-blocked` | The r00005 introductory formula/quotation boundary would revise published children and must retain existing V2/V3 mappings. The r00002 request to inspect finer boundaries is not permission for a length-only split: specify matched semantic boundaries and independently review them. The version conflict below is an additional unresolved constraint, not an ordinary alias. |

## `item-asharh-6` version conflict

The same published ID `r00002-s33d1515313a177c7` denoted different Persian text at different commits. At `e6532e83ffd1acf921becc3d7f5f1bef5b14cecf`, its Persian text ID is `t9c02806ffb8a1beed09b81e6` (basmala followed by praise); at `52e4ed9d` its Persian text ID is `t8c4ab9ef2333099c6edcb2e7` (the basmala only). The present record aliases the latter to the first 51 code points of `m4bf42ef11547f4388f4a32ba` in Persian. That alias does **not** represent the older longer version. Any solution must explicitly account for the version or define and adjudicate a provenance policy for ambiguous historical links; one unversioned alias cannot faithfully stand for both payloads. Do not overwrite either historical meaning or treat the diagnostic proposals as an implemented migration.

Remaining: individually inspect and classify the other 86 records; do not infer their disposition solely from length, row counts, or the existence of a split record. Adjacent joins need preview and link checks, and any inserted space needs separate review.
