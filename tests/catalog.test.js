import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, flatItems, itemKey } from '../assets/js/catalog.js';

test('catalog keys are unique and match category items', () => {
  const categoryItems = Object.entries(categories).flatMap(([category, data]) =>
    data.items.map(item => ({
      key: itemKey(item.name),
      name: item.name,
      category
    }))
  );

  assert.equal(flatItems.length, categoryItems.length);
  assert.equal(new Set(flatItems.map(item => item.key)).size, flatItems.length);
  assert.deepEqual(
    flatItems.map(({ key, name, category }) => ({ key, name, category })),
    categoryItems
  );
});


test('food names do not embed preparation methods', () => {
  const preparationWords = [
    'raw',
    'cooked',
    'roasted',
    'steamed',
    'grilled',
    'fried',
    'baked',
    'boiled',
    'sautéed',
    'sauteed',
    'pickled',
    'smoked',
    'cured',
    'dried',
    'juiced',
    'melted',
    'whipped',
    'fermented',
    'toasted',
    'sprouted',
    'braised',
    'seared'
  ];

  const offenders = flatItems
    .filter(item => preparationWords.some(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(item.name)
    ))
    .map(item => item.name);

  assert.deepEqual(offenders, []);
});

test('foods are alphabetically sorted within every category', () => {
  for (const category of Object.values(categories)) {
    const names = category.items.map(item => item.name);
    assert.deepEqual(names, [...names].sort((left, right) => left.localeCompare(right)));
  }
});
