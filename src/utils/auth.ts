/**
 * Garage 61 OAuth helpers for web and mobile.
 * Uses the same API base as the proxy (/api/garage61 or full URL when needed).
 */
import {Platform} from 'react-native';

const PRODUCTION_ORIGIN = 'https://botracing-61.web.app';
const API_BASE_FALLBACK = 'https://botracing-61.web.app/api/garage61';

function getApiBase(): string {
  // Local dev: use same env as api.ts so auth and API hit the emulator
  const envBase =
    typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_GARAGE61_API_BASE;
  if (envBase) return envBase;
  if (
    typeof window !== 'undefined' &&
    window.location?.origin === PRODUCTION_ORIGIN
  ) {
    return `${window.location.origin}/api/garage61`;
  }
  return API_BASE_FALLBACK;
}

export function getAuthCallbackRedirectUri(): string {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location?.origin
  ) {
    return `${window.location.origin}/auth/callback`;
  }
  return 'botracing61://auth/callback';
}

export async function fetchAuthLoginUrl(): Promise<{url: string}> {
  const redirectUri = getAuthCallbackRedirectUri();
  const base = getApiBase();
  const url = `${base}/auth/login?redirect_uri=${encodeURIComponent(
    redirectUri,
  )}`;
  let res: Response;
  try {
    res = await fetch(url, {credentials: 'include'});
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message === 'Failed to fetch'
        ? `Cannot reach the API at ${base}. Deploy backend: firebase deploy --only functions (and once: firebase deploy --only hosting so /api/garage61 rewrites work). Check you're online and no extension is blocking the request.`
        : e instanceof Error
        ? e.message
        : String(e);
    throw new Error(msg);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.message || err?.error || `Login URL failed: ${res.status}`,
    );
  }
  return res.json();
}

/** Check if the current request has an OAuth session (web: cookie; used to show Sign in vs Sign out). */
export async function fetchAuthStatus(): Promise<{hasSession: boolean}> {
  const res = await fetch(`${getApiBase()}/auth/status`, {
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({hasSession: false}));
  return {hasSession: !!data?.hasSession};
}

export async function exchangeCodeForSession(params: {
  code: string;
  redirect_uri: string;
  state: string;
  code_verifier?: string;
}): Promise<{success: boolean; redirect?: string}> {
  const res = await fetch(`${getApiBase()}/auth/callback`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Callback failed: ${res.status}`,
    );
  }
  return {success: true, redirect: data.redirect ?? '/'};
}

/** Exchange code for tokens (mobile only). Returns tokens to store locally. */
export async function exchangeCodeForTokens(params: {
  code: string;
  redirect_uri: string;
  state: string;
  code_verifier?: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const res = await fetch(`${getApiBase()}/auth/callback`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Callback failed: ${res.status}`,
    );
  }
  if (!data.access_token) {
    throw new Error('No access_token in response');
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

export async function refreshAuthTokens(params: {
  refresh_token: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const res = await fetch(`${getApiBase()}/auth/refresh`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params),
  });
  if (res.status === 204) {
    throw new Error('Refresh returned 204 (web session)');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Refresh failed: ${res.status}`,
    );
  }
  if (!data.access_token) {
    throw new Error('No access_token in refresh response');
  }
  return data;
}

export async function logoutAuth(): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data?.message || data?.error || `Logout failed: ${res.status}`,
    );
  }
}
