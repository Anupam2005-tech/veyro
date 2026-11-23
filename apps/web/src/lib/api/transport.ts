import type { ApiResponse } from '@veyro/contracts';
import { apiBaseUrl } from '../env';

export class ApiClientError extends Error {
  constructor(message: string, public code = 'API_ERROR') { super(message); this.name = 'ApiClientError'; }
}
export async function apiFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  if (!apiBaseUrl) throw new ApiClientError('The API URL is not configured. Set NEXT_PUBLIC_API_BASE_URL.', 'API_UNAVAILABLE');
  const { getClientAppCheckToken } = await import('../firebase/client');
  const appCheck = await getClientAppCheckToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  if (appCheck) headers.set('X-Firebase-AppCheck', appCheck);
  try {
    return await fetch(`${apiBaseUrl}${path}`, { ...init, headers, cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(30000) });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new ApiClientError('The request timed out. Please try again.', 'REQUEST_TIMEOUT');
    throw new ApiClientError('Could not reach the server. Check your connection and retry.', 'NETWORK_ERROR');
  }
}
export async function request<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await apiFetch(path, init, token);
  let payload: ApiResponse<T>;
  try { payload = await response.json(); }
  catch { throw new ApiClientError('The server returned an unreadable response.', 'INVALID_RESPONSE'); }
  if (!response.ok || !payload.success) {
    throw new ApiClientError(payload.message || 'The request failed.', 'error' in payload ? payload.error?.code : 'API_ERROR');
  }
  return payload.data;
}
