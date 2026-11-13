# Historical draft: six-agent parallel ring for Arabic/Persian work

> **Superseded historical record; do not use this as an agent startup guide.** The original discussion and its old status statements remain below for context. The executable implementation, current rules, assignments and limitations are in [the six-agent instructions](split-agent-instructions.md). In particular, the pilot-first, proposal-only and blanket no-push language in this draft is obsolete. The user has started agents and authorized each to push only its own branch; no PRs. Each needs the pushed executable preparation before continuing.

## 1. The requested workflow

- The user opens six GitHub-connected Arena Agent Mode chats and gives each its number, for example: **“You are agent 1. Start working.”** Everything else needed to start must be discoverable in the repository after the preparation is approved and pushed.
- All six agents work **in parallel**, each on its own complete assignment and its own branch. There is no requirement for six pilot items or for all agents to finish before peer work starts.
- Each agent reviews and merges the work of **one predecessor**, and communicates only through its two neighbor communication files: one with the predecessor and one with the successor. Agent 1 wraps around to agent 6.
- An agent does not wait for a cumulative integration chain or for all six agents. Its peer-merge dependency is the **predecessor's authored work**, not the predecessor's own incoming merge. Agents can continue their own work and respond to neighbor messages while the predecessor is still working.
- Agents resolve their own conflicts on their own branches. They may read another branch and merge a specified peer commit **into their own branch**; this does not modify the peer branch. They may push **only their own branch**, not `main` or another agent's branch. No agent opens a PR or merges into `main`.
- There is **no designated complete agent branch**. A normal agent branch contains its own work and the predecessor work it has merged, not a six-agent cumulative result. The assistant must collect **all six** finished branches at the end; the previous suggestion that agent 6 would contain everything was wrong.
- Agent branch commits, progress notes and conflict-resolution history are temporary coordination. They can commit and revise as needed; there is no need to clean up their histories or make a patch per agent. Preserve data, review records and evidence while the work is in progress.
- When the agents have finished and resolved conflicts, the assistant combines the results on the assistant's own branch, verifies them, and delivers **one mailbox patch containing one final commit**. The user applies the patch and later deletes the temporary branches. If a conflict remains, the assistant reports it back for the relevant agent(s) to resolve; the assistant does not decide the conflict.

The repository is public. A pushed branch is public even without a PR, and deleting it later does not guarantee removal of copies or cached Git objects. Existing rights are unverified; do not represent pushing as a rights clearance.

## 2. Assignments and neighbor rotation

The already-prepared partition covers **686 distinct items, 11,820 existing rows and 21,181 existing Arabic/Persian row-field occurrences**, including previously split and classified material. Titles are not counted in the 21,181 row-field occurrences. Draft copies of the full [machine-readable manifest](split-assignments/assignments.json) and six item lists are in `docs/split-assignments/`; they are not launch-ready. A title-bearing consolidated list was also generated outside the repository in the preparation workspace; that local file is not required to use this repository. Before launch, make the finalized assignments and instructions discoverable to new GitHub sessions.

| Agent / author | Own items | Own AR/FA fields | Reviews and merges | Own work reviewed by | Two neighbor files |
|---|---:|---:|---|---|---|
| agent-1 | 112 | 4,274 | agent-6 | agent-2 | 1–6, 1–2 |
| agent-2 | 114 | 3,552 | agent-1 | agent-3 | 1–2, 2–3 |
| agent-3 | 115 | 3,188 | agent-2 | agent-4 | 2–3, 3–4 |
| agent-4 | 115 | 3,240 | agent-3 | agent-5 | 3–4, 4–5 |
| agent-5 | 115 | 3,607 | agent-4 | agent-6 | 4–5, 5–6 |
| agent-6 | 115 | 3,320 | agent-5 | agent-1 | 5–6, 1–6 |

Draft item lists: [agent 1](split-assignments/agent-1.md), [agent 2](split-assignments/agent-2.md), [agent 3](split-assignments/agent-3.md), [agent 4](split-assignments/agent-4.md), [agent 5](split-assignments/agent-5.md), and [agent 6](split-assignments/agent-6.md).

Each item has one author. Its assigned reviewer is a **different** agent. Whole-item ownership prevents two authors independently rewriting the same item. The balancing formula is an estimate based on text length, occurrences and items, not a guarantee of equal difficulty. Large individual items must support incremental, resumable work.

