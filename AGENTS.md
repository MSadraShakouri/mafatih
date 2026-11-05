# Instructions for AI agents working on this project

Read `CONTENT_POLICY.md`, `ROADMAP.md`, `docs/ai-splitting.md` and `docs/segmentation.md` before touching content.

## Absolute content rule

Never generate a translation of Arabic text (including Quran, prayers, ziyarat, invocations or quotations), or indirectly translate devotional Arabic through a Persian rendition. Missing devotional translations must come from licensed human translations or be left missing. AI may translate Persian explanatory prose only under `CONTENT_POLICY.md`, with source/method recorded and reviewed. Do not infer that existing translations are licensed or human-made when provenance is unknown.

## Work style

- Do not require manual line splitting or visual data-editing tools. Use text/JSON commands and build agent-friendly automation. Do not create an editor or reviewer GUI.
- Use `npm run split:plan -- export <item>` and the plan/validate workflow in `docs/ai-splitting.md`. It proposes lossless pieces and optional **unreviewed** groups; it does not modify canonical text. Do not silently promote a machine proposal to a reviewed alignment.
- Preserve exact Arabic, Persian and English source text, meaningful repeats, source claims, IDs and editorial history. Do not equate line number or position with translation. English can remain one paragraph while multiple exact spans refer to it.
- A general one-to-many split/merge migration and physical canonical-splitting command are not implemented. Do not bulk-rewrite text or reuse retired IDs to fake one. Follow the roadmap and make backups/migration tests before adding that capability.
- Source of truth is `data/`; SQLite, search indexes, audit reports and `generated/` are derived build artifacts. Do not commit duplicate generated files. Run `npm run check:repository` and the documented tests. Do not replace canonical data with an old import or generated output.
- Earlier Persian normalization used Hazm; not every suggestion was applied, and its word list is incomplete. Do not assume an unknown word is wrong or automatically apply every suggestion. Read `docs/persian-normalization.md`.
- Rights remain unverified; keep this work local/private until appropriate permissions are obtained. Do not publish, force-push, alter an unrelated repository, or mark rights reviewed without evidence.
