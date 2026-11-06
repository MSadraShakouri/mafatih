import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadCorpus, text, type Corpus } from '../src/corpus.js';
import { breakPositions, compareLineBreaks, LineBreakExceptionFile, scanLineBreaks, type Exception } from '../src/line-breaks.js';
import { validateLineBreakMarkerHistory } from '../src/line-break-history.js';
import { normalizeSearch } from '../src/normalize.js';
import { EnglishDocumentSchema, ItemSchema, NavigationSchema, SourcesSchema } from '../src/schema.js';
import { textId } from '../src/text-ids.js';

const real = loadCorpus();

function fixture(): Corpus {
  // Start with metadata only; none of the real corpus's pooled/history values
  // should accidentally contribute to this deliberately small fixture.
  const c: Corpus = { ...real, items: new Map(), english: new Map(), texts: new Map(), textShards: new Map(),
    claims: {}, alignments: new Map(), editorial: { evidence: {}, metadata_corrections: [] } };
  const add = (value: string): string => {
    const id = textId(value); c.texts.set(id, value); c.textShards.set(id, id.slice(1, 3)); return id;
  };
  const row = add('😀\u0301\nع');
  const title = add('title\u2028continued');
  const tag = add('tag\u2029continued');
  const metadata = add('meta\u0085next');
  const paragraph = add('para\r\nnext');
  const source = add('source\rnext');
  const claim = add('claim\vnext');
  const nav = add('nav\fnext');
  add('historical-only\nnot-current'); // unreferenced pool values must not trigger the guard
  c.items.set('sample', ItemSchema.parse({
    legacy_id: null, title: { ar: null, fa: title, en: null }, category: 'dua', tags: [tag],
    legacy_alignment: null, legacy_missing_english_title: title,
    rows: [{ id: 'r1', ar: row, fa: row }, { id: 'r2', ar: row, fa: null }],
  }));
  c.english.set('sample-en', EnglishDocumentSchema.parse({
    display_title: { en: title, ar: null }, coverage: 'unknown',
    source_metadata: { title: metadata, title_ar: null, section: null, chapter: null,
      translator_claim: null, origin_claim: null, method_claim: null, note_claim: null },
    paragraphs: [{ id: 'p1', text: paragraph }],
  }));
  c.nav = NavigationSchema.parse({ default_order: ['sample'], featured: [], toc: [{
    title: nav, source_level: 1, source_page: null, item: 'sample', children: [{
      title, source_level: 2, source_page: null, item: null, children: [],
    }],
  }] });
  c.sources = SourcesSchema.parse({ sources: { sample: {
    name: source, author: metadata, license: { status: 'unverified', evidence: claim }, notes: paragraph,
  } } });
  c.claims = { c000000000000000000000000: claim };
  return c;
}

test('all physical separator kinds and CRLF use zero-based Unicode code-point offsets', () => {
  assert.deepEqual(breakPositions('😀a\u0301\nb\r\nc\rd\u0085e\u2028f\u2029g\vh\fi'), [
    { offset: 3, break: 'LF' }, { offset: 5, break: 'CRLF' }, { offset: 8, break: 'CR' },
    { offset: 10, break: 'NEL' }, { offset: 12, break: 'LS' }, { offset: 14, break: 'PS' },
    { offset: 16, break: 'VT' }, { offset: 18, break: 'FF' },
  ]);
  assert.deepEqual(breakPositions('ordinary wrapping is not a physical line break'), []);
});

test('checks current occurrences in every display family, including shared texts, but not historical pool values', () => {
  const c = fixture(); const breaks = scanLineBreaks(c);
  const locations = breaks.map(entry => entry.location).sort();
  assert.deepEqual(locations, [
    'claim/c000000000000000000000000', 'english/sample-en/display-title/en',
    'english/sample-en/paragraph/p1', 'english/sample-en/source-metadata/title',
    'item/sample/legacy-missing-english-title', 'item/sample/row/r1/ar', 'item/sample/row/r1/fa',
    'item/sample/row/r2/ar', 'item/sample/tag/0', 'item/sample/title/fa',
    'navigation/toc/0.0/title', 'navigation/toc/0/title', 'source/sample/author',
    'source/sample/license/evidence', 'source/sample/name', 'source/sample/notes',
  ].sort());
  const shared = breaks.filter(entry => entry.location.startsWith('item/sample/row/'));
  assert.equal(new Set(shared.map(entry => entry.text)).size, 1);
  assert.ok(shared.every(entry => entry.offset === 2 && entry.break === 'LF'));
  assert.ok(!breaks.some(entry => c.texts.get(entry.text)?.includes('historical-only')));
  const id = c.items.get('sample')!.title.fa!;
  c.texts.set(id, 'illegally edited in place\u2028continued');
  assert.throws(() => scanLineBreaks(c), /text ID does not match content/);
});

