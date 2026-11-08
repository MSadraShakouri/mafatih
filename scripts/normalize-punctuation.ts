import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, validateCorpus } from '../src/corpus.js';
import { commit, preserveKeyOrder, pretty } from '../src/editor.js';
import { applyPunctuationNormalization, planPunctuationNormalization } from '../src/punctuation-migration.js';

const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => !['--apply', '--check', '--help'].includes(arg))) {
  console.error('Usage: npm run normalize:punctuation -- [--check | --apply]'); process.exit(2);
}
if (args.includes('--help')) {
  console.log('Without flags, preview changes. --check exits nonzero if changes are needed. --apply records and commits safe punctuation-only edits.');
  process.exit(0);
}
const c = loadCorpus();
const initial = validateCorpus(c);
if (initial.errors.length) throw new Error(`Fix existing corpus errors first:\n${initial.errors.join('\n')}`);
const plan = planPunctuationNormalization(c);
const counts = new Map<string, number>();
for (const edit of plan) counts.set(edit.location.kind, (counts.get(edit.location.kind) ?? 0) + 1);
console.log(`Punctuation corrections: ${plan.length} content occurrence(s); ${new Set(plan.map(edit => edit.previous)).size} unique original value(s).`);
for (const [kind, count] of [...counts].sort(([a], [b]) => a.localeCompare(b, 'en'))) console.log(`  ${kind}: ${count}`);
if (args.includes('--check')) {
  if (plan.length) process.exitCode = 1;
} else if (args.includes('--apply') && plan.length) {
  const date = new Date().toISOString().slice(0, 10);
  const applied = applyPunctuationNormalization(c, plan, date);
  const validated = validateCorpus(c);
  if (validated.errors.length) throw new Error(`Refusing invalid punctuation edit:\n${validated.errors.join('\n')}`);
  const changes = new Map<string, string | null>();
  for (const file of applied.files) {
    let value: unknown;
    if (file === 'editorial-history.json') value = c.editorial;
    else if (file === 'navigation.json') value = c.nav;
    else if (file.startsWith('items/')) value = c.items.get(path.basename(file, '.json'));
    else if (file.startsWith('english/')) value = c.english.get(path.basename(file, '.json'));
    if (value === undefined) throw new Error(`Missing changed value for ${file}`);
    const fullPath = path.join(c.root, file);
    const original = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as unknown;
    changes.set(fullPath, pretty(preserveKeyOrder(original, value)));
  }
  commit(c, changes, applied.previous, applied.replacement);
  console.log('Saved punctuation-only changes and occurrence-level history; exact original values remain in the pool.');
  console.log('Review, transcription and source rights remain unverified.');
} else if (!args.includes('--apply')) {
  console.log('Dry run only; pass --apply to save these changes after reviewing the summary.');
}
