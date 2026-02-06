import axios, {AxiosRequestConfig} from 'axios';
import * as admin from 'firebase-admin';
import {defineSecret} from 'firebase-functions/params';
import {onRequest} from 'firebase-functions/v2/https';
import {
  handleAuthCallback,
  handleAuthLogin,
  handleAuthLogout,
  handleAuthRefresh,
  resolveAccessToken,
} from './authHandlers';
import {SESSION_COOKIE_NAME} from './oauth';

if (!admin.apps.length) {
  admin.initializeApp();
}

const garage61ApiToken = defineSecret('GARAGE61_API_TOKEN');
const garage61OauthClientId = defineSecret('GARAGE61_OAUTH_CLIENT_ID');
const garage61OauthClientSecret = defineSecret('GARAGE61_OAUTH_CLIENT_SECRET');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReqLike = any;

interface Response {
  set(header: string, value: string): void;
  status(code: number): Response;
  json(data: any): void;
  send(data: any): void;
  end(): void;
}

const AUTH_PREFIX = '/api/garage61/auth/';

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

async function getJsonBody(req: ReqLike): Promise<Record<string, any>> {
  if (req?.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (req?.rawBody) {
    try {
      return JSON.parse(req.rawBody.toString());
    } catch {
      return {};
    }
  }
  return {};
}

export const garage61Proxy = onRequest(
  {
    secrets: [
      garage61ApiToken,
      garage61OauthClientId,
      garage61OauthClientSecret,
    ],
  },
  async (req: ReqLike, res: Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const path = req.path;
    const isAuthRoute =
      path === `${AUTH_PREFIX}login` ||
      path === `${AUTH_PREFIX}callback` ||
      path === `${AUTH_PREFIX}refresh` ||
      path === `${AUTH_PREFIX}logout`;

    if (isAuthRoute) {
      try {
        const clientId = garage61OauthClientId.value();
        const clientSecret = garage61OauthClientSecret.value();
        if (!clientId || !clientSecret) {
          res.status(500).json({
            error: 'OAuth not configured',
            message:
              'GARAGE61_OAUTH_CLIENT_ID and GARAGE61_OAUTH_CLIENT_SECRET must be set',
          });
          return;
        }
        const cookies = parseCookies(req.headers.cookie);

        if (path === `${AUTH_PREFIX}login` && req.method === 'GET') {
          const redirectUri =
            (Array.isArray(req.query.redirect_uri)
              ? req.query.redirect_uri[0]
              : req.query.redirect_uri) || '';
          const result = await handleAuthLogin(redirectUri, clientId);
          res.status(200).json(result);
          return;
        }

        if (path === `${AUTH_PREFIX}callback` && req.method === 'POST') {
          const body = await getJsonBody(req);
          const result = await handleAuthCallback(
            body,
            clientId,
            clientSecret,
            cookies,
          );
          if (result.setCookie) {
            res.set('Set-Cookie', result.setCookie);
          }
          if (result.redirect) {
            res.status(200).json({success: true, redirect: result.redirect});
          } else if (result.access_token) {
            res.status(200).json({
              access_token: result.access_token,
              refresh_token: result.refresh_token,
              expires_in: result.expires_in,
            });
          } else {
            res.status(200).json({success: true});
          }
          return;
        }

        if (path === `${AUTH_PREFIX}refresh` && req.method === 'POST') {
          const body = await getJsonBody(req);
          const result = await handleAuthRefresh(
            body,
            clientId,
            clientSecret,
            cookies,
          );
          if (result === null) {
            res.status(204).end();
          } else {
            res.status(200).json(result);
          }
          return;
        }

        if (path === `${AUTH_PREFIX}logout` && req.method === 'POST') {
          await handleAuthLogout(cookies);
          res.set(
            'Set-Cookie',
            `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
          );
          res.status(204).end();
          return;
        }
      } catch (err: any) {
        if (err?.status) {
          res.status(err.status).json(err.body || {error: err.message});
        } else {
          console.error('Auth error:', err);
          res.status(500).json({error: 'Auth failed', message: err?.message});
        }
        return;
      }
    }

    // Proxy: resolve token then forward to Garage 61 API
    const apiPath = path.replace(/^\/api\/garage61/, '');
    const targetUrl = `https://garage61.net/api/v1${apiPath}`;

    const fallbackToken = garage61ApiToken.value() || null;
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    try {
      clientId = garage61OauthClientId.value() || undefined;
      clientSecret = garage61OauthClientSecret.value() || undefined;
    } catch {
      clientId = undefined;
      clientSecret = undefined;
    }
    const token = await resolveAccessToken(
      req.headers.authorization,
      req.headers.cookie,
      fallbackToken,
      clientId,
      clientSecret,
    );

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid token (Bearer, session, or server token)',
      });
      return;
    }

    const axiosConfig: AxiosRequestConfig = {
      method: req.method as any,
      url: targetUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...Object.fromEntries(
          Object.entries(req.headers).filter(
            ([key]) =>
              ![
                'host',
                'connection',
                'keep-alive',
                'proxy-authenticate',
                'proxy-authorization',
                'te',
                'trailers',
                'transfer-encoding',
                'upgrade',
                'authorization',
                'cookie',
              ].includes(key.toLowerCase()),
          ),
        ),
      },
      params: req.query,
      timeout: 30000,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.rawBody && req.rawBody.length) {
        axiosConfig.data = req.rawBody;
      } else if (
        req.body &&
        typeof req.body === 'object' &&
        !Buffer.isBuffer(req.body)
      ) {
        axiosConfig.data = req.body;
      }
    }

    try {
      const response = await axios(axiosConfig);
      const contentType = response.headers['content-type'] || '';
      if (
        contentType.includes('text/csv') ||
        contentType.includes('application/csv')
      ) {
        res.set('Content-Type', contentType);
        res.status(response.status).send(response.data);
      } else {
        res.status(response.status).json(response.data);
      }
    } catch (error: any) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'No response from Garage 61 API',
        });
      } else {
        res
          .status(500)
          .json({error: 'Internal Server Error', message: error.message});
      }
    }
  },
);
