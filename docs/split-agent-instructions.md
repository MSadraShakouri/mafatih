# Six-agent Arabic/Persian work: start here

This is the **current executable workflow**, superseding the old proposal-only guide, serial chain, mandatory pilot and the historical ring draft. If the user says only “you are agent N, start,” take N from that message, read `AGENTS.md` and `CONTENT_POLICY.md`, and follow this document. Do not ask the user to copy a list or tell you the whole protocol.

The user explicitly authorizes **each agent to push only its own branch**. Never push `main` or a peer's branch, force-push, create a PR, release or tag, or change a different repository. A pushed branch of this repository is public even without a PR. Do not commit generated text-bearing inputs/previews, third-party editions, secrets, raw source quotations in messages, or claims that permissions were verified. Do not translate Arabic devotional text, even through Persian. No APK builds.

## 1. Preserve existing work; obtain the common base

If resuming a session, first report and preserve its current branch, status, commits and files. Do not reset, clean, stash, overwrite or throw away previous work. On `main`, create `split-agent-N` before editing; if already on your own differently named branch, rename it safely to `split-agent-N` if that name is free. If you cannot tell who owns the current branch, or a name is already occupied, stop and report. Commit your existing tracked work on your own branch before merging preparation; keep any text-bearing exports local. If unrelated or conflicting work cannot safely be committed, stop and report rather than discard it. All commits, including merge commits, need both `Co-authored-by:` trailers specified in `AGENTS.md`.

Wait until the user has applied **and pushed the preparation patch**. Fetch, find the exact commit that introduced the launch marker, and merge that commit into your own branch. Do not use the old draft-only base or wait for a pilot. These commands illustrate the process; set `N` to your actual number and inspect status before each mutating command:

```sh
N=3                       # replace with your own number, 1–6
ME="agent-$N"
PREV=$(( (N + 4) % 6 + 1 ))
NEXT=$(( N % 6 + 1 ))
git status --short --branch
git fetch origin refs/heads/main:refs/remotes/origin/main
BASE=$(git log -1 --diff-filter=A --format=%H refs/remotes/origin/main -- docs/split-assignments/launch.json)
test -n "$BASE" && git show "$BASE:docs/split-assignments/launch.json"
# Create/switch to split-agent-N as described above, preserving all work.
# Merge $BASE into YOUR branch; resolve your own conflicts, retaining both.
```

Use a merge commit with the required trailers if histories diverged. If preparation is absent or you cannot fetch, report that and preserve your work. Do not guess the SHA. Save this exact full `BASE` **only if the file does not already exist**; on resume read it and require it to match:

```sh
mkdir -p "agent-work/$ME"
BASE_FILE="agent-work/$ME/base.txt"
if test -e "$BASE_FILE"; then
  test "$(cat "$BASE_FILE")" = "$BASE" || { echo 'Frozen base mismatch: preserve and report' >&2; exit 1; }
else
  (set -C; printf '%s\n' "$BASE" > "$BASE_FILE")
fi
```

Never silently switch the baseline mid-round. The frozen baseline is what `--base "$BASE"` means below; reading it uses Git blobs in memory, not a second checkout.

Install the existing locked dependencies if needed, without editing the package or lock file. Then run:

```sh
node --import tsx scripts/six-agent.ts configure --agent "$ME"
node --import tsx scripts/split-agent.ts verify-tool-info docs/split-assignments/tool-info.json
node --import tsx scripts/split-agent.ts verify-partitions docs/split-assignments/assignments.json --base "$BASE"
```

Tool-info pins the source, dependencies, Node, ICU and Unicode version; if it differs, report the mismatch rather than bypassing it. The partition checks all **686 items / 21,181 original AR/FA occurrences**, including already split/classified material and reciter labels. Your complete list is `docs/split-assignments/agent-N.md`; do not switch or sample the assignment. A `manual-v1` flag is an old claim, not proof of current accuracy. The workload weights are estimates.

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

The tool checks a frozen item fingerprint, author assignment, complete occurrence coverage, Unicode/marker boundaries, source-order reconstruction, row roles and shared-text copy-on-write. It writes your `data/items/ITEM.json`, a reversible `data/row-splits/ITEM.json` and any necessary `data/texts/*.json` additions. It preserves original references and historical row identities and supports old row/language/offset reading links. It refuses to overwrite unrelated or non-reconstructible prior item work; preserve and reconcile such work, don't force it. Mechanical checks do not establish correct meaning or rights.

