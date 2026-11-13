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

test('repeated original highlighting reuses bounded per-character folding and decomposition', () => {
  const input = '😀 رَحْمَةٌ يا رَحْمَتِي ﻻ ۱۲۳';
  const words = ['رحمت', 'رحمة', 'یا', 'لا'];
  const expected = findOriginalWordMatches(input, words);
  const normalize = String.prototype.normalize, test = RegExp.prototype.test;
  let decompositions = 0, classifications = 0;
  String.prototype.normalize = function(form?: string): string {
    if (Array.from(String(this)).length === 1) decompositions += 1;
    return normalize.call(String(this), form);
  };
  RegExp.prototype.test = new Proxy(test, { apply(target, receiver, args) {
    if (receiver instanceof RegExp && receiver.source === '[\\p{M}\\u0640\\u200c\\u200d]') classifications += 1;
    return Reflect.apply(target, receiver, args);
  } });
  try {
    for (let pass = 0; pass < 100; pass += 1) assert.deepEqual(findOriginalWordMatches(input, words), expected);
  } finally { String.prototype.normalize = normalize; RegExp.prototype.test = test; }
  const distinct = new Set(Array.from(input)).size;
  assert.ok(decompositions <= distinct, `repeated ${decompositions} single-character decompositions`);
  assert.ok(classifications <= distinct * 3, `repeated ${classifications} single-character classifications`);
});

test('uncased original text avoids building a second per-character lowercase map', () => {
  const input = `${'㐀'.repeat(60)} رَحْمَة`;
  const original = String.prototype.toLocaleLowerCase;
  let individual = 0;
  String.prototype.toLocaleLowerCase = function(locales?: string | string[]): string {
    if (Array.from(String(this)).length === 1) individual += 1;
    return original.call(String(this), locales);
  };
  try { assert.equal(foldWithOffsets(input, true)?.value, `${'㐀'.repeat(60)} رحمة`); }
  finally { String.prototype.toLocaleLowerCase = original; }
  assert.equal(individual, 0, 'unchanged lowercase does not need per-character case mapping');
});

test('uncased source builds only the final offset map', () => {
  const input = 'ب'.repeat(400);
  const original = Array.prototype.push;
  let rangeWrites = 0;
  Array.prototype.push = function(...values: unknown[]): number {
    if (values.length === 1 && values[0] && typeof values[0] === 'object' &&
        'start' in values[0] && 'end' in values[0]) rangeWrites += 1;
    return original.apply(this, values);
  };
  try { assert.equal(foldWithOffsets(input, true)?.value, input); }
  finally { Array.prototype.push = original; }
  assert.equal(rangeWrites, input.length, 'unchanged case needs no temporary per-character offset map');
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
  const text = `A${characters.join('')}`; // force the contextual lowercase-mapping path
  assert.equal(foldWithOffsets(text)?.value, `a${characters.join('')}`);
  const uncached = characters.at(-1)!;
  const original = String.prototype.toLocaleLowerCase, normalize = String.prototype.normalize, test = RegExp.prototype.test;
  let calls = 0, decompositions = 0, classifications = 0;
  String.prototype.toLocaleLowerCase = function (locales?: string | string[]): string {
    if (String(this) === uncached) calls += 1;
    return original.call(String(this), locales);
  };
  String.prototype.normalize = function(form?: string): string {
    if (String(this) === uncached) decompositions += 1;
    return normalize.call(String(this), form);
  };
  RegExp.prototype.test = new Proxy(test, { apply(target, receiver, args) {
    if (receiver instanceof RegExp && receiver.source === '[\\p{M}\\u0640\\u200c\\u200d]' && args[0] === uncached) classifications += 1;
    return Reflect.apply(target, receiver, args);
  } });
  try { assert.equal(foldWithOffsets(`A${uncached.repeat(6)}`)?.value, `a${uncached.repeat(6)}`); }
  finally { String.prototype.toLocaleLowerCase = original; String.prototype.normalize = normalize; RegExp.prototype.test = test; }
  assert.equal(calls, 6, 'lowercase length cache remains bounded');
  assert.ok(decompositions >= 6, 'decomposition cache remains bounded');
  assert.ok(classifications >= 6, 'character-fold cache remains bounded');
});
