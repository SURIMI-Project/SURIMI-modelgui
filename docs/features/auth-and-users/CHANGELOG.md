# Authentication and users — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-04 — Role from the `groups` claim

Decided by the user, 2026-11-04: the role comes from the token's `groups`
claim, with `surimi-admins` → admin and `surimi-members` → member. Recorded
in [ADR 0005](../../decisions/0005-authorization-roles-and-ownership.md)
(Keycloak setup and why) and the README's claim table. No backend code
change: the claim path was already configuration.

**Files**

- `deployments/compose.yml` — defaults `OIDC_KEYCLOAK_ROLE_CLAIM=groups`,
  `OIDC_KEYCLOAK_ADMIN_VALUES=surimi-admins`,
  `OIDC_KEYCLOAK_MEMBER_VALUES=surimi-members`.
- `deployments/keycloak/surimi-realm.json` — Group Membership mapper (claim
  `groups`, full path off, ID token, access token, userinfo) instead of the
  client-role mapper; client roles removed; users get fixed ids, so a
  re-import keeps their `sub` (otherwise ADR 0016 refuses them as new people
  with a taken e-mail).
- `apps/backend/tests/test_sso.py` — the fake provider sends `groups`;
  `tests/test_auth_units.py` — new test: `/surimi-admins` does not match
  `surimi-admins`.
- `deployments/.env.example`, ADR 0005, this feature's README.

**Verified:** `pytest` 144 passed. Keycloak recreated from the new realm:
the stored claim is `["surimi-admins"]` for alice and `["surimi-members"]`
for bob; alice admin, bob member, carol 403; bob moved to `surimi-admins` →
admin at the next sign-in, removed from every group → refused and his
session ended; the ADR 0016 checks pass again. The old SSO test users alice
and bob were deleted from the local database first: their `sub` came from
the earlier import.

**Deploy:** a Keycloak that used client roles needs the Group Membership
mapper on the client (claim `groups`, *Full group path* off), or keep client
roles by setting `OIDC_KEYCLOAK_ROLE_CLAIM`, `_ADMIN_VALUES`,
`_MEMBER_VALUES` to the old values.

---

## 2026-11-04 — Separate SSO and local accounts; first, last and display name

Decided by the user, 2026-11-04, recorded as
[ADR 0016](../../decisions/0016-separate-sso-and-local-accounts.md) (it
supersedes the account matching of ADR 0004).

**What changed**

- No linking: an SSO user is found by `(provider, sub)` only. The old
  "link by verified e-mail" branch, the placeholder e-mail
  `<sub>@<provider>.sso.invalid` and the `identity.linked` audit event are
  gone. This also fixes the open issue "a linked account keeps its local
  password after SSO access is removed" (deleted from `docs/ISSUES.md`).
- A first SSO sign-in is refused with 403 `email_not_verified` (no e-mail,
  or not verified) or `email_taken` (another user has it, compared without
  case, deleted users included). `login_events` result `email_rejected`, log
  `auth.sso_email_rejected`.
- At every SSO sign-in the e-mail, first, last and display name follow the
  claims `email`, `given_name`, `family_name`, `name`; audit
  `profile.synced` with the field names. A new e-mail that is unverified or
  taken is not copied (log `auth.sso_email_not_synced`), and the sign-in
  goes on.
- Users have `first_name` and `last_name` (required for local users) and a
  required `display_name` (given, else "first last", else the username). The
  admin API takes them on create and update, searches them (`q`) and sorts by
  `last_name`; for SSO users they are read-only (409
  `profile_managed_by_provider`). `UserOut` gains `first_name`, `last_name`
  and `account` (`local` or `sso`).
- `create-admin` needs `--first-name` and `--last-name`, or
  `ADMIN_FIRST_NAME` and `ADMIN_LAST_NAME` with `--from-env`. A partly set
  group of `ADMIN_*` now exits 2 instead of doing nothing.

**Files**

- `apps/backend/src/surimi_backend/auth/service.py` — `SsoProfile`,
  `_create_sso_user`, `_email_rejected`, `_sync_profile`; linking removed.
- `auth/errors.py` (`EmailNotVerifiedError`, `EmailTakenError`),
  `auth/models.py` (`LoginResult.EMAIL_REJECTED`).
- `users/models.py` (`first_name`, `last_name`, `display_name` not null,
  `User.is_sso`, `default_display_name`), `users/schemas.py`,
  `users/service.py` (`Names`, `ProfileManagedByProviderError`, names in
  `create_user`, `update_user`, `ensure_admin`), `users/repository.py`
  (`email_taken(excluding=)`, search and sort by names, `get_by_email`
  removed), `users/router.py`.
