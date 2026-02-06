/**
 * Garage 61 OAuth helpers and config.
 * Update GARAGE61_OAUTH_* URLs when Garage 61 provides official endpoints.
 */
import * as crypto from 'crypto';

export const GARAGE61_OAUTH_AUTH_URL =
  process.env.GARAGE61_OAUTH_AUTH_URL || 'https://garage61.net/oauth/authorize';
export const GARAGE61_OAUTH_TOKEN_URL =
  process.env.GARAGE61_OAUTH_TOKEN_URL || 'https://garage61.net/oauth/token';

/** Allowed redirect URIs (must match what is registered in Garage 61 app) */
export const ALLOWED_REDIRECT_URIS = [
  'https://botracing-61.web.app/auth/callback',
  'http://localhost:8080/auth/callback',
  'http://localhost:19006/auth/callback', // Expo web
  'botracing61://auth/callback',
];

export const SESSION_COOKIE_NAME = 'g61_session';
export const SESSION_MAX_AGE_DAYS = 30;

export function generateState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function generatePkce(): {codeVerifier: string; codeChallenge: string} {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return {codeVerifier, codeChallenge};
}

export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}): string {
  const search = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  });
  if (params.scope) search.set('scope', params.scope);
  return `${GARAGE61_OAUTH_AUTH_URL}?${search.toString()}`;
}

export function isAllowedRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}

export function isMobileRedirectUri(uri: string): boolean {
  return uri.startsWith('botracing61://');
}
