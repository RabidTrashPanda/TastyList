import { resolvePreference } from './preference.js';

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
    const preparation = (entry.preparations ?? [])
      .find(value => containsPhrase(normalizedText, value.toLowerCase())) ?? null;
    const preference = resolvePreference(item, preparation);

    matches.push({
      name: preparation ? `${entry.name} (${preparation})` : entry.name,
      category: entry.category,
      classification: classify(preference, item?.rating ?? 0),
      anomalyNote: entry.isAnomaly ? entry.note : null
    });
  }

  return matches;
}

function containsPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function classify(preference, rating) {
  if (!preference) return 'unrated';
  if (preference === 'refuse') return 'refuse';
  if (preference === 'enjoy' && rating >= 4) return 'love';
  if (preference === 'enjoy' || rating >= 4) return 'like';
  return 'tolerate';
}
