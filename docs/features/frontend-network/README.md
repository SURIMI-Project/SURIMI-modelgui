# Frontend REST foundation

**Confirmed by the user, 2026-11-05:** adapt the supplied Axios/Zod/TanStack pattern to SURIMI. This increment provides network infrastructure, typed auth/scenario services and server-state hooks. No login UI, route guards, scenario-page integration, backend or deployment changes.

| Decision | Why | Source |
| --- | --- | --- |
| `src/network/` for HTTP, schemas and services | One discoverable request entry point; services describe endpoints without React | User-approved structure |
| Axios + Zod | Retain the supplied pattern; validate payloads and responses, infer TypeScript types from schemas | User, 2026-11-05 |
| `src/serverState/` for TanStack hooks and query keys | Cache/session presentation concerns stay outside transport and components | User-approved structure |
| No unconditional redirects from HTTP | Login errors, expired sessions and forbidden access need different UI behaviour | Backend auth contracts |
| One refresh in flight; retry an authenticated 401 at most once | Rotating refresh cookies must not race in the same page | Backend auth design |
| Handwritten Zod schemas for the implemented endpoints | Keep this increment small; OpenAPI-generated client tooling is deferred | ADR 0017 |

## Flow

```mermaid
flowchart LR
  component["React component"] --> hook["serverState hook"]
  hook --> service["network service"]
  service --> request["request: payload validation, HTTP, response validation"]
  request --> backend["SURIMI REST API"]
```

## Boundaries

The query provider is installed but no hook is mounted on existing pages: opening the demo makes no new API requests. Services cover existing auth and catalogue endpoints only. There is no guessed experiment API or copied surge/port behaviour. HTTP uses same-origin `/api/v1`, credentials, and the readable CSRF cookie for writes. JavaScript does not access authentication tokens.

Login, providers and password-change requests do not trigger automatic refresh on wrong credentials. Protected requests may refresh once after a 401; 403, network errors, and invalid responses are not replayed. A caller can cancel its own wait without cancelling refresh for other callers. CSRF is read again after refresh. The refresh response must be 204.

Application errors use `error.code/message/details/request_id`; default FastAPI validation errors may use `detail`. Non-JSON/proxy errors also normalize safely. Payload-validation errors and successful responses that fail Zod validation are different error kinds. Validation errors retain field paths/messages, never the raw password/body. HTTP errors preserve status, backend code, optional details, request ID and Retry-After. Cancellation remains cancellation.

The HTTP layer returns errors; TanStack manages session cache changes. Terminal session expiry clears protected query data. Login/account switching and logout cancel/remove cached queries. No query or mutation automatically retries; transport alone handles the bounded auth retry. The login UI must prevent simultaneous account-changing actions. Cross-tab refresh coordination is not implemented.

## Source contracts and limits

Read from `apps/backend/src/surimi_backend/{auth,users,catalog}`; no backend file is edited. User dates stay ISO strings, IDs are UUID strings, roles are `admin/member`. Nullable fields remain nullable. `contract.simulation` is a record of unknown values: the backend does not yet expose a strongly typed nested schema. The frontend does not invent one.

SSO provider URLs are returned as data; future login UI will perform browser navigation. No Keycloak client code or tokens are added. Local Vite API proxy and coordinated SSO callbacks still belong to the later live integration step; Docker already has the same-origin REST proxy.

## Next step

Implement the login experience and route/session boundary using these hooks after agreeing login-screen behaviour. End-to-end cookie, SSO, password-change and live catalogue verification remains separate from mocked transport tests.
