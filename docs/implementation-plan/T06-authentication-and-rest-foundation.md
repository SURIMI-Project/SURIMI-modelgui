# T06 — Authentication and REST server-state foundation

**Priority:** 2, confirmed by the user on 2026-11-05; follows T05.  
**Status:** Planned; no frontend implementation.  
**Goal:** Users sign in before entering SURIMI, and frontend server state comes from our backend REST API through TanStack Query.

## Existing backend — read from source

The backend already implements these routes in `apps/backend/src/surimi_backend/auth/router.py`; this is not a fresh live API test.

| Endpoint | Frontend purpose |
| --- | --- |
| `POST /api/v1/auth/login` | Local login using `{login, password}`; returns user and sets session cookies |
| `GET /api/v1/auth/me` | Restore the signed-in user/session |
| `POST /api/v1/auth/refresh` | Refresh session cookies; requires refresh cookie and current `X-CSRF-Token` |
| `POST /api/v1/auth/logout` | End session and clear cookies |
| `POST /api/v1/auth/password` | Change password, including mandatory password change |
| `GET /api/v1/auth/providers` | Discover configured SSO providers |
| `GET /api/v1/auth/sso/{provider}/login` | Browser redirect into SSO |
| `GET /api/v1/auth/sso/{provider}/callback` | Backend handles SSO callback and redirects to app |

Access/refresh cookies are HttpOnly. The frontend reads the separate CSRF cookie for relevant writes, not the authentication tokens. `/auth/token` is the bearer-token endpoint for scripts, not the browser login flow. Backend roles are `admin` and `member`.

See [backend auth design](../features/auth-and-users/README.md), [auth changelog](../features/auth-and-users/CHANGELOG.md), and [migration audit](../plans/2026-11-04-frontend-rest-migration-audit.md) for source details. Live verification is part of implementation.

## Tasks

- [ ] Verify backend login/logout/session/SSO behaviour and cookie requirements with the running API and Bruno collection.
- [ ] Define a generic request function: cookies, JSON/204 handling, normalized errors, cancellation, CSRF, and a shared bounded refresh/retry flow.
- [ ] Define plain endpoint services and TanStack query keys/hooks; keep request handling out of components. Decide OpenAPI type tooling using the existing proposed ADR.
- [ ] Implement login UI and session restoration. Protect SURIMI content routes, including direct links and `/netcdf-lab`; `/test` remains public for now by the user’s explicit decision on 2026-11-05. Avoid briefly showing protected content while checking the session.
- [ ] Implement logout, expired-session handling, mandatory password change, and appropriate access errors; clear user-scoped query caches on logout/account change.
- [ ] Implement SSO entry using backend provider URLs and browser redirects. Coordinate local/public origins and registered callback URLs with the backend developer.
- [ ] Once signed in, connect `GET /api/v1/scenarios` through service/query hooks. Distinguish real unavailability from loading and errors.
- [ ] Inspect `GET /api/v1/scenarios/{name}/contract` through REST before connecting configuration inputs; do not reintroduce generated gRPC messages.

## Dependencies and boundaries

The backend enforces permissions; frontend route guards only control the user experience. No experiment submission/status/output REST integration is assumed available: verify those APIs separately before replacing demo flows. Admin simulation management is not automatically part of this login ticket.

## Defining questions

1. Should the login screen offer both local username/password and SSO immediately, or emphasize one method?
2. After login, should users always reach case selection, or return to the protected page they originally opened?
3. Is account creation/reset-password UI required now, or are accounts/password resets managed by administrators and the SSO provider?

## Done when

Signed-out users cannot enter protected SURIMI content, including `/netcdf-lab`, through navigation or a direct URL. `/test` remains public for now. Local login and agreed SSO work; refresh, logout, required password changes, and denied access behave correctly. Authenticated scenario data uses the shared REST/services/TanStack flow, with no browser-to-controller communication.