test('guard rejects new, removed, moved, changed-type, changed-text and duplicate exceptions', () => {
  const actual = scanLineBreaks(fixture())[0]!;
  const entry: Exception = { ...actual, status: 'pending', reason: 'Preserved pending source review.' };
  const clean = compareLineBreaks([actual], [entry]);
  assert.deepEqual(clean, { unexpected: [], stale: [], duplicates: [] });
  for (const changed of [
    { ...actual, offset: actual.offset + 1 },
    { ...actual, break: actual.break === 'LF' ? 'CR' as const : 'LF' as const },
    { ...actual, text: textId('some different text') },
    { ...actual, location: actual.location + '/other' },
  ]) {
    const result = compareLineBreaks([changed], [entry]);
    assert.equal(result.unexpected.length, 1); assert.equal(result.stale.length, 1);
  }
  assert.equal(compareLineBreaks([], [entry]).stale.length, 1);
  assert.equal(compareLineBreaks([actual], []).unexpected.length, 1);
  assert.equal(compareLineBreaks([actual], [entry, entry]).duplicates.length, 1);
  assert.equal(compareLineBreaks([actual], [entry, { ...entry, text: textId('different') }]).duplicates.length, 1);
  assert.throws(() => LineBreakExceptionFile.parse({ version: 1, description: 'test', exceptions: [{ ...entry, status: 'approved' }] }));
  assert.throws(() => LineBreakExceptionFile.parse({ version: 1, description: 'test', exceptions: [{ ...entry, status: 'reviewed' }] }));
  const review = { reviewer: 'Example human', date: '2026-11-06', evidence: 'Inspected the source paragraph.' };
  const reviewed = LineBreakExceptionFile.parse({ version: 1, description: 'test', exceptions: [{ ...entry, status: 'reviewed', review }] });
  assert.equal(reviewed.exceptions[0]?.status, 'reviewed');
  assert.deepEqual(compareLineBreaks([actual], reviewed.exceptions), { unexpected: [], stale: [], duplicates: [] });
  assert.throws(() => LineBreakExceptionFile.parse({ version: 1, description: 'test', exceptions: [{ ...entry, status: 'reviewed', review: { ...review, date: '2026-02-30' } }] }));
  assert.throws(() => LineBreakExceptionFile.parse({ version: 1, description: 'test', exceptions: [{ ...entry, reason: '' }] }));
  assert.throws(() => LineBreakExceptionFile.parse({ version: 1, description: 'test', exceptions: [{ ...entry, offset: -1 }] }));
});

test('checked-in exceptions exactly match active content and Ashura has no embedded separators', () => {
  const file = JSON.parse(fs.readFileSync(path.join(real.root, 'line-break-exceptions.json'), 'utf8')) as unknown;
  const manifest = LineBreakExceptionFile.parse(file);
  const breaks = scanLineBreaks(real);
  assert.deepEqual(compareLineBreaks(breaks, manifest.exceptions), { unexpected: [], stale: [], duplicates: [] });
  assert.ok(!breaks.some(entry => entry.location.startsWith('item/ziyarat-ashura/row/')));
  // Other pending exceptions may legitimately be resolved or reviewed later;
  // the exact manifest/actual comparison above protects them without freezing
  // their current count or status forever.
});

test('all line-break corrections retain exact originals, stable IDs and search content', () => {
  const changes = (real.editorial.row_corrections ?? []).filter(entry =>
    entry.evidence === 'linebreak-ai-assisted-2026-11-06' || entry.evidence === 'ashura-duplicate-semicolon-crosscheck');
  assert.equal(changes.length, 237);
  assert.equal(new Set(changes.map(entry => `${entry.item}/${entry.row}/${entry.language}`)).size, changes.length);
  let removedBreaks = 0; let punctuationExceptions = 0;
  for (const entry of changes) {
    assert.ok(entry.previous && entry.replacement);
    const before = text(real, entry.previous); const after = text(real, entry.replacement);
    assert.equal(textId(before), entry.previous); assert.equal(textId(after), entry.replacement);
    assert.ok(real.items.get(entry.item)?.rows.some(row => row.id === entry.row));
    assert.match(entry.reason, /AI-assisted, unreviewed/);
    assert.ok(breakPositions(before).length > 0);
    removedBreaks += breakPositions(before).length;
    assert.equal(breakPositions(after).length, 0);
    assert.equal(normalizeSearch(before), normalizeSearch(after));
    const compactBefore = before.replace(/\s+/gu, ''); const compactAfter = after.replace(/\s+/gu, '');
    if (entry.evidence === 'ashura-duplicate-semicolon-crosscheck') {
      punctuationExceptions += 1;
      assert.deepEqual([entry.item, entry.row, entry.language], ['ziyarat-ashura', 'r00032', 'ar']);
      assert.ok(compactBefore.endsWith('؛؛'));
      assert.equal(compactAfter, compactBefore.slice(0, -1));
    } else assert.equal(compactBefore, compactAfter, `${entry.item}/${entry.row}/${entry.language}`);
  }
  assert.equal(removedBreaks, 238);
  assert.equal(punctuationExceptions, 1);
});

