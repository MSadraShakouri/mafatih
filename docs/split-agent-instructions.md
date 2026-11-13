# Six-agent Arabic/Persian work: start here

This is the **current executable workflow**, superseding the old proposal-only guide, serial chain, mandatory pilot and the historical ring draft. If the user says only “you are agent N, start,” take N from that message, read `AGENTS.md` and `CONTENT_POLICY.md`, and follow this document. Do not ask the user to copy a list or tell you the whole protocol.

The user explicitly authorizes **each agent to push only its own branch**. Never push `main` or a peer's branch, force-push, create a PR, release or tag, or change a different repository. A pushed branch of this repository is public even without a PR. Do not commit generated text-bearing inputs/previews, third-party editions, secrets, raw source quotations in messages, or claims that permissions were verified. Do not translate Arabic devotional text, even through Persian. No APK builds.

## 1. Keep your Arena branch; obtain and register the common base

First inspect and preserve the current branch, status, commits and files. In a GitHub-connected Arena session, keep the **platform-assigned current `arena/<session>-mafatih` branch**. Do not create, switch to or rename it to `split-agent-N`; the platform permits you to push only your own session branch. Outside Arena, an already-established own `split-agent-N` branch is also supported. If you cannot identify your session's own branch, stop and report; the name or registration alone does not prove ownership. Never reset, clean, stash, force-push, overwrite or discard work. If existing work cannot safely be committed or merged, stop and report it. Every commit, including merge commits, needs both co-author trailers from `AGENTS.md`.

Wait until the user has applied **and pushed the updated preparation patch**. Fetch `main` and find the latest first-parent commit that **added or modified** the launch marker. This freezes the same preparation even if unrelated commits are later added to `main`; the original marker-adding commit is now obsolete. The following is Bash; set N to your own number:

```bash
set -euo pipefail
N=4                       # replace with your own number, 1–6
ME="agent-$N"
PREV=$(( (N + 4) % 6 + 1 ))
NEXT=$(( N % 6 + 1 ))
OWN_BRANCH=$(git branch --show-current)
git status --short --branch
# Confirm OWN_BRANCH is your platform-assigned branch, not main or a peer.
# Fetch the actual main tip without moving any local branch or tracking ref.
git fetch --no-tags --refmap= origin refs/heads/main
# A shallow boundary can falsely make existing commits appear to be roots.
# If shallow, obtain the missing history before choosing a frozen base:
if test "$(git rev-parse --is-shallow-repository)" = true; then
  git fetch --no-tags --unshallow --refmap= origin refs/heads/main
fi
test "$(git rev-parse --is-shallow-repository)" = false || { echo 'Complete history unavailable; preserve work and report' >&2; exit 1; }
MAIN=$(git rev-parse --verify 'FETCH_HEAD^{commit}')
BASE=$(git log -1 --first-parent --diff-filter=AM --format=%H "$MAIN" -- docs/split-assignments/launch.json)
test -n "$BASE" || { echo 'Updated launch marker not found; stop and report' >&2; exit 1; }
git show "$BASE:docs/split-assignments/launch.json" | node -e '
  let s=""; process.stdin.on("data", x => s+=x); process.stdin.on("end", () => {
    const m=JSON.parse(s); if(m.protocol!=="six-agent-parallel-ring-v2" || m.preparation_revision!==2) {
      console.error("Updated preparation is not on main; preserve work and stop"); process.exitCode=1;
    } else console.log("Updated launch marker:", m.protocol, m.preparation_revision);
  });'
# Before any merge, reject a changed existing round/branch binding.
REG="agent-work/$ME/registration.json"
OLD_BASE="agent-work/$ME/base.txt"
for p in agent-work "agent-work/$ME" "$REG" "$OLD_BASE"; do
  test ! -L "$p" || { echo "Unsafe symlink: $p; preserve and report" >&2; exit 1; }
done
if test -e "$REG"; then
  node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
    if(x.agent!==process.argv[2]||x.branch!==process.argv[3]||x.base!==process.argv[4]) {
      console.error("Existing registration differs; preserve work and report"); process.exit(1);
    }' "$REG" "$ME" "$OWN_BRANCH" "$BASE"
fi
if test -e "$OLD_BASE"; then
  test "$(cat "$OLD_BASE")" = "$BASE" || { echo 'Existing frozen base differs; preserve work and report' >&2; exit 1; }
fi
if ! test -e "$REG" && ! test -e "$OLD_BASE"; then
  for kind in plans layouts reviews; do
    d="agent-work/$ME/$kind"
    if test -d "$d" && test -n "$(find "$d" -mindepth 1 -maxdepth 1 -print -quit)"; then
      echo "Existing $kind have no verifiable frozen base; preserve work and report" >&2; exit 1
    fi
  done
fi
```

