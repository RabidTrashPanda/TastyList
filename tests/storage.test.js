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
