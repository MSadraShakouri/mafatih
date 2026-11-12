import assert from 'node:assert/strict';
import test from 'node:test';
import { findOriginalWordMatches, foldWithOffsets } from '../src/search-text.js';

test('joined-source verification reuses identical per-character lowercase lengths', () => {
  // A frequent library query must verify original horizontal gaps in many
  // records. This measures repeated expensive work without a flaky time limit.
  const examples = [
    { text: 'أَهْلَ بَيْتٍ', spans: [{ word: 'اهلبیت', start: 0, end: 12 }] },
    { text: 'أَهْلَ، بَيْتٍ', spans: [] },
    { text: 'أَهْلَ\nبَيْتٍ', spans: [] },
    { text: 'أَهْلَ بَيْتِهِمْ', spans: [{ word: 'اهلبیت', start: 0, end: 12 }] },
    { text: '🌙 أَهْلَ بَيْتٍ', spans: [{ word: 'اهلبیت', start: 3, end: 15 }] },
  ];
  const distinct = new Set(examples.flatMap(({ text }) =>
    Array.from(Array.from(text, character => character.normalize('NFKD')).join(''))));
  const original = String.prototype.toLocaleLowerCase;
  let singleCharacterCalls = 0;
  String.prototype.toLocaleLowerCase = function (locales?: string | string[]): string {
    if (Array.from(String(this)).length === 1) singleCharacterCalls += 1;
    return original.call(String(this), locales);
  };
  try {
    for (let pass = 0; pass < 50; pass += 1) for (const { text, spans } of examples) {
      assert.deepEqual(findOriginalWordMatches(text, ['اهلبیت'], 1), spans);
    }
  } finally { String.prototype.toLocaleLowerCase = original; }
  assert.ok(singleCharacterCalls <= distinct.size,
    `expected at most ${distinct.size} per-character lowercase conversions, saw ${singleCharacterCalls}`);
});

test('cached original offsets retain contextual casing, ligatures and supplementary UTF-16 spans', () => {
  const input = 'İ I\u0307 ΟΣ ΟΣΑ ﻻ 😀𐐀 ۱٢';
  const offsets = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
    [9, 10], [10, 11], [11, 12], [12, 13], [12, 13], [13, 14], [16, 18], [16, 18],
    [18, 19], [19, 20], [20, 21]].map(([start, end]) => ({ start, end }));
  for (let pass = 0; pass < 2; pass += 1) {
    assert.deepEqual(foldWithOffsets(input), { value: 'i i ος οσα لا 𐐨 12', offsets });
    assert.deepEqual(findOriginalWordMatches(input, ['لا']), [{ word: 'لا', start: 12, end: 13 }]);
  }
});

test('the per-character memo remains bounded when texts contain thousands of distinct characters', () => {
  const characters = Array.from({ length: 2500 }, (_, index) => String.fromCodePoint(0x4e00 + index));
  const text = characters.join('');
  assert.equal(foldWithOffsets(text)?.value, text);
  const uncached = characters.at(-1)!;
  const original = String.prototype.toLocaleLowerCase;
  let calls = 0;
  String.prototype.toLocaleLowerCase = function (locales?: string | string[]): string {
    if (String(this) === uncached) calls += 1;
    return original.call(String(this), locales);
  };
  try { assert.equal(foldWithOffsets(uncached.repeat(6))?.value, uncached.repeat(6)); }
  finally { String.prototype.toLocaleLowerCase = original; }
  assert.equal(calls, 6, 'characters encountered after the cache limit use the original mapping path');
});