Review `git status` and the actual diff. Stage and commit only your own plans/layouts, changed assigned items, their split records and the affected text shards; never `git add` ignored inputs/previews or an unrelated user's file. Use the two co-author trailers. Push only your own branch with `git push -u origin "HEAD:refs/heads/split-$ME"` (never force). If a push is rejected or branch ownership is unclear, stop and preserve/report the state.

## 4. Parallel ring, two communication files, and independent review

| Agent | Reviews and merges predecessor | Reviewed by successor | Pair files |
|---|---|---|---|
| 1 | 6 | 2 | `agent-1-agent-6`, `agent-1-agent-2` |
| 2 | 1 | 3 | `agent-1-agent-2`, `agent-2-agent-3` |
| 3 | 2 | 4 | `agent-2-agent-3`, `agent-3-agent-4` |
| 4 | 3 | 5 | `agent-3-agent-4`, `agent-4-agent-5` |
| 5 | 4 | 6 | `agent-4-agent-5`, `agent-5-agent-6` |
| 6 | 5 | 1 | `agent-5-agent-6`, `agent-1-agent-6` |

Each listed file is `coordination/<pair>.jsonl`. Each agent uses exactly its two pairwise files. The files are **branch copies**, not a live shared filesystem: write messages on your own branch, commit and push; fetch the neighbor's branch and `git show` the same pair file at its tip to read replies. Never edit the peer's branch. Messages are grow-only records; use IDs/offsets and no text passages. Merges may sort records by ID, so use `reply_to` rather than line position to follow a conversation. `configure` installs tested, local Git drivers that union independent text-shard additions and message IDs. If they report a collision, corruption, changed old value, or genuine semantic conflict, they refuse it; resolve it on **your own** branch with your neighbor and recheck. Never blindly choose ours/theirs or delete a peer message.

After committing a batch, publish an isolated, mergeable authored snapshot:

```sh
node --import tsx scripts/six-agent-snapshot.ts --base "$BASE" --agent "$ME"
```

The command prints the exact `snapshot` SHA and `partial-authored-snapshot` or `author-ready`. It makes a commit containing **only your own completed authored items**, attaches it to your own branch, and never pushes. Even after you merge a predecessor, a revised snapshot descends from your previous isolated snapshot, not your peer-merged branch. This avoids a cyclic chain and lets the successor merge revisions normally. Commit/push your own branch, then tell the successor the SHA and whether it is partial or author-ready:

```sh
NEXT_AGENT="agent-$NEXT"
node --import tsx scripts/six-agent.ts message --from "$ME" --to "$NEXT_AGENT" --kind ready --commit "$SNAP" --text "author-ready or partial; base $BASE; see snapshot"
# Commit your changed pair file with both trailers, then push only split-agent-N.
```

`SNAP` must be the actual SHA printed by the snapshot command, never guessed. A partial snapshot supports early review; do **not** call it author-ready. You may review predecessor batches as they appear, in parallel with your own work. When its full authored snapshot is ready, fetch its branch, verify that SHA is reachable from its pushed branch, and merge **that snapshot into your own branch**, not the moving peer tip:

```sh
PEER="agent-$PREV"
git fetch origin "refs/heads/split-$PEER:refs/remotes/origin/split-$PEER"
git merge-base --is-ancestor "$PEER_SNAPSHOT" "refs/remotes/origin/split-$PEER"
# On split-agent-N, merge $PEER_SNAPSHOT with a merge-commit message containing both co-author trailers.
```

Do not wait for the predecessor to finish *its* predecessor merge, or wait for all six agents. If your predecessor has not pushed an author-ready snapshot, continue your own work and review available batches; if all remaining work is waiting on one neighbor, report the specific condition and stop rather than polling forever. The user can ask you to resume. If GitHub branch reads/pushes are unavailable in the Arena session, report the exact error and ask the user for a commit/file handoff; never expose credentials.

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

At the end the coordinator fetches all six tips and combines them without assuming any one contains everything. The agent `configure` command is deliberately branch-restricted. On the coordinator's integration branch, install the same safe drivers without overwriting a different existing setting:

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
