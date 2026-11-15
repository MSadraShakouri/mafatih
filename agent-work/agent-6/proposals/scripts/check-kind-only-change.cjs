#!/usr/bin/env node
// Reviewer aid (agent-6). Checks that an author snapshot NEW differs from the
// reviewed snapshot OLD by exactly one thing: the kind of one never-cut row.
// It reads Git objects only and writes nothing.
//
//   node agent-work/agent-6/proposals/scripts/check-kind-only-change.cjs \
//     OLD NEW ITEM ROW KIND [AUTHOR]
//
// Exit 0 only if every check passes. It does not replace reading the row.
const cp = require("child_process");
const [OLD, NEW, ITEM, ROW, KIND, AUTHOR = "agent-5"] = process.argv.slice(2);
if (!KIND) { console.error("usage: OLD NEW ITEM ROW KIND [AUTHOR]"); process.exit(2); }
const git = (args) => cp.execFileSync("git", args, { maxBuffer: 1 << 29, stdio: ["ignore", "pipe", "ignore"] }).toString();
const show = (c, p) => { try { return JSON.parse(git(["show", `${c}:${p}`])); } catch { return null; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

// 1. ancestry and scope
let anc = true; try { git(["merge-base", "--is-ancestor", OLD, NEW]); } catch { anc = false; }
check("new snapshot descends from the reviewed one", anc);
const changed = git(["diff", "--name-only", OLD, NEW]).trim().split("\n").filter(Boolean);
const own = [`data/items/${ITEM}.json`, `data/row-splits/${ITEM}.json`, `agent-work/${AUTHOR}/plans/${ITEM}.json`, `agent-work/${AUTHOR}/layouts/${ITEM}.json`];
const otherItems = changed.filter((p) => /^(data\/(items|row-splits)|agent-work\/[^/]+\/(plans|layouts))\//.test(p) && !own.includes(p));
check("no other item, mapping, plan or layout changed", otherItems.length === 0, otherItems.slice(0, 5).join(", "));
const foreign = changed.filter((p) => !own.includes(p) && !p.startsWith("data/texts/") && !p.startsWith(`agent-work/${AUTHOR}/`) && !p.startsWith("coordination/"));
check("no file outside the author's scope changed", foreign.length === 0, foreign.slice(0, 5).join(", "));

// 2. pooled texts
const pool = (c) => { const t = {}; for (const f of git(["ls-tree", "--name-only", `${c}:data/texts`]).trim().split("\n")) Object.assign(t, show(c, `data/texts/${f}`)); return t; };
const tOld = pool(OLD), tNew = pool(NEW);
const lost = Object.keys(tOld).filter((k) => !(k in tNew)), alt = Object.keys(tOld).filter((k) => k in tNew && tOld[k] !== tNew[k]);
const added = Object.keys(tNew).filter((k) => !(k in tOld));
check("no pooled text removed or altered", lost.length === 0 && alt.length === 0, `removed ${lost.length}, altered ${alt.length}, added ${added.length}`);

// 3. the item: same rows, IDs, text keys and text; one kind differs
const a = show(OLD, own[0]), b = show(NEW, own[0]);
const { rows: ra, ...ma } = a, { rows: rb, ...mb } = b;
check("item metadata unchanged", same(ma, mb));
check("same number and order of rows, same IDs", ra.length === rb.length && ra.every((r, i) => r.id === rb[i].id));
const target = rb.filter((r) => r.id === ROW);
check(`row ${ROW} exists once and keeps its ID`, target.length === 1 && ra.filter((r) => r.id === ROW).length === 1);
const keyDiff = ra.filter((r, i) => rb[i] && (r.ar !== rb[i].ar || r.fa !== rb[i].fa)).map((r) => r.id);
check("every row keeps its Arabic and Persian text keys", keyDiff.length === 0, keyDiff.join(", "));
const textDiff = rb.filter((r) => ["ar", "fa"].some((l) => r[l] && tNew[r[l]] !== tOld[r[l]])).map((r) => r.id);
check("every row resolves to the same text, character for character", textDiff.length === 0, textDiff.join(", "));
const kindDiff = ra.filter((r, i) => rb[i] && r.kind !== rb[i].kind).map((r, i) => r.id);
check(`only ${ROW} changes kind`, same(kindDiff, [ROW]), `changed: ${kindDiff.join(", ") || "none"}`);
const o = ra.find((r) => r.id === ROW), n = target[0];
check(`${ROW} is now ${KIND}`, !!n && n.kind === KIND, `${o ? o.kind : "?"} -> ${n ? n.kind : "?"}`);
const extra = ra.filter((r, i) => rb[i] && !same({ ...r, kind: 0 }, { ...rb[i], kind: 0 })).map((r) => r.id);
check("no other field of any row changed", extra.length === 0, extra.join(", "));

// 4. the mapping: identical apart from the two binding hashes
const strip = (m) => { const { plan_sha256, layout_sha256, ...rest } = m; return rest; };
const sa = show(OLD, own[1]), sb = show(NEW, own[1]);
check("mapping record unchanged apart from the plan and layout hashes", same(strip(sa), strip(sb)));
check("accepted spaces (insertions) unchanged", same(sa.insertions || [], sb.insertions || []), `${(sb.insertions || []).length} insertion(s)`);
check("aliases unchanged", same(sa.aliases || [], sb.aliases || []), `${(sb.aliases || []).length} alias(es)`);
const entry = sb.rows.find((e) => e.original.id === ROW);
const uncut = !!entry && ["ar", "fa"].every((l) => entry[l].every((p) => p.row === ROW));
check(`${ROW} is still an uncut row mapped to itself`, uncut);

// 5. plan and layout: only the kind of the target row
const pa = show(OLD, own[2]), pb = show(NEW, own[2]);
const planNorm = (p) => ({ ...p, sources: p.sources.map((s) => (s.row === ROW ? { ...s, kinds: s.kinds.map(() => "*") } : s)) });
check("plan unchanged apart from the kind of the target row", same(planNorm(pa), planNorm(pb)));
const pk = pb.sources.filter((s) => s.row === ROW);
check("plan gives the target row the new kind in every language", pk.length > 0 && pk.every((s) => s.kinds.length === 1 && s.kinds[0] === KIND), pk.map((s) => `${s.language}:${s.kinds.join("/")}`).join(" "));
check("cuts of the target row unchanged (none)", pk.every((s) => s.cuts.length === 0));
const la = show(OLD, own[3]), lb = show(NEW, own[3]);
const layNorm = (l) => { const { plan_sha256, ...rest } = l; return { ...rest, rows: l.rows.map((r) => (r.row === ROW ? { ...r, output: r.output.map((x) => ({ ...x, kind: "*" })) } : r)) }; };
check("layout unchanged apart from the plan hash and the kind of the target row", same(layNorm(la), layNorm(lb)));
check("joins (merges) unchanged", same(la.merges || [], lb.merges || []), `${(lb.merges || []).length} merge(s)`);

const fails = results.filter((x) => !x).length;
console.log(`\n${results.length - fails} of ${results.length} checks pass.`);
process.exit(fails ? 1 : 0);
