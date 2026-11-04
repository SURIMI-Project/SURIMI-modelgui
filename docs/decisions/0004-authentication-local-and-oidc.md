# 0004 — Local password and OIDC SSO (Keycloak first, more providers later) both end in one backend-issued session

**Status:** Accepted 2026-11-03 (user); built in phase 3 (branch `develop`). Account matching ("or links by verified email") superseded by [0016](0016-separate-sso-and-local-accounts.md) on 2026-11-04
**Date:** 2026-11-03
**Related:** [features/auth-and-users](../features/auth-and-users/README.md), [0005](0005-authorization-roles-and-ownership.md)

## Context

- Requirement: two ways to sign in, (1) username or email and password stored
  in our database, (2) SSO.
- User, 2026-11-03: any Keycloak will do for now; **another SSO provider will
  be added later**. So the SSO code must not be Keycloak-specific.
- Roles and ownership are ours; the identity provider does not know about
  experiments. Roles of SSO users come from the provider's roles or groups and
  must be re-read on every sign-in ([0005](0005-authorization-roles-and-ownership.md)).
- The SPA and the API are served from one origin behind nginx.
- `fastapi-users` is in maintenance mode, no new features. **Read from source**
  (its README and PyPI page), 2026-11-03. FastAPI's security tutorial
  recommends `pwdlib[argon2]` and `pyjwt`. **Read from source.**

## Decision

The backend is the session authority for every sign-in method
(backend-for-frontend).

- **Local:** `POST /api/v1/auth/login` with login (email or username) and
  password. Argon2id via `pwdlib`. Failed attempts rate-limited per account and
  IP.
- **SSO, generic OpenID Connect:** providers are configuration, not code. Each
  has a key (`keycloak`, later for example `edugain` or `google`), an issuer URL
  (discovery via `/.well-known/openid-configuration`), client id and secret,
  scopes, a display name for the button, and a role mapping
  ([0005](0005-authorization-roles-and-ownership.md)). The backend runs the
  Authorization Code flow with PKCE (S256) on `httpx` and verifies the ID
  token with `PyJWT` (JWKS signature with asymmetric algorithms only, issuer,
  audience, `azp` when there are several audiences, expiry, nonce). The
  state, nonce, PKCE verifier and return path travel in a signed 10-minute
  cookie. It then finds the user by
  `(provider, subject)` in `identities`, or links by verified email, or creates
  one. Routes: `/api/v1/auth/sso/{provider}/login` and `…/callback`. Provider
  tokens never reach the browser.
- **Session, all methods:** a short-lived access JWT (15 min, `pyjwt`, HS256,
  claims `sub`, `role`, `sid`) and a rotating opaque refresh token (14 days,
  stored hashed in `sessions`), both `HttpOnly; Secure; SameSite=Lax` cookies.
  CSRF double-submit header on unsafe methods. The same access token is
  accepted as `Authorization: Bearer`; `POST /api/v1/auth/token` hands one
  to Bruno and scripts (a 15-minute session with no refresh).
- **Every request loads its session and user from the database**, and the
  role is taken from the user row, not from the token. Sign-out,
  deactivation, demotion and removal of access therefore apply at the next
  request.
- **SSO sessions have an absolute lifetime** of 12 h
  (`SSO_SESSION_MAX_AGE_HOURS`), after which the user goes through the
  provider again and their role is re-synced. A sign-in refused because the
  provider no longer grants a role also revokes the user's open sessions.
  Optionally (`OIDC_RESYNC_ON_REFRESH=true`, **not built**, the column
  `sessions.idp_refresh_token_enc` is reserved for it) the backend would keep
  the provider's refresh token encrypted and re-read roles at every refresh of
  our session (every 15 min).
- Sign-out revokes the session row; deactivating a user revokes all of theirs.
- The first admin is created by `surimi-backend create-admin` from env vars
  (`ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, with `--from-env`).

## Why

- One session type means one dependency (`CurrentUser`) on every route,
  whatever the sign-in method, and one place for roles.
- Plain OIDC with discovery covers Keycloak and almost every other SSO
  (Azure AD/Entra ID, Google, eduGAIN proxies, EDITO's Keycloak). Adding a
  provider is a config entry, not a code change.
- Tokens in `HttpOnly` cookies are out of reach of JavaScript.
- A session row makes sign-out and "disable this user" effective within the
  access-token lifetime.
- The absolute SSO lifetime bounds how long a role removed in the provider can
  still be used without our backend holding provider tokens; the resync option
  shortens it to 15 min for deployments that need it.
- Argon2id is the current recommendation for password hashing.
- `httpx` and `PyJWT` instead of `authlib`: the flow is four HTTP calls and
  one JWT check, about 200 lines that the tests drive end to end against a
  fake provider. `authlib`'s Starlette client keeps the flow state in
  `request.session`, so it needs Starlette's `SessionMiddleware`: a second,
  general-purpose session cookie we would add only for this. `PyJWT` is
  already needed for our own tokens. **Read from source**
  (`authlib/integrations/starlette_client/apps.py`, 2026-11-03).
- One database read per request for the session costs one indexed primary-key
  lookup; in exchange a revoked session stops at once instead of after the
  access-token lifetime.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keycloak for both methods, local users inside Keycloak | Requirement is passwords in our database; local sign-in would depend on Keycloak |
| Keycloak-specific adapter (`python-keycloak`) | Ties the code to one product; the next SSO needs new code |
| Frontend OIDC (`keycloak-js`, `oidc-client-ts`) | Tokens in browser memory; two token types for the API; one client library per provider |
| `fastapi-users` | Maintenance mode; its OAuth flow returns tokens to the client |
| Pure JWT, no session row | Cannot be revoked |
| `authlib` for the OIDC client | Works, but brings its own session handling for the flow state and a second JWT library; see Why |
| Trust the role claim in our access token | A demoted admin keeps admin rights for up to 15 minutes |
| Keycloak identity brokering only (other SSOs federated through Keycloak) | A good option if Keycloak stays the hub; our generic OIDC client works with that setup too, so it is not excluded |

## Consequences

- We own the security of the local password path: rate limiting, lockout,
  admin reset, password policy.
- Each provider needs a confidential client with redirect URI
  `<origin>/api/v1/auth/sso/<provider>/callback`.
- Provider configuration is read at start-up; the discovery document is
  fetched at the first SSO request and cached for an hour, so a provider that
  is down affects only its own sign-ins (502 `sso_provider_error`).
- `OIDC_<K>_DISCOVERY_URL` lets the API fetch discovery from an internal
  address while the issuer stays the public URL (compose, Kubernetes).
- We own the OIDC client code too: algorithm allow-list, key rotation (the
  JWKS is fetched again for an unknown `kid`), clock leeway (60 s).
