# Working on Mafatih

For coding agents. Read this before working on the project. Mafatih is a Persian-first web reader with a Capacitor Android shell. Protect the source corpus, reading position, search behavior and the user's existing work.

**Six-agent Arabic/Persian round:** If the user tells you only your agent number (1–6), immediately follow [the executable six-agent instructions](docs/split-agent-instructions.md) and your matching [assignment](docs/split-assignments/). These instructions supersede the historical draft and pilot-only notes. Preserve any existing session work when updating to the preparation commit.

## The working agreement

**Never make an APK.** Do not build, assemble, package, sign, export or generate an APK, including a debug or test APK. Do not initiate an APK build for verification. Never run a Gradle task that produces one. The existing `npm run test:apk-assets` writes a temporary `.apk`-named ZIP fixture: do not run it unless the test has first been adapted to use a non-APK fixture.

**Pushing is normally forbidden.** The user applies and pushes patches. The user has explicitly authorized a narrow exception for the six-agent Arabic/Persian round: each numbered agent may push **only its own session branch** for that round. In a GitHub-connected Arena session that is the platform-assigned `arena/<session>-mafatih` branch; do not create, rename or switch it to `split-agent-N`. An existing own `split-agent-N` branch can also be used outside that platform. Do not push `main` or another agent's branch, open a PR, create a release or tag, force-push, or rewrite published history. The coordinating assistant still does not push. Registration records are self-reported; the platform, not a branch name, enforces ownership. The repository is public, so a pushed branch is public even without a PR; do not include private exports, new third-party content, secrets or unverified permission claims.

**No patch leaves with a failing test.** Run the relevant checks and fix every failure before handing over a patch. A caveat in chat does not make a red result acceptable. If a required check cannot run or a failing test cannot be made green, hand over the diagnosis and no patch. If a failure predates the work, prove it against the base and report it, but do not ship a patch while the test remains red.

**Reproduce the user's complaint before fixing it.** Trace the actual code path and the user's action, not just the most convenient simulation. If the behavior cannot be reproduced, stop and report the diagnosis and uncertainty instead of delivering a guessed fix.

**Revert-proof every bug fix.** Add the regression test before implementing the fix, demonstrate that it fails, then implement the fix and demonstrate that the same test passes with the same inputs and environment. Record both results. Work in the existing checkout, without copying the project or making another worktree. If testing a fix that already exists, temporarily reverse only the agent's own changes in place and restore them exactly; never overwrite, reset or stash the user's changes. If that cannot be done safely, stop and ask. If the test cannot demonstrate the regression, do not claim the fix is verified or hand over a finished patch.

**Ask before designing behavior the user will feel.** A key, button, gesture, navigation outcome or visible interaction needs the user's choice if the request leaves a meaningful decision open. Ask a short, specific question. A bug with one agreed correct outcome can go straight to investigation.

**Measure, fix, and measure again.** For a performance, scrolling or visual-position complaint, use representative inputs and the same environment; report the before and after numbers and what they measure. Never invent numbers. Never ship a change that makes a user-facing number worse, even for correctness. If a regression or trade-off remains, keep working or stop and report it rather than handing over the patch.

**`package.json` is frozen.** Do not change it, the lockfile, dependency versions or app version, and never create a release tag. If the requested work appears to require a dependency or version change, stop and ask the user instead of changing it yourself. Keep the app light; do not add a dependency for a small task the existing tools can handle.

**Both co-author trailers belong on every commit.** The confirmed identities for Mafatih are `Sadra Shakouri <sadra.shakouri@gmail.com>` and `Arena Agent <agent@arena.ai>`. Use both accurate `Co-authored-by:` trailers; if an identity changes or becomes uncertain, ask before creating a commit. Do not invent an identity or silently copy Satr-specific addresses.

**Keep unrelated topics in separate commits.** Each commit should cover one focused topic; for example, do not combine gestures and text grouping in one commit. A requested round can still be delivered as one verified mailbox patch containing multiple focused commits.

**Start from the user's actual base.** Use the existing checkout for the whole related task. Check the working tree, the named base and the pushed state before starting; do not assume an earlier patch was applied or pushed. Preserve unrelated changes, user files, unselected work and backups. Do not reset, clean, overwrite or stash them without permission. Never create another checkout, clone or worktree for convenience.

