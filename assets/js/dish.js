export function matchDish(text, profile, flatItems) {
  const normalizedText = text.toLowerCase();
  const matches = [];

  for (const entry of flatItems) {
    const candidates = [entry.name, ...(entry.aliases ?? [])]
      .map(value => value.toLowerCase());

    if (!candidates.some(candidate => containsPhrase(normalizedText, candidate))) {
      continue;
    }

    const item = profile.items[entry.key] ?? null;
    matches.push({
      name: entry.name,
      category: entry.category,
      classification: classify(item),
      anomalyNote: entry.isAnomaly ? entry.note : null
    });
  }

  return matches;
}

function containsPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function classify(item) {
  if (!item?.tolerance) return 'unrated';
  if (item.tolerance === 'refuse') return 'refuse';
  if (item.tolerance === 'enjoy' && item.rating >= 4) return 'love';
  if (item.tolerance === 'enjoy' || item.rating >= 4) return 'like';
  return 'tolerate';
}