- `migrations/versions/20261104_0003_user_names.py` — new.
- `core/config.py` (`ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`), `cli.py`
  (`--first-name`, `--last-name`; `alembic_config()` typed as `Config`, so
  two `type: ignore` are gone).
- Tests: `test_sso.py` (linking tests replaced by refusal, sync and
  display-name tests), `test_admin_users.py` (names required, default and
  following display name, SSO profile read-only), `test_cli.py` (names,
  partly set `ADMIN_*`), `test_database.py` (head revision from Alembic, not
  a literal), `fake_idp.py` (userinfo endpoint), `conftest.py`.
- `deployments/compose.yml` (`ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` to
  `migrate`), `deployments/.env.example`.
- Bruno: `api/admin/users/post user.yml` (body with names), `patch user.yml`,
  `get users.yml`, `folder.yml`, `api/auth/get me.yml`, `get sso login.yml`.

**Verified**

- Ruff, format, mypy strict (50 files) clean; `pytest` 143 passed (71 unit,
  72 integration).
- Migration on the compose database with the data of 2026-11-03: upgrade
  backfilled `display_name`; downgrade to `0002_auth` removed
  `email_rejected` and rebuilt `login_events_failed_at_idx`; upgrade again;
  `alembic check` no drift.
- Against Keycloak 26.4 in compose: alice's names copied; a Keycloak user with
  the local admin's e-mail refused with 403 `email_taken`, no user created;
  bob's new e-mail and first name copied at his next sign-in; an admin edit
  of bob's name refused with 409. Role checks of 2026-11-03 rerun, same
  results. Bruno requests replayed: 18 of 18 as documented.

**Not verified:** a provider that sends no `given_name` or `family_name`
against a real server (fake provider only).

**Deploy:** migration `0003_user_names`. Set `ADMIN_FIRST_NAME` and
`ADMIN_LAST_NAME` wherever `ADMIN_*` is set, or the `migrate` job fails.

---

## 2026-11-03 — ADR 0004 accepted

The user accepted [ADR 0004](../../decisions/0004-authentication-local-and-oidc.md)
as built (local password and generic OIDC, one backend session, `httpx` and
`PyJWT` for the OIDC client). Files: the ADR's status line,
`docs/decisions/README.md`. From now on it changes only through a new ADR
that supersedes it. No code change.

---

## 2026-11-03 — Phase 3: password and OIDC sign-in, sessions, users, admin API

**Status:** built on `feature/monorepo-and-backend`, not merged. Backend and
API only; no frontend change (phase 10).

**Verified:**

- Quality gate: Ruff and Ruff format clean, mypy strict clean (49 files),
  `pytest`: 134 passed (71 unit, 63 integration with PostgreSQL in
  testcontainers). `alembic check` against the compose database: no drift.
  Migration `0002_auth` upgrade, downgrade and upgrade again.
- Compose stack with `--profile keycloak` (Keycloak 26.4), through nginx on
  `localhost:18080`: the `migrate` job created the admin from `ADMIN_*`;
  password sign-in as that admin; `/api/v1/scenarios` from the real
  controller `user-alexiosgkikas` (200 when signed in, 401 without).
- SSO through Keycloak's real login form (scripted browser): alice → admin,
  bob → member, carol → 403 `no_access`. Bob moved from `surimi-members` to
  `surimi-admins` with the Keycloak admin API → admin at the next sign-in, and
  `GET /api/v1/admin/users` → 200. Bob removed from every group → next
  sign-in 403, and his earlier session → 401.
- Every new Bruno request replayed against the stack by a script that reads
  the request files (18 requests, every status as documented). The Bruno
  app and CLI were not run: the CLI could not be downloaded in this session.
  Open the collection in Bruno once to confirm it loads.

**Not verified:** realm-role and group claim shapes against a real Keycloak
(unit tests only); behaviour behind https with `COOKIE_SECURE=true`.

**Not built from the design:** `OIDC_RESYNC_ON_REFRESH` (column
`sessions.idp_refresh_token_enc` reserved), provider back-channel logout, the
metric `surimi_logins_total`, the retention purge job (phase 5).

### Backend

- `apps/backend/src/surimi_backend/auth/` — new: `passwords.py` (Argon2id via
  pwdlib in a thread, policy), `tokens.py` (access JWT, flow JWT, opaque
  tokens), `sessions.py` (create, rotate with reuse detection, revoke),
  `ratelimit.py` (per-IP counter), `history.py` (sign-in events, IP and user
  agent retention switches, failures since last success), `role_mapping.py`,
  `cookies.py`, `dependencies.py` (`CurrentUser`, `AdminUser`, CSRF),
  `errors.py`, `schemas.py`, `service.py`, `router.py`, `models.py`.
