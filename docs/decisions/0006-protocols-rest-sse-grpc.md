# 0006 — REST/JSON between browser and backend; native gRPC between backend and controller

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [ARCHITECTURE.md](../ARCHITECTURE.md#protocols), [0008](0008-notifications-sse.md), [0011](0011-controller-stubs-from-buf-registry.md)

## Context

- Today the browser speaks gRPC-Web to Envoy, which forwards native gRPC to the
  controller (`envoy/envoy.yaml.template`, `src/lib/services/controller.ts`).
  **Read from source.**
- The controller only speaks gRPC and has no authentication. **Read from
  source** (proto, and the Bruno collection calls it without credentials).
- The backend adds cookie-based auth, role checks, pagination and filters, and
  admin endpoints that have no equivalent in the controller.

## Decision

- **Browser ↔ backend:** REST with JSON under `/api/v1`, described by the
  OpenAPI 3.1 document FastAPI generates. The frontend uses a typed client
  generated from it (`openapi-typescript` and `openapi-fetch`) and TanStack
  Query for caching and refetching.
- **Backend → controller:** native gRPC over HTTP/2 with TLS using `grpc.aio`,
  with a deadline on every call and retries on `UNAVAILABLE` for the read RPCs.
- **Notifications:** Server-Sent Events, see ADR 0008.
- Envoy, the `/api/controller` nginx location, the connect-web client and the
  frontend's `apps/frontend/src/gen/` are removed once the frontend uses the
  backend.

## Why

- Browsers cannot send native gRPC; gRPC-Web needs a proxy and gains nothing
  for request/response calls a browser makes.
- REST with cookies needs nothing extra for auth; Bruno, curl and browser dev
  tools work without plugins; OpenAPI gives the frontend the same type safety
  that the proto stubs give today.
- Server to server, native gRPC is the controller's own protocol: no
  translation layer, deadlines and status codes carry through.
- Taking the controller off the public path is required: without auth it would
  let anyone remove any experiment.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep gRPC-Web from the browser and add our own gRPC service | Needs Envoy for ever; cookie auth, file downloads and SSE are awkward over gRPC-Web; fewer tools |
| Connect protocol (connect-python) for our API | Lets the browser call protobuf services over plain HTTP, but connect-python is young and the admin and filter endpoints fit REST better |
| GraphQL | Flexible queries are not needed; adds a schema layer and caching complexity |
| Backend as a transparent gRPC proxy | Gives no place for ownership, validation or history |

## Consequences

- The frontend's data layer is rewritten once (phase 10 of the plan, if the user agrees).
- The backend maps proto messages to Pydantic schemas; the mapping is tested.
- The OpenAPI document is versioned with the code; breaking changes go to
  `/api/v2`.
