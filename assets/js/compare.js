export function compareProfiles(profiles, flatItems) {
  const rows = [];

  for (const entry of flatItems) {
    const values = profiles.map(profile => profile.items[entry.key] ?? null);
    if (values.every(value => !value?.tolerance)) {
      continue;
    }

    const scores = values.map(scoreItem);
    rows.push({
      key: entry.key,
      name: entry.name,
      category: entry.category,
      values,
      classification: classify(scores)
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
  if (!item?.tolerance) {
    return 'Not rated';
  }

  if (item.tolerance === 'refuse') {
    return 'Refuse';
  }

  const stars = item.rating > 0 ? ` · ${'★'.repeat(item.rating)}` : '';
  return `${capitalize(item.tolerance)}${stars}`;
}

function scoreItem(item) {
  if (!item?.tolerance) {
    return null;
  }

  if (item.tolerance === 'refuse') {
    return -1;
  }

  if (item.tolerance === 'tolerate') {
    return item.rating >= 4 ? 1 : 0;
  }

  if (item.rating >= 4) {
    return 2;
  }

  return item.rating <= 2 ? 0 : 1;
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

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
