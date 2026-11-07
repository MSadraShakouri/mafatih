import test from 'node:test';
import assert from 'node:assert/strict';
import { EditableRowSchema, internItem, readableItem } from '../src/editable.js';
import { loadCorpus } from '../src/corpus.js';
import { RowSchema, SourcesSchema } from '../src/schema.js';

const reference = `t${'a'.repeat(24)}`;

test('canonical rows retain their reference, strictness, and nonempty-side rules', () => {
  assert.equal(RowSchema.safeParse({ id: 'r1', ar: reference, fa: null }).success, true);
  assert.equal(RowSchema.safeParse({ id: 'r1', ar: null, fa: reference, kind: 'note' }).success, true);
  assert.equal(RowSchema.safeParse({ id: 'r1', ar: null, fa: null }).success, false);
  assert.equal(RowSchema.safeParse({ id: 'r1', ar: 'not-a-text-id', fa: null }).success, false);
  assert.equal(RowSchema.safeParse({ id: 'r1', ar: reference, fa: null, unexpected: true }).success, false);
  assert.equal(RowSchema.safeParse({ id: 'r1', ar: reference, fa: null, sources: { ar: ['INVALID KEY'] } }).success, false);
});

test('editable rows accept literal text but still reject empty and unknown fields', () => {
  assert.equal(EditableRowSchema.safeParse({ id: 'r1', ar: 'دعاء', fa: null }).success, true);
  assert.equal(EditableRowSchema.safeParse({ id: 'r1', ar: '', fa: 'ترجمه' }).success, true);
  assert.equal(EditableRowSchema.safeParse({ id: 'r1', ar: '', fa: null }).success, false);
  assert.equal(EditableRowSchema.safeParse({ id: 'r1', ar: null, fa: null }).success, false);
  assert.equal(EditableRowSchema.safeParse({ id: 'r1', ar: 'دعاء', fa: null, unexpected: true }).success, false);
});

test('record key validation remains strict and a real editable item round-trips', () => {
  const source = { name: reference, license: { status: 'unverified' } };
  assert.equal(SourcesSchema.safeParse({ sources: { 'valid-key': source } }).success, true);
  assert.equal(SourcesSchema.safeParse({ sources: { 'INVALID KEY': source } }).success, false);
  const corpus = loadCorpus();
  const id = 'dua-kumayl';
  const original = corpus.items.get(id);
  assert.ok(original);
  assert.deepEqual(internItem(corpus, readableItem(corpus, id)), original);
});
