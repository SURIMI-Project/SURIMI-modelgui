# 0016 — SSO and local users are separate accounts; the provider owns an SSO user's e-mail and names

**Status:** Accepted 2026-11-04 (user)
**Date:** 2026-11-04
**Supersedes:** the account matching in [0004](0004-authentication-local-and-oidc.md) ("or links by verified email")
**Related:** [features/auth-and-users](../features/auth-and-users/README.md), [0005](0005-authorization-roles-and-ownership.md), [0013](0013-data-retention.md)

## Context

- [ADR 0004](0004-authentication-local-and-oidc.md) let a first SSO sign-in
  take over an existing local account when the provider said the e-mail was
  verified. When the e-mail was unverified or already used, the new user got
  the placeholder `<sub>@<provider>.sso.invalid`.
- That left a gap: a linked account kept its local password, so someone whose
  access was removed at the provider could still sign in with the password and
  their last role. **Read from source**, 2026-11-03 (recorded in
  `docs/ISSUES.md`, now closed).
- The user, 2026-11-04: "I don't like to have so much flexibility". Users are
  separate; two users can never have the same e-mail; a first SSO sign-in
  whose e-mail is missing, unverified or taken is **refused**; an SSO user's
  e-mail and names **follow the provider at every sign-in**; users have first
  name, last name and a display name, required for local users and optional
  for SSO users.
- The internal identifier is `users.id`. SSO users are found by the
  provider's `sub` in `identities`, which does not change when the person
  changes e-mail or username at the provider. **Read from source.**

## Decision

1. **No linking.** An SSO sign-in looks up `(provider, sub)` in `identities`
   and nothing else. A local account is never matched by e-mail or username.
2. **Every user has a real, verified, unique e-mail.** `users.email` stays
   unique (case-insensitive, deleted users included). A first SSO sign-in is
   refused with 403 when the provider sends no e-mail or does not mark it
   verified (`email_not_verified`), or when another user has it
   (`email_taken`). The attempt is a `login_events` row with result
   `email_rejected`. No placeholder addresses.
3. **The provider owns an SSO user's profile.** At every sign-in `email`,
   `first_name`, `last_name` and `display_name` are copied from the claims
   `email`, `given_name`, `family_name` and `name`. A new e-mail that is
   unverified or used by another user is not copied: the old one stays, the
   sign-in still works, and `auth.sso_email_not_synced` is logged. Changes
   are audited as `profile.synced` with the field names only. The admin API
   refuses to edit these fields for SSO users (409
   `profile_managed_by_provider`), as it already refuses their role.
4. **Names.** `first_name` and `last_name` are required for local users (admin
   API and `create-admin`) and optional for SSO users. `display_name` is
   always set: given, else "first last", else the username.
5. **Local or SSO** is told apart by the password: local users always have
   one, SSO users never get one (an admin password reset is refused for
   them). The API shows it as `account`: `local` or `sso`.

## Why

- No linking removes the takeover path and the leftover-password gap
  together, without extra rules for linked accounts.
- A refused sign-in with a clear message is better than an account with a
  fake address that cannot receive notifications and confuses admins.
- The provider is already the source of truth for an SSO user's role
  ([0005](0005-authorization-roles-and-ownership.md)); owning their e-mail and
  names too keeps one rule for SSO users and keeps the address usable after
  the person changes it there.
- Keeping the old e-mail when the new one is taken does not lock a person out
  because of someone else's account.
- First and last name allow sorting by surname and formal greetings;
  display name stays for what the screens show. Optional for SSO, because
  not every provider sends `given_name` and `family_name`.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Link by verified e-mail (ADR 0004) | Takeover risk if a provider marks e-mails verified carelessly; the linked account keeps its local password |
| Separate accounts with a placeholder e-mail on a clash | A user with no usable address; two people who look the same to an admin |
| Allow the same e-mail on a local and an SSO account | E-mail sign-in becomes ambiguous; notifications to one address for two users |
| Freeze the e-mail at the first sign-in | Stale addresses after a change at the provider |
| Refuse the sign-in when the new e-mail is taken | Locks a person out because of another account |
| A single `display_name` (as before) | No surname to sort by; user asked for first and last name |
| An explicit `users.account` column | Same information as `password_hash IS NULL` today; a column would have to be kept in step |

## Consequences

- A person who has a local account and signs in through SSO with the same
  e-mail is refused. They use the local account, or an admin deletes it
  first. An admin action to move a local user to SSO can be added later if
  needed.
- People whose provider account has no verified e-mail cannot use SSO until
  it is verified there.
- Migration `0003_user_names`: `first_name`, `last_name`, `display_name` NOT
  NULL (backfilled from the username), `login_result` value
  `email_rejected`.
- `create-admin` needs `ADMIN_FIRST_NAME` and `ADMIN_LAST_NAME`; a partly
  set group of `ADMIN_*` now fails instead of doing nothing.
- Deleting a user (ADR 0013) must anonymise first and last name too.
