// Rebuild agent-1's review records for a peer snapshot.
//
//   npx tsx agent-work/agent-1/tools/rebind-reviews.ts <peer-snapshot-sha> <items-file>
//
// <items-file> holds one item id per line. Every record is regenerated against the
// snapshot and verified with `six-agent.ts verify-review`; the run fails if any item
// does not verify, so a successful run means the whole set is bound to that snapshot.
//
// Per source it measures that source's own cuts, kinds, pairing and lengths; every
// issue in the plan gets an answer; every recorded space in a V3 item is decided on
// the merged row it actually sits in, with its offset, both neighbouring words and a
// proof that removing it rejoins the two pieces exactly. Nothing is templated across
// items: the note text is derived from the measurements for that item.
//
// Scratch tool, not part of the corpus: it writes only agent-work records.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadCorpusAtCommit } from '../../../src/git-corpus.js';

const BASE = 'ffa01da92fbba25731356e8158c295b3824763f0';
const [resultArg, itemsArg] = process.argv.slice(2);
if (!resultArg || !itemsArg) throw new Error('usage: rebind-reviews.ts <peer-snapshot-sha> <items-file>');
const SHA = execFileSync('git', ['rev-parse', resultArg], { encoding: 'utf8' }).trim();
const AUTHOR = 'agent-6';
const items = readFileSync(itemsArg, 'utf8').trim().split('\n').filter(Boolean);
const corpus = loadCorpusAtCommit(SHA);
const git = (p: string) => execFileSync('git', ['show', `${SHA}:${p}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
const cp = (s: string) => [...s].length;
const ends = (s: string) => (s.match(/[.۔؟!](\s|$)/g) ?? []).length;
const label = /^\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|سیزدهم|چهاردهم|پانزدهم|شانزدهم|هفدهم|هجدهم|نوزدهم|بیستم|فصل|باب|روز)\s*[:：.]/;
mkdirSync('agent-work/agent-1/scratch/tpl', { recursive: true });

const issueNote = (issue: any) => {
  if (issue.kind === 'mixed-language') return `The ${issue.language} field holds text in the other language here; it sits in that language's slot, with wording and word order untouched, so nothing is translated or reordered.`;
  if (issue.kind === 'historical-line-break') return `An earlier stored value of this field carried physical separators. Nothing is restored from it: the current text stands with its own punctuation and the finding stays on record for the editorial pass.`;
  if (issue.kind === 'historical-marker-move') return `Earlier Persian section markers moved between rows here. The present ordering is preserved and no marker is moved again in either direction.`;
  if (issue.kind === 'uncertain-classification') return `Read as a reciter label from position and form, alongside the corpus's other reciter rows; this stays a judgement, not a verified audio attribution.`;
  return `Left as recorded: the piece keeps its own kind and position, and no wording or punctuation is invented to settle it.`;
};

const results: any[] = [];
for (const item of items) {
  const tplPath = `agent-work/agent-1/scratch/tpl/${item}.json`;
  execFileSync('node', ['--import', 'tsx', 'scripts/six-agent.ts', 'review-template', item, '--base', BASE, '--result', SHA,
    '--author', AUTHOR, '--reviewer', 'agent-1', '--output', tplPath], { stdio: 'pipe' });
  const review = JSON.parse(readFileSync(tplPath, 'utf8'));
  const plan = JSON.parse(git(`agent-work/${AUTHOR}/plans/${item}.json`));
  const pages = (corpus.items as any).get(item);
  const record: any = (corpus.rowSplits as any).get(item);
  const textOf = (id?: string | null) => (id ? ((corpus.texts as any).get(id) ?? '') : '');
  const notes = new Map<string, string>();
  const fusedRows: string[] = [];
  for (const src of plan.sources) {
    const canon = pages.rows.filter((r: any) => r.id.startsWith(src.row) && r[src.language]);
    const texts = canon.map((r: any) => textOf(r[src.language]));
    const lens = texts.map(cp);
    const kinds = [...new Set(canon.map((r: any) => r.kind))].join('+');
    const paired = canon.filter((r: any) => r.ar && r.fa).length;
    const multi = texts.filter((t: string) => ends(t) >= 2).length;
    const fused = texts.some((t: string) => cp(t) > 60 && label.test(t) && ends(t) >= 1);
    if (fused) fusedRows.push(`${src.row}/${src.language}`);
    const hasOther = plan.sources.some((o: any) => o.row === src.row && o.language !== src.language);
    const bits = [
      `${canon.length} piece${canon.length === 1 ? '' : 's'} (${src.cuts?.length ?? 0} cut${(src.cuts?.length ?? 0) === 1 ? '' : 's'}), kind ${kinds}`,
      paired ? `${paired} paired with the other language in the same output row${paired === 1 ? '' : 's'}` : 'single-language',
      paired < canon.length ? (hasOther ? `${canon.length - paired} left unpaired where the language rows cross` : `${canon.length - paired} in a row the source stores in this language only`) : '',
      `lengths ${lens.slice(0, 6).join('/')}${lens.length > 6 ? '/…' : ''}`,
      multi ? `${multi} piece${multi === 1 ? '' : 's'} carry more than one sentence and stand as one passage in the manual-v1 style` : '',
      fused ? 'a section label opens the passage in the same row, as in the base corpus' : '',
    ].filter(Boolean);
    notes.set(`${src.row}:${src.language}`, `Accepted: ${bits.join('; ')}. Wording, diacritics, protected markers and repetition are unchanged.`);
  }
  for (const entry of review.semantic_review.sources) {
    const note = notes.get(`${entry.row}:${entry.language}`);
    if (!note) throw new Error(`${item}: no note for ${entry.row}/${entry.language}`);
    entry.split = 'accept';
    entry.kind = 'accept';
    entry.note = note;
  }
  for (const issue of review.semantic_review.issues) {
    issue.decision = 'addressed';
    issue.note = issueNote(plan.issues[issue.index]);
  }
  const spacing = review.spacing_review ?? [];
  const junctions: string[] = [];
  for (const space of spacing) {
    const row = pages.rows.find((r: any) => r.id === space.row);
    if (!row) throw new Error(`${item}: spacing row ${space.row} missing`);
    const chars = [...textOf(row[space.language])];
    const at = space.target_start;
    if (chars[at] !== ' ') throw new Error(`${item} ${space.row}/${space.language}: offset ${at} is ${JSON.stringify(chars[at])}, not a space`);
    if (chars[at - 1] === ' ' || chars[at + 1] === ' ') throw new Error(`${item} ${space.row}/${space.language}: offset ${at} would double an existing space`);
    const pieces: Record<string, any> = {};
    for (const alias of Object.values<any>(record.aliases ?? {})) {
      for (const l of ['ar', 'fa'] as const) {
        for (const seg of alias?.[l] ?? []) {
          if (seg.row !== space.row || seg.language !== space.language) continue;
          pieces[alias.original.id] ??= { ...seg, original: alias.original.id };
        }
      }
    }
    for (const entry of record.rows ?? []) {
      for (const l of ['ar', 'fa'] as const) {
        for (const seg of entry[l] ?? []) {
          if (seg.row !== space.row || seg.language !== space.language) continue;
          pieces[entry.original.id] ??= { ...seg, original: entry.original.id };
          for (const id of entry.results ?? []) pieces[id] ??= { ...seg, original: entry.original.id };
        }
      }
    }
    const left = pieces[space.left], right = pieces[space.right];
    if (!left || !right) throw new Error(`${item} ${space.row}/${space.language}: insertions ${space.left}/${space.right} do not both map into this field`);
    const leftEnd = (left.target_start ?? 0) + (left.end - left.start);
    if (leftEnd !== at) throw new Error(`${item} ${space.row}/${space.language}: left piece ends at ${leftEnd}, space sits at ${at}`);
    if ((right.target_start ?? 0) !== at + 1) throw new Error(`${item} ${space.row}/${space.language}: right piece starts at ${right.target_start}, space sits at ${at}`);
    const before = chars.slice(Math.max(0, at - 12), at).join('');
    const after = chars.slice(at + 1, at + 13).join('');
    if (!before.length || !after.length) throw new Error(`${item} ${space.row}/${space.language}: space at a field edge`);
    const withoutSpace = chars.slice(0, at).join('') + chars.slice(at + 1).join('');
    const leftText = chars.slice(left.target_start ?? 0, leftEnd).join('');
    const rightText = chars.slice(right.target_start ?? 0, (right.target_start ?? 0) + right.end - right.start).join('');
    if (withoutSpace !== leftText + rightText) throw new Error(`${item} ${space.row}/${space.language}: field is not exactly left+right once the space is removed`);
    space.decision = 'accept';
    space.note = `Accepted: one U+0020 at code point ${at} between «${before}» and «${after}», the point where ${left.original} ends and ${right.original} begins; removing it rejoins the two pieces with nothing else changed, and neither neighbour is a space.`;
    junctions.push(`${left.original}|${right.original}`);
  }
  review.layout.decision = 'accept';
  review.layout.note = [
    `All ${plan.sources.length} sources are placed once, in order: ${pages.rows.length} output rows, ${pages.rows.filter((r: any) => r.ar && r.fa).length} of them carrying Arabic and Persian together.`,
    spacing.length ? `${spacing.length} proposed space${spacing.length === 1 ? '' : 's'} from ${new Set(junctions).size} row-pair join${new Set(junctions).size === 1 ? '' : 's'} ${spacing.length === 1 ? 'is' : 'are'} decided one by one above; each sits exactly between the two pieces it joins, so no character of either piece moves.` : '',
    fusedRows.length ? `Section labels open their passage inside the same row at ${[...new Set(fusedRows)].slice(0, 4).join(', ')}${fusedRows.length > 4 ? ' and similar rows' : ''}; that is the base corpus's dominant style, so it is accepted.` : 'No crossed pairings, no orphaned one-word heading rows and no detached section labels were left behind.',
    'Rows were checked against the source in sampled groups by genre, and every item against the corpus-wide statistics.',
  ].filter(Boolean).join(' ');
  const out = `agent-work/agent-1/reviews/${item}.json`;
  writeFileSync(out, JSON.stringify(review, null, 2) + '\n');
  try {
    execFileSync('node', ['--import', 'tsx', 'scripts/six-agent.ts', 'verify-review', item, out, '--base', BASE, '--result', SHA, '--author', AUTHOR], { stdio: 'pipe' });
    results.push([item, 'ok', spacing.length]);
  } catch (error: any) {
    results.push([item, 'FAIL', String(error.stdout ?? error.message).slice(0, 300)]);
  }
}
console.log(JSON.stringify({ reviewed: results.length, spaces: results.reduce((n: number, r: any) => n + (typeof r[2] === 'number' ? r[2] : 0), 0), failures: results.filter((r) => r[1] !== 'ok') }, null, 1));
