function normalizeApiBase(base: string) {
  const trimmed = base.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

const DEFAULT_REMOTE_API_BASE = 'https://money-app-api-fi9k.onrender.com';

function resolveApiBase() {
  const stored = (uni.getStorageSync('apiBase') as string | undefined)?.trim();
  if (stored) return normalizeApiBase(stored);

  const envBase = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE || '').trim();
  if (envBase) return normalizeApiBase(envBase);

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalhost =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    if (isLocalhost) {
      return normalizeApiBase(`${window.location.protocol}//${window.location.hostname}:3000`);
    }

    return normalizeApiBase(DEFAULT_REMOTE_API_BASE);
  }

  return normalizeApiBase(DEFAULT_REMOTE_API_BASE);
}

const API_BASE = resolveApiBase();

export function getApiBase() {
  return API_BASE;
}

export function getAuthToken() {
  return (uni.getStorageSync('token') as string | undefined) || '';
}

export async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  data?: Record<string, unknown>
): Promise<T> {
  const token = getAuthToken();
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
          return;
        }
        reject(new Error(`Request failed: ${res.statusCode}`));
      },
      fail: (err) => reject(err)
    });
  });
}