If the frozen base is not already an ancestor of your own branch, merge it **into that branch** with a merge-commit message containing both trailers. Do not switch branches. First commit your own existing tracked work if that can be done safely. For histories with a common ancestor, the merge command is:

```bash
MERGE_MSG=$'Merge updated six-agent preparation\n\nCo-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>'
git merge --no-ff -m "$MERGE_MSG" "$BASE"
```

If Git says the histories are unrelated, first check whether the repository is shallow and fetch the missing history; never assume that a shallow boundary means unrelated roots. If full histories are genuinely unrelated, the corresponding careful merge is `git merge --allow-unrelated-histories --no-ff -m "$MERGE_MSG" "$BASE"` on **your own branch**. Preserve both histories and resolve conflicts by comparing the actual pre-merge work and preparation, never by blindly choosing a side; stop and report if any existing work cannot be preserved.

A safe shortcut exists for the specific clean, unrelated-history case where your entire current tree is byte-for-byte identical to `$BASE^` (as with an unchanged session on the previous preparation). Verify `git status --porcelain` is empty and the current tree equals the parent tree **using the exact commands below**; otherwise do not use this shortcut. It retains the existing history and applies only the known preparation delta, then verifies the complete resulting tree before the merge commit:

```bash
set -euo pipefail
# Only after confirming full histories are unrelated, the worktree is clean,
# BASE has a parent, and your current tree is exactly BASE's parent tree:
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD^{tree})" = "$(git rev-parse "$BASE^"^{tree})"
git merge --allow-unrelated-histories --no-ff --no-commit -s ours "$BASE"
git diff --no-ext-diff --binary "$BASE^" "$BASE" | git apply --index
test "$(git write-tree)" = "$(git rev-parse "$BASE"^{tree})" || { echo 'Tree mismatch; preserve merge state and report' >&2; exit 1; }
git commit -m "Merge updated six-agent preparation" \
  -m $'Co-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>'
```

If the command fails or conflicts, preserve the merge state and report; do not force, reset or discard files. If your current tree is not exactly the prior preparation, use an ordinary careful merge instead. If fetching the complete history is impossible, report the exact limitation rather than guessing a common base.

Install the existing locked dependencies with `npm ci` if needed, without changing package or lock files. This round is pinned to **Node v22.22.3, ICU 78.2 and Unicode 17.0**: use that exact runtime, not the earlier Node 20 pin. If the runtime or another pin differs, `verify-tool-info` reports the differing fields; do not bypass it. On resume, keep the original registration and base; if a legacy `agent-work/$ME/base.txt` or existing plans record a different or unverifiable base, preserve them and report instead of silently migrating them.

```bash
node --version                 # must print v22.22.3
node --import tsx scripts/split-agent.ts verify-tool-info docs/split-assignments/tool-info.json
node --import tsx scripts/split-agent.ts verify-partitions docs/split-assignments/assignments.json --base "$BASE"
node --import tsx scripts/six-agent.ts register --agent "$ME" --base "$BASE"
node --import tsx scripts/six-agent.ts configure --agent "$ME"
```

Registration creates `agent-work/$ME/registration.json` once, binding your number, **actual current branch**, and frozen base. Repeating it is safe only when all three match. It checks the base is an ancestor and refuses a changed legacy base, duplicate local identity or differently bound registration. This is a self-declaration, not platform ownership proof. Review and commit just your registration with the required trailers, then publish it on **your own** current branch:

