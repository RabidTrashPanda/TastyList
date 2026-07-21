import test from 'node:test';
import assert from 'node:assert/strict';
import { matchDish } from '../assets/js/dish.js';

const flatItems = [
  {
    key: 'scallion',
    name: 'Scallion',
    category: 'Fresh Aromatics',
    aliases: ['green onion'],
    isAnomaly: false,
    note: null
  }
];

test('dish matching recognizes aliases on phrase boundaries', () => {
  const profile = {
    items: {
      scallion: {
        tolerance: 'enjoy',
        rating: 5,
        preparations: [],
        notes: ''
      }
    }
  };

  const matches = matchDish('Noodles with green onion and sesame', profile, flatItems);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].classification, 'love');
});

test('dish matching does not match aliases inside longer words', () => {
  const profile = { items: {} };
  assert.deepEqual(matchDish('A green oniony sauce', profile, flatItems), []);
});
