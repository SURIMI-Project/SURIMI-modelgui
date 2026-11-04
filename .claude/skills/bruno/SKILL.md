---
name: bruno
description: Keep the Bruno collection in resources/bruno/surimi-modelgui in step with the SURIMI controller gRPC API and the backend REST API. Creates a request for every new RPC or endpoint, updates requests when a message, path, body or auth changes, and removes requests for deleted ones. Use whenever a backend route or schema changes, the controller protocol changes, an environment is added, or the user types /bruno.
---

# Sync the Bruno collection

The collection is `resources/bruno/surimi-modelgui/` in OpenCollection YAML, one
`.yml` file per request. It is the team's working client, so a stale request is
a bug.

## Folders

| Folder | Holds |
| --- | --- |
| `grpc-proxy/` | Controller RPCs (`surimi.v1.ControllerService`), `type: grpc`. Called directly or through Envoy |
| `api/` | Backend REST requests, `type: http`, one sub-folder per router (`auth/`, `experiments/`, `admin/`, …), created with the backend |
| `environments/` | One file per target: `local`, `rikkert`, … |

## gRPC requests

Copy a neighbour. The shape is:

```yaml
info:
  name: GetSimulationStatuses
  type: grpc
  seq: <next free number>

grpc:
  url: "{{urlGrpcProxy}}"
  method: /surimi.v1.ControllerService/GetSimulationStatuses
  methodType: unary
  message:
    - title: message 1
      message: |-
        { "experiment_ids": ["{{experiment_id}}"] }
```

- File and `info.name` are the RPC name.
- Field names are the proto snake_case names.
- The message is a valid example the controller accepts today. For
  `northwestern_med`, use only species the scenario's recruitment config
  covers (see `docs/ISSUES.md`); an invalid species fails at `CreateRegulations`.
- The source of truth for messages is `buf.build/surimi/surimi-protocol`, not
  `apps/frontend/proto/surimi.binpb`.

## REST requests

```yaml
info:
  name: post experiment
  type: http
  seq: <next free number>

http:
  method: POST
  url: "{{apiUrl}}/api/v1/experiments"
  body:
    type: json
    data: |
      { ... }
  auth: inherit

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5
```

- File name is lower case, verb first: `get experiments.yml`,
  `post experiment cancel.yml`.
- Base URLs come from environment variables (`{{apiUrl}}`, `{{urlGrpcProxy}}`).
  Never a literal host.
- Auth is set on the `api/` folder (`folder.yml`: `request.auth` with
  `type: bearer`, `token: "{{accessToken}}"`) and inherited with
  `auth: inherit`. A request without an `auth` key sends no auth (use it for
  `get providers`, `post token`, `post login`).
  `api/auth/post token.yml` stores the access token in a script:

  ```yaml
  runtime:
    scripts:
      - type: after-response
        code: |-
          if (res.status === 200) {
            bru.setEnvVar("accessToken", res.body.access_token);
          }
  ```

  `post login` returns cookies, not a token; it is there to try the browser
  flow (`post refresh` needs the `csrfToken` it stores).
- Ids that one request creates and the next needs (`experimentId`, `userId`)
  are stored the same way and declared in every environment file that has an
  `apiUrl`.
- Secrets (`password`, `newPassword`, `accessToken`, `csrfToken`) are
  declared with `secret: true` and no value. Never write a token or password
  into the collection.
- Headers: `http.headers`, a list of `name` and `value`. Query strings go in
  the `url`.

## Docs blocks

Add a `docs:` block when the request needs a role (admin), depends on another
request, has a side effect (submits a run, removes an experiment), or has fields
whose meaning is not obvious. Markdown: one `#` title, then `##` sections
(`Before you run it`, `Body`, `Response`, `Notes`), tables for fields. Link the
feature doc instead of copying the design.

## Changed or removed

- Changed body or message: edit every request that sends it; remove fields the
  API no longer accepts.
- Changed path, method or RPC name: update it and rename the file.
- Removed endpoint or RPC: delete its request files.

## Report

List the request files created, changed and deleted, and say whether they were
run against a live service.
