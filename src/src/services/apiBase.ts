const normalizeApiBaseUrl = (value: string) => value.replace(/\/+$/, '');

const configuredApiBaseUrl = String(import.meta.env.VITE_API_URL || '').trim();
const localhostApiRegex = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/api)?\/?$/i;
const shouldUseRelativeApiInDev =
  import.meta.env.DEV && (!configuredApiBaseUrl || localhostApiRegex.test(configuredApiBaseUrl));
const fallbackApiBaseUrl = '/api';

export const API_BASE_URL = normalizeApiBaseUrl(
  shouldUseRelativeApiInDev ? fallbackApiBaseUrl : configuredApiBaseUrl || fallbackApiBaseUrl
);

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
