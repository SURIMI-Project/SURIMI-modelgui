# SURIMI server state

- `queryClient.ts`: one QueryClient with explicit cache defaults, no automatic query/mutation retries, and terminal-session error handling.
- `auth/`: shared auth keys, current-user/provider queries, login/logout/password mutations, and cache cleanup. `useCurrentUser()` returns `User | null`; network/invalid-response/access errors remain errors rather than being disguised as signed out.
- `scenarios/`: user-scoped catalogue/contract keys and hooks. Queries wait for an active user without a mandatory password change.

Hooks return the normal TanStack result (`data`, loading/error state, `mutate`, etc.). Do not create a second handwritten result interface for each hook or duplicate the cached user in unrelated component context. Local selections/form fields remain ordinary React state.

Login/account switching cancels and removes previous query data before caching the new user. Logout clears local session data after the backend succeeds or confirms the session already ended. Network/server logout failure stays visible; do not pretend the server ended the session. Terminal session expiry clears protected data and cancels late user requests. Wrong credentials do not trigger this expiry policy.

No hook here is currently used by the demo pages. Connecting login UI and protected navigation is the next integration step. Cross-tab session coordination and simultaneous login/logout handling need to be considered when that UI is built; the HTTP refresh deduplication covers requests in this page only.
