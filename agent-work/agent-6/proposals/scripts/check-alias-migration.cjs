#!/usr/bin/env node
// agent-6: checks what an alias migration changed, by comparing the worktree
// (or commit AFTER) with commit BEFORE. Reads only; writes nothing.
//   node agent-work/agent-6/proposals/scripts/check-alias-migration.cjs BEFORE [AFTER]
// Exit 0 only if: only mapping records of the proposal's items changed; in
// each, nothing changed but the format (1 -> 2) and added aliases; the added
// aliases are exactly the proposal's; every alias rebuilds its old text from
// the current rows; rows, texts and proposed spaces are untouched.
const fs = require("fs"), cp = require("child_process");
const [BEFORE, AFTER] = process.argv.slice(2);
if (!BEFORE) { console.error("usage: BEFORE [AFTER]"); process.exit(2); }
const git = (a) => cp.execFileSync("git", a, { maxBuffer: 1 << 29, stdio: ["ignore", "pipe", "ignore"] }).toString();
const at = (c, p) => JSON.parse(c ? git(["show", `${c}:${p}`]) : fs.readFileSync(p, "utf8"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const res = []; const check = (n, ok, d = "") => { res.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const prop = JSON.parse(fs.readFileSync("agent-work/agent-6/proposals/historical-row-links.json", "utf8"));
const want = new Map(prop.items.map((i) => [i.item, i.entries.map((e) => e.proposed_alias)]));

const changed = (AFTER ? git(["diff", "--name-only", BEFORE, AFTER, "--", "data"]) : git(["diff", "--name-only", BEFORE, "--", "data"]) + git(["ls-files", "--others", "--exclude-standard", "data"])).trim().split("\n").filter(Boolean).sort();
const expected = [...want.keys()].map((i) => `data/row-splits/${i}.json`).sort();
check("files changed under data/ are exactly the mapping records of the proposal's items", same(changed, expected), `${changed.length} changed, ${expected.length} expected`);
const sub = (d) => (AFTER ? git(["diff", "--name-only", BEFORE, AFTER, "--", d]) : git(["diff", "--name-only", BEFORE, "--", d])).trim();
check("no item file changed (rows, kinds, text keys)", sub("data/items") === "");
check("no pooled text file changed", sub("data/texts") === "");
check("no plan or layout changed", sub("agent-work/agent-6/plans") === "" && sub("agent-work/agent-6/layouts") === "");

const pool = {}; for (const f of fs.readdirSync("data/texts")) Object.assign(pool, JSON.parse(fs.readFileSync("data/texts/" + f, "utf8")));
let added = 0, promoted = 0, kept = 0, rebuilt = 0, spaces = 0, liveClash = 0, dup = 0; const bad = [];
for (const [item, aliases] of want) {
  const p = `data/row-splits/${item}.json`, a = at(BEFORE, p), b = at(AFTER, p);
  const rows = new Map(at(AFTER, `data/items/${item}.json`).rows.map((r) => [r.id, r]));
  const { aliases: aa = [], format_version: fa, ...ra } = a, { aliases: ab = [], format_version: fb, ...rb } = b;
  if (fa === 1 && fb === 2) { promoted++; // V1 -> V2: every piece gains target_start; nothing else
    const norm = (m) => ({ ...m, rows: m.rows.map((e) => { const { results, ...x } = e; return { ...x, ar: e.ar.map(({ target_start, ...s }) => s), fa: e.fa.map(({ target_start, ...s }) => s) }; }) });
    if (!same(norm(ra), norm(rb))) bad.push(`${item}: promoted record differs beyond the format`);
    for (const e of b.rows) for (const l of ["ar", "fa"]) for (const s of e[l]) if (s.target_start === undefined) bad.push(`${item}: piece without target_start`);
  } else if (fa !== fb) bad.push(`${item}: format ${fa} -> ${fb}`);
  else if (!same(ra, rb)) bad.push(`${item}: record changed outside aliases`);
  if (!same(a.insertions || [], b.insertions || [])) bad.push(`${item}: insertions changed`);
  spaces += (b.insertions || []).length;
  if (!same(ab.slice(0, aa.length), aa)) bad.push(`${item}: an earlier alias changed`); else kept += aa.length;
  const fresh = ab.slice(aa.length);
  if (!same(fresh, aliases)) bad.push(`${item}: added aliases are not exactly the proposal's`); added += fresh.length;
  const ids = ab.map((x) => x.original.id); if (new Set(ids).size !== ids.length) dup++;
  for (const al of fresh) {
    if (rows.has(al.original.id) || b.rows.some((e) => e.original.id === al.original.id)) liveClash++;
    let ok = true;
    for (const l of ["ar", "fa"]) {
      const key = al.original[l]; const segs = al[l];
      if (!key) { if (segs.length) ok = false; continue; }
      const old = [...pool[key] ?? ""]; if (!(key in pool)) { ok = false; continue; }
      let cur = 0;
      for (const s of segs) { const row = rows.get(s.row); const t = row && row[s.language] ? [...pool[row[s.language]]] : null;
        if (!t || s.start !== cur || t.slice(s.target_start, s.target_start + s.end - s.start).join("") !== old.slice(s.start, s.end).join("")) { ok = false; break; } cur = s.end; }
      if (cur !== old.length) ok = false;
    }
    if (ok) rebuilt++; else bad.push(`${item}/${al.original.id}: does not rebuild its old text`);
  }
}
check("each record: nothing changed but added aliases (and format 1 -> 2 where it was 1)", bad.length === 0, bad.slice(0, 6).join(" | "));
check("aliases that were there before are untouched", bad.every((x) => !x.includes("earlier alias")), `${kept} kept`);
check("added aliases are exactly the proposal's, in number and content", added === prop.totals.ids, `${added} added, ${prop.totals.ids} proposed, ${promoted} record(s) promoted from V1 to V2`);
check("every added alias rebuilds its old text exactly from current rows, code point by code point", rebuilt === added, `${rebuilt} of ${added}`);
check("no added alias uses an ID that is a live row or an original row", liveClash === 0);
check("no alias ID occurs twice in a record", dup === 0);
check("proposed spaces (insertions) untouched", bad.every((x) => !x.includes("insertions")), `${spaces} in these records`);
const fails = res.filter((x) => !x).length; console.log(`\n${res.length - fails} of ${res.length} checks pass.`); process.exit(fails ? 1 : 0);
