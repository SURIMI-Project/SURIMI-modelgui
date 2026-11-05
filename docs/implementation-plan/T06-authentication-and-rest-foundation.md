# T06 — Authentication and REST server-state foundation

**Priority:** 2, confirmed by the user on 2026-11-05; follows T05.  
**Status:** Local login, session protection, password-change completion, Keycloak SSO and real scenario availability implemented and browser-tested 2026-11-05. Denied-SSO callback presentation is a documented backend-contract follow-up.
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

- [x] Review Bruno auth contracts and verify local login/logout/session/refresh/cookies against the running API.
- [x] Verify SSO against local Keycloak, including member/admin roles and denied access.
- [x] Define a generic request function: cookies, JSON/204 handling, normalized errors, cancellation, CSRF, and a shared bounded refresh/retry flow.
- [x] Define plain endpoint services and TanStack query keys/hooks; keep request handling out of components. Decide OpenAPI type tooling using the existing proposed ADR.
- [x] Implement login UI and session restoration. Protect SURIMI content routes, including direct links and `/netcdf-lab`; `/test` remains public for now by the user’s explicit decision on 2026-11-05. Avoid briefly showing protected content while checking the session.
- [x] Implement local logout, expired-session handling, access/error states and user-scoped cache cleanup.
- [x] Block protected content when a mandatory password change is required.
- [x] Implement and test the password-change form/completion flow.
- [x] Implement SSO entry using backend provider URLs and browser redirects. Coordinate local/public origins and registered callback URLs with the backend developer.
- [x] Once signed in, connect `GET /api/v1/scenarios` through service/query hooks. Distinguish real unavailability from loading and errors.
- [ ] Inspect `GET /api/v1/scenarios/{name}/contract` through REST before connecting configuration inputs; do not reintroduce generated gRPC messages.

## Dependencies and boundaries

The backend enforces permissions; frontend route guards only control the user experience. No experiment submission/status/output REST integration is assumed available: verify those APIs separately before replacing demo flows. Admin simulation management is not automatically part of this login ticket.

## Defining questions

1. **Confirmed and implemented:** local login first, then SSO provider buttons on the same login screen.
2. **Implemented default:** return to a validated original local page, otherwise case selection.
3. Is account creation/reset-password UI required now, or are accounts/password resets managed by administrators and the SSO provider?

## Done when

Signed-out users cannot enter protected SURIMI content, including `/netcdf-lab`, through navigation or a direct URL. `/test` remains public for now. Local login and agreed SSO work; refresh, logout, required password changes, and denied access behave correctly. Authenticated scenario data uses the shared REST/services/TanStack flow, with no browser-to-controller communication.

## Foundation delivered — 2026-11-05

See [frontend network feature](../features/frontend-network/README.md) and [ADR 0017](../decisions/0017-frontend-axios-zod-and-query-layers.md). Axios/Zod and TanStack layers are implemented under `apps/frontend/src/network/` and `src/serverState/`; copied examples were removed. Eighteen focused tests cover payloads, response/error shapes, refresh/cancellation and cache boundaries. Existing demo pages make no new API requests because none of these hooks is mounted there.

**Follow-up:** local login and proxy are now implemented with live API/browser verification; see [local login](../features/frontend-local-login/README.md). SSO, password-change completion and scenario availability are now implemented with live verification. Contract-driven inputs and experiment/output APIs are outside this completed increment. No backend or deployment files were changed.

**Follow-up limitation:** denied full-page SSO callbacks return backend JSON, not a frontend error route. See [open issues](../ISSUES.md). Only ignored local settings/runtime Keycloak registration changed; tracked backend/deployment files remain untouched.
