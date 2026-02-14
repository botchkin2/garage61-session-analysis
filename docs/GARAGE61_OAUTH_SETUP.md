# Garage 61 OAuth Setup (Web + Mobile)

This doc covers how to support **OAuth with Garage 61** so each user signs in with their own account, on both **web** and **mobile**, and what backend/APIs you need.

Reference: [Garage 61 – Developer Authentication](https://garage61.net/developer/authentication) (OAuth app form; you’ll need to register redirect URLs there.)

---

## Configuration (after you have Client ID & Secret)

### 1. Set Firebase secrets

The backend reads **Client ID** and **Client Secret** from Firebase Secret Manager. Set them with the Firebase CLI (run from your project root):

```bash
# OAuth app credentials from Garage 61
firebase functions:secrets:set GARAGE61_OAUTH_CLIENT_ID
# When prompted, paste your Client ID and press Enter.

firebase functions:secrets:set GARAGE61_OAUTH_CLIENT_SECRET
# When prompted, paste your Client Secret and press Enter.
```

You can also set values non-interactively:

```bash
echo -n "your-client-id" | firebase functions:secrets:set GARAGE61_OAUTH_CLIENT_ID
echo -n "your-client-secret" | firebase functions:secrets:set GARAGE61_OAUTH_CLIENT_SECRET
```

**Note:** The proxy does **not** use a fallback shared token. Access requires OAuth (session cookie on web or Bearer token on mobile). You do **not** need to set `GARAGE61_API_TOKEN`.

After changing secrets, **redeploy** the functions so they pick up the new values:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**If "Sign in with Garage 61" gives "Failed to fetch" from localhost:** Ensure Hosting has been deployed at least once so the `/api/garage61/**` rewrite is active: `firebase deploy --only hosting` (or `firebase deploy`). The rewrite in `firebase.json` sends those requests to the function; without it, the request never reaches the backend.

**If you get 404 on `https://YOUR_SITE.web.app/api/garage61/auth/login`:**

1. Deploy **both** Hosting and Functions so the rewrite and function are in sync:

   ```bash
   cd functions && npm run build && cd ..
   firebase deploy
   ```

   (Do not deploy only functions; the Hosting config with the rewrite must be deployed too.)

2. Check that the rewrite is active: open **https://YOUR_SITE.web.app/api/garage61** in a browser. You should see `{"ok":true,"path":"/api/garage61","message":"garage61Proxy reached"}`. If you get 404 there too, the Hosting rewrite is not taking effect—confirm in [Firebase Console](https://console.firebase.google.com) → Hosting → your site that the release includes the `/api/garage61/**` → `garage61Proxy` rewrite.

3. If your function is in a region other than `us-central1`, edit `firebase.json` and set `"region"` in the `function` block to that region (e.g. `europe-west1`).

### 2. Register redirect URLs in Garage 61

In the [Garage 61 developer authentication form](https://garage61.net/developer/authentication), add these **OAuth2 redirect URLs** (exactly as shown):

| Use case           | Redirect URL                                 |
| ------------------ | -------------------------------------------- |
| Web (production)   | `https://botracing-61.web.app/auth/callback` |
| Web (Expo / local) | `http://localhost:8080/auth/callback`        |
| Mobile (Expo app)  | `botracing61://auth/callback`                |

If your production URL is different, use that origin instead of `https://botracing-61.web.app` for the web production entry.

### 3. Custom OAuth URLs (if Garage 61 gave different ones)

The code uses these defaults:

- **Authorization:** `https://garage61.net/app/account/oauth`
- **Token:** `https://garage61.net/api/oauth/token`
- **User Info (optional, OIDC):** `https://garage61.net/api/oauth/userinfo`

If Garage 61 provided different URLs, either:

- **Option A:** Edit `functions/src/oauth.ts` and replace the default strings for `GARAGE61_OAUTH_AUTH_URL` and `GARAGE61_OAUTH_TOKEN_URL`, or
- **Option B:** Set environment variables when deploying (if your setup supports it), e.g. `GARAGE61_OAUTH_AUTH_URL` and `GARAGE61_OAUTH_TOKEN_URL`. The code already reads these from `process.env` if set.

### 4. Scopes

The login URL is built with scope `driving_data` per [Garage 61 permissions](https://garage61.net/developer/permissions). To use a different scope, change the `scope` argument in `functions/src/authHandlers.ts` where `buildAuthUrl` is called.

### 5. Session cookie and Firebase Hosting

When requests go through Firebase Hosting rewrites to Cloud Functions, **only the cookie named `__session` is forwarded**. All other cookies are stripped (for CDN cache behavior). The backend therefore uses `__session` as the web session cookie name (`functions/src/oauth.ts`). Responses that depend on the session set `Cache-Control: private` as required by [Firebase Hosting](https://firebase.google.com/docs/hosting/manage-cache#session_cookie). Do not rename this cookie unless you stop using Hosting rewrites for the API.

---

## Expected workflow (why deploy first)

**Yes — you need to deploy the Firebase app (at least the functions) for OAuth to work** when using the default setup.

**Reasoning:**

1. **Where the OAuth logic runs**
   Login URL, code exchange, refresh, and session handling all run in **Firebase Functions** (`/api/garage61/auth/*`). The client never sees the client secret; it only calls your backend.

2. **Where the client points**
   By default the app uses `https://botracing-61.web.app/api/garage61` as the API base (see `getApiBase()` in `src/utils/auth.ts` and `api.ts`). So from a browser at `http://localhost:8080`, every auth request (login, callback, refresh) goes to the **deployed** Hosting URL, which routes to your **deployed** function.

3. **Where secrets live**
   `GARAGE61_OAUTH_CLIENT_ID` and `GARAGE61_OAUTH_CLIENT_SECRET` are in Firebase Secret Manager. They are injected only into **deployed** functions (or into the emulator if you explicitly configure it). So the code that talks to Garage 61’s token endpoint must run in a deployed function (or emulator) that has access to those secrets.

4. **Resulting workflow**
   - Deploy functions once (with secrets set) so the live API can build auth URLs and exchange codes with Garage 61.
   - Run the web app **locally** on port 8080 so the redirect URI matches what you registered at Garage 61 (`http://localhost:8080/auth/callback`).
   - The local app still talks to the **deployed** API; no need to run the Functions emulator unless you’re changing function code.

**Summary:** Set secrets → deploy functions → run `npm run web:oauth` and open http://localhost:8080. The browser is local; the backend is deployed.

---

## Test locally

**Prerequisite:** Secrets set and functions deployed (see “Configuration” and “Expected workflow” above).

1. **Garage 61** – In the [developer auth form](https://garage61.net/developer/authentication), add this redirect URL for local web (if not already added):

   - `http://localhost:8080/auth/callback`

   (Also add `https://botracing-61.web.app/auth/callback` and `botracing61://auth/callback` for production and mobile.)

2. **Run the app on port 8080** (must match the redirect URL you registered):

   ```bash
   npm run web:oauth
   ```

   Or: `npx expo start --web --port 8080`
   Then open **http://localhost:8080** in your browser.

3. In the app, click **Sign in with Garage 61**. You’ll go to Garage 61, sign in, then come back to your app.

**Note:** When testing on localhost, the session cookie is for the production domain, so you may not stay logged in after the redirect. To confirm the full “stay logged in” flow, use the deployed site (https://botracing-61.web.app) or the mobile app.

### How the session is used (and how to verify)

1. **After sign-in** the backend sets a cookie `g61_session=<sessionId>` (HttpOnly, Secure, SameSite=None) and stores the real tokens in Firestore under that session id.
2. **On each API request** (laps, user, etc.) the app calls the proxy at `https://botracing-61.web.app/api/garage61/...`. On **web**, the client sends that cookie (`withCredentials: true`). The proxy reads the cookie, looks up the session in Firestore, and uses that user's access token to call Garage 61.
3. **How to verify:** (1) Header shows **Sign out** (session detected). (2) DevTools → Network → any request to `.../api/garage61/...` → Request Headers should include `Cookie: g61_session=...`. (3) Laps/driver data should match the account you signed in with.

**Cookie and localhost:** The session cookie uses `SameSite=None; Secure` so it can be set when the callback response is cross-origin (e.g. app on localhost calling the deployed backend). If you previously saw "Set-Cookie was blocked" (SameSite=Lax in a cross-site context), redeploy the functions so the new attribute is used.

**Cookie not sent / 401 on localhost:** For cookie-based auth to work when the app runs on localhost, API requests must go to the **same origin that set the cookie** (the deployed proxy). Do **not** set `EXPO_PUBLIC_GARAGE61_API_BASE` to the Functions emulator URL when testing sign-in on web; leave it unset so the client calls `https://botracing-61.web.app/api/garage61`. Then the browser will send the `g61_session` cookie with those requests. In DevTools → Network → select a failing request to `/api/garage61/me` or `/laps` → Headers: under "Request Headers" you should see `Cookie: g61_session=...`. If the cookie is missing, the request is going to a different origin (e.g. emulator) or the cookie was never set (sign in again). If the cookie is present but you still get 401, the session may have expired in Firestore—sign in again and redeploy functions if needed.

---

## 1. Current vs OAuth Architecture

| Current                                                    | With OAuth                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Single `GARAGE61_API_TOKEN` in Firebase (one shared token) | Each user has their own access/refresh tokens                                       |
| Proxy always uses the same token for all requests          | Proxy uses the token of the logged-in user (from session or `Authorization` header) |
| No “login” in the app                                      | User clicks “Sign in with Garage 61”; we run OAuth and store tokens                 |

---

## 2. OAuth2 Redirect URLs to Register

When you fill out the Garage 61 OAuth form, you’ll need **OAuth2 redirect URLs**. Register both of these so the same OAuth app works for web and mobile.

### Web

- **Production:**
  `https://botracing-61.web.app/auth/callback`
  (or whatever path you use for the callback, e.g. `/oauth/callback`.)
- **Local dev (if Garage 61 allows):**
  `http://localhost:8080/auth/callback`
  (adjust port to match your web dev server.)

### Mobile (Expo / deep link)

Your app already has a URL scheme in `app.json`: `"scheme": "botracing61"`.

Use the **custom scheme** as the redirect for the native app:

- **Redirect URL:**
  `botracing61://auth/callback`

Garage 61 will redirect to this after login; the OS will open your app and you can read the `code` (and optional `state`) from the URL.

**Summary – add these in the Garage 61 OAuth form:**

| Environment | Redirect URL                                         |
| ----------- | ---------------------------------------------------- |
| Web (prod)  | `https://botracing-61.web.app/auth/callback`         |
| Web (dev)   | `http://localhost:8080/auth/callback` (if supported) |
| Mobile      | `botracing61://auth/callback`                        |

You may need to confirm with Garage 61 whether they support custom schemes and multiple redirect URIs.

---

## 3. What You Need from Garage 61

From the [Garage 61 developer authentication page](https://garage61.net/developer/authentication) (and any API docs they provide), you need:

1. **OAuth2 endpoints**
   - Authorization URL (e.g. `https://garage61.net/app/account/oauth`).
   - Token URL (e.g. `https://garage61.net/oauth/token`) for exchanging `code` → access/refresh tokens.
2. **Client credentials**
   - Client ID (often public).
   - Client Secret (must stay server-side only; used in Firebase Functions).
3. **Scopes**
   - Which scopes to request (e.g. `read:laps`, `read:user`). Use the minimum needed for your app.
4. **PKCE**
   - If they support PKCE (recommended for mobile and single-page apps), use it for both web and mobile so you don’t send the client secret from the client.

Until we have their exact URLs and scopes, the implementation below uses placeholders you can replace.

---

## 4. Backend: New Firebase Functions / APIs

You need a few server-side pieces so the client never touches the client secret and so token exchange happens securely.

### 4.1 Secrets / config

- Keep **Client Secret** in Firebase (e.g. `GARAGE61_OAUTH_CLIENT_SECRET`) and optionally `GARAGE61_OAUTH_CLIENT_ID` if you don’t want to hardcode it.
- You can keep the existing `GARAGE61_API_TOKEN` for backward compatibility during migration, or phase it out once OAuth is the only path.

### 4.2 Suggested endpoints

| Purpose                    | Method | Path (example)                                                 | Notes                                                                                                                                                       |
| -------------------------- | ------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start OAuth (get auth URL) | GET    | `/api/garage61/auth/login` or `/api/auth/garage61/login`       | Returns `{ url: "https://garage61.net/app/account/oauth?..." }` with `client_id`, `redirect_uri`, `scope`, `state`, and optionally `code_challenge` (PKCE). |
| Callback (exchange code)   | POST   | `/api/garage61/auth/callback` or `/api/auth/garage61/callback` | Body: `{ code, redirect_uri, code_verifier? }`. Exchanges code for access + refresh token; creates session (or returns tokens for mobile).                  |
| Refresh token              | POST   | `/api/garage61/auth/refresh`                                   | Body: `{ refresh_token }`. Returns new access token (and optionally new refresh token).                                                                     |
| Logout / revoke            | POST   | `/api/garage61/auth/logout`                                    | Optional: revoke token with Garage 61 if they support it; clear server session.                                                                             |

For **web**, the flow is usually:

1. Frontend calls `GET /api/garage61/auth/login?redirect_uri=https://botracing-61.web.app/auth/callback`.
2. Backend returns the full Garage 61 authorization URL (with `state`, PKCE `code_challenge` if used).
3. User is redirected to that URL, signs in at Garage 61, and Garage 61 redirects to `https://botracing-61.web.app/auth/callback?code=...&state=...`.
4. Your **web app** at `/auth/callback` reads `code` and `state`, then calls `POST /api/garage61/auth/callback` with `{ code, redirect_uri }` (and `code_verifier` if PKCE).
5. Backend exchanges `code` for tokens and creates a session (e.g. HTTP-only cookie with session id). Subsequent API calls from the browser send the session cookie; the proxy uses the token tied to that session.

For **mobile**:

1. App calls `GET /api/garage61/auth/login?redirect_uri=botracing61://auth/callback`.
2. User is sent to Garage 61 in the browser (or in-app browser); after login, Garage 61 redirects to `botracing61://auth/callback?code=...&state=...`.
3. OS opens your app; you parse the URL (e.g. with `expo-linking`), get `code` and `state`.
4. App calls `POST /api/garage61/auth/callback` with `{ code, redirect_uri: "botracing61://auth/callback", code_verifier }`.
5. Backend returns tokens (or a short-lived “mobile session” token). App stores refresh token (and optionally access token) in secure storage (e.g. `expo-secure-store`). Either the app sends the access token on each request, or a session token that the backend maps to the user’s Garage 61 access token.

So: **same OAuth flow**, different redirect URIs and different way of persisting the “session” (cookie on web, secure store + Bearer or session token on mobile).

---

## 5. Proxy Changes (Per-User Token)

Right now `garage61Proxy` uses a single `GARAGE61_API_TOKEN` for every request. With OAuth you have two options.

### Option A: Proxy reads user token from session/header (recommended)

- **Web:** Browser sends session cookie; backend looks up the session and gets the Garage 61 access token for that user; proxy forwards `Authorization: Bearer <user_access_token>` to Garage 61.
- **Mobile:** App sends `Authorization: Bearer <user_access_token>` (or a backend-issued token that the backend translates to the user’s Garage 61 token). Proxy forwards the same header to Garage 61.

So the proxy no longer uses `GARAGE61_API_TOKEN` for authenticated user requests; it uses the token associated with the current user (from session or from the incoming `Authorization` header if you use a backend-issued token).

### Option B: Client sends token to proxy

- Client stores access token (web: memory or cookie; mobile: secure store) and sends `Authorization: Bearer <access_token>` to the proxy.
- Proxy forwards that header to Garage 61 and does not add its own token.

Option B is simpler on the server (no session store) but you must ensure the proxy only forwards requests that are already authenticated (and that you don’t log tokens). Option A gives you a single place to refresh tokens and manage sessions.

---

## 6. Client-Side Flow (Web vs Mobile)

### Web

1. “Sign in with Garage 61” → call backend `GET .../auth/login?redirect_uri=<web_callback>` → redirect user to returned `url`.
2. User lands on `/auth/callback?code=...&state=...` → your page calls `POST .../auth/callback` with `code` and `redirect_uri`.
3. Backend sets HTTP-only session cookie and redirects to `/` or dashboard.
4. All API requests to the proxy send the cookie; proxy uses the session’s access token.

### Mobile (Expo)

1. “Sign in with Garage 61” → call backend `GET .../auth/login?redirect_uri=botracing61://auth/callback` → open returned `url` with `Linking.openURL()` (or WebBrowser).
2. After login, Garage 61 redirects to `botracing61://auth/callback?code=...&state=...` → app opens.
3. Use `expo-linking` (e.g. `Linking.addEventListener('url', handler)` or `Linking.getInitialURL()`) to get the URL and parse `code` and `state`.
4. App calls `POST .../auth/callback` with `code`, `redirect_uri=botracing61://auth/callback`, and `code_verifier` if using PKCE.
5. Backend returns `{ access_token, refresh_token, expires_in }` (or a session token). Store in `expo-secure-store`.
6. On each API request, send `Authorization: Bearer <access_token>` to the proxy. When the token expires, use `POST .../auth/refresh` with `refresh_token` to get a new access token.

You already have `expo-linking` and `scheme: "botracing61"` in `app.json`, which is what you need for the mobile redirect.

---

## 7. Security Notes

- **State:** Always send a random `state` in the authorization URL and verify it in the callback to avoid CSRF.
- **PKCE:** Use PKCE for both web and mobile if Garage 61 supports it (especially for mobile and public clients).
- **Client secret:** Only use it in Firebase Functions (or another backend). Never ship it in the app or expose it in the frontend.
- **Refresh tokens:** Store only on the server for web (session) or in secure storage on device for mobile; never in plain localStorage on web if you can avoid it.
- **Redirect URI:** Validate in the backend that `redirect_uri` in the callback is one of your whitelisted URIs (same list you register at Garage 61).

---

## 8. Implementation Checklist

- [ ] Get OAuth credentials and docs from Garage 61 (auth URL, token URL, scopes, PKCE support).
- [ ] Register redirect URLs:
      `https://botracing-61.web.app/auth/callback`,
      `botracing61://auth/callback`,
      and optionally `http://localhost:8080/auth/callback`.
- [ ] Add Firebase secrets: `GARAGE61_OAUTH_CLIENT_ID`, `GARAGE61_OAUTH_CLIENT_SECRET`.
- [ ] Implement Firebase Functions: login URL builder, callback (code exchange), refresh, optional logout.
- [ ] Add session store (e.g. Firestore or in-memory with a proper TTL) for web sessions if using Option A.
- [ ] Change proxy to use per-request token (from session or `Authorization` header) instead of a single `GARAGE61_API_TOKEN` for user requests.
- [ ] Web: add `/auth/callback` route; handle `code` and call backend callback; set cookie and redirect.
- [ ] Mobile: handle `botracing61://auth/callback` with `expo-linking`; call backend callback; store tokens in `expo-secure-store`.
- [ ] Update `api.ts` / api client: for web send cookie (automatic if same origin); for mobile send `Authorization: Bearer <access_token>` from secure store.
- [ ] Add token refresh logic (e.g. when API returns 401) using `POST .../auth/refresh` and then retry the request.
- [ ] Optional: keep `GARAGE61_API_TOKEN` for a “guest” or fallback path until OAuth is fully rolled out.

---

## 9. Placeholder Endpoint Shapes (for implementation)

Once you have real Garage 61 OAuth URLs and scopes, you can implement the functions like this.

**GET /api/garage61/auth/login**

- Query: `redirect_uri` (required), optional `state` (or generate on server).
- Response: `{ url: "https://garage61.net/app/account/oauth?client_id=...&redirect_uri=...&response_type=code&scope=...&state=..." }`.
- If PKCE: generate `code_verifier` and `code_challenge`, store `code_verifier` keyed by `state`, and add `code_challenge` and `code_challenge_method=S256` to `url`.

**POST /api/garage61/auth/callback**

- Body: `{ code, redirect_uri, state?, code_verifier? }`.
- Validate `state` and, if PKCE, `code_verifier`.
- Exchange `code` at Garage 61 token URL; get `access_token`, `refresh_token`, `expires_in`.
- **Web:** Create session; set HTTP-only cookie; respond with `{ redirect: "/" }` or 302 to `/`.
- **Mobile:** No cookie; respond with `{ access_token, refresh_token, expires_in }`; client stores in secure store.

**POST /api/garage61/auth/refresh**

- Body: `{ refresh_token }` (or read from session for web).
- Call Garage 61 token URL with `grant_type=refresh_token`; return new tokens or update session.

This gives you a clear path to support OAuth with Garage 61 on both web and mobile and tells you exactly which OAuth2 redirect URLs to put in their form.
