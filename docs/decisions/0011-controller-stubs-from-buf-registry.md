# 0011 — Generate the controller stubs from buf.build/surimi/surimi-protocol at a pinned version

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [0006](0006-protocols-rest-sse-grpc.md), [ISSUES.md](../ISSUES.md)

## Context

- Today `buf.gen.yaml` generates TypeScript from `proto/surimi.binpb`, a
  descriptor set pulled by server reflection from the `rikkert` controller
  (`npm run proto:pull`). **Read from source.**
- That descriptor lacks `GetSimulationStatuses`, which the published module
  has. **Verified** 2026-11-03 by exporting `buf.build/surimi/surimi-protocol`
  and comparing with `src/gen/surimi/v1/controller_service_pb.d.ts`.
- The `project-surimi` controller has reflection turned off. **Verified**
  2026-11-03 (`grpcurl … list`: "server does not support the reflection API").
- The module is public on the Buf Schema Registry; `buf export` works without
  credentials. **Verified** 2026-11-03.

## Decision

`packages/proto/` is a uv workspace package, `surimi-protocol`. Its
`pyproject.toml` pins the module and commit (`[tool.surimi-protocol]`, today
`b10b05a0ca7f4712a333392a7d431b25`, 2026-10-20). `generate.py` runs
`buf export` on the pin and `grpcio-tools`' protoc for messages, type stubs
(`.pyi`) and gRPC stubs into `packages/proto/src/{surimi,buf}/`, and sets the
runtime lower bounds (`grpcio`, `protobuf`) to the versions it generated with.
The generated code is committed. CI job `proto-stubs` regenerates and fails on
a diff. *As built 2026-11-03; first planned as a `buf.gen.yaml` with remote
plugins, changed because the local `grpcio-tools` version decides which
`grpcio` and `protobuf` runtime the code needs, and remote plugins are rate
limited without a Buf account.* Upgrading the protocol
is a pull request that changes the pin, the generated code and the mapping
tests. The frontend no longer needs protobuf stubs (ADR 0006).

## Why

- The registry is the published contract, owned by the controller team;
  reflection gives whatever one deployment happens to run, and may be off.
- Pinning means a protocol change upstream never changes our build silently.
- Committed stubs let the backend build without network access to the registry,
  and the diff in review shows what the protocol change was.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep pulling descriptors by reflection | Already out of date; impossible against `project-surimi` |
| Buf's generated SDK packages from `buf.build/gen/python` | Convenient, but a package index we do not control in the build path |
| Generate at build time, not committed | Builds depend on the registry being reachable; changes are invisible in review |
| Copy the `.proto` files into the repo | Becomes a fork of the contract |

## Consequences

- `apps/frontend/proto/`, `apps/frontend/src/gen/` and the `proto:pull`/`proto:gen` scripts are removed when
  the frontend stops calling the controller.
- Someone must watch for new protocol versions; `GetProtocolVersion` is logged
  at worker start and compared with the pinned version.