```bash
git status --short --branch
git add "agent-work/$ME/registration.json"
git commit -m "Register $ME for the splitting round" \
  -m $'Co-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>'
test "$(git branch --show-current)" = "$OWN_BRANCH" || { echo 'Own branch changed; preserve work and stop' >&2; exit 1; }
git push origin "$OWN_BRANCH"
```

If already committed, do not create an empty commit; push the existing own branch if necessary. Never push another ref or `main`. If push is rejected, stop and report without exposing credentials. The partition covers all **686 items / 21,181 original AR/FA occurrences**, including already split/classified material and reciter labels. Your complete list is `docs/split-assignments/agent-N.md`; do not switch or sample the assignment. A `manual-v1` flag is an old claim, not proof of current accuracy. The workload weights are estimates.

## 2. What to do

- Inspect every original Arabic and Persian occurrence in your assigned items, including no-cut passages, repeated occurrences, explanations, existing kinds and reciter labels. Look at surrounding context and historical break/marker hints; do not blindly restore old breaks or move markers.
- Split into meaningful passages in the existing **manual-v1 row style**: a row may contain corresponding existing Arabic and Persian, or one language alone. Pair only when meaning and context warrant it—not because piece numbers happen to match. The languages may have different counts. Use `recitation`, `note`, `instruction`, `heading`, `quotation`, `audio-reciter` or `other` as appropriate; don't guess a classification to make a check pass.
- Preserve every source character, diacritic, space, punctuation mark, protected Quran marker and repetition. Don't invent or remove text. A mixed/mislabeled field can be split and an exact piece placed in the correct language field; its original location remains mapped. If the language or boundary is genuinely uncertain, record it and request help instead of guessing.
- Complete items and push batches incrementally. You can keep a partly completed plan and continue another time; a canonical item is applied only after its **entire original item** has been checked and laid out. Do not mislabel a partial item or unanswered finding complete.
- Do not silently change punctuation. This round's apply tool rejects punctuation replacements, physical newline separators, pre-existing human-reviewed spans and other unsupported migrations; preserve and report those individual cases. The frozen current corpus has no physical separators in its scoped fields. Never bypass the guards with a manual bulk rewrite.

## 3. Author an item and apply it to your own branch

Choose `ITEM` from your assigned table. Use the exact paths shown, numeric **Unicode code-point** cuts rather than text quotations, and no punctuation replacements in a pushed plan. The template is an unchecked draft; it is not completed work.

```sh
ITEM=the-assigned-item-id
MANIFEST=docs/split-assignments/assignments.json
PLAN="agent-work/$ME/plans/$ITEM.json"
LAYOUT="agent-work/$ME/layouts/$ITEM.json"
# Use a fresh unique name for private exports/previews; these directories are ignored.
INPUT="agent-work/$ME/inputs/$ITEM-v1.json"
PREVIEW="agent-work/$ME/previews/$ITEM-v1.json"
node --import tsx scripts/split-agent.ts export "$ITEM" --base "$BASE" --output "$INPUT"
node --import tsx scripts/split-agent.ts template "$ITEM" --base "$BASE" --author "$ME" --manifest "$MANIFEST" --output "$PLAN"
# Inspect the input, then edit the plan: every source checked, cuts and one kind per piece.
node --import tsx scripts/split-agent.ts split "$PLAN" --base "$BASE" --manifest "$MANIFEST" --output "$PREVIEW"
node --import tsx scripts/split-agent.ts verify "$PREVIEW" --base "$BASE" --manifest "$MANIFEST"
node --import tsx scripts/six-agent.ts layout "$PLAN" --base "$BASE" --output "$LAYOUT"
# Inspect and edit every layout row, including its explicit pairings; set checked=true only after inspecting.
node --import tsx scripts/six-agent.ts apply "$PLAN" "$LAYOUT" --base "$BASE" --agent "$ME"
npm run validate
npm run check:line-breaks
```

Every `--output` must be a **new** file; don't overwrite a prior export. For revisions, commit the prior work, edit your own plan/layout, and update the layout's `plan_sha256` to SHA-256 of compact `JSON.stringify` of the revised plan, or create a fresh template in ignored `scratch/` and use it to revise your layout. Avoid `cut_after` quotations and `punctuation_suggestions` in the committed plan. Add concise **ID/offset-based**, not text-bearing, issue notes.

