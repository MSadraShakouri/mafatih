// Audit every junction of every merged row in a snapshot.
//
//   npx tsx agent-work/agent-1/tools/space-audit.ts <snapshot-sha>
//
// For each merged row ("m…") it collects the pieces each language field received
// from the split record's alias list, sorts them by their offset in the field and
// checks the seam: either the pieces meet with no gap and one recorded space sits
// between them, or the seam is anything else, which is reported. A row whose field
// received a single piece is counted, not reported: nothing can be glued there.
//
// This is the check that settles "is an Arabic-only join gluing the Persian?" —
// answer it on the pieces the merge actually joined, not on whole original rows.
import { execFileSync } from 'node:child_process';
import { loadCorpusAtCommit } from '../../../src/git-corpus.js';

const arg = process.argv[2];
if (!arg) throw new Error('usage: space-audit.ts <snapshot-sha>');
const SHA = execFileSync('git', ['rev-parse', arg], { encoding: 'utf8' }).trim();
const c = loadCorpusAtCommit(SHA);
const problems: string[] = [];
const stats: Record<string, number> = {};

for (const [item, record] of c.rowSplits as any) {
  const rec: any = record;
  const pages: any = (c.items as any).get(item);
  const merged = (pages?.rows ?? []).filter((r: any) => /^m[0-9a-f]{24}$/.test(r.id)).map((r: any) => r.id);
  if (!merged.length) continue;
  const insBy = new Map<string, any[]>();
  for (const ins of rec.insertions ?? []) {
    const k = `${ins.row}|${ins.language}`;
    if (!insBy.has(k)) insBy.set(k, []);
    insBy.get(k)!.push(ins);
  }
  for (const rowId of merged) {
    for (const lang of ['ar', 'fa'] as const) {
      const segs: any[] = [];
      for (const a of Object.values<any>(rec.aliases ?? {}))
        for (const s of a?.[lang] ?? []) if (s.row === rowId && s.language === lang) segs.push({ ...s, piece: a.original.id });
      segs.sort((x, y) => (x.target_start ?? 0) - (y.target_start ?? 0));
      if (segs.length < 2) { stats[`${lang}:single`] = (stats[`${lang}:single`] ?? 0) + 1; continue; }
      for (let i = 1; i < segs.length; i++) {
        const prevEnd = (segs[i - 1].target_start ?? 0) + (segs[i - 1].end - segs[i - 1].start);
        const start = segs[i].target_start ?? 0;
        const ins = (insBy.get(`${rowId}|${lang}`) ?? []).filter((x) => x.target_start === prevEnd);
        if (start === prevEnd && !ins.length) problems.push(`${item} ${rowId}/${lang}: ${segs[i - 1].piece} | ${segs[i].piece} touch with no space`);
        else if (start === prevEnd + 1 && ins.length === 1) stats[`${lang}:spaced`] = (stats[`${lang}:spaced`] ?? 0) + 1;
        else problems.push(`${item} ${rowId}/${lang}: gap ${start - prevEnd} at ${prevEnd} (${segs[i - 1].piece} | ${segs[i].piece}), insertions ${ins.length}`);
      }
    }
  }
}
console.log(JSON.stringify({ snapshot: SHA, problems: problems.length, stats }, null, 1));
console.log(problems.slice(0, 10).join('\n'));
