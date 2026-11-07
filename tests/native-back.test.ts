import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeBackAction } from '../web/native-back.js';
import { parseRoute } from '../web/routes.js';

test('native Back follows app-owned history, falls back on direct links, and minimizes only at home', () => {
  assert.deepEqual(nativeBackAction(parseRoute('#/'), true, true), { kind: 'minimize' });
  assert.deepEqual(nativeBackAction(parseRoute('#/item/dua-kumayl'), true, true), { kind: 'history' });
  assert.deepEqual(nativeBackAction(parseRoute('#/item/dua-kumayl'), false, true), { kind: 'replace', href: '#/' });
  assert.deepEqual(nativeBackAction(parseRoute('#/item/dua-kumayl'), true, false), { kind: 'replace', href: '#/' });
  assert.deepEqual(nativeBackAction(parseRoute('#/settings/dua-kumayl'), false, false), { kind: 'replace', href: '#/item/dua-kumayl' });
  assert.deepEqual(nativeBackAction(parseRoute('#/contents/dua/0.4.1.6'), false, false), { kind: 'replace', href: '#/contents/dua' });
  assert.deepEqual(nativeBackAction(parseRoute('#/contents/dua'), false, false), { kind: 'replace', href: '#/contents' });
  assert.deepEqual(nativeBackAction(parseRoute('#/bookmarks'), false, false), { kind: 'replace', href: '#/' });
});