**One verified patch per requested round.** Name it for the base and subject, for example `mafatih-on-<base>-<subject>.patch`. Produce a real `git format-patch` mailbox and verify it with an actual `git am` against that exact base; compare the resulting Git tree with the intended tree. A plain diff is not a `git am` mailbox. Verify in the same checkout: record the original ref and status, use a temporary detached HEAD at the base only if the switch and application leave all unrelated changes intact, apply the mailbox, compare trees, then return to the original ref and verify its status and changes. Do not force a switch, reset, stash, clone or create a worktree to do this. If the existing changes or index make safe verification impossible, stop and ask the user; do not deliver an unverified patch. Keep unpushed work and historical backups; delete an older patch only after confirming it is integrated, an exact duplicate or otherwise explicitly authorized for removal.

**A running server is not a preview for this user.** The user cannot see a running Node server. Provide a self-contained HTML, image, PDF or other directly viewable file, or references to files that can be opened without a server. Embed the styles, scripts, fonts and images needed by the workspace viewer; it does not load external network resources. Never offer a localhost or live-server URL as the user's preview. A temporary local server may be used internally by automated tests, but it is not a deliverable and must be stopped after the tests.

**Do not claim device verification from emulation or mocks.** An Android keyboard, system Back, touch gesture or device rendering can differ on real hardware. State plainly whether a physical device was tested. Focus alone does not prove an IME is visible, and a simulated viewport or mocked native callback does not prove what a phone did. Do not call a device-specific behavior fixed based only on these simulations.

## Absolute content and rights rules

Read `CONTENT_POLICY.md`, `ROADMAP.md`, `docs/ai-splitting.md` and `docs/segmentation.md` before touching content.

Never generate a translation of Arabic text (including Quran, prayers, ziyarat, invocations or quotations), or indirectly translate devotional Arabic through a Persian rendition. Missing devotional translations must come from licensed human translations or be left missing. AI may translate Persian explanatory prose only under `CONTENT_POLICY.md`, with source/method recorded and reviewed. Do not infer that existing translations are licensed or human-made when provenance is unknown.

- Do not require manual line splitting or visual data-editing tools. Use text/JSON commands and build agent-friendly automation. Do not create an editor or reviewer GUI.
- For the six-agent round use `scripts/split-agent.ts` and `scripts/six-agent.ts` as documented in `docs/split-agent-instructions.md`; the former plans, the latter can apply a checked, reversible physical split on the agent's own branch. The older `npm run split:plan` remains a separate proposal-only general planner. Do not promote any machine proposal or agent review to a human-reviewed alignment.
- Preserve exact Arabic, Persian and English source text, meaningful repeats, source claims and editorial history. New physical rows have tested old-to-new row/language/code-point mappings; retired row IDs must never be reused for unrelated content. Do not equate line number or position with translation. English can remain one paragraph while multiple exact spans refer to it.
- The six-agent command handles this round's checked per-item splits, not general row merging, punctuation correction, or migration of human-reviewed alignments. It rejects those unsupported cases and actual physical line breaks. Do not silently bypass these guards or bulk-rewrite canonical data by hand; preserve and report an exceptional case.
- Source of truth is `data/`; SQLite, search indexes, audit reports and `generated/` are derived build artifacts. Do not commit duplicate generated files. Run `npm run check:repository` and the documented tests. Do not replace canonical data with an old import or generated output.
- Earlier Persian normalization used Hazm; not every suggestion was applied, and its word list is incomplete. Do not assume an unknown word is wrong or automatically apply every suggestion. Read `docs/persian-normalization.md`.
- Rights remain unverified. The user has nevertheless authorized the six numbered agents to push their own work branches in this public repository; that authorization is not evidence of content rights. Do not add third-party source material, duplicate private review exports, force-push, alter another repository, create a release, or mark rights reviewed without evidence.

## Local workspace: one checkout and a real budget

