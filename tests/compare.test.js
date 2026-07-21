import test from 'node:test';
import assert from 'node:assert/strict';
import { compareProfiles } from '../assets/js/compare.js';

const items = [
  { key: 'broccoli', name: 'Broccoli', category: 'Vegetables' },
  { key: 'salmon', name: 'Salmon', category: 'Seafood' }
];

test('comparison identifies conflicts across three profiles', () => {
  const profiles = [
    { items: { broccoli: { tolerance: 'enjoy', rating: 5 } } },
    { items: { broccoli: { tolerance: 'refuse', rating: 0 } } },
    { items: { broccoli: { tolerance: 'tolerate', rating: 3 } } }
  ];

  const rows = compareProfiles(profiles, items);
  assert.equal(rows[0].classification, 'conflict');
});

test('comparison identifies shared likes', () => {
  const profiles = [
    { items: { salmon: { tolerance: 'enjoy', rating: 5 } } },
    { items: { salmon: { tolerance: 'tolerate', rating: 4 } } }
  ];

  const rows = compareProfiles(profiles, items);
  assert.equal(rows[0].classification, 'sharedLike');
});

test('comparison detects a conflict in a preparation override', () => {
  const profiles = [
    {
      items: {
        broccoli: {
          tolerance: 'tolerate',
          rating: 3,
          preparationPreferences: { raw: 'enjoy' }
        }
      }
    },
    {
      items: {
        broccoli: {
          tolerance: 'tolerate',
          rating: 3,
          preparationPreferences: { raw: 'refuse' }
        }
      }
    }
  ];

  const rows = compareProfiles(profiles, items);
  assert.equal(rows[0].classification, 'conflict');
});
