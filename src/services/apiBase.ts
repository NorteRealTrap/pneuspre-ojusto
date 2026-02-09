const normalizeApiBaseUrl = (value: string) => value.replace(/\/+$/, '');

const configuredApiBaseUrl = String(import.meta.env.VITE_API_URL || '').trim();
const fallbackApiBaseUrl = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl || fallbackApiBaseUrl);

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
