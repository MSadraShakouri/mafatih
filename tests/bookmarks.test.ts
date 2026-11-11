import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOKMARKS_KEY, createBookmarkStore } from '../web/bookmarks.js';

const memory = () => {
  const entries = new Map<string, string>();
  return { entries, getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); } };
};

test('whole-item bookmarks toggle, persist in insertion order, and return defensive copies', () => {
  const storage = memory(), store = createBookmarkStore(storage);
  assert.deepEqual(store.items(), []);
  assert.equal(store.toggle('dua-kumayl'), true); assert.equal(store.lastWritePersistent(), true);
  assert.equal(store.toggle('sura-yasin'), true);
  assert.deepEqual(JSON.parse(storage.entries.get(BOOKMARKS_KEY)!), ['dua-kumayl', 'sura-yasin']);
  const reopened = createBookmarkStore(storage);
  assert.equal(reopened.has('dua-kumayl'), true);
  const copy = reopened.items(); copy.length = 0;
  assert.deepEqual(reopened.items(), ['dua-kumayl', 'sura-yasin']);
  assert.equal(reopened.toggle('dua-kumayl'), false);
  assert.deepEqual(createBookmarkStore(storage).items(), ['sura-yasin']);
  assert.throws(() => reopened.toggle('../bad'));
});

test('invalid storage and storage failures cannot prevent reading or in-session bookmarks', () => {
  const storage = memory();
  storage.entries.set(BOOKMARKS_KEY, '{bad json');
  assert.deepEqual(createBookmarkStore(storage).items(), []);
  storage.entries.set(BOOKMARKS_KEY, JSON.stringify(['dua-kumayl', null, '../bad', 'dua-kumayl', 'sura-yasin']));
  assert.deepEqual(createBookmarkStore(storage).items(), ['dua-kumayl', 'sura-yasin']);
  storage.entries.set(BOOKMARKS_KEY, JSON.stringify({ items: ['dua-kumayl'] }));
  assert.deepEqual(createBookmarkStore(storage).items(), []);
  const denied = createBookmarkStore({ getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
  assert.equal(denied.toggle('dua-kumayl'), true); assert.equal(denied.lastWritePersistent(), false);
  assert.equal(denied.has('dua-kumayl'), true);
  assert.deepEqual(denied.items(), ['dua-kumayl']);
});
