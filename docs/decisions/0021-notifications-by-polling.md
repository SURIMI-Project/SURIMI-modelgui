# 0021 — Clients poll experiment events from a cursor; no SSE stream

**Status:** Accepted 2026-11-12 (the user asked for polling instead of SSE, 2026-11-12)
**Date:** 2026-11-12
**Supersedes:** [0008](0008-notifications-sse.md)
**Related:** [features/notifications](../features/notifications/README.md), [0019](0019-worker-row-driven-with-advisory-lock.md)

## Context

- ADR 0008 built `GET /api/v1/events` as Server-Sent Events: one long-lived
  connection per open tab, fed by `LISTEN experiment_events` in every API
  process, with `Last-Event-ID` replay and a heartbeat every 20 s. Built
  2026-11-06; never seen working in a browser through nginx or the EDITO
  ingress.
- Experiment statuses come from the worker polling the controller every
  `POLL_INTERVAL_SECONDS` (10 s); the controller has no push. A status cannot
  reach the database faster than that, whatever the browser transport.
- Runs take minutes to hours. Tens of users are expected, not thousands.
- The idle timeouts and buffering of the EDITO ingress in front of the API are
  not known.
- The user asked on 2026-11-12 for polling instead of SSE.

## Decision

1. `GET /api/v1/events` answers JSON, not a stream:
   `{events, last_id, has_more, poll_after_seconds}`.
2. Without `after`, it returns no events and only the cursor (`last_id`, the
   newest event id the caller may see). A page loads the current state from
   the experiment endpoints and then polls from that cursor.
3. With `after=<id>`, it returns the caller's events with a larger id, oldest
   first, at most `limit` (default 100, at most 500); `has_more` says to poll
   again at once.
4. `poll_after_seconds` is the worker's `POLL_INTERVAL_SECONDS`, so clients do
   not poll faster than statuses can change.
5. Scope as before: members see their own experiments' events; admins see all,
   or theirs with `scope=mine`.
6. Events stay rows in `experiment_events`, served by the existing indexes
   (primary key for admins, `(owner_id, id)` for members). `NOTIFY
   experiment_events`, the broker and the `SSE_*` settings are removed.
   `NOTIFY surimi_dispatch` (API wakes the worker, ADR 0019) stays.
7. Events are hints to refresh; the experiment endpoints hold the state.

## Why

- **The latency SSE saves is not there to save.** The worker writes a status
  at most every 10 s; a client polling every 10 s sees it within 10 s more.
  For runs of hours, that is not noticeable.
- **No long-lived connections.** Every proxy on the way (nginx, the EDITO
  ingress) handles short requests; SSE needs buffering off and idle timeouts
  above the heartbeat on each, which we cannot check for the ingress.
- **Less to run.** No `LISTEN` connection per API process, no fan-out queues,
  no heartbeat or session re-check loop; the endpoint is one indexed query.
- **Simple in the phase 10 frontend.** TanStack Query's `refetchInterval` does
  it; no `EventSource` reconnect handling.
- **Same data.** The cursor gives the same "nothing missed" guarantee as
  `Last-Event-ID` replay, from the same table.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep SSE (ADR 0008) | Works, but costs a connection per tab, a `LISTEN` connection per API process and proxy settings we cannot check on EDITO, for a latency gain the 10 s controller poll already eats |
| Keep SSE and add polling as a fallback | Two paths to build, test and document for the same events |
| WebSocket | Two-way, which we do not need; the same proxy questions as SSE, plus Upgrade handling |
| Poll the experiment list only, no events endpoint | Works for one list, but a page with several experiments, or an admin view, would re-read every row each time; the cursor returns only what changed |
| Long polling (hold the request until an event or a timeout) | Needs the `LISTEN` fan-out back to wake waiting requests; a fixed interval is enough here |

## Consequences

- Each open tab makes one small request per `POLL_INTERVAL_SECONDS`. At 50
  tabs and 10 s that is 5 requests per second, each one index scan.
- A notification appears up to `poll_after_seconds` later than with SSE.
- Event ids come from a sequence and are taken before commit, so a transaction
  that commits late could insert an id below a cursor a client has already
  passed. Writers are the worker (one leader) and short API transactions, so
  this is unlikely. The endpoints of the experiment stay the truth, and the
  frontend refreshes them on any event.
- The `SSE_HEARTBEAT_SECONDS`, `SSE_REPLAY_MAX_EVENTS` and
  `SSE_REPLAY_MAX_HOURS` settings are gone; nothing in nginx needs
  `proxy_buffering off` for events.
- Web Push or e-mail for "your run finished" with the tab closed can still be
  added on the same rows.