The previously generated manifest is pinned to corpus snapshot `5a7213e7185863d49836ce5a94c9456099e459a70eb4326596e8e20939cbb69b`, and its current byte SHA-256 is `93ba4bf02029a1a03d162168dcbc32280cf40dd7aad1e2dd7a1832c9339a3e0c`. GitHub `main` was last checked at `6bb1b4b7b86d8a2b5236609af8bd1a9c0909b251`, with the same tree as the local preparation commit. After the new preparation is approved and pushed, the **launch base** will be that new actual commit; do not invent its SHA now. Confirm that its corpus still matches or explicitly reconcile and reverify the assignments before launch; never silently repartition while agents are working.

## 3. Work each agent performs

1. In its Arena-provided checkout, discover the repository instructions, identify its number and assignment, check the common launch base and runtime/tool setup, create or use its uniquely assigned branch, and confirm its push target. Preserve existing changes and do not create another checkout or worktree merely for convenience.
2. Examine **every existing Arabic and Persian row-field occurrence** in its assigned items. This includes fields historically marked `manual-v1`, existing notes and instructions, reciter labels, repeated content, fields that need no further split, and mixed or mislabeled fields. An old manual label is not proof of a completed review.
3. Choose meaningful splits independently for Arabic and Persian and classify pieces appropriately. Preserve exact source text, spaces, diacritics, punctuation, markers, repetitions and ordering during splitting. Do not generate translations, edit English, invent missing text, or infer an Arabic–Persian alignment merely from piece number or row position. Record uncertain boundaries, roles, language labels and historical line-break/marker questions instead of guessing.
4. Apply supported splits to **canonical files on the agent's own branch**, not just a proposal document. Punctuation corrections are separate from splitting: record original and proposed values and reasons, and independently review them; never silently alter wording. The exact representation for independently split languages and per-piece roles still needs a tested design before launch.
5. Work incrementally. Commit and push useful, verifiable batches to the agent's own branch; a very large item must be resumable without falsely reporting the whole item complete. Show counts and blockers in the agent's own progress record. The user can monitor branches without manually approving every item.
6. Independently review the predecessor's authored work and actual canonical changes, not just its own plan. Check source preservation, splits, classifications, uncertainties, punctuation, historical cases and structural tests. Record review on the reviewer's own branch, bound to an immutable author snapshot and relevant item fingerprint. A review is an agent assertion, not human, scholarly, translation or rights certification.
7. When the predecessor's authored result is ready, merge the specified predecessor snapshot into the agent's own branch and resolve its own conflicts there. Record the result and tests. If resolving a conflict changes already-reviewed content, the appropriate independent reviewer must review the changed content again.

The current `split-agent` tool creates/validates plans and reviews but **does not apply canonical splits**. Its existing partition check also compares against the current whole-corpus snapshot, so it becomes stale after any canonical edit. The tools and instructions must be extended; the steps above are not executable today merely by changing the prompt.

## 4. Dependencies: a ring, not a six-step chain

**Proposed terminology for refinement:**

- `author-ready`: the agent has finished an identifiable version of its **own assigned authored work**, including explicit unresolved findings. This does not mean its own predecessor merge or its independent review has finished.
- `review-ready`: a specific version is available for its successor's independent review. It can precede final acceptance; a reviewer can request changes.
- `peer-merged`: the agent has merged and checked a specific predecessor snapshot in its own branch.
- `branch-ready-for-final`: the agent has completed its own assignment and assigned peer review/merge, reconciled messages, passed required checks, and reported the exact final branch tip and any genuinely unresolved issues. Do not mark an unresolved issue as settled merely to reach this state.

These are different states. An agent must not require the predecessor to be `branch-ready-for-final` before it can consume that predecessor's authored work. Otherwise agent 1 could wait for 6, 6 for 5, and eventually 2 for 1: a circular wait.

Example: agent 1 finishes its authored work and publishes an author-ready snapshot. Agent 2 can review/merge that snapshot while agent 1 is still waiting for agent 6. Agent 3 depends on agent 2's **authored** snapshot, not on agent 2 first merging agent 1. Agent 1 can keep working or answer messages while agent 6 is unfinished. The six agents' execution and peer merges may overlap.

