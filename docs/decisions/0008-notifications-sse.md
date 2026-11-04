# 0008 — Notifications over Server-Sent Events, fed by PostgreSQL LISTEN/NOTIFY

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [features/notifications](../features/notifications/README.md), [0007](0007-scheduler-worker-postgres-queue.md)

## Context

- Users should be told when their experiment changes state (started, finished,
  failed, cancelled, outputs ready) without refreshing. Admins may watch all.
- Every notification goes from server to browser; the browser sends nothing
  back on that channel. Commands (submit, cancel) are REST calls.
- The status change is detected in the worker, but the browser is connected to
  an API process. There may be more than one API replica.
- The request mentioned WebSockets as a possibility.

## Decision

- `GET /api/v1/events` returns `text/event-stream`, authenticated by the
  session cookie. Each event has an `id` (the `experiment_events.id`), a `type`
  (`experiment.status_changed`, `experiment.outputs_ready`, …) and JSON data.
- The worker writes the event row and runs `NOTIFY experiment_events, '<id>'`
  in the same transaction. Each API process holds one `LISTEN` connection and
  fans events out to its connected clients, filtered by owner (admins get all).
- On reconnect the browser sends `Last-Event-ID`; the API replays missed
  events from the table, so nothing is lost while a laptop sleeps.
- Heartbeat comment every 20 s so proxies keep the connection open; nginx has
  `proxy_buffering off` on that location.
- The frontend invalidates the matching TanStack Query caches on each event and
  shows a toast.

## Why

- SSE fits one-way traffic: plain HTTP, the browser's `EventSource` reconnects
  by itself and supports `Last-Event-ID`, cookies are sent as with any request.
- Events stored in a table give replay and history for free; the same rows feed
  the activity statistics.
- `LISTEN/NOTIFY` delivers across processes with the database we already have.

## Alternatives considered

| Option | Why not |
| --- | --- |
| WebSocket | Two-way, which we do not need; reconnect, replay and heartbeats are ours to write; needs Upgrade support in every proxy (nginx, EDITO ingress). Kept as the option if a two-way need appears (live collaboration, interactive steering) |
| Frontend polling only | Simple, but delay and load grow with users; still kept as a fallback when SSE is unavailable |
| Redis pub/sub between worker and API | Works, but adds Redis only for this |
| Web Push or e-mail | Useful for "your 3-hour run finished" when the tab is closed; possible later on top of the same events |

## Consequences

- Each open tab holds one HTTP connection; uvicorn handles thousands, which is
  far above expected use.
- `NOTIFY` payloads are limited to 8000 bytes, so only the event id is sent and
  the API reads the row.
- Switching to WebSocket later reuses the event table and fan-out; only the
  transport changes.
