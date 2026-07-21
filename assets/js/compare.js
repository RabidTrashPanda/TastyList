import { preferenceLabel, resolvePreference } from './preference.js';

export function compareProfiles(profiles, flatItems) {
  const rows = [];

  for (const entry of flatItems) {
    const values = profiles.map(profile => profile.items[entry.key] ?? null);
    if (values.every(value => !hasPreferenceData(value))) {
      continue;
    }

    rows.push({
      key: entry.key,
      name: entry.name,
      category: entry.category,
      values,
      classification: classifyItemAcrossPreparations(values)
    });
  }

  const order = { conflict: 0, sharedLike: 1, sharedDislike: 2, mixed: 3 };
  return rows.sort((left, right) =>
    order[left.classification] - order[right.classification]
    || left.category.localeCompare(right.category)
    || left.name.localeCompare(right.name)
  );
}

export function describeItem(item) {
  if (!hasPreferenceData(item)) {
    return 'Not rated';
  }

  const parts = [];
  if (item.tolerance) {
    const stars = item.tolerance !== 'refuse' && item.rating > 0
      ? ` ${'★'.repeat(item.rating)}`
      : '';
    parts.push(`Overall: ${preferenceLabel(item.tolerance)}${stars}`);
  }

  const overrides = Object.entries(item.preparationPreferences ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}: ${preferenceLabel(value)}`);

  parts.push(...overrides);
  return parts.join(' · ');
}

function classifyItemAcrossPreparations(values) {
  const contexts = new Set(['overall']);
  for (const item of values) {
    for (const preparation of Object.keys(item?.preparationPreferences ?? {})) {
      contexts.add(preparation);
    }
  }

  const classifications = [...contexts].map(context => {
    const scores = values.map(item => scorePreference(
      context === 'overall' ? item?.tolerance ?? null : resolvePreference(item, context),
      context === 'overall' ? item?.rating ?? 0 : 0
    ));
    return classify(scores);
  });

  if (classifications.includes('conflict')) return 'conflict';
  if (classifications.includes('sharedLike')) return 'sharedLike';
  if (classifications.every(value => value === 'sharedDislike')) return 'sharedDislike';
  return 'mixed';
}

function hasPreferenceData(item) {
  return Boolean(
    item?.tolerance
    || Object.keys(item?.preparationPreferences ?? {}).length > 0
  );
}

function scorePreference(preference, rating) {
  if (!preference) {
    return null;
  }

  if (preference === 'refuse') {
    return -1;
  }

  if (preference === 'tolerate') {
    return rating >= 4 ? 1 : 0;
  }

  if (rating >= 4) {
    return 2;
  }

  return rating <= 2 && rating > 0 ? 0 : 1;
}

function classify(scores) {
  const rated = scores.filter(score => score !== null);
  if (rated.length === 0) {
    return 'mixed';
  }

  const hasRefusal = rated.includes(-1);
  const hasLike = rated.some(score => score >= 1);
  if (hasRefusal && hasLike) {
    return 'conflict';
  }

  if (rated.length === scores.length && rated.every(score => score >= 1)) {
    return 'sharedLike';
  }

  if (rated.length === scores.length && rated.every(score => score <= 0)) {
    return 'sharedDislike';
  }

  return 'mixed';
}
