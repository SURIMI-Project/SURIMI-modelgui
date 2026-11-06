# 0017 — Frontend Axios request, Zod contracts, and TanStack server state

**Status:** Accepted by the user, 2026-11-05  
**Scope:** Frontend only; refines the proposed client-tooling portion of ADR 0006. REST/native-gRPC boundaries are unchanged.

## Decision

Use `apps/frontend/src/network/` for Axios transport, normalized errors and per-domain service/schema files. Use `src/serverState/` for TanStack Query configuration, query keys and hooks. Infer service payload/response types from Zod. All JSON services use the centralized request function, including authentication.

Retain the supplied Axios approach because it is familiar to the frontend owner. Native fetch would also work but would require replacing that convention. Use explicit schemas for the small implemented API surface rather than introducing OpenAPI-generated client code now. Revisit generation when the API grows; do not maintain two competing handwritten type systems.

## Consequences

Backend Pydantic models remain the API source of truth; Zod validates at the browser boundary. Schemas need updates when those contracts change. A permissive dictionary in OpenAPI cannot provide strict nested simulation types. Session refresh/CSRF handling is centralized and tested. Components do not handle transport errors or tokens directly. No backend, nginx, Compose, protocol or deployment edits are required for this increment.
