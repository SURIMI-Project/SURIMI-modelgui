# 0005 — Roles `admin` and `member` in our database, mapped from SSO claims at every sign-in; ownership enforced in the repository layer

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [features/auth-and-users](../features/auth-and-users/README.md), [features/experiments](../features/experiments/README.md), [0004](0004-authentication-local-and-oidc.md)

## Context

- Two roles. Admin: create users, see and manage every experiment, filter by
  user. The other role: create experiments, see and cancel only their own.
  The request called it SimpleUser; the user asked for a better name,
  2026-11-03.
- User, 2026-11-03: SSO groups or roles must map to our roles, and the mapping
  must be re-applied **at every sign-in**, because a user's roles can change in
  Keycloak.
- The controller has no ownership. **Read from source.**
- Keycloak puts realm roles in `realm_access.roles` and client roles in
  `resource_access.<client_id>.roles` of the access token; groups appear in a
  `groups` claim only when a Group Membership mapper is added to the client.
  **Read from source** (Keycloak mapper docs and general Keycloak behaviour);
  to be checked against our dev realm in phase 3.

## Decision

### Role names

`admin` and `member`, shown as "Admin" and "Member". Admin includes every
member permission: admins submit and run their own experiments like any
member, and can also cancel and delete any user's experiment and download
its outputs. **Confirmed by the user, 2026-11-03.**

### Where a user's role comes from

`users.role_source` is `local` or `idp`.

- **Local users:** role set by an admin in our app.
- **SSO users, provider with a role mapping:** role computed from the token's
  claims at **every** sign-in and written to `users.role`, with
  `role_source = idp` and `role_synced_at`. The admin UI shows the role as
  read-only "managed by <provider>". A change is written to `audit_events`
  (`role.synced`, old and new value).
- **SSO users, provider without a mapping:** new users get
  `default_role`; after that the role is managed in our app like a local user.

### Mapping configuration, per provider

```yaml
oidc_providers:
  keycloak:
    issuer: https://keycloak.example.org/realms/surimi
    client_id: surimi-modelgui
    role_mapping:
      claim: groups                # or resource_access.surimi-modelgui.roles, realm_access.roles
      admin: [surimi-admins]       # any of these → admin
      member: [surimi-members]     # any of these → member
      default: deny                                   # none matched → deny | member
```

Rules, in order: any `admin` value → `admin`; else any `member` value →
`member`; else `default`. `deny` refuses the sign-in with a clear message and a
`login_events` row (`result = no_role`). The claim is read from the ID token,
falling back to the userinfo endpoint. `claim` is a dotted path, so the same
code serves Keycloak client roles, realm roles, groups, or another provider's
claim.

Keycloak setup (user, 2026-11-04): the **`groups` claim**, with groups
`surimi-admins` and `surimi-members`. The `surimi-modelgui` client gets a
Group Membership mapper: claim name `groups`, *Full group path* **off**,
added to the ID token, access token and userinfo. Values are compared
exactly: with *Full group path* on, Keycloak sends `/surimi-admins`, which
does not match unless the configured values carry the slash.

### Taking effect

A role change in the provider takes effect at the next sign-in, which happens
at most `SSO_SESSION_MAX_AGE_HOURS` (12 h) later, or within 15 min with
`OIDC_RESYNC_ON_REFRESH` (not built, [0004](0004-authentication-local-and-oidc.md)). A
demotion from admin revokes the user's sessions; so does a sign-in refused
because the provider no longer grants any role.

### Enforcement

- Route-level checks with the `AdminUser` dependency (`auth/dependencies.py`);
  the role is read from the user row at every request.
- Ownership in one place: experiment repository methods take the current user
  and add `WHERE owner_id = :user_id` unless admin. A missing or foreign
  experiment both return 404.
- Admins see every experiment and can cancel, delete and download any of
  them; their own runs go
  through the same queue and limits as everyone else's.
- Every admin action on another user's data writes `audit_events`.
- Controller experiments not in our table are shown only to admins, as
  unmanaged.

## Why

- **`member` instead of SimpleUser:** "Simple" sounds like a lesser user to the
  scientists using it; `user` collides with the User entity (`user.role ==
  'user'` reads badly and confuses logs); `member` is neutral, common (GitHub,
  GitLab, Slack) and does not assume a profession, which suits a mix of
  researchers, fisheries managers and stakeholders. Domain names like
  `researcher` would be wrong for half of them.
- **The `groups` claim** (user, 2026-11-04): people are managed by putting
  them in a group, which is how realm admins already work, and the token
  says it plainly. Client roles would be scoped to this application and keep
  a shared realm tidier; they stay supported by setting
  `claim: resource_access.surimi-modelgui.roles`. With *Full group path*
  off, a group with the same name elsewhere in the realm (a subgroup
  `/other/surimi-admins`) also counts, so only realm admins may create groups
  with these names.
- **Sync at every sign-in:** the provider is the source of truth for SSO users,
  as requested; writing the result to `users.role` keeps every query (filters,
  statistics, ownership) on one column.
- **Read-only role in our UI for IdP-managed users:** an admin edit would be
  silently overwritten at the next sign-in.
- **`deny` as default:** a person in the realm who was never given access to
  SURIMI does not get in by accident. `member` is available for open
  deployments.
- **Scoping in the repository:** a new endpoint gets ownership by default.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Role names `user`, `researcher`, `scientist`, `operator` | Collides with the entity, or assumes a profession that not every user has |
| Roles only from the provider, nothing stored | Local users have no provider; filters and statistics would need the token |
| Map once at first sign-in | Does not meet the requirement; demotions in Keycloak would never reach us |
| Realm roles | Shared realms mix roles of many apps |
| Permission library (Casbin, Oso) or PostgreSQL RLS | Built for many roles and policies; we have two roles and one ownership rule |
| Checks in each router | Easy to forget in one place |

## Consequences

- `users` gains `role_source` and `role_synced_at`; `identities` stores the
  last claims used (`claims_snapshot`) for troubleshooting.
- Tests cover each experiment endpoint with owner, non-owner and admin, and
  role mapping with every claim shape.
- Adding a third role later means extending the enum, the mapping keys and the
  scope function.
