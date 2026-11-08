import test from 'node:test';
import assert from 'node:assert/strict';
import { displayDigits, verseMarkerRanges } from '../web/display-text.js';
import { titleText } from '../web/render.js';

test('Persian display digits preserve source offsets and leave English text unchanged', () => {
  const source = '🌙 آیه 12 و ٣۴ و ۹';
  const actual = displayDigits(source, 'ar');
  assert.equal(actual, '🌙 آیه ۱۲ و ۳۴ و ۹');
  assert.equal(actual.length, source.length);
  assert.equal(Array.from(actual).length, Array.from(source).length);
  assert.equal(displayDigits('Chapter 12:3', 'en'), 'Chapter 12:3');
  assert.equal(displayDigits('Chapter 12:3', 'ui'), 'Chapter 12:3');
  assert.equal(displayDigits('آیه 12', 'ui'), 'آیه ۱۲');
  assert.equal(displayDigits('123', 'ui'), '۱۲۳');
  assert.equal(titleText({ fa: '', ar: '', en: 'Chapter 12' }, 'fallback').text, 'Chapter 12');
  assert.equal(titleText({ fa: 'فصل 12', ar: '', en: '' }, 'fallback').text, 'فصل ۱۲');
});

test('only ornate brackets containing digits are verse markers', () => {
  const input = '﴿نص قرآني﴾ 🌙 لفظ ﴿12﴾ سپس ﴿٣۴﴾';
  const ranges = verseMarkerRanges(input);
  assert.deepEqual(ranges.map(({ start, end }) => input.slice(start, end)), ['﴿12﴾', '﴿٣۴﴾']);
});
