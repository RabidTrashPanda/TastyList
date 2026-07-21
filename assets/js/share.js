export function encodeShareCode(profile) {
  const payload = JSON.stringify({
    format: 'tastylist-share',
    version: 1,
    profile: {
      name: profile.name,
      items: profile.items
    }
  });

  return toBase64Url(new TextEncoder().encode(payload));
}

export function decodeShareCode(code) {
  const bytes = fromBase64Url(code.trim());
  const payload = JSON.parse(new TextDecoder().decode(bytes));

  if (payload?.format !== 'tastylist-share' || payload?.version !== 1 || !payload.profile) {
    throw new Error('This is not a supported TastyList share code.');
  }

  return payload.profile;
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
