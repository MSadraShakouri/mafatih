import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { ICONS } from '../web/icons.js';

test('factoring shared SVG markup preserves each existing Lucide icon byte for byte', () => {
  const expected = {
    back: '0fc1a9b6dc6a1f5e6c506ad5b6ac1458e6b61bc77a24d37f2f8a07fd6d0a0cb6',
    scroll: 'fb4af34df50bdbac82a169dd7fe6d18ba510b047889cacbcd78f4faed6f69671',
    search: '1cd70cfe1897900ba8c620e20427098351a8be5ed0819ffd479590c42f6732f6',
    settings: 'f4aca441c1b80dddb8ab2408646c832a3cae842e3fd8b2a55ceb524b2d007b04',
    next: 'bd16a7f9969a40ab8171a9a214b40611233783c92e8cb0d43d15ad4d6392bcf0',
    plus: 'b9582d4964531fc23310ee33e6d69006b14f9dd51c3a44f26124242048896075',
    minus: '1819565c032e001c9501840fd514024e978345efd625591cde996b01643aae4b',
    bookmark: 'd4800364879d8fcb3ec81441146305a0f32a2322cb60abd9c3a45becd566dc12',
  };
  const actual = Object.fromEntries(Object.entries(ICONS).map(([name, svg]) => [name, createHash('sha256').update(svg).digest('hex')]));
  assert.deepEqual(actual, expected);
});