- `apps/backend/src/surimi_backend/integrations/oidc.py` — new: generic OIDC
  client on httpx and PyJWT (discovery with a separate URL, PKCE S256, Basic
  client auth, ID token checks, userinfo, JWKS refetch on unknown key).
- `apps/backend/src/surimi_backend/users/` — new: `User`, `Identity`,
  repository, service (`create_user`, `update_user`, `reset_password`,
  `ensure_admin`), admin router `/api/v1/admin/users`.
- `apps/backend/src/surimi_backend/audit/` — new: `AuditEvent`, `record()`.
- `apps/backend/src/surimi_backend/migrations/versions/20261103_0002_auth.py` —
  six tables, four enums, the indexes of `docs/database/indexes.sql`.
- `apps/backend/src/surimi_backend/core/config.py` — sign-in, cookie, rate
  limit, retention, OIDC and admin settings; `JWT_SECRET` checked at `serve`.
- `apps/backend/src/surimi_backend/catalog/router.py` — scenarios now need a
  signed-in user.
- `apps/backend/src/surimi_backend/cli.py` — `create-admin` (`--email`,
  `--username`, `--from-env`, `--reset-password`).
- `apps/backend/pyproject.toml` — `pwdlib[argon2]`, `pyjwt[crypto]`, `httpx`,
  `pydantic[email]`; dev `types-protobuf`, `types-grpcio`.
- `apps/backend/tests/` — `conftest.py` fixtures (PostgreSQL, users, sign-in
  helpers), `fake_idp.py`, `test_auth_units.py`, `test_auth_password.py`,
  `test_admin_users.py`, `test_sso.py`, `test_cli.py`; existing tests signed in.

Found and fixed while verifying:

- A sign-in refused because the provider no longer grants a role now also
  revokes the user's sessions (`access_removed`) and writes an audit event;
  before, their refresh token kept working up to 12 h. Only users already
  linked to that provider are affected: a local account matched by e-mail
  that has no role at the provider keeps its sessions. Two tests.
- Reuse tests send the old refresh token in an explicit `Cookie` header
  instead of httpx's deprecated per-request `cookies=`.

### Deploy and config

- `deployments/compose.yml` — `keycloak` service (profile `keycloak`, port
  18083, realm import, `KC_HOSTNAME_BACKCHANNEL_DYNAMIC`); `api` gets
  `JWT_SECRET`, `PUBLIC_BASE_URL`, `COOKIE_SECURE`, `OIDC_PROVIDERS`,
  `OIDC_KEYCLOAK_*`, `RETENTION_LOGIN_IP_DAYS`,
  `RETENTION_LOGIN_USER_AGENT_DAYS`; `migrate` runs
  `create-admin --from-env` with `ADMIN_*`.
- `deployments/keycloak/surimi-realm.json` — new dev realm.
- `deployments/.env.example` — sign-in, admin and Keycloak sections.

### Bruno

- `resources/bruno/surimi-modelgui/api/folder.yml` — bearer `{{accessToken}}`
  for every API request; docs.
- `api/auth/` — new: `post token` (stores `accessToken`), `get me`,
  `get providers`, `post login` (stores `csrfToken`), `post refresh`,
  `post password`, `post logout`, `get sso login`.
- `api/admin/users/` — new: `get users`, `post user` (stores `userId`),
  `get user`, `patch user`, `post user reset password`.
- `environments/local.yml`, `alexiosgkikas.yml`, `project-surimi.yml` —
  `login`, secrets `password`, `newPassword`, `accessToken`, `csrfToken`,
  `userId`.
- `.claude/skills/bruno/SKILL.md` — bearer folder auth and script syntax,
  `post token` instead of `post login`.

### Docs

`README.md` of this feature (as built), [ADR 0004](../../decisions/0004-authentication-local-and-oidc.md)
(httpx and PyJWT instead of authlib, token endpoint, role from the database,
access removal), `docs/database/` (`sessions.previous_refresh_token_hash`
and its index; DBML checked against the migrated database),
`docs/ARCHITECTURE.md`, `docs/ISSUES.md`, the plan, `docs/CHANGELOG.md`,
`README.md`, `CLAUDE.md`.

**Deploy:** run the migrations (`surimi-backend migrate`), set `JWT_SECRET`
(at least 32 characters), `PUBLIC_BASE_URL`, and the first admin with
`ADMIN_*` and `create-admin --from-env`. For SSO register the redirect URI
`<PUBLIC_BASE_URL>/api/v1/auth/sso/<key>/callback` at the provider. Every API
route except health and sign-in now needs a signed-in user.
