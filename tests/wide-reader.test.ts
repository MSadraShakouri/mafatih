import assert from 'node:assert/strict';
import test from 'node:test';
import { planWideArabicBreaks, planWideBands } from '../web/wide-reader.js';

test('wide bands are greedy, consecutive, width-bounded, and never swallow boundary or oversized rows', () => {
  const widths = [40, 45, null, 150, 30, 30, 30, 10];
  assert.deepEqual(planWideBands(widths, 100, 0, 5), [{ start: 0, end: 2 }, { start: 4, end: 7 }]);
  assert.deepEqual(planWideBands(widths, 100, .5, 5), [{ start: 0, end: 2 }, { start: 4, end: 8 }]);
  assert.deepEqual(planWideBands([120, 20, 20], 100, .5, 5), [{ start: 0, end: 2 }]);
  assert.deepEqual(planWideBands([120, 20, 20], 100, 0, 5), [{ start: 1, end: 3 }]);
  assert.deepEqual(planWideBands([10, null, 10, NaN, 10, Infinity, 10], 100, 0), []);
  assert.deepEqual(planWideBands([10, 20], 0, 0), []);
});

test('generated bands cover each selected index once, fit exactly, and cannot skip boundaries', () => {
  // Deterministic varied sizes, including explicit missing-language boundaries.
  const widths = Array.from({ length: 240 }, (_, i) => i % 17 === 0 ? null : 1 + (i * 37 % 140));
  for (const allowance of [0, .25, .5]) {
    const bands = planWideBands(widths, 100, allowance);
    let priorEnd = 0;
    for (const band of bands) {
      assert.ok(band.start >= priorEnd && band.end - band.start >= 2);
      const selected = widths.slice(band.start, band.end);
      assert.ok(selected.every(w => typeof w === 'number' && Number.isFinite(w)));
      const sum = (selected as number[]).reduce((a, b) => a + b, 0) + (selected.length - 1) * 12;
      assert.ok(sum <= 100 * (1 + allowance));
      priorEnd = band.end;
    }
  }
});

test('Arabic fragments fill the remaining line only at real word boundaries', () => {
  const texts = ['12345678901234', 'aa bbb cc', 'ok'];
  const widths = texts.map(text => text.length);
  const measure = (row: number, start: number, end: number) => texts[row]!.slice(start, end).length;
  assert.deepEqual([...planWideArabicBreaks(widths, texts, [{ start: 0, end: 3 }], 20, measure, 2)], [[1, [{ offset: 3 }]]]);
  const unbreakable = ['12345678901234', 'abcdef gh'];
  assert.deepEqual([...planWideArabicBreaks(unbreakable.map(x => x.length), unbreakable,
    [{ start: 0, end: 2 }], 20, (row, start, end) => unbreakable[row]!.slice(start, end).length, 2)], []);
});

test('line planning handles an oversized phrase and never cuts a no-break space or combining sequence', () => {
  const texts = ['aaa bbb ccc ddd', 'ok', 'aa\u00a0bb cc', 'x'];
  const widths = texts.map(text => text.length);
  const measure = (row: number, start: number, end: number) => texts[row]!.slice(start, end).length;
  assert.deepEqual([...planWideArabicBreaks(widths, texts, [{ start: 0, end: 2 }], 10, measure, 2)], [[0, [{ offset: 8 }]]]);
  assert.deepEqual([...planWideArabicBreaks(widths, texts, [{ start: 2, end: 4 }], 7, measure, 1)], [[2, [{ offset: 6 }]]]);
  const combined = ['123456', 'e\u0301 xx'];
  assert.deepEqual([...planWideArabicBreaks(combined.map(text => text.length), combined, [{ start: 0, end: 2 }], 10,
    (row, start, end) => combined[row]!.slice(start, end).length, 1)], [[1, [{ offset: 3 }]]]);
});


test('a word fits when its line-end separator hangs, without cutting the separator', () => {
  const texts = ['123456789012345', 'abc def'];
  const measure = (row: number, start: number, end: number) => texts[row]!.slice(start, end).length;
  assert.deepEqual([...planWideArabicBreaks(texts.map(text => text.length), texts,
    [{ start: 0, end: 2 }], 20, measure, 2)], [[1, [{ offset: 4, hangFrom: 3 }]]]);
});
