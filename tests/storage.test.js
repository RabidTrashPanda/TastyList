import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyState,
  createProfile,
  exportProfile,
  exportState,
  importState,
  importProfile,
  normalizeState,
  saveState,
  loadState
} from '../assets/js/storage.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('profiles use stable IDs instead of names as storage keys', () => {
  const profile = createProfile('Alex');
  const state = createEmptyState();
  state.profiles[profile.id] = profile;
  state.activeProfileId = profile.id;

  const normalized = normalizeState(state);
  assert.equal(normalized.profiles[profile.id].name, 'Alex');
  assert.equal(normalized.activeProfileId, profile.id);
});

test('state round-trips through browser storage', () => {
  const storage = new MemoryStorage();
  const profile = createProfile('Taylor');
  const state = createEmptyState();
  state.profiles[profile.id] = profile;
  state.activeProfileId = profile.id;

  saveState(state, storage);
  const loaded = loadState(storage);

  assert.deepEqual(loaded, state);
});

test('profile import creates a new guest profile ID', () => {
  const original = createProfile('Morgan');
  const imported = importProfile(exportProfile(original));

  assert.equal(imported.name, original.name);
  assert.equal(imported.kind, 'guest');
  assert.notEqual(imported.id, original.id);
});


test('empty item records are pruned from persisted state', () => {
  const profile = createProfile('Casey');
  profile.items.broccoli = {
    tolerance: null,
    rating: 0,
    preparations: [],
    notes: ''
  };
  const state = createEmptyState();
  state.profiles[profile.id] = profile;
  state.activeProfileId = profile.id;

  const normalized = normalizeState(state);
  assert.deepEqual(normalized.profiles[profile.id].items, {});
});

test('backup import rejects unrelated JSON instead of returning an empty state', () => {
  assert.throws(
    () => importState(JSON.stringify({ hello: 'world' })),
    /valid TastyList backup/
  );
});

test('backup export round-trips through the versioned envelope', () => {
  const profile = createProfile('Jordan');
  const state = createEmptyState();
  state.profiles[profile.id] = profile;
  state.activeProfileId = profile.id;

  assert.deepEqual(importState(exportState(state)), state);
});


test('legacy preparation-specific catalog keys migrate to base foods', () => {
  const profile = createProfile('Riley');
  profile.items = {
    yellow_onion_cooked: {
      tolerance: 'enjoy',
      rating: 4,
      preparations: [],
      notes: ''
    },
    garlic_roasted: {
      tolerance: 'enjoy',
      rating: 5,
      preparations: [],
      notes: 'Only roasted'
    },
    raw_red_onion: {
      tolerance: 'refuse',
      rating: 0,
      preparations: [],
      notes: ''
    }
  };

  const state = createEmptyState();
  state.profiles[profile.id] = profile;
  state.activeProfileId = profile.id;

  const items = normalizeState(state).profiles[profile.id].items;

  assert.equal(items.yellow_onion.tolerance, 'enjoy');
  assert.equal(items.garlic.rating, 5);
  assert.deepEqual(items.garlic.preparations, ['roasted']);
  assert.equal(items.red_onion.tolerance, 'refuse');
  assert.deepEqual(items.red_onion.preparations, ['raw']);
  assert.equal(items.yellow_onion_cooked, undefined);
  assert.equal(items.garlic_roasted, undefined);
  assert.equal(items.raw_red_onion, undefined);
});

test('legacy garlic data merges with an existing base-food record', () => {
  const profile = createProfile('Avery');
  profile.items = {
    garlic: {
      tolerance: 'tolerate',
      rating: 2,
      preparations: ['raw'],
      notes: 'Small amounts'
    },
    garlic_roasted: {
      tolerance: 'enjoy',
      rating: 5,
      preparations: [],
      notes: 'Roasted is great'
    }
  };

  const state = createEmptyState();
  state.profiles[profile.id] = profile;

  const garlic = normalizeState(state).profiles[profile.id].items.garlic;

  assert.equal(garlic.tolerance, 'tolerate');
  assert.equal(garlic.rating, 5);
  assert.deepEqual(garlic.preparations, ['raw', 'roasted']);
  assert.equal(garlic.notes, 'Small amounts · Roasted is great');
});