If the only remaining task requires a neighbor response or the predecessor's authored result, the session reports the specific waiting condition and stops; it must not poll indefinitely. The user can monitor and ask it to continue. Arena chats do not automatically wake one another in the background.

### Immutable snapshots and revisions — implementation required

An agent needs to identify the predecessor's authored version without accidentally waiting for or importing an ever-growing cumulative chain. **Proposed requirement:** publish an immutable, reachable Git commit or equivalently mergeable author-only snapshot that identifies the agent's own authored output against the common base. The successor reads its exact SHA and merges that snapshot into its own branch. A later peer merge on the author's branch must not be mistaken for a new version of the authored output.

A commit cannot contain its own final commit hash. A workable handoff is: create the authored snapshot; then, in a later commit, append a neighbor message containing the actual snapshot SHA. The snapshot must be reachable through the sender's pushed branch; no one pushes a peer's branch or invents a SHA.

If the author changes an item after review or after merging its own predecessor, publish a new author-owned snapshot/fingerprint, notify the successor through the appropriate neighbor file, and repeat the relevant review/merge. The preparation must design and test how to expose such a revision **without turning the ring into a cumulative chain or requiring a second agent branch**. Possible implementations include a scoped Git snapshot or an equivalent tested per-owner mechanism; no particular implementation has yet been selected or tested. A review remains valid through unrelated branch commits only if the reviewed item's relevant canonical content and metadata still match its recorded fingerprint.

## 5. Two neighbor communication files per agent

**Proposed interpretation for refinement:** use one logical, pairwise file for each neighboring pair. Each agent then has exactly two logical file paths: one with the preceding number and one with the following number. The six paths could be:

```text
coordination/agent-1-agent-2.jsonl
coordination/agent-2-agent-3.jsonl
coordination/agent-3-agent-4.jsonl
coordination/agent-4-agent-5.jsonl
coordination/agent-5-agent-6.jsonl
coordination/agent-1-agent-6.jsonl
```

For example, agent 1 uses the 1–6 and 1–2 files; agent 2 uses 1–2 and 2–3. This is **two pairwise paths per agent**, not six-way chat and not a coordinator-written conflict file. The exact file format and whether the user intended shared pairwise paths or two sender-owned files per agent remain open for refinement.

These are Git files, not live shared files. Both participants may append messages to **their own branch's copy** of their pair's path; neither edits the other participant's branch. To read the latest message, fetch the peer's branch read-only and inspect that file at an exact peer commit, for example with `git show`. The local copy may be older. Push your own branch after writing; the other session must fetch/read it to see the message. Reading a peer branch or commit does not authorize pushing to it; keep your own branch checked out when making edits or merges.

Proposed message fields: unique message ID, sender, recipient, message type, related item/row/path, relevant source or branch SHA/fingerprint, concise issue or answer, and optional `reply_to`/resolution reference. Useful types include authored-snapshot-ready, review finding, conflict question, answer, acknowledgement and resolved. A file is append-only in meaning: never silently rewrite or delete a peer's messages; corrections are new messages. Avoid source passages or secrets in these public branch messages.

Because both peers can append to their own versions of the same path, the files can themselves conflict during a Git merge. Preparation needs a tested, deterministic way to union messages by unique ID, reject differing messages with the same ID, and preserve acknowledgements; agents resolve/report failures on their own branches. Do not assume these files magically synchronize, and do not use a global third-party message channel as a hidden dependency.

## 6. Independent review and conflict handling

- The reviewer fetches the assigned author's immutable snapshot **read-only**, verifies the exact commit/item fingerprint, compares the original and the actual canonical result, and records its own decisions. It does not modify the author's branch or claim to be a human reviewer.
- It may review available batches early, but it does not wait for unrelated agents. The peer merge itself uses the agreed authored snapshot, not an unpinned moving branch tip.
- A conflict or requested content change is described in the appropriate neighbor file, with identifiers, commit hashes, expected behavior and a clear question. The author or reviewer responds in their own branch's copy. They can continue other work while awaiting a response.
- The merging agent resolves Git conflicts **on its own branch**. It must preserve both legitimate results and never resolve a content disagreement by silently picking `ours` or `theirs`. It reruns structural and relevant semantic checks and records which snapshot was merged.
- If a change affects reviewed source content, a new item fingerprint and renewed independent review are required. A later commit affecting unrelated items or only communication files does not by itself invalidate a matching item review.
- If agents cannot decide a real semantic or policy issue, keep it open and report it for the user's decision; do not silently mark it complete.

