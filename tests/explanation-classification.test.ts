import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadCorpus, text } from '../src/corpus.js';
import { readerTextRole } from '../web/reader-blocks.js';
import { currentPieces, historicalRow } from './helpers/row-split-history.js';

type Choice = { item: string; row: string; kind: 'note' | 'instruction'; ar: string | null; fa: string | null };
const choices = (JSON.parse(readFileSync(new URL('./fixtures/manual-explanations.json', import.meta.url), 'utf8')) as
  { entries: Choice[] }).entries;

test('historical explanation choices retain their sources while current mapped rows use their own roles', () => {
  const corpus = loadCorpus(), problems: string[] = [], seen = new Set<string>();
  for (const choice of choices) {
    const key = `${choice.item}/${choice.row}`;
    if (seen.has(key)) problems.push(`${key}: duplicate selection`);
    seen.add(key);
    const row = historicalRow(corpus, choice.item, choice.row);
    if (row.ar !== choice.ar || row.fa !== choice.fa) problems.push(`${key}: historical source reference changed`);
    if (row.kind !== choice.kind) problems.push(`${key}: expected old ${choice.kind}, got ${row.kind ?? 'unclassified'}`);
    const runtime = { id: row.id, ar: text(corpus, row.ar), fa: text(corpus, row.fa), kind: row.kind };
    const language = choice.fa ? 'fa' : 'ar';
    if (readerTextRole(runtime, language) !== 'explanation') problems.push(`${key}: old explanation role changed`);
    // The new round may intentionally reconsider the kind or language. Verify
    // every mapped piece and its actual display role without freezing that decision.
    for (const sourceLanguage of ['ar', 'fa'] as const) for (const piece of currentPieces(corpus, choice.item, choice.row, sourceLanguage)) {
      const actual = { id: piece.row.id, ar: text(corpus, piece.row.ar), fa: text(corpus, piece.row.fa), kind: piece.row.kind };
      const role = piece.row.kind === 'instruction' || piece.row.kind === 'note' ? 'explanation' :
        piece.language === 'ar' ? 'arabic' : 'translation';
      if (readerTextRole(actual, piece.language) !== role) problems.push(`${key}: incorrect current piece role`);
    }
  }
  assert.deepEqual(problems, []);
});

test('historical unselected reciters, headings, prayer and translations were not blanket-classified', () => {
  const corpus = loadCorpus();
  for (const [item, id] of [
    ['dua-iftitah', 'r00001'], // title, not prose
    ['dua-samat', 'r00001'], // reciter label, not explanation
    ['dua-jawshan-kabir', 'r00086'], // section number
    ['item-abvhmzh-smaly', 'r00220'], // Arabic devotional text stored in the fa field
    ['item-abvhmzh-smaly', 'r00221'], // its Persian translation without an ar field
    ['dua-jawshan-sagheer', 'r00002'], // mixed introduction, recitation and translation
  ]) {
    const row = historicalRow(corpus, item!, id!);
    for (const language of ['ar', 'fa'] as const) currentPieces(corpus, item!, id!, language);
    assert.notEqual(row.kind, 'instruction', `${item}/${id}`);
    assert.notEqual(row.kind, 'note', `${item}/${id}`);
  }
});