test('CLI exits nonzero for new breaks, stale exceptions and duplicates in a separate data root', async () => {
  const os = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-break-check-'));
  try {
    fs.cpSync(real.root, root, { recursive: true });
    const run = (extra: string[] = []) => spawnSync(process.execPath,
      ['--import', 'tsx', 'scripts/check-line-breaks.ts', ...extra],
      { encoding: 'utf8', env: { ...process.env, MAFATIH_DATA_ROOT: root } });
    const baseline = run(['--json']);
    assert.equal(baseline.status, 0, baseline.stderr);
    assert.equal((JSON.parse(baseline.stdout) as { breaks: unknown[] }).breaks.length, scanLineBreaks(real).length);

    const itemPath = path.join(root, 'items/ziyarat-ashura.json');
    const itemBefore = fs.readFileSync(itemPath, 'utf8');
    const item = JSON.parse(itemBefore) as { rows: Array<{id:string;fa:string|null}> };
    const row = item.rows.find(value => value.id === 'r00003')!;
    const value = text(real, row.fa) + ' 😀\nextra';
    const id = textId(value); row.fa = id;
    const shardPath = path.join(root, 'texts', id.slice(1, 3) + '.json');
    const shard = JSON.parse(fs.readFileSync(shardPath, 'utf8')) as Record<string,string>;
    shard[id] = value; fs.writeFileSync(shardPath, JSON.stringify(shard));
    fs.writeFileSync(itemPath, JSON.stringify(item));
    const introduced = run();
    assert.equal(introduced.status, 1);
    assert.match(introduced.stderr, /NEW: item\/ziyarat-ashura\/row\/r00003\/fa/);
    assert.ok(introduced.stderr.includes(`@${Array.from(value).indexOf('\n')}`), 'code-point offset in CLI output');
    const exceptionsPath = path.join(root, 'line-break-exceptions.json');
    const exceptions = LineBreakExceptionFile.parse(JSON.parse(fs.readFileSync(exceptionsPath, 'utf8')) as unknown);
    const synthetic: Exception = { location: 'item/ziyarat-ashura/row/r00003/fa', text: id,
      offset: Array.from(value).indexOf('\n'), break: 'LF', status: 'pending', reason: 'Synthetic pending test entry.' };
    exceptions.exceptions.push(synthetic);
    fs.writeFileSync(exceptionsPath, JSON.stringify(exceptions));
    assert.equal(run().status, 0, 'an exact, explicit pending exception passes');

    // The same pinned exception becomes stale if the row is restored.
    fs.writeFileSync(itemPath, itemBefore);
    const stale = run();
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /STALE EXCEPTION: item\/ziyarat-ashura\/row\/r00003\/fa/);

    // Review is explicit and requires reviewer/date/evidence; it does not
    // unpin the text or offset. This is a synthetic fixture, not a real review.
    fs.writeFileSync(itemPath, JSON.stringify(item));
    exceptions.exceptions[exceptions.exceptions.length - 1] = { ...synthetic, status: 'reviewed',
      review: { reviewer: 'Example human', date: '2026-11-06', evidence: 'Inspected the synthetic fixture.' } };
    fs.writeFileSync(exceptionsPath, JSON.stringify(exceptions));
    const reviewed = run(['--list']);
    assert.equal(reviewed.status, 0, reviewed.stderr);
    assert.match(reviewed.stdout, /\[reviewed\] Synthetic pending test entry/);

    exceptions.exceptions.push(synthetic);
    fs.writeFileSync(exceptionsPath, JSON.stringify(exceptions));
    const duplicate = run();
    assert.equal(duplicate.status, 1);
    assert.match(duplicate.stderr, /DUPLICATE EXCEPTION:/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the second pass removes the 88 old breaks without losing original text or repeated excerpts', () => {
  const evidence = 'linebreak-remaining-user-request-2026-11-06';
  const changes = (real.editorial.row_corrections ?? []).filter(entry => entry.evidence === evidence);
  const moves = (real.editorial.line_break_marker_moves ?? []).filter(entry => entry.evidence === evidence);
  assert.equal(changes.length, 84);
  assert.equal(moves.length, 19);
  assert.equal(new Set(changes.map(entry => `${entry.item}/${entry.row}/${entry.language}`)).size, changes.length);
  const moved = new Set(moves.flatMap(move => [
    `${move.item}/${move.source_row}/${move.language}`, `${move.item}/${move.destination_row}/${move.language}`,
  ]));
  let removed = 0, unchangedSearch = 0;
  for (const entry of changes) {
    assert.ok(entry.previous && entry.replacement);
    const before = text(real, entry.previous), after = text(real, entry.replacement);
    assert.equal(textId(before), entry.previous); assert.equal(textId(after), entry.replacement);
    assert.match(entry.reason, /AI-assisted, unreviewed/);
    removed += breakPositions(before).length;
    assert.equal(breakPositions(after).length, 0);
    if (normalizeSearch(before) === normalizeSearch(after)) unchangedSearch += 1;
    if (!moved.has(`${entry.item}/${entry.row}/${entry.language}`)) {
      assert.equal(before.replace(/\s+/gu, ''), after.replace(/\s+/gu, ''), `${entry.item}/${entry.row}/${entry.language}`);
    }
  }
  assert.equal(removed, 88);
  assert.equal(unchangedSearch, 78); // only the three moved section numbers change six searchable row fields
  assert.deepEqual(validateLineBreakMarkerHistory(real), []);

  const samat = real.items.get('dua-samat')!.rows.find(row => row.id === 'r00117')!;
  const excerpts = text(real, samat.fa);
  assert.match(excerpts, /خدایا! به حق این دعا… خدایا! به حق این دعا/u);
  assert.equal(excerpts.split('خدایا! به حق این دعا').length, 3);
  const monajat = real.items.get('monajat-mnajat-aymh-alyhm')!.rows.find(row => row.id === 'r00020')!;
  assert.equal(text(real, monajat.ar).split('إِلٰهِى إِنْ حَرَمْتَنِى').length, 3);

  // Do not silently delete or reinterpret previously ambiguous punctuation.
  const rowText = (item: string, row: string, language: 'ar' | 'fa') =>
    text(real, real.items.get(item)!.rows.find(value => value.id === row)![language]);
  assert.equal(rowText('hadith-asnad-hdys-ksa', 'r00012', 'fa'), '..');
  assert.match(rowText('namaz-adab-zhr', 'r00008', 'fa'), /\.\.$/u);
  assert.match(rowText('namaz-taqyb-mghrb-nql', 'r00015', 'ar'), /\.»\.$/u); // the two original periods remain
  assert.match(rowText('amal-aamal-ayd-nvrvz', 'r00006', 'fa'), /\.\u2026$/u);
});

test('marker-move history rejects duplicate, altered, orphaned and missing-row records', () => {
  const fresh = (): Corpus => ({ ...real, editorial: structuredClone(real.editorial) });
  const duplicate = fresh();
  duplicate.editorial.line_break_marker_moves!.push(structuredClone(duplicate.editorial.line_break_marker_moves![0]!));
  assert.ok(validateLineBreakMarkerHistory(duplicate).some(message => /duplicate/i.test(message)));
  const altered = fresh();
  altered.editorial.line_break_marker_moves![0]!.marker = 'X';
  assert.ok(validateLineBreakMarkerHistory(altered).some(message => /marker|changed/i.test(message)));
  const missingRow = fresh();
  missingRow.editorial.line_break_marker_moves![0]!.source_row = 'missing-row';
  assert.ok(validateLineBreakMarkerHistory(missingRow).some(message => /missing row/i.test(message)));
  const missingCorrection = fresh();
  const m = missingCorrection.editorial.line_break_marker_moves![0]!;
  missingCorrection.editorial.row_corrections = missingCorrection.editorial.row_corrections!.filter(entry =>
    !(entry.item === m.item && entry.row === m.source_row && entry.language === m.language &&
      entry.previous === m.source_previous && entry.replacement === m.source_replacement));
  assert.ok(validateLineBreakMarkerHistory(missingCorrection).some(message => /missing matching row correction/i.test(message)));
});