## 7. Important global-merge problem to solve before launch

**Neighbor merges alone do not mathematically guarantee that the final merge of all six branches will be conflict-free.** The authors own different item files, but the current corpus stores text in 256 shared `data/texts/*.json` shards. The inventory found existing row-text IDs used across different author groups; different agents can also add different entries to the same shard. A simple synthetic `git merge-file` example demonstrated that two already-pairwise-combined JSON files can still conflict with each other because independent additions land on the same lines. This was an illustration, **not** a test of future agent branches.

The preparation must address this without making the assistant the conflict resolver or imposing a serial chain:

1. Keep item ownership disjoint and avoid unnecessary concurrent edits to global files. Design canonical application so shared text is content-addressed/copy-on-write, originals and references are not lost, and one agent cannot silently change another occurrence. Consider per-item/per-owner additions or a rigorously tested key-aware merge strategy; the storage approach is **not yet chosen**.
2. Provide agents with tools to combine non-conflicting shared-file additions deterministically, detect real collisions or conflicting edits, preserve all valid entries/history, and validate the complete referenced corpus. No lossy last-writer-wins or automatic selection of one person's semantic changes.
3. Test the actual planned procedure with **six synthetic branches**, non-neighbor edits to the same shared shard, all six pairwise merges, varying completion/merge orders, subsequent revisions, and the final six-branch integration. Include intentional collisions, missing references, duplicate messages and semantic disagreements; verify that each is detected or correctly preserved. Passing neighbor-only tests is insufficient.
4. If a real final integration still exposes a conflict, stop and route the exact paths, versions and issue back to the responsible agent(s), using the two-neighbor communication scheme or the user's coordination. The agents update only their own branches, resolve the conflict, re-review affected content and republish. The assistant retries only after that; the assistant does not choose the resolution.

## 8. Canonical application and reader compatibility to prepare

The direct-edit mechanism needs to be implemented and tested before the agents are told it exists:

- Apply exact Unicode-code-point splits atomically and reversibly; never split inside a grapheme or protected Quran marker. Prove original text reconstruction, including any separator tokens and repetitions.
- Use copy-on-write for pooled texts, check hash collisions, preserve source references and old values/history, and validate all affected references. Do not allow one agent's edit of a shared value to silently alter other occurrences.
- Preserve item IDs. For changed row IDs or offsets, provide a tested old-to-new mapping and reader/search-link handling; preserve editorial-history references and review state rather than losing them. Current personal bookmarks are **whole-item** bookmarks, so preserving item IDs should preserve those; row-and-offset links are the specific concern.
- Support different Arabic and Persian split counts and per-piece kinds without inventing a pairing. The exact canonical representation and any visible reader-layout change need design and, where user-visible behavior is ambiguous, the user's decision. Do not label inferred alignments or AI decisions as reviewed human alignments.
- Adapt source/assignment checks to the immutable launch baseline and per-item fingerprints, so subsequent branch edits and peer merges do not make the entire manifest unusable. Stale edits, wrong assignments and mismatched source hashes must still fail explicitly.
- Make tests cover no-cut items, already-split/classified items, mixed/mislabeled fields, reciters, preserved history/markers, unequal language pieces, links, shared IDs, punctuation, reversibility, conflicts and resume/review invalidation. Synthetic tests and non-destructive dry runs do not require a separate semantic pilot round.

## 9. Repository preparation and launch

After the user refines and approves this draft, but **before** launching the six chats:

