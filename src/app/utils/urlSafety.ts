const DISALLOWED_URL_PREFIXES = ['javascript:', 'data:', 'vbscript:', 'file:'];

export function sanitizeImageUrl(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  const lowered = trimmed.toLowerCase();
  if (DISALLOWED_URL_PREFIXES.some((prefix) => lowered.startsWith(prefix))) {
    return fallback;
  }

  // Relative URLs are allowed for local static assets.
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}
