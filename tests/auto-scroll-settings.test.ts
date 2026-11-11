import assert from 'node:assert/strict';
import test from 'node:test';
import { createScrollSettings, DEFAULT_SCROLL_SPEED, MAX_SCROLL_SPEED, MIN_SCROLL_SPEED, nextScrollSpeed, SMART_SCROLL_KEY } from '../web/scroll-settings.js';

test('Smart mode persists, while manual or learned speed only lasts this app session', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const first = createScrollSettings(storage);
  assert.equal(first.get().smart, true); assert.equal(first.get().speed, DEFAULT_SCROLL_SPEED);
  first.setSmart(false); first.setSpeed(85.5);
  assert.equal(data.get(SMART_SCROLL_KEY), 'false');
  assert.equal(first.get().speed, 85.5);
  assert.deepEqual(createScrollSettings(storage).get(), { smart: false, speed: 16, revision: 0 });
  first.setSmart(true); assert.equal(data.get(SMART_SCROLL_KEY), 'true');
  first.setSpeed(-20); assert.equal(first.get().speed, MIN_SCROLL_SPEED);
  first.setSpeed(9999); assert.equal(first.get().speed, MAX_SCROLL_SPEED);
  first.setSpeed(NaN); assert.equal(first.get().speed, DEFAULT_SCROLL_SPEED);
});

test('manual speed stops match the selected preview and work without storage', () => {
  const denied = createScrollSettings({ getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
  denied.setSmart(false); denied.setSpeed(15.68);
  assert.equal(denied.get().smart, false); assert.equal(nextScrollSpeed(denied.get().speed, 1), 18);
  for (const [a, b] of [[.2, .3], [1, 1.5], [10, 12], [16, 18], [20, 23], [80, 85], [300, 320], [480, 500]]) {
    assert.equal(nextScrollSpeed(a!, 1), b); assert.equal(nextScrollSpeed(b!, -1), a);
  }
  assert.equal(nextScrollSpeed(MIN_SCROLL_SPEED, -1), MIN_SCROLL_SPEED);
  assert.equal(nextScrollSpeed(MAX_SCROLL_SPEED, 1), MAX_SCROLL_SPEED);
  assert.equal(createScrollSettings({ getItem: () => 'bad', setItem: () => {} }).get().smart, true);
});
