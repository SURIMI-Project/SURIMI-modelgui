# Frontend local login — changelog

## 2026-11-06 — Shared light login presentation

Login now composes the project-owned AuthLayout, Card, React Aria Input and Button components from the light design-system foundation. SSO entry uses the same outlined button. Auth services, cookies, safe return paths, validation and error normalization are unchanged. Controlled browser responses verified pending/error handling, request payload, protected return destination, SSO start navigation and desktop/mobile presentation; no new live Keycloak exchange was performed. See [design system](../frontend-design-system/README.md).

## 2026-11-05 — Prevent disabled-card flash before availability loads

**Cause read from source:** the home page mounted cards while the initial REST query was pending and applied disabled styling to every non-available state, including unknown/loading. It was new REST availability presentation, not leftover gRPC integration.

**Fix:** split the availability boundary from the animated case-selection content. Initial loading shows a loading screen; a failed check shows a retry screen. Cards and intro timers mount only after a successful response. Only cases absent from that response are disabled. Successful empty responses still show genuinely unavailable cases. Removed obsolete per-card loading/error labels and banner-button styles.

**Files:** case-selection page and its CSS module; feature design and project changelog.

**Verified:** real browser login with the first catalogue response deliberately held: loading screen contained zero case cards and no unavailable labels. Releasing the response rendered cards with actual backend availability. A controlled 502 showed a retry screen with zero cards; retrying with a subset disabled only the two absent cases. No browser JavaScript errors. Production TypeScript/Vite build, targeted page ESLint and diff whitespace checks passed. Backend/protocol/deployment/CI files unchanged. No commit created.

## 2026-11-05 — Password completion, Keycloak SSO and real availability

**User authorized all three follow-ups.** Added `/change-password` with current/new/confirmation validation, backend error display and current-user refetch before returning to the requested page. Confirmation is never sent to the API. Login now discovers SSO providers and navigates through the backend; no Keycloak SDK, code exchange or token storage in React. Home reads the authenticated REST catalogue, mapping scenario names onto local case content; it distinguishes loading, failed checks, and successful unavailable/empty results, with retry. Reports and experiment setup/submission remain demo data.

**Source:** password page and form schema; `SsoSignIn`/safe login URL helper; return-path and protected-route updates; auth schema messages; scenario availability helper; home card state/styles; tests. Sign-out is disabled during password submission. Returning from SSO through browser Back restores usable controls.

**Verified live in isolated Chrome:** a dedicated local account was created through the existing admin API with `must_change_password=true`. Local length/confirmation failures made no password request; wrong current password returned 401 without ending the session; a common password returned 422; a valid change returned 204, cleared the requirement via `/auth/me`, returned to the original runs route and survived reload. Temporary test accounts were deactivated afterwards; configured admin credentials are unchanged.

**Verified SSO:** local Keycloak Bob signed in as member and Alice as admin; both returned to a protected deep link, restored sessions after reload, and received `account=sso`, `role_source=idp`, `has_password=false`. Browser requests did not exchange tokens. Carol, with no mapped role, received 403 `no_access` and no SURIMI session. The current backend displays that denial as JSON at the callback URL; a friendly frontend denial redirect needs a backend/gateway contract change and is recorded in ISSUES.

**Verified catalogue:** the actual controller-backed REST endpoint returned `aegean_sea`, `anchovy_bay`, and `northwestern_med`; all three card states matched. Controlled subset/error/empty responses verified disabled unavailable cards, no false-unavailable label on an error, and successful retry. Controlled provider-list failure preserves local login and retry restores SSO. Desktop/mobile screenshots inspected; no horizontal overflow in the mobile login/password screens; no browser page errors.

**Local configuration only:** started the existing Keycloak profile, set ignored `deployments/.env` `PUBLIC_BASE_URL=http://localhost:5173`, and registered the exact Vite callback on the running local Keycloak client via its admin API. Checked-in realm, Compose, backend, protocol and CI files are unchanged. Runtime registration does not survive recreating Keycloak without persistent data; reproduction steps are in README. The previously built local API image was reused with `--no-build`.

**Checks:** 23 focused tests passed; targeted ESLint and production build passed. Existing third-party Zod annotation and bundle-size warnings remain. No commit created.

## 2026-11-05 — Local login with the running Docker API

**Implemented:** local username/email/password login; session restoration and retry/error screens; shared protected route boundary; validated internal return paths; mandatory-password/inactive-account blocking states; small local sign-out control on case selection. `/test` stays public; `/netcdf-lab` requires authentication. The case-selection and report data remain fixtures. No SSO UI, password-change form, registration/reset-password screen or scenario availability integration.

**Source files:** `apps/frontend/src/features/auth/`, `src/pages/LoginPage/`, `src/App.tsx`, case-selection page header, `src/serverState/auth/sessionCache.ts`, `tests/network.test.ts`, `vite.config.ts`, frontend `.env.example`. Session replacement now retains the observed `auth/me` query so mounted route guards are notified immediately on login/logout. Added observer and return-path regression tests.

**Bruno/source review:** all `resources/bruno/surimi-modelgui/api/auth/*.yml` reviewed against backend Pydantic schemas and router. Browser login payload is `{login,password}`; response is UserOut plus cookies. Refresh/logout return 204. Scripts' `/token` flow was not used for browser login.

**Verified live:** Docker API/PostgreSQL healthy, existing Vite server on localhost:5173 proxies `/api/v1` to 127.0.0.1:18082. Isolated Chrome browser tested signed-out deep-link redirect without private content, wrong password error, successful login with return to original route, HttpOnly access/refresh cookies, session restore after full reload, access-cookie removal triggering real refresh/CSRF rotation, authenticated NetCDF access, local logout clearing server cookies and content, protected NetCDF redirect after logout, public `/test` without auth requests, mobile viewport without horizontal overflow. Browser had no page JavaScript errors and sent no scenario-availability requests.

**Controlled browser checks:** session endpoint 503 shows retry screen and recovers when unblocked; a UserOut response with `must_change_password=true` blocks content. These two states were injected in the browser, not produced by changing the backend/account password. Desktop/mobile screenshots inspected.

**Local build workaround:** original Docker build could not fetch `ghcr.io/astral-sh/uv:0.10.4` (`denied`). Built `surimi-modelgui-backend:local` with `/tmp/surimi-local-login.Dockerfile`, installing the exact same `uv==0.10.4` from PyPI; frozen backend dependencies/source are unchanged. Started existing Compose services with `up --no-build -d api`. Repository Dockerfile and deployments are untouched; normal `up --build` still depends on registry access. Existing user-owned Vite server was reused, not replaced. Services remain running for local review.

**Remaining:** real mandatory password-change completion, inactive/rate-limit live-account tests, SSO and scenario availability are deferred. No backend/protocol/CI/deployment files changed and no commit created.

**Final checks:** 20 focused transport/schema/session-observer/return-path tests passed. Targeted ESLint passed for the new auth UI, route configuration, server state, tests and Vite config. Final TypeScript/Vite production build passed; existing chunk-size and third-party Zod annotation warnings remain. `git diff --name-only -- apps/backend packages/proto deployments .github` is empty.
