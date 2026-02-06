import axios from 'axios';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import {
  buildAuthUrl,
  GARAGE61_OAUTH_TOKEN_URL,
  generatePkce,
  generateState,
  isAllowedRedirectUri,
  isMobileRedirectUri,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_DAYS,
} from './oauth';

const COLLECTION_STATE = 'oauth_state';
const COLLECTION_SESSIONS = 'oauth_sessions';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getFirestore() {
  return admin.firestore();
}

function parseCookies(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...v] = part.trim().split('=');
    if (key && v.length) acc[key] = decodeURIComponent(v.join('=').trim());
    return acc;
  }, {} as Record<string, string>);
}

export async function handleAuthLogin(
  redirectUri: string,
  clientId: string,
): Promise<{url: string}> {
  if (!isAllowedRedirectUri(redirectUri)) {
    throw {status: 400, body: {error: 'Invalid redirect_uri'}};
  }
  const state = generateState();
  const {codeVerifier, codeChallenge} = generatePkce();
  await getFirestore().collection(COLLECTION_STATE).doc(state).set({
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const url = buildAuthUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
    scope: 'read', // Adjust when Garage 61 documents scopes
  });
  return {url};
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export async function handleAuthCallback(
  body: {
    code?: string;
    redirect_uri?: string;
    state?: string;
    code_verifier?: string;
  },
  clientId: string,
  clientSecret: string,
  cookies: Record<string, string>,
): Promise<{
  success?: boolean;
  redirect?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  setCookie?: string;
}> {
  const {code, redirect_uri, state, code_verifier} = body;
  if (!code || !redirect_uri || !state) {
    throw {status: 400, body: {error: 'Missing code, redirect_uri, or state'}};
  }
  if (!isAllowedRedirectUri(redirect_uri)) {
    throw {status: 400, body: {error: 'Invalid redirect_uri'}};
  }

  const stateRef = getFirestore().collection(COLLECTION_STATE).doc(state);
  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) {
    throw {status: 400, body: {error: 'Invalid or expired state'}};
  }
  const stateData = stateSnap.data()!;
  const codeVerifier = code_verifier ?? stateData.code_verifier;
  if (!codeVerifier) {
    throw {status: 400, body: {error: 'Missing code_verifier (PKCE required)'}};
  }
  await stateRef.delete();

  const tokenRes = await axios.post<TokenResponse>(
    GARAGE61_OAUTH_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    }),
    {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      timeout: 15000,
    },
  );
  const data = tokenRes.data;
  if (!data.access_token) {
    throw {status: 502, body: {error: 'No access_token in Garage 61 response'}};
  }

  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = Date.now() + expiresIn * 1000;

  if (isMobileRedirectUri(redirect_uri)) {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  }

  const sessionId = crypto.randomBytes(24).toString('hex');
  await getFirestore()
    .collection(COLLECTION_SESSIONS)
    .doc(sessionId)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  const maxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;
  const setCookieValue = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  return {
    success: true,
    redirect: '/',
    setCookie: setCookieValue,
  };
}

export async function handleAuthRefresh(
  body: {refresh_token?: string},
  clientId: string,
  clientSecret: string,
  cookies: Record<string, string>,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
} | null> {
  let refreshToken: string | null = body.refresh_token ?? null;
  let sessionId: string | null = null;

  if (!refreshToken && cookies[SESSION_COOKIE_NAME]) {
    sessionId = cookies[SESSION_COOKIE_NAME];
    const sessionSnap = await getFirestore()
      .collection(COLLECTION_SESSIONS)
      .doc(sessionId)
      .get();
    if (sessionSnap.exists) {
      refreshToken = sessionSnap.data()?.refreshToken ?? null;
    }
  }

  if (!refreshToken) {
    throw {status: 400, body: {error: 'Missing refresh_token or session'}};
  }

  const tokenRes = await axios.post<TokenResponse>(
    GARAGE61_OAUTH_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      timeout: 15000,
    },
  );
  const data = tokenRes.data;
  if (!data.access_token) {
    throw {status: 502, body: {error: 'No access_token in refresh response'}};
  }

  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = Date.now() + expiresIn * 1000;

  if (sessionId) {
    await getFirestore()
      .collection(COLLECTION_SESSIONS)
      .doc(sessionId)
      .update({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      });
    return null; // Web: no body needed, session updated
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

export async function handleAuthLogout(
  cookies: Record<string, string>,
): Promise<void> {
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (sessionId) {
    await getFirestore()
      .collection(COLLECTION_SESSIONS)
      .doc(sessionId)
      .delete();
  }
}

export function getSessionCookieFromRequest(
  cookieHeader: string | undefined,
): string | null {
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

/** Get Garage 61 access token: Bearer header, or session from cookie (with optional refresh), or fallback */
export async function resolveAccessToken(
  authHeader: string | undefined,
  cookieHeader: string | undefined,
  fallbackToken: string | null,
  clientId?: string,
  clientSecret?: string,
): Promise<string | null> {
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const sessionId = getSessionCookieFromRequest(cookieHeader);
  if (!sessionId) return fallbackToken;

  const sessionRef = getFirestore()
    .collection(COLLECTION_SESSIONS)
    .doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return fallbackToken;

  const session = sessionSnap.data()!;
  let accessToken = session.accessToken as string;
  const expiresAt = session.expiresAt as number;
  const now = Date.now();
  const canRefresh =
    clientId &&
    clientSecret &&
    session.refreshToken &&
    expiresAt <= now + 60 * 1000;
  if (canRefresh) {
    try {
      const tokenRes = await axios.post<TokenResponse>(
        GARAGE61_OAUTH_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          timeout: 15000,
        },
      );
      const data = tokenRes.data;
      if (data.access_token) {
        accessToken = data.access_token;
        await sessionRef.update({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? session.refreshToken,
          expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
        });
      }
    } catch {
      return fallbackToken;
    }
  }
  return accessToken;
}
