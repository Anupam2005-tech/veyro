import type { ApiResponse } from '@veyro/contracts';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

const TOKEN_KEY = 'veyro.session';

/**
 * Per-tab session: sessionStorage keeps each tab's account separate (so one
 * tab can be the customer and another the driver during a demo); localStorage
 * seeds new tabs with the most recent sign-in.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = localStorage.getItem(TOKEN_KEY);
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: { field?: string; message: string }[] = [],
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Cannot reach the Veyro API. Is it running on port 4000?', 0, 'NETWORK_ERROR');
  }
  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status >= 500 ? 'The Veyro API is unavailable. Start it with `pnpm dev:api`.' : 'Unexpected response.', res.status, 'BAD_RESPONSE');
  }
  if (!json.success) {
    if (res.status === 401 && token) {
      setToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('veyro:signed-out'));
    }
    throw new ApiError(json.message, res.status, json.error.code, json.error.details ?? []);
  }
  return json.data;
}

/** Message envelope variant: returns both data and the server message. */
export async function apiWithMessage<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ data: T; message: string }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  }).catch(() => {
    throw new ApiError('Cannot reach the Veyro API.', 0, 'NETWORK_ERROR');
  });
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) throw new ApiError('Unexpected response.', res.status, 'BAD_RESPONSE');
  if (!json.success) throw new ApiError(json.message, res.status, json.error.code, json.error.details ?? []);
  return { data: json.data, message: json.message };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const field = err.details.find((d) => d.message && d.message !== 'Invalid value');
    return field && err.code === 'VALIDATION_ERROR' ? field.message : err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