A layout's `rows` follow the original row order. Each `output` row has `ar` and `fa`, each either `null` or `{ "source": "ar" | "fa", "part": 0 }`, plus one `kind`. Parts are zero-based within the original field, must appear **exactly once and in source order**, and the output kind must match each included part. `source` names the original field; the containing `ar`/`fa` key is the destination field. For example, a Persian instruction formerly in the Arabic field may be `fa: {"source":"ar","part":0}` with `kind: "instruction"`, followed by the Arabic and its existing Persian in a later output row. Unpair uncertain portions; do not invent a translation. The generated layout is a starting draft, not evidence that pairings are right.

The tool checks a frozen item fingerprint, author assignment, complete occurrence coverage, Unicode/marker boundaries, source-order reconstruction, row roles and shared-text copy-on-write. It writes your `data/items/ITEM.json`, a reversible `data/row-splits/ITEM.json` and any necessary `data/texts/*.json` additions. It preserves original references and historical row identities and supports old row/language/offset reading links. When an export contains `inherited_from`, a historical hint is conservatively attached to every mapped descendant of the old occurrence, including pieces moved between languages. The original event may affect only part of that occurrence; old break offsets are not offsets into the current field. Inspect the history instead of treating this inheritance as an automatic boundary. It refuses to overwrite unrelated or non-reconstructible prior item work; preserve and reconcile such work, don't force it. Mechanical checks do not establish correct meaning or rights.

Review `git status` and the actual diff. Stage and commit only your own plans/layouts, changed assigned items, their split records and the affected text shards; never `git add` ignored inputs/previews or an unrelated user's file. Use the two co-author trailers. Before every push, confirm `git branch --show-current` still equals the verified `$OWN_BRANCH`; then push only that branch with `git push origin "$OWN_BRANCH"` (never force). If a push is rejected or branch ownership is unclear, stop and preserve/report the state.

## 4. Parallel ring, two communication files, and independent review

| Agent | Reviews and merges predecessor | Reviewed by successor | Pair files |
|---|---|---|---|
| 1 | 6 | 2 | `agent-1-agent-6`, `agent-1-agent-2` |
| 2 | 1 | 3 | `agent-1-agent-2`, `agent-2-agent-3` |
| 3 | 2 | 4 | `agent-2-agent-3`, `agent-3-agent-4` |
| 4 | 3 | 5 | `agent-3-agent-4`, `agent-4-agent-5` |
| 5 | 4 | 6 | `agent-4-agent-5`, `agent-5-agent-6` |
| 6 | 5 | 1 | `agent-5-agent-6`, `agent-1-agent-6` |

Each listed file is `coordination/<pair>.jsonl`. Each agent uses exactly its two pairwise files. The files are **branch copies**, not a live shared filesystem: write messages on your own branch, commit and push; discover the neighbor's actual branch and read that file at its fetched tip. Never edit or push the peer's branch. Messages are grow-only records; use IDs/offsets and no text passages. Merges may sort records by ID, so use `reply_to` and commit ancestry rather than line order. `configure` installs tested local Git drivers that union independent text-shard additions and message IDs. If they report a collision, corruption, changed old value, or genuine semantic conflict, resolve it on **your own** branch with your neighbor and recheck. Never blindly choose ours/theirs or delete a peer message.

Discover each neighbor from its committed registration instead of guessing an `arena/` name:

```bash
node --import tsx scripts/six-agent.ts discover --agent "$ME" --peer "agent-$PREV"
node --import tsx scripts/six-agent.ts discover --agent "$ME" --peer "agent-$NEXT"
```

`awaiting-peer` means the neighbor has not published a matching registration: continue your own assignment and try later, rather than waiting. `peer-found` includes the exact `branch`, fetched `tip` SHA and common `base`. Discovery lists candidate Arena and conventional branches, fetches their objects without changing any local branch or pushing, accepts a registration only when it names its own remote ref and this exact base, and refuses multiple claimants instead of guessing. Registration is self-reported, not proof of ownership; if it is ambiguous or branch read access fails, preserve the state and ask the coordinator for a verified handoff.

