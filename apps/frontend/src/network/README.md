# SURIMI network layer

Component → `serverState` hook → service → `request.ts` → `/api/v1`.

- `apiConfig.ts`: API base URL and request timeout. Defaults to same-origin `/api/v1`.
- `request.ts`: the only Axios client. Validates payloads/responses, supports 204, sends cookies/CSRF, and coordinates one refresh/retry for protected 401 responses. It never navigates the browser.
- `csrf.ts`: reads only the readable CSRF cookie. Access/refresh tokens stay HttpOnly.
- `errors/`: converts SURIMI application errors, FastAPI `detail` errors and non-JSON/network failures into `AppError`; preserves error codes and request IDs. Cancellation stays cancellation.
- `services/auth/`: schemas and functions for current user, providers, password login, logout, password change and refresh.
- `services/scenarios/`: schemas/functions for the existing catalogue and contract endpoints. Nested `simulation` values remain unknown until the backend defines their structure.

## Adding an endpoint

1. Read the backend's existing payload and response models; do not infer them from demo data.
2. Define the Zod schemas beside the domain service. Export inferred payload/response types where callers need them; do not duplicate interfaces. Object schemas accept additive fields and return only the declared fields.
3. Add a plain service function using `request`. Specify `auth: "public"` only for endpoints that must not trigger session refresh. Empty responses use `z.void()`.
4. Add a query key and query/mutation hook under `serverState/<domain>/`. Pass the query's `signal` into the service. Include user ID and data parameters in protected query keys.
5. Consume the hook in a component; render loading/errors there. Add a transport/contract regression test when behaviour warrants it.

Use `error.kind` for general UI states and `error.code` for backend-specific handling, such as `password_change_required`. Payload-validation issues are frontend input errors; `invalidResponse` means the server returned an unexpected successful response. Neither should be silently substituted with mock data.

## Current integration boundary

Local login, session restoration and protected navigation now use the auth hooks. Vite proxies `/api/v1` to the local Docker API. Login now renders provider-discovered SSO entry, password change uses the existing service, and home mounts the catalogue query. The backend owns the SSO callback/token exchange. The contract service is available but not wired into input forms. A different API origin alone does not configure backend CORS or cookie/SSO origins.

Run `npm --workspace apps/frontend run test:network` from the repository root. Tests use a controlled Axios adapter and Node's test runner; they do not call the live backend.
