import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadCorpus, text } from '../src/corpus.js';
import { readerTextRole } from '../web/reader-blocks.js';

type Choice = { item: string; row: string; kind: 'note' | 'instruction'; ar: string | null; fa: string | null };
const choices = (JSON.parse(readFileSync(new URL('./fixtures/manual-explanations.json', import.meta.url), 'utf8')) as
  { entries: Choice[] }).entries;

test('individually chosen famous passages use explanation styling without changing their source references', () => {
  const corpus = loadCorpus(), problems: string[] = [], seen = new Set<string>();
  for (const choice of choices) {
    const key = `${choice.item}/${choice.row}`;
    if (seen.has(key)) problems.push(`${key}: duplicate selection`);
    seen.add(key);
    const row = corpus.items.get(choice.item)?.rows.find(candidate => candidate.id === choice.row);
    if (!row) { problems.push(`${key}: missing`); continue; }
    if (row.ar !== choice.ar || row.fa !== choice.fa) problems.push(`${key}: source reference changed`);
    if (row.kind !== choice.kind) problems.push(`${key}: expected ${choice.kind}, got ${row.kind ?? 'unclassified'}`);
    const runtime = { id: row.id, ar: text(corpus, row.ar), fa: text(corpus, row.fa), kind: row.kind };
    const language = choice.fa ? 'fa' : 'ar';
    if (readerTextRole(runtime, language) !== 'explanation') problems.push(`${key}: not styled as explanation`);
  }
  assert.deepEqual(problems, []);
});

test('unselected reciters, headings, prayer and translations are not blanket-classified', () => {
  const corpus = loadCorpus();
  for (const [item, id] of [
    ['dua-iftitah', 'r00001'], // title, not prose
    ['dua-samat', 'r00001'], // reciter label, not explanation
    ['dua-jawshan-kabir', 'r00086'], // section number
    ['item-abvhmzh-smaly', 'r00220'], // Arabic devotional text stored in the fa field
    ['item-abvhmzh-smaly', 'r00221'], // its Persian translation without an ar field
    ['dua-jawshan-sagheer', 'r00002'], // mixed introduction, recitation and translation
  ]) {
    const row = corpus.items.get(item!)!.rows.find(candidate => candidate.id === id)!;
    assert.ok(row, `${item}/${id}`);
    assert.notEqual(row.kind, 'instruction', `${item}/${id}`);
    assert.notEqual(row.kind, 'note', `${item}/${id}`);
  }
});
