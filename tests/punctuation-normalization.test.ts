import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearch } from '../src/normalize.js';
import { normalizePunctuationSpacing } from '../src/punctuation.js';

test('removes horizontal space before closing punctuation in Arabic, Persian and English', () => {
  const cases: Array<[string, string]> = [
    ['كَلام  ، وَعَدْلٌ\t؛ حَقٌّ ؟', 'كَلام، وَعَدْلٌ؛ حَقٌّ؟'],
    ['می‌روم , تو ! سپس ؛ پایان .', 'می‌روم, تو! سپس؛ پایان.'],
    ['Hello , world ! Why ? (example )', 'Hello, world! Why? (example)'],
    ['الف\u00a0، ب\u202f؛ ج\u2009؟', 'الف، ب؛ ج؟'],
    ['a ： b ， c 。 d ！ e ？', 'a： b， c。 d！ e？'],
    ['कथा । कथा ॥', 'कथा। कथा॥'],
    ['۵ ٪ و 10 %', '۵٪ و 10%'],
    ['قبل «نقل قول » و [توضیح ]', 'قبل «نقل قول» و [توضیح]'],
    ['one . . .', 'one...'],
  ];
  for (const [before, after] of cases) {
    assert.equal(normalizePunctuationSpacing(before), after);
    assert.equal(normalizePunctuationSpacing(after), after, 'normalization is idempotent');
    assert.equal(normalizeSearch(before), normalizeSearch(after), 'search folding is unchanged');
  }
});

test('preserves opening punctuation, dashes, transliteration and explicit line breaks', () => {
  const original = 'عنوان (شرح) و «متن» — بعد «دیگر»\nنقل ( \nپایان';
  assert.equal(normalizePunctuationSpacing(original), original);
  assert.equal(normalizePunctuationSpacing('a ﴿1﴾ b'), 'a ﴿1﴾ b');
  assert.equal(normalizePunctuationSpacing('Nad ’Ali and \'Ali'), 'Nad ’Ali and \'Ali');
  assert.equal(normalizePunctuationSpacing('He said “hello ” and "goodbye " .'), 'He said “hello” and "goodbye".');
  // Some source strings use a closing quote glyph to open a quotation; do not
  // attach it to preceding sentence punctuation and change its meaning.
  assert.equal(normalizePunctuationSpacing('Prayer: ” Say this'), 'Prayer: ” Say this');
  assert.equal(normalizePunctuationSpacing('😀 \n، next'), '😀 \n، next');
});

test('does not alter letters, diacritics, half-spaces, punctuation characters or non-horizontal whitespace', () => {
  const before = 'می\u200cآیَم\t، قالَ\u00a0؛\n“word \" ”\r\nکار';
  const after = normalizePunctuationSpacing(before);
  assert.equal(after.replace(/[\p{Zs}\t]/gu, ''), before.replace(/[\p{Zs}\t]/gu, ''));
  assert.ok(after.includes('\u200c'));
  assert.equal((after.match(/\n/g) ?? []).length, (before.match(/\n/g) ?? []).length);
  assert.equal((after.match(/\r/g) ?? []).length, (before.match(/\r/g) ?? []).length);
});