- Finalize the draft assignment manifest and six lists under `docs/split-assignments/`, and add discoverable startup instructions and the neighbor protocol to the GitHub repository. An agent given only its number must be able to locate its exact full group and the two file paths without a hand-copied local workspace file.
- Reconcile `AGENTS.md`, `plan.md` and `docs/split-agent-instructions.md` with the user's narrow authorization: push only the agent's own branch; no PR, no push to `main` or peers; peer merges **into one's own branch** are allowed. Remove the old pilot-first and blanket proposal-only launch assumptions. Retain content, translation, testing, workspace and no-APK safeguards.
- Implement the canonical split, frozen-base verification, communication and merge/conflict mechanisms above; test their full combined behavior. Update pinned tool/runtime fingerprints after the files change. Do not change frozen dependencies or package versions without separate authorization.
- Verify the prep against the user's actual base and hand it over for the user to apply/push. **Only then** start the six new chats. Actual cross-session fetch/read/push behavior has not yet been demonstrated in this environment; provide a user-mediated file/commit handoff if peer read access is unavailable.

No canonical-application or merge tooling has been implemented in this round. No agent run, canonical corpus edit, commit, push or PR is authorized merely by the existence of this draft.

## 10. Assistant's final integration and one-commit patch

When all six agents have finished their own work, peer merges and independent reviews, and their conflicts are resolved:

1. The assistant obtains the six final branch names and exact tips and fetches them read-only. Verify that all six assigned groups and review records are present; do **not** assume any one branch contains the whole result.
2. On the assistant's own integration branch, combine all six results against the user's then-current `main`. Automated, tested combination of non-conflicting shared additions is acceptable; an actual unresolved conflict is returned to the responsible agent(s). The assistant does not silently resolve it or change the agents' branches.
3. Recheck exact text reconstruction, source/row mappings, links, shared references, history, full assignment and independent-review coverage, genuine unresolved issues, and project tests. Do not claim AI review is human or rights approval. Keep a final verification summary available to the user. Exclude temporary coordination/progress artifacts from the delivered patch unless they are needed for the actual product or required audit/history.
4. Create **one final commit whose parent is the actual current base**, with no agent branch commits or merge commits as parents. Produce **one real `git format-patch` mailbox** for that single commit. Test it using an actual `git am` against that exact base in the existing checkout and compare the resulting tree with the intended final tree, while preserving unrelated user changes. Do not push it, open a PR or delete agent branches.
5. The user applies the patch and, when satisfied, deletes the temporary agent branches. A later advance of `main` or an unexpected conflict must be handled by the responsible agents and reverified before producing or reissuing the patch.

The current repository requires both `Sadra Shakouri` and `Arena Agent` co-author trailers on commits. Whether that rule should remain for temporary branch commits and/or the one final commit is a separate user decision if “no agent history” is intended to remove generic AI attribution as well as individual branch commits. No individual agent commits should be included as `main` history under either interpretation.

## 11. Open points for the user's refinement

- **Two files:** Are the six proposed shared pairwise paths the intended meaning, or should each agent instead own two outgoing files (12 files total) and read its neighbors' outgoing copies?
- **Snapshot readiness:** Is “predecessor has finished” correctly interpreted as its own authored snapshot being ready, without waiting for its predecessor merge/review? This avoids a circular wait and matches the parallel ring.
- **Language representation:** How should independently split Arabic and Persian pieces with unequal counts be represented/displayed while preserving the existing relationship without inventing a new one? This needs an explicit design before changing visible behavior.
- **Shared-file strategy:** Choose and test the canonical storage/merge strategy that makes the final six-way merge safe without a serial agent chain; pairwise neighbor success alone is not sufficient.
- **Temporary vs durable records:** Which review/evidence summaries, if any, should remain after the agent branches are deleted? Essential canonical history and link mappings must remain; temporary chatter need not.
- **Commit attribution:** Clarify whether the existing co-author trailer rule stays in the final squashed commit and whether it applies to temporary commits.

## 12. Current status

- [x] Inventory, six-group partition and non-destructive proposal/review tools exist; the user previously pushed that preparation.
- [x] Full human-readable six-group lists were generated and independently checked against every current item. Draft manifest and per-group ID lists now also exist inside the repository.
- [x] This parallel-ring design has been recorded as a **draft** for refinement; publishing the draft alone does not start the agents.
- [ ] Resolve the open design points and update the repository instructions after the user approves them.
- [ ] Implement and test direct canonical application, immutable author snapshots, communication, merge handling and full coverage/review checks.
- [ ] Prepare a verified handoff and have the user push the launch preparation.
- [ ] User launches six agents; agents work, review and resolve conflicts on their own branches.
- [ ] Assistant combines the six finished results and delivers one verified, single-commit patch; user applies it and deletes branches.
