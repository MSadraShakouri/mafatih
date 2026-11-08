import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadCorpus, validateCorpus } from '../src/corpus.js';
import { commit, preserveKeyOrder, pretty } from '../src/editor.js';
import { applyQuranMarkerSpacing, planQuranMarkerSpacing } from '../src/punctuation-migration.js';

const args = process.argv.slice(2);
const dates = args.filter(arg => arg.startsWith('--date='));
const expected = args.filter(arg => arg.startsWith('--expect-plan='));
const options = args.filter(arg => !arg.startsWith('--date=') && !arg.startsWith('--expect-plan='));
if (dates.length > 1 || expected.length > 1 || options.some(arg => !['--apply', '--check', '--help'].includes(arg)) ||
    options.length > 1 || ((dates.length || expected.length) && !options.includes('--apply'))) {
  console.error('Usage: npm run normalize:quran-markers -- [--check | --apply --expect-plan=SHA256 [--date=YYYY-MM-DD]]'); process.exit(2);
}
if (options.includes('--help')) {
  console.log('Preview Arabic rows with unspaced numeric ayah markers. --check exits nonzero if edits are needed. To apply, supply the reviewed dry-run SHA256 as --expect-plan; affected reviews are refused.');
  process.exit(0);
}
const c = loadCorpus();
const initial = validateCorpus(c);
if (initial.errors.length) throw new Error(`Fix existing corpus errors first:\n${initial.errors.join('\n')}`);
const plan = planQuranMarkerSpacing(c);
const digest = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
console.log(`Quran marker spacing: ${plan.length} Arabic row occurrence(s).`);
console.log(`Plan SHA-256: ${digest}`);
for (const edit of plan) {
  if (edit.location.kind !== 'item-row') throw new Error('Unexpected marker migration scope');
  console.log(`  ${edit.location.item}/${edit.location.row}/${edit.location.language}: ${edit.previous} -> ${edit.replacement}`);
}
if (options.includes('--check')) {
  if (plan.length) process.exitCode = 1;
} else if (options.includes('--apply') && plan.length) {
  if (expected[0]?.slice('--expect-plan='.length) !== digest) {
    throw new Error('Missing or stale --expect-plan hash; review the current dry-run list before applying');
  }
  const date = dates[0]?.slice('--date='.length) ?? new Date().toISOString().slice(0, 10);
  const applied = applyQuranMarkerSpacing(c, plan, date);
  const validated = validateCorpus(c);
  if (validated.errors.length) throw new Error(`Refusing invalid marker edit:\n${validated.errors.join('\n')}`);
  const changes = new Map<string, string | null>();
  for (const file of applied.files) {
    const value = file === 'editorial-history.json' ? c.editorial
      : file.startsWith('items/') ? c.items.get(path.basename(file, '.json')) : undefined;
    if (value === undefined) throw new Error(`Unexpected changed file: ${file}`);
    const fullPath = path.join(c.root, file);
    const original = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as unknown;
    changes.set(fullPath, pretty(preserveKeyOrder(original, value)));
  }
  commit(c, changes, applied.previous, applied.replacement);
  console.log('Saved whitespace-only changes and occurrence history; exact original values remain in the pool.');
  console.log('This is not a review of the text, transcription, translation or rights.');
} else if (!options.includes('--apply')) {
  console.log('Dry run only; review the occurrence list and pass its SHA-256 as --expect-plan when applying.');
}
