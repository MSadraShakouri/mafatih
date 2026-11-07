import assert from 'node:assert/strict';
import test from 'node:test';
import type { ItemRow } from '../web/data.js';
import { readerBlocks, readerTextRole } from '../web/reader-blocks.js';
import {
  createReaderPreferencesStore, DEFAULT_READER_PREFERENCES, normalizeReaderPreferences, nextSize, SIZE_LEVELS,
  readReaderPreferences, READER_PREFERENCES_KEY,
} from '../web/reader-preferences.js';

test('reader preferences validate stored fonts and independently bound each size', () => {
  assert.deepEqual(normalizeReaderPreferences({
    font: 'noto-naskh', arabicSize: 154, translationSize: -20, explanationSize: 900,
  }), { font: 'noto-naskh', arabicSize: 154, translationSize: 25, explanationSize: 400 });
  assert.deepEqual(normalizeReaderPreferences({
    font: 'bad; background: red', arabicSize: '150', translationSize: null, explanationSize: Infinity,
  }), DEFAULT_READER_PREFERENCES);
  for (const value of [null, [], 2, 'broken']) assert.deepEqual(normalizeReaderPreferences(value), DEFAULT_READER_PREFERENCES);
  assert.deepEqual(readReaderPreferences({ getItem: () => '{', setItem: () => {} }), DEFAULT_READER_PREFERENCES);
});

test('size steps are reversible around 100 and preserve legacy saved sizes until adjusted', () => {
  assert.equal(SIZE_LEVELS.length, 65);
  assert.equal(new Set(SIZE_LEVELS).size, 65);
  assert.equal(SIZE_LEVELS[0], 25); assert.equal(SIZE_LEVELS[32], 100); assert.equal(SIZE_LEVELS[64], 400);
  for (let i = 0; i < SIZE_LEVELS.length - 1; i++) {
    assert.equal(nextSize(SIZE_LEVELS[i]!, 1), SIZE_LEVELS[i + 1]);
    assert.equal(nextSize(SIZE_LEVELS[i + 1]!, -1), SIZE_LEVELS[i]);
  }
  assert.equal(normalizeReaderPreferences({ arabicSize: 150 }).arabicSize, 150);
  assert.equal(nextSize(150, 1), 154); assert.equal(nextSize(150, -1), 148);
  assert.equal(nextSize(25, -1), 25); assert.equal(nextSize(400, 1), 400);
});

test('preferences persist, reset, and continue working when storage is denied', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const first = createReaderPreferencesStore(storage);
  first.update({ font: 'scheherazade', arabicSize: 140 });
  first.update({ translationSize: 125, explanationSize: 160 });
  assert.ok(data.has(READER_PREFERENCES_KEY));
  const second = createReaderPreferencesStore(storage);
  assert.deepEqual(second.get(), { font: 'scheherazade', arabicSize: 140, translationSize: 125, explanationSize: 160 });
  const copy = second.get(); copy.arabicSize = 900;
  assert.equal(second.get().arabicSize, 140);
  assert.deepEqual(second.reset(), DEFAULT_READER_PREFERENCES);
  assert.deepEqual(createReaderPreferencesStore(storage).get(), DEFAULT_READER_PREFERENCES);
  const blocked = createReaderPreferencesStore({ getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
  blocked.update({ font: 'noto-naskh', arabicSize: 175 });
  assert.equal(blocked.get().font, 'noto-naskh');
  assert.equal(blocked.get().arabicSize, 175);
});

test('display blocks retain occurrence order and classify only explicit explanations', () => {
  const rows: ItemRow[] = [
    { id: '1', ar: '', fa: 'Persian-only content' },
    { id: '2', ar: 'Arabic', fa: 'translation', kind: 'unknown' },
    { id: '3', ar: '', fa: 'instruction', kind: 'instruction' },
    { id: '4', ar: '', fa: 'note', kind: 'note' },
  ];
  const blocks = readerBlocks(rows);
  assert.deepEqual(blocks.map(block => [block.kind, block.row.id]), [['row', '1'], ['row', '2'], ['instruction', '3'], ['row', '4']]);
  assert.ok(blocks.every((block, index) => block.row === rows[index]));
  assert.equal(readerTextRole(rows[0]!, 'fa'), 'translation');
  assert.equal(readerTextRole(rows[1]!, 'ar'), 'arabic');
  assert.equal(readerTextRole(rows[1]!, 'fa'), 'translation');
  assert.equal(readerTextRole(rows[2]!, 'fa'), 'explanation');
  assert.equal(readerTextRole(rows[3]!, 'fa'), 'explanation');
});
