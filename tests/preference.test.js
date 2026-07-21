import test from 'node:test';
import assert from 'node:assert/strict';
import { nextPreference, resolvePreference } from '../assets/js/preference.js';

test('preference cycle moves through enjoy, tolerate, refuse, and unset', () => {
  assert.equal(nextPreference(null), 'enjoy');
  assert.equal(nextPreference('enjoy'), 'tolerate');
  assert.equal(nextPreference('tolerate'), 'refuse');
  assert.equal(nextPreference('refuse'), null);
});

test('preparation preference overrides the overall food preference', () => {
  const item = {
    tolerance: 'tolerate',
    preparationPreferences: {
      raw: 'enjoy',
      steamed: 'refuse'
    }
  };

  assert.equal(resolvePreference(item, 'raw'), 'enjoy');
  assert.equal(resolvePreference(item, 'steamed'), 'refuse');
  assert.equal(resolvePreference(item, 'roasted'), 'tolerate');
});
