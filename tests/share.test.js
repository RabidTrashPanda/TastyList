import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeShareCode, encodeShareCode } from '../assets/js/share.js';

test('share codes preserve Unicode profile data', () => {
  const profile = {
    name: 'Zoë',
    items: {
      pate: {
        tolerance: 'enjoy',
        rating: 5,
        preparations: ['sautéed'],
        notes: 'Crème brûlée pairing'
      }
    }
  };

  assert.deepEqual(decodeShareCode(encodeShareCode(profile)), {
    name: profile.name,
    items: profile.items
  });
});

test('share code decoder rejects unsupported payloads', () => {
  const unsupported = Buffer.from(JSON.stringify({
    format: 'other-format',
    version: 1,
    profile: {}
  })).toString('base64url');

  assert.throws(() => decodeShareCode(unsupported), /not a supported TastyList share code/);
});
