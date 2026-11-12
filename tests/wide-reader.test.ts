import assert from 'node:assert/strict';
import test from 'node:test';
import { planWideBands } from '../web/wide-reader.js';

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
