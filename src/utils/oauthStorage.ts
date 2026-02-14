/**
 * OAuth token storage: SecureStore on native, not used on web (web uses session cookie).
 */
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';

const KEY_ACCESS = 'garage61_oauth_access_token';
const KEY_REFRESH = 'garage61_oauth_refresh_token';
const KEY_EXPIRES = 'garage61_oauth_expires_at';

function getSecureStore(): typeof SecureStore | null {
  if (Platform.OS === 'web') return null;
  return SecureStore;
}

export async function getStoredAccessToken(): Promise<string | null> {
  const store = getSecureStore();
  if (!store) return null;
  try {
    return await store.getItemAsync(KEY_ACCESS);
  } catch {
    return null;
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const store = getSecureStore();
  if (!store) return null;
  try {
    return await store.getItemAsync(KEY_REFRESH);
  } catch {
    return null;
  }
}

export async function getStoredExpiresAt(): Promise<number | null> {
  const store = getSecureStore();
  if (!store) return null;
  try {
    const s = await store.getItemAsync(KEY_EXPIRES);
    if (!s) return null;
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export async function setStoredTokens(params: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}): Promise<void> {
  const store = getSecureStore();
  if (!store) return;
  try {
    await store.setItemAsync(KEY_ACCESS, params.access_token);
    if (params.refresh_token) {
      await store.setItemAsync(KEY_REFRESH, params.refresh_token);
    }
    if (params.expires_in != null) {
      const expiresAt = Date.now() + params.expires_in * 1000;
      await store.setItemAsync(KEY_EXPIRES, String(expiresAt));
    }
  } catch (e) {
    console.warn('OAuth storage set failed:', e);
  }
}

export async function clearStoredTokens(): Promise<void> {
  const store = getSecureStore();
  if (!store) return;
  try {
    await store.deleteItemAsync(KEY_ACCESS);
    await store.deleteItemAsync(KEY_REFRESH);
    await store.deleteItemAsync(KEY_EXPIRES);
  } catch {}
}
