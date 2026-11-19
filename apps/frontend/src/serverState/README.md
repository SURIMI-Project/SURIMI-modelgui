# SURIMI server state

- `queryClient.ts`: one QueryClient with explicit cache defaults, no automatic query/mutation retries, and terminal-session error handling.
- `auth/`: shared auth keys, current-user/provider queries, login/logout/password mutations, and cache cleanup. `useCurrentUser()` returns `User | null`; network/invalid-response/access errors remain errors rather than being disguised as signed out.
- `scenarios/`: user-scoped catalogue/contract keys and hooks. Queries wait for an active user without a mandatory password change.

Hooks return the normal TanStack result (`data`, loading/error state, `mutate`, etc.). Do not create a second handwritten result interface for each hook or duplicate the cached user in unrelated component context. Local selections/form fields remain ordinary React state.

Login/account switching cancels requests and removes other cached queries before updating the user. The observed `auth/me` query is retained so mounted guards immediately receive identity changes. Logout clears local session data after the backend succeeds or confirms the session already ended. Network/server logout failure stays visible; do not pretend the server ended the session. Terminal session expiry clears protected data and cancels late user requests. Wrong credentials do not trigger this expiry policy.

Local login/session restoration, the protected route boundary and sign-out now consume auth hooks. Provider discovery is mounted on login, mandatory-password completion refetches the user, and home mounts the scenario availability query. The contract hook remains available for future input integration. Cross-tab session coordination and simultaneous login/logout handling need to be considered when that UI is built; the HTTP refresh deduplication covers requests in this page only.

## Experiment foundation (2026-11-17)

The runs list, Northwestern creation options/submission, and event polling are integrated.
Output queries and HCR configuration management remain prepared for later integration.
Use backend scenario names (`aegean_sea`, `anchovy_bay`, `northwestern_med`), not
UI route slugs. The existing case mapping remains the place to translate them.

| Hook | Arguments / action | Cache behaviour |
| --- | --- | --- |
| `useExperimentOptions` | `(scenarioName, enabled)`; enable while setup is open | Per user/case, fresh for five minutes |
| `useExperiments` | `(filters, enabled)`; filters include case, page, size, sorting | Separate pages/filters; existing 30-second default |
| `useExperiment` | `(experimentId, enabled)` | Full detail, not a list item masquerading as detail |
| `useCreateExperiment` | `(scenarioName)`; `mutateAsync(payload)` | Validates against cached/revalidated setup options, then invalidates user lists |
| `useHcrConfiguration` | `(scenarioName, configurationId, enabled)` | Fetch full rules only after selection |
| `useSaveHcrConfiguration` | `(scenarioName)`; `mutateAsync({id?, payload})` | No ID creates; ID replaces; updates detail and invalidates list/options |
| `useExperimentOutputs` | `(experimentId, enabled)` | Read readiness, dimensions and available metrics |
| `useOutputSeries` | `(experimentId, paramsOrNull, enabled)` | Immutable data cached per selection; inactive retention 30 minutes |
| `useOutputMap` | `(experimentId, paramsOrNull, enabled)` | JSON grids cached per selection; inactive retention five minutes |
| `useOutputDownloadUrl` | `(experimentId)`; `mutateAsync("nc")` | Explicit audited GET, exposed as a mutation; no retries, inactive retention zero |
| `useExperimentEvents` | `(enabled)`; mounted once by the runs page | User-scoped cursor; refresh hints, never list data |

Queries return standard TanStack results. Pass `null` output selections until
metadata is ready. Do not enable chart/map queries for unready outputs. A
case alone is not enough to open real results: use an experiment UUID. No
browser NetCDF parser, automatic download, route change or form integration
is included in this increment.

The event feed follows the backend's `poll_after_seconds`, drains `has_more`
without waiting, and refreshes affected details/output queries plus user lists.
Both `experiment.*` and `simulation.status_changed` trigger refreshes; individual
simulation changes can update counts without changing the experiment status.
Observed list pages with nonterminal runs also refresh on each feed poll because
progress-only changes do not emit events. Terminal-only pages refresh on events.
The runs page exposes feed errors; it does not invent progress between polls.
The initial cursor reconciles existing views because it contains no history.
Focus/reconnect requests catch up using the cursor; unmount discards the cursor
and remount establishes/reconciles a new one. Background polling is disabled
by TanStack's default. Session replacement cancels/removes the feed. Mount it
once; list rows must not each mount a polling hook.

Server session guards prevent mutations from starting without an active user
and prevent late mutation responses from updating a different user's cache.
Queries pass AbortSignal to the transport. Writes do not retry automatically.
No cache is persisted to disk; staleTime is freshness, not a scheduled daily
fetch. Configuration list/delete HTTP methods are available; their management
hooks and experiment cancel/clone/delete are deferred until requested.

Payloads are strict Zod objects; response types are inferred from schemas.
HCRs use kg, distinguish species plus life stage, reject duplicate entries and
validate numeric limits. Creation additionally checks case dates, climate,
eligible entries and configuration summaries. Saving a configuration checks
current eligibility. These checks supplement backend validation; the server
still owns authorization, uniqueness and latest capabilities. Initial values
are nullable reference data, never default HCR rules or an implicit conversion.
Initial biomass units remain unconfirmed; no frontend schema assumes a
conversion to HCR kilograms.

Output series/maps and core axis fields are validated against the backend
implementation, whose JSON routes lack full OpenAPI response models. Unknown
stored experiment requests, event extras and quality-report contents remain
explicit unknown records. Download URLs are returned as data; never send a
signed external URL through the cookie/CSRF API transport. Reset the download
mutation when closing its UI; request a fresh URL for each new download action.
