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
import {decryptToken, encryptToken} from './sessionEncryption';

const COLLECTION_STATE = 'oauth_state';
const COLLECTION_SESSIONS = 'oauth_sessions';

/** Read access/refresh from session doc (encrypted only; no plaintext fallback). */
function getSessionTokens(
  data: Record<string, unknown>,
  encryptionKey: string,
): {accessToken: string; refreshToken: string | null} {
  if (typeof data.accessTokenEnc !== 'string') {
    return {accessToken: '', refreshToken: null};
  }
  const accessToken = decryptToken(data.accessTokenEnc, encryptionKey);
  const refreshToken =
    typeof data.refreshTokenEnc === 'string'
      ? decryptToken(data.refreshTokenEnc, encryptionKey)
      : null;
  return {accessToken, refreshToken};
}

/**
 * Build session token fields for write. Encryption is required.
 * For initial .set() do not use delete(); for .update() use delete() to remove any plaintext fields.
 */
function buildSessionTokenFields(
  accessToken: string,
  refreshToken: string | null,
  encryptionKey: string,
  options?: {forUpdate?: boolean},
): Record<string, string | null | admin.firestore.FieldValue> {
  const fields: Record<string, string | null | admin.firestore.FieldValue> = {
    accessTokenEnc: encryptToken(accessToken, encryptionKey),
    refreshTokenEnc: refreshToken
      ? encryptToken(refreshToken, encryptionKey)
      : null,
  };
  if (options?.forUpdate) {
    fields.accessToken = admin.firestore.FieldValue.delete();
    fields.refreshToken = admin.firestore.FieldValue.delete();
  }
  return fields;
}

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
    scope: 'driving_data', // per https://garage61.net/developer/permissions
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
  encryptionKey: string,
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

  let tokenRes;
  try {
    tokenRes = await axios.post<TokenResponse>(
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
        validateStatus: () => true, // so we can inspect any status
      },
    );
  } catch (err: any) {
    const status = err?.response?.status;
    const url = err?.config?.url || GARAGE61_OAUTH_TOKEN_URL;
    console.error(
      'Token exchange failed:',
      url,
      status,
      err?.response?.data || err?.message,
    );
    throw {
      status: 502,
      body: {
        error: 'Token exchange failed',
        message:
          status === 405
            ? `Garage 61 token URL returned 405 Method Not Allowed. Check their docs for the correct token URL (current: ${GARAGE61_OAUTH_TOKEN_URL}).`
            : err?.message || String(err),
      },
    };
  }

  if (tokenRes.status !== 200) {
    console.error('Token exchange non-200:', tokenRes.status, tokenRes.data);
    const is405 = tokenRes.status === 405;
    throw {
      status: 502,
      body: {
        error: 'Token exchange failed',
        message: is405
          ? `Garage 61 token URL returned 405 Method Not Allowed. Use the exact token URL from their docs (current: ${GARAGE61_OAUTH_TOKEN_URL}).`
          : `Garage 61 token URL returned ${tokenRes.status}. Check token URL and request format.`,
        detail: tokenRes.data,
      },
    };
  }

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
  const tokenFields = buildSessionTokenFields(
    data.access_token,
    data.refresh_token || null,
    encryptionKey,
  );
  await getFirestore()
    .collection(COLLECTION_SESSIONS)
    .doc(sessionId)
    .set({
      ...tokenFields,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  const maxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;
  const setCookieValue = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
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
  encryptionKey: string,
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
      const data = sessionSnap.data()!;
      const tokens = getSessionTokens(data, encryptionKey);
      refreshToken = tokens.refreshToken;
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
    const tokenFields = buildSessionTokenFields(
      data.access_token,
      data.refresh_token ?? null,
      encryptionKey,
      {forUpdate: true},
    );
    await getFirestore()
      .collection(COLLECTION_SESSIONS)
      .doc(sessionId)
      .update({
        ...tokenFields,
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
  if (!cookieHeader) {
    return null;
  }
  const cookies = parseCookies(cookieHeader);
  const value = cookies[SESSION_COOKIE_NAME] ?? null;
  if (!value && Object.keys(cookies).length > 0) {
    console.log('[auth] Cookie header present but no session cookie', {
      sessionCookieName: SESSION_COOKIE_NAME,
      cookieKeys: Object.keys(cookies),
    });
  }
  return value;
}

/** Check if the request has a valid OAuth session (for UI: show Sign in vs Sign out). */
export async function getAuthStatus(
  cookieHeader: string | undefined,
): Promise<{hasSession: boolean}> {
  const sessionId = getSessionCookieFromRequest(cookieHeader);
  if (!sessionId) return {hasSession: false};
  const snap = await getFirestore()
    .collection(COLLECTION_SESSIONS)
    .doc(sessionId)
    .get();
  return {hasSession: snap.exists};
}

/** Get Garage 61 access token: Bearer header, or session from cookie (with optional refresh), or fallback */
export async function resolveAccessToken(
  authHeader: string | undefined,
  cookieHeader: string | undefined,
  fallbackToken: string | null,
  clientId?: string,
  clientSecret?: string,
  encryptionKey?: string,
): Promise<string | null> {
  if (authHeader?.startsWith('Bearer ')) {
    console.log('[auth] resolveAccessToken: using Bearer header');
    return authHeader.slice(7).trim();
  }
  const sessionId = getSessionCookieFromRequest(cookieHeader);
  if (!sessionId) {
    console.log('[auth] resolveAccessToken: no session cookie', {
      cookieHeaderPresent: !!cookieHeader,
    });
    return fallbackToken;
  }

  const sessionRef = getFirestore()
    .collection(COLLECTION_SESSIONS)
    .doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    console.warn(
      '[auth] resolveAccessToken: session doc not found in Firestore',
      {
        sessionIdPrefix: sessionId.slice(0, 8) + '…',
        collection: COLLECTION_SESSIONS,
      },
    );
    return fallbackToken;
  }

  const session = sessionSnap.data()!;
  if (!encryptionKey) {
    console.warn(
      '[auth] resolveAccessToken: SESSION_ENCRYPTION_KEY not set; cannot read session',
    );
    return fallbackToken;
  }
  const {accessToken: rawAccess, refreshToken: rawRefresh} = getSessionTokens(
    session,
    encryptionKey,
  );
  let accessToken = rawAccess;
  const expiresAt = (session.expiresAt as number) ?? 0;
  const now = Date.now();
  const canRefresh =
    clientId && clientSecret && rawRefresh && expiresAt <= now + 60 * 1000;
  if (canRefresh) {
    try {
      const tokenRes = await axios.post<TokenResponse>(
        GARAGE61_OAUTH_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: rawRefresh,
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
        const tokenFields = buildSessionTokenFields(
          data.access_token,
          data.refresh_token ?? rawRefresh,
          encryptionKey,
          {forUpdate: true},
        );
        await sessionRef.update({
          ...tokenFields,
          expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
        });
        console.log('[auth] resolveAccessToken: token refreshed from session');
      }
    } catch (err) {
      console.warn(
        '[auth] resolveAccessToken: refresh failed',
        (err as Error)?.message,
      );
      return fallbackToken;
    }
  }
  console.log('[auth] resolveAccessToken: using session token', {
    sessionIdPrefix: sessionId.slice(0, 8) + '…',
  });
  return accessToken;
}
