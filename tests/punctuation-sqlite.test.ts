import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus } from '../src/corpus.js';

test('SQLite retains punctuation and marker-move history, exact values, and foreign-key integrity', () => {
  assert.match(fs.readFileSync('tools/schema.sql', 'utf8'), /CREATE TABLE punctuation_normalization\s*\(/);
  assert.match(fs.readFileSync('tools/schema.sql', 'utf8'), /CREATE TABLE punctuation_correction\s*\(/);
  assert.match(fs.readFileSync('tools/schema.sql', 'utf8'), /CREATE TABLE line_break_marker_move\s*\(/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-sqlite-'));
  const db = path.join(temp, 'punctuation.sqlite');
  try {
    const result = spawnSync('python3', ['tools/export_sqlite.py'], { cwd: process.cwd(), env: { ...process.env, MAFATIH_SQLITE_OUT: db }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(db), 'export must honor its requested temporary destination');
    const probe = spawnSync('python3', ['-c', `
import json,sqlite3,sys
c=sqlite3.connect(sys.argv[1]); c.execute('PRAGMA foreign_keys=ON')
batches=c.execute('SELECT position,rule,edit_date FROM punctuation_normalization ORDER BY position').fetchall()
rows=c.execute('''SELECT p.batch_position,p.position,p.location_json,p.previous_text_id,p.replacement_text_id,a.value,b.value
FROM punctuation_correction p JOIN text_value a ON a.id=p.previous_text_id JOIN text_value b ON b.id=p.replacement_text_id
ORDER BY p.batch_position,p.position''').fetchall()
moves=c.execute('''SELECT position,item_id,language,source_row_id,destination_row_id,marker,
source_previous_text_id,source_replacement_text_id,destination_previous_text_id,destination_replacement_text_id,evidence_id,reason
FROM line_break_marker_move ORDER BY position''').fetchall()
print(json.dumps({'batches':batches,'rows':rows,'moves':moves,'violations':c.execute('PRAGMA foreign_key_check').fetchall()},ensure_ascii=False))
`, db], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    assert.equal(probe.status, 0, probe.error?.message ?? probe.stderr);
    const actual = JSON.parse(probe.stdout) as { batches: Array<[number, string, string]>; rows: Array<[number, number, string, string, string, string, string]>; moves: unknown[][]; violations: unknown[] };
    const corpus = loadCorpus(); const history = corpus.editorial.punctuation_normalizations ?? [];
    assert.deepEqual(actual.violations, []);
    assert.deepEqual(actual.batches, history.map((batch, position) => [position, batch.rule, batch.date]));
    const expected = history.flatMap((batch, batchPosition) => batch.changes.map((edit, position) => [batchPosition, position,
      edit.location, edit.previous, edit.replacement, corpus.texts.get(edit.previous), corpus.texts.get(edit.replacement)]));
    assert.deepEqual(actual.rows.map(row => [row[0], row[1], JSON.parse(row[2]) as unknown, ...row.slice(3)]), expected);
    assert.deepEqual(actual.moves, (corpus.editorial.line_break_marker_moves ?? []).map((move, position) => [
      position, move.item, move.language, move.source_row, move.destination_row, move.marker,
      move.source_previous, move.source_replacement, move.destination_previous, move.destination_replacement,
      move.evidence, move.reason,
    ]));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
