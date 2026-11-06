import assert from 'node:assert/strict';
import test from 'node:test';
import { TopK } from '../src/search-top-k.js';

test('bounded selection agrees with an independent full sort over many input sizes and tie patterns', () => {
  let seed = 0x8834c221;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let trial = 0; trial < 300; trial += 1) {
    const size = random(300);
    const input = Array.from({ length: size }, (_, id) => ({ id, score: random(9), type: random(3) }));
    const compare = (a: typeof input[number], b: typeof input[number]) => b.score - a.score || a.type - b.type || a.id - b.id;
    const expected = [...input].sort(compare);
    for (const limit of [0, 1, 2, 10, Math.floor(size / 2), size, size + 2]) {
      const selected = new TopK(limit, size, compare);
      for (const item of input) selected.add(item);
      assert.deepEqual(selected.sorted(), expected.slice(0, limit), `${trial}: ${size}/${limit}`);
    }
  }
});