To read the predecessor's messages when discovery reports `peer-found`:

```bash
PEER="agent-$PREV"
PEER_INFO=$(node --import tsx scripts/six-agent.ts discover --agent "$ME" --peer "$PEER")
# Run the next lines only if PEER_INFO reports peer-found.
PEER_TIP=$(node -e 'const x=JSON.parse(process.argv[1]); if(x.status!=="peer-found") process.exit(1); console.log(x.tip)' "$PEER_INFO")
PAIR="coordination/$(node -e 'console.log(process.argv.slice(1).sort().join("-"))' "$ME" "$PEER").jsonl"
git show "$PEER_TIP:$PAIR"
```

After committing a batch, publish an isolated, mergeable authored snapshot and notify the successor:

```bash
SNAP_INFO=$(node --import tsx scripts/six-agent-snapshot.ts --base "$BASE" --agent "$ME")
printf '%s\n' "$SNAP_INFO"
SNAP=$(node -e 'console.log(JSON.parse(process.argv[1]).snapshot)' "$SNAP_INFO")
SNAP_STATUS=$(node -e 'console.log(JSON.parse(process.argv[1]).status)' "$SNAP_INFO")
NEXT_AGENT="agent-$NEXT"
NEXT_PAIR="coordination/$(node -e 'console.log(process.argv.slice(1).sort().join("-"))' "$ME" "$NEXT_AGENT").jsonl"
node --import tsx scripts/six-agent.ts message --from "$ME" --to "$NEXT_AGENT" --kind ready --commit "$SNAP" --text "$SNAP_STATUS; base $BASE"
git add "$NEXT_PAIR"
git commit -m "Publish $ME snapshot notice" \
  -m $'Co-authored-by: Sadra Shakouri <sadra.shakouri@gmail.com>\nCo-authored-by: Arena Agent <agent@arena.ai>'
test "$(git branch --show-current)" = "$OWN_BRANCH" || { echo 'Own branch changed; preserve work and stop' >&2; exit 1; }
git push origin "$OWN_BRANCH"
```

The snapshot command prints `partial-authored-snapshot` or `author-ready`; it makes a commit containing **only your own completed authored items**, attaches it to your own branch and never pushes. Even after a predecessor merge, a revised snapshot descends from your previous isolated snapshot, not your peer-merged branch. A partial snapshot supports early review; do **not** call it author-ready. Never guess the SHA or status.

For a predecessor snapshot, use a `ready` message sent by that predecessor to you for this base. Verify its exact `commit` is reachable from the discovered `PEER_TIP` using `git merge-base --is-ancestor "$PEER_SNAPSHOT" "$PEER_TIP"`. When there are multiple ready messages, select the newest by **snapshot commit ancestry**, not message line order; a later revision descends from the previous snapshot. If candidates are incomparable or the tip does not contain the snapshot, report it rather than guessing. Review available partial snapshots in parallel. When the full `author-ready` snapshot is available, merge **that exact snapshot into your own branch**, not the moving peer tip, with both co-author trailers; after revisions, merge the newer descendant and redo affected reviews.

Do not wait for the predecessor to finish *its* predecessor merge, or wait for all six agents. If the predecessor has not pushed an author-ready snapshot, continue your own work and review available batches; if all remaining work is waiting on one neighbor, report the specific condition and stop rather than polling forever. The user can ask you to resume. If GitHub branch reads/pushes are unavailable in the Arena session, report the error without credentials and ask the coordinator for a commit/file handoff.

To independently review an item from the predecessor's exact published snapshot:

```sh
ITEM=the-predecessors-assigned-item
AUTHOR="agent-$PREV"
RESULT="$PEER_SNAPSHOT"
REVIEW="agent-work/$ME/reviews/$ITEM.json"
node --import tsx scripts/six-agent.ts inspect "$ITEM" --base "$BASE" --result "$RESULT" --author "$AUTHOR"
node --import tsx scripts/six-agent.ts review-template "$ITEM" --base "$BASE" --result "$RESULT" --author "$AUTHOR" --reviewer "$ME" --output "$REVIEW"
# Independently inspect every source, actual output row, pairing, role and history issue; edit the review.
node --import tsx scripts/six-agent.ts verify-review "$ITEM" "$REVIEW" --base "$BASE" --result "$RESULT" --author "$AUTHOR"
```

