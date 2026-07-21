const STORAGE_KEY = 'tastylist.state';
const SCHEMA_VERSION = 1;
const BACKUP_FORMAT = 'tastylist-backup';
const BACKUP_VERSION = 1;

const LEGACY_ITEM_KEYS = {
  yellow_onion_cooked: { key: 'yellow_onion' },
  garlic_roasted: { key: 'garlic', preparation: 'roasted' },
  raw_red_onion: { key: 'red_onion', preparation: 'raw' }
};

export function createEmptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeProfileId: null,
    profiles: {}
  };
}

export function createProfile(name, kind = 'local') {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: sanitizeProfileName(name),
    kind,
    createdAt: now,
    updatedAt: now,
    items: {}
  };
}

export function loadState(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyState();
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    const backupKey = `${STORAGE_KEY}.corrupt.${Date.now()}`;
    storage.setItem(backupKey, raw);
    storage.removeItem(STORAGE_KEY);
    return createEmptyState();
  }
}

export function saveState(state, storage = window.localStorage) {
  const normalized = normalizeState(state);
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeState(input) {
  const state = createEmptyState();

  if (!input || typeof input !== 'object') {
    return state;
  }

  const profiles = input.profiles && typeof input.profiles === 'object' ? input.profiles : {};
  for (const [id, rawProfile] of Object.entries(profiles)) {
    const profile = normalizeProfile(rawProfile, id);
    if (profile) {
      state.profiles[profile.id] = profile;
    }
  }

  if (typeof input.activeProfileId === 'string' && state.profiles[input.activeProfileId]) {
    state.activeProfileId = input.activeProfileId;
  } else {
    state.activeProfileId = Object.keys(state.profiles)[0] ?? null;
  }

  return state;
}

export function normalizeProfile(input, fallbackId = null) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const name = sanitizeProfileName(input.name);
  if (!name) {
    return null;
  }

  const now = new Date().toISOString();
  const id = typeof input.id === 'string' && input.id.trim() ? input.id : (fallbackId || createId());
  const items = {};

  if (input.items && typeof input.items === 'object') {
    for (const [sourceKey, rawItem] of Object.entries(input.items)) {
      const legacyMapping = LEGACY_ITEM_KEYS[sourceKey];
      const key = legacyMapping?.key ?? sourceKey;
      const item = normalizeItem(rawItem);

      if (legacyMapping?.preparation && !item.preparations.includes(legacyMapping.preparation)) {
        item.preparations.push(legacyMapping.preparation);
      }

      if (hasItemData(item)) {
        items[key] = items[key] ? mergeItems(items[key], item) : item;
      }
    }
  }

  return {
    id,
    name,
    kind: input.kind === 'guest' ? 'guest' : 'local',
    createdAt: validDate(input.createdAt) ? input.createdAt : now,
    updatedAt: validDate(input.updatedAt) ? input.updatedAt : now,
    items
  };
}

export function touchProfile(profile) {
  profile.updatedAt = new Date().toISOString();
}

export function getOrCreateItem(profile, key) {
  if (!profile.items[key]) {
    profile.items[key] = {
      tolerance: null,
      rating: 0,
      preparations: [],
      notes: ''
    };
  }

  return profile.items[key];
}

export function exportState(state) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    state: normalizeState(state)
  }, null, 2);
}

export function importState(jsonText) {
  const parsed = JSON.parse(jsonText);
  const source = parsed?.format === BACKUP_FORMAT
    ? readBackupEnvelope(parsed)
    : readLegacyBackup(parsed);

  return normalizeState(source);
}

export function exportProfile(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized) {
    throw new Error('The selected profile is invalid.');
  }

  return JSON.stringify({
    format: 'tastylist-profile',
    version: 1,
    profile: normalized
  }, null, 2);
}

export function importProfile(jsonText) {
  const parsed = JSON.parse(jsonText);
  const source = parsed?.format === 'tastylist-profile' ? parsed.profile : parsed;
  const profile = normalizeProfile(source);
  if (!profile) {
    throw new Error('This file does not contain a valid TastyList profile.');
  }

  profile.id = createId();
  profile.kind = 'guest';
  profile.createdAt = new Date().toISOString();
  profile.updatedAt = profile.createdAt;
  return profile;
}

export const storageKey = STORAGE_KEY;


function readBackupEnvelope(parsed) {
  if (parsed.version !== BACKUP_VERSION || !isStateDocument(parsed.state)) {
    throw new Error('This is not a supported TastyList backup.');
  }

  return parsed.state;
}

function readLegacyBackup(parsed) {
  if (!isStateDocument(parsed)) {
    throw new Error('This file does not contain a valid TastyList backup.');
  }

  return parsed;
}

function isStateDocument(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && value.schemaVersion === SCHEMA_VERSION
    && value.profiles
    && typeof value.profiles === 'object'
    && !Array.isArray(value.profiles)
  );
}


function mergeItems(existing, incoming) {
  const notes = [existing.notes, incoming.notes]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(' · ')
    .slice(0, 500);

  return {
    tolerance: existing.tolerance ?? incoming.tolerance,
    rating: Math.max(existing.rating, incoming.rating),
    preparations: [...new Set([...existing.preparations, ...incoming.preparations])],
    notes
  };
}

function hasItemData(item) {
  return Boolean(
    item.tolerance
    || item.rating > 0
    || item.preparations.length > 0
    || item.notes
  );
}

function normalizeItem(input) {
  const tolerance = ['refuse', 'tolerate', 'enjoy'].includes(input?.tolerance)
    ? input.tolerance
    : null;
  const ratingNumber = Number(input?.rating);
  const rating = Number.isInteger(ratingNumber) && ratingNumber >= 0 && ratingNumber <= 5
    ? ratingNumber
    : 0;
  const preparations = Array.isArray(input?.preparations)
    ? [...new Set(input.preparations.filter(value => typeof value === 'string'))]
    : Object.entries(input?.prep ?? {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name);

  return {
    tolerance,
    rating,
    preparations,
    notes: typeof input?.notes === 'string' ? input.notes.slice(0, 500) : ''
  };
}

function sanitizeProfileName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 60) : '';
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