- **One Git folder for related work.** Work directly in the existing checkout. Do not duplicate source files, copy the project, create more clones or worktrees, or keep `-copy`, `-final` and preview-specific versions. Read Git history instead of copying files for safety. Create an additional file only when it is needed for the task, a required test or a deliverable, and remove temporary files as soon as their job is done. If an exception is genuinely necessary, ask the user first. Existing checkouts with unique or dirty work must not be deleted or merged without permission.
- **Treat the workspace snapshot limits as hard constraints.** The platform captures at most roughly 128 MB or 10,000 files, on a best-effort basis. Aim to stay below **100 MB and 8,000 snapshot-eligible files** to leave headroom. Before generating sizeable output, and again before ending each round, measure the entire workspace—not just the project—including Git objects, patches, archives and existing checkouts. Estimate the eligible bytes and file count using the platform's actual exclusion rules, and report the numbers. A measurement is an estimate, not a guarantee of capture. If projected usage exceeds the safe budget, stop generating files, clean up safely first, and ask the user if the budget cannot be met without losing work.
- **Do not bypass the limit.** Never move unique or important work into excluded cache/build directories or outside the workspace, split it among directories, or compress duplicate trees merely to get under the snapshot limit. Generated directories such as `node_modules` and `dist` are naturally excluded; that is not permission to hide persistent work or accumulate extra installations there. Temporary files outside the snapshot must genuinely be temporary and removed when finished.
- **Delete extras as soon as they are safely obsolete.** Remove this agent's generated builds, duplicate assets, temporary logs, old previews and caches when they are no longer needed and contain no unique work. Once an older patch or artifact is verified as already integrated, an exact duplicate or explicitly approved for deletion, remove it rather than accumulating copies. Confirm integration from the actual pushed state and, when necessary, compare trees or contents rather than commit IDs. Keep the current deliverable, unpushed changes, historical backups and unselected or uncertain work; if unsure whether something is disposable, ask before deleting it. Do not rely on `git clean`, a destructive reset or a blanket deletion.

## Setup and the gate

Reuse one compatible **workspace-local** Node installation. Do not install dependencies globally or create separate preview installations. Confirm lockfiles are compatible before reusing an installation; a different lockfile may require the user's decision.

`node_modules` and links named `node_modules` are excluded from workspace snapshots. After a restore, recreate the one local installation rather than assuming it survived. In this workspace, `/home/user/restore-shared-node-modules.sh` can restore the existing shared setup if available and the lockfiles match; do not assume the script exists elsewhere. Do not create a second installation or another checkout to run a preview.

After each meaningful code edit, run the focused tests for the changed behavior and its neighbors. Rebuild before any Playwright test that exercises the built app; never test a stale `dist/`. Run the relevant Node tests for data, logic and scripts, and the relevant browser specs for UI changes. Browser specs run against both configured root and GitHub Pages bases by default.

Before handing over a patch, the focused tests must be green and this project gate must pass:

```bash
npm run check
```

`npm run check` runs type-checking, Node tests, the repository and line-break checks, and the web build. Then run the relevant browser specs, for example `npx playwright test tests/browser/search.spec.ts` when that spec is relevant. `npm run test:browser` builds and runs the full browser suite.

Do not run the full browser suite after every edit. Reserve it for a release check, a central or cross-cutting change, a change whose affected tests cannot be scoped, or an explicit user request. Do not copy Satr's test failures or assume they apply here. Do not run a command that creates an APK. Automated tests do not replace physical-device, content or rights review.

Write long test output to a temporary log and inspect the actual failures and summary. Do not pipe away the only copy of the output. Report the exact commands and passed, failed and skipped counts. Remove disposable logs when they are no longer needed; never hide important results outside the snapshot. Preserve diagnostics or backups containing unique user work.

## Where things are

- `data/` — canonical corpus and source records; content, not build output.
- `src/` — data, normalization, search and content-model logic.
- `web/` and `index.html` — the reader, UI, navigation, search, typography and prebuilt home shell.
- `scripts/` — validators, migrations, data/index generation and other text-based tools.
- `tests/*.test.ts` — Node tests; `tests/browser/` — active Playwright browser tests. `tests/deferred/` contains older specs and is not the active browser suite.
- `docs/` — content policy details, search behavior, segmentation and web/Android documentation. `ROADMAP.md` is the product roadmap. Treat `plan.md` and any existing dirty changes as the user's work; do not overwrite them or invent a shared-memory convention.
- `android/` — the thin native shell. Report source changes and non-APK checks honestly; never produce an APK.
- `dist/`, `generated/`, test results and `node_modules` — derived or local artifacts, not canonical content.

Use current code and tests rather than remembered line numbers. When changing search or display text, preserve the mapping between original text, Unicode/UTF-16 offsets and the DOM, including text split by Quran marker spans. When changing Back behavior, inspect both the web route/history and native callback paths, search UI and results overlay; do not infer device behavior from focus or a mock alone.

## Ending a round

Say what changed in the user's terms. Give the patch path and base when one is requested and verified. List the exact tests and their results, and state openly what was not tested, is unverified or remains wrong. Never claim a push, a green test or a physical-device test that did not happen.