Set each `semantic_review.sources` split and kind decision to `accept`, `revise` or `uncertain`; explain findings. Resolve each historical or other issue with a note, and set the separate `layout.decision` after checking actual row pairings. `pending`, `revise`, `uncertain` or an escalated issue is not complete. Commit the review to **your own branch** and communicate findings through your shared neighbor file. An author revises on its own branch, commits, publishes a new isolated snapshot, and notifies its successor. A review is bound to exact plan, layout and canonical item/mapping hashes: changes to those invalidate it; unrelated commits do not. Repeat the affected review and merge after a revision. Agent checks are not human, scholarly or rights approval.

## 5. Finish and hand off

Run `node --import tsx scripts/six-agent.ts audit-authored --base "$BASE" --agent "$ME"`; it is complete only when every assigned item has a checked plan, layout and matching canonical result. Run `npm run check` and `npm run validate`; resolve real failures. Ensure your predecessor's final snapshot was reviewed and merged, all relevant neighbor questions have answers, and unresolved issues are clearly reported—not falsely marked complete. Push your own branch and report its exact tip, authored snapshot, predecessor snapshot and test/audit results. Do not open a PR.

At the end each agent reports its actual Arena branch, exact pushed tip and frozen base. The coordinator fetches those six reported refs, checks each `agent-work/agent-N/registration.json` against the reported ref and base, rejects duplicate claims, and combines all six tips without assuming any one contains everything. Registration alone is not ownership proof. The agent `configure` command is deliberately branch-restricted. On the coordinator's integration branch, install the same safe drivers without overwriting a different existing setting:

```sh
for kind in texts messages; do
  key="merge.mafatih-$kind.driver"
  wanted="node scripts/merge-agent-files.mjs $kind %O %A %B %P"
  if current=$(git config --local --get "$key"); then
    test "$current" = "$wanted" || { echo "Conflicting $key: preserve and report" >&2; exit 1; }
  else
    git config --local "$key" "$wanted"
  fi
done
```

With the combined round changes committed and the relevant worktree clean, run the **strict pre-squash** audit and the full project checks:

```sh
node --import tsx scripts/six-agent.ts audit-round --base "$BASE"
npm run check
npm run validate
npx playwright test tests/browser/row-split-links.spec.ts
```

`audit-round` requires every actual result and independent review, confirms each recorded author commit is reachable and contains the reviewed item and pooled values, and rejects out-of-scope canonical changes. Preserve its complete report with the integration handoff, identifying the integration commit it audited. Actual unresolved conflicts return to the agents; the coordinator does not make their semantic decisions.

Produce one verified, squashed one-commit patch against the user's then-current main, without pushing or including the agents' individual commits. On that squashed result (including in a fresh clone without the original agent objects), run:

```sh
node --import tsx scripts/six-agent.ts audit-squashed --base "$BASE"
```

This repeats the coverage, reversible result, assigned independent-review and scope checks using the delivered files. Its `author_commit_provenance` is explicitly `not-verified-after-squash`: it cannot reconstruct the removed ancestry or prove that the pre-squash audit actually ran. The strict pre-squash audit is required, not replaced by this check. The user applies the patch and can delete the temporary branches; GitHub and local clones may retain copies.

The Node suite's fixed historical assertions use the reversible pre-split rows, while current-corpus index and runtime tests still check current outputs. The optional `node --import tsx scripts/test-six-agent-migrated-corpus.ts` runs the Node suite against a disposable mechanically split data root; its artificial decisions are not content review. Some older browser specs also pin original row IDs and exact segmentation: review any failures against actual changes instead of treating the historical expectations as a semantic veto or hiding real regressions. The dedicated split-link/search spec above uses synthetic split rows. No automated check proves transcription, scholarly accuracy, translation provenance, publication rights or that an agent truly inspected the text.
