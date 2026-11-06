import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, validateCorpus } from '../src/corpus.js';
import { normalizeSearch } from '../src/normalize.js';
import { normalizePunctuationSpacing } from '../src/punctuation.js';
import { planPunctuationNormalization } from '../src/punctuation-migration.js';

test('current multilingual content is normalized without rewriting historical claims', () => {
  const corpus = loadCorpus();
  assert.deepEqual(planPunctuationNormalization(corpus), []);
  assert.deepEqual(validateCorpus(corpus).errors, []);
});

test('each recorded punctuation edit retains its exact previous and corrected text', () => {
  const corpus = loadCorpus();
  const history = corpus.editorial.punctuation_normalizations ?? [];
  assert.ok(history.length > 0);
  let count = 0;
  for (const batch of history) for (const change of batch.changes) {
    count += 1;
    const previous = corpus.texts.get(change.previous);
    const replacement = corpus.texts.get(change.replacement);
    assert.notEqual(previous, undefined); assert.notEqual(replacement, undefined);
    assert.notEqual(previous, replacement);
    assert.equal(normalizePunctuationSpacing(previous!), replacement);
    assert.equal(normalizeSearch(previous!), normalizeSearch(replacement!));
    assert.equal(previous!.replace(/[\p{Zs}\t]/gu, ''), replacement!.replace(/[\p{Zs}\t]/gu, ''));
  }
  assert.ok(count > 0);
});

test('validation detects fabricated or duplicated punctuation history', () => {
  const corpus = loadCorpus(); const first = corpus.editorial.punctuation_normalizations?.[0];
  assert.ok(first && first.changes.length);
  const saved = structuredClone(first.changes[0]!);
  first.changes.push(structuredClone(saved));
  assert.ok(validateCorpus(corpus).errors.some(error => error.includes('duplicate punctuation')));
  first.changes.pop();
  first.changes[0]!.replacement = saved.previous;
  assert.ok(validateCorpus(corpus).errors.some(error => error.includes('invalid punctuation')));
  first.changes[0] = saved;
});
