export const preferenceCycle = [null, 'enjoy', 'tolerate', 'refuse'];

export function nextPreference(value) {
  const index = preferenceCycle.indexOf(value ?? null);
  return preferenceCycle[(index + 1) % preferenceCycle.length];
}

export function resolvePreference(item, preparation = null) {
  if (!item) {
    return null;
  }

  if (preparation && item.preparationPreferences?.[preparation]) {
    return item.preparationPreferences[preparation];
  }

  return item.tolerance ?? null;
}

export function preferenceLabel(value) {
  if (value === 'enjoy') return 'Enjoy';
  if (value === 'tolerate') return 'Tolerate';
  if (value === 'refuse') return 'Refuse';
  return 'Unset';
}
