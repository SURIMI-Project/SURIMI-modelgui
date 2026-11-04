# 0013 — Retention: short for operational logs, 13 months for sign-in history, minimal personal data

**Status:** Proposed
**Date:** 2026-11-03
**Related:** [0010](0010-observability-and-activity-tracking.md), [features/observability-and-activity](../features/observability-and-activity/README.md)

## Context

- The user asked, 2026-11-03, how long logs can be kept and whether we should
  store this much information.
- Two kinds of "log": **operational logs** (stdout lines, metrics, traces)
  for debugging, and **activity records** in the database (`login_events`,
  `audit_events`, `experiment_events`) for statistics and accountability.
- Size is not the problem. Estimate: 100 users × 3 sign-ins a day ≈ 110,000
  `login_events` rows a year, about 25 MB with indexes. Experiment events are
  a few dozen per run.
- Privacy is the problem. IP addresses, user agents, emails and activity
  timelines are personal data under the GDPR, which applies to this EU
  project. GDPR requires keeping personal data no longer than needed for the
  stated purpose (storage limitation) and collecting no more than needed (data
  minimisation). It sets no fixed number of days; the periods below are our
  proposal and should be confirmed with the project's data protection contact.

## Decision

| Data | Where | Kept | Then |
| --- | --- | --- | --- |
| Application logs (stdout JSON) | Log platform; Docker `json-file` locally | 30 days | Deleted by the platform. Compose: `max-size: 10m`, `max-file: 5` |
| Metrics | Prometheus | 15 days (Prometheus default) | Expire |
| Traces | OTLP collector | 7 days | Expire |
| `login_events` rows | PostgreSQL | 13 months | Rolled up into `login_stats_monthly` (user, month, method, successes, failures), then deleted |
| `ip` in `login_events` | PostgreSQL | 90 days (`RETENTION_LOGIN_IP_DAYS`) | Set to `NULL` |
| `user_agent` in `login_events` | PostgreSQL | 90 days (`RETENTION_LOGIN_USER_AGENT_DAYS`) | Set to `NULL` |
| `users.last_login_at`, `login_count` | PostgreSQL | Life of the account | — |
| `sessions` | PostgreSQL | Until expiry or revocation + 30 days | Deleted |
| `audit_events` | PostgreSQL | 24 months | Deleted |
| `experiment_events` | PostgreSQL | Life of the experiment | Deleted with it |
| Soft-deleted experiments and their output metadata | PostgreSQL | 12 months after deletion | Purged |
| Output cache | Worker volume | LRU up to `OUTPUT_CACHE_MAX_GB` | Evicted; the source stays in the bucket |
| Deleted user | PostgreSQL | — | E-mail, username, first, last and display name replaced by a placeholder; rows keep the user id, so totals stay correct; IPs removed |

What we do **not** store:

- Passwords, tokens, cookies or `Authorization` headers, anywhere, including
  logs.
- The login string of a failed attempt when it matches no user (people type
  passwords into the username field). Failed attempts on a known user store
  only the user id.
- Full request bodies in logs. Experiment parameters are stored once, in
  `experiments.request`, where they are needed.

A daily worker task `purge_retention` applies the table rows above (see Mechanism). Every
period is a setting (`RETENTION_LOGIN_EVENTS_DAYS=395`,
`RETENTION_LOGIN_IP_DAYS=90`, `RETENTION_LOGIN_USER_AGENT_DAYS=90`,
`RETENTION_AUDIT_DAYS=730`,
`RETENTION_SESSIONS_DAYS=30`, `RETENTION_DELETED_EXPERIMENTS_DAYS=365`).

## Why

- **30 days of application logs** covers the time between a problem and
  someone looking at it (the 2026-10-30 stuck runs were investigated within
  days). Older debugging needs are rare, and logs hold IPs and ids.
- **13 months of sign-in history** lets admins compare a month with the same
  month last year. The monthly roll-up keeps the statistics the user asked for
  (count of sign-ins, last sign-in) for ever without keeping per-event personal
  data.
- **90 days of IPs** is long enough to investigate a suspicious sign-in, which
  is their only purpose.
- **24 months of audit** covers a project period and a review cycle for who
  changed whose role or cancelled whose run.
- **Settings, not constants:** a deployment with different rules (EDITO, a
  partner) changes numbers, not code.

## Where IP addresses and user agents are kept

Asked by the user, 2026-11-03. Exactly two places, nowhere else:

| Place | What | How long | Why |
| --- | --- | --- | --- |
| `login_events.ip`, `login_events.user_agent` | One row per sign-in attempt | Each 90 days by default, set separately; then set to `NULL`; the row stays | Investigating a suspicious sign-in or a password-guessing attack |
| Access logs of nginx and uvicorn (stdout) | Client IP per request; no user agent | 30 days (log platform) | Debugging and abuse investigation |

Not stored in `sessions`, `audit_events`, `experiment_events`, experiments or
our structured application log lines. Rate limiting of sign-ins keys on the IP
in memory only.

Settings, one per field so each can have its own period:

| Setting | Default | `0` means |
| --- | --- | --- |
| `RETENTION_LOGIN_IP_DAYS` | 90 | IP is never stored |
| `RETENTION_LOGIN_USER_AGENT_DAYS` | 90 | Browser is never stored |

For the access logs, `LOG_CLIENT_IP=false` drops the IP; `LOG_IP_TRUNCATE=true`
keeps only the network part (`/24` IPv4, `/48` IPv6). Behind nginx and the
EDITO ingress the real client IP comes from `X-Forwarded-For`, trusted only
from the proxies in `TRUSTED_PROXIES`; otherwise we would store the ingress
address, which is useless.

## Mechanism: what enforces each period

Retention is only real if something deletes the data. Each kind of data has
its own mechanism:

| Data | Mechanism | Where it is configured |
| --- | --- | --- |
| Our tables (`login_events`, `sessions`, `audit_events`, soft-deleted experiments and their series) | Worker task `purge_retention`, a Procrastinate periodic task, daily at 03:00 UTC, one run at a time across workers | `RETENTION_*` env vars |
| IP and user agent | Same task, one `UPDATE` per field: `ip = NULL` for rows older than `RETENTION_LOGIN_IP_DAYS`, `user_agent = NULL` for rows older than `RETENTION_LOGIN_USER_AGENT_DAYS` | `RETENTION_LOGIN_IP_DAYS`, `RETENTION_LOGIN_USER_AGENT_DAYS` |
| Monthly roll-up | Same task, same transaction as the delete: `INSERT … ON CONFLICT DO UPDATE` into `login_stats_monthly`, then delete the rolled-up rows | — |
| Deleted user | Immediately, in the delete request: personal fields replaced, IPs nulled, an audit event written | — |
| Application logs | Not ours to delete: the log platform's retention (for example Loki `retention_period: 720h`). Locally, Docker `json-file` rotation (`max-size: 10m`, `max-file: 5`) and on Kubernetes the kubelet's rotation, both size-based, not time-based | Log platform; compose `logging`; Helm values |
| Metrics | Prometheus `--storage.tsdb.retention.time=15d` | Prometheus config |
| Traces | Retention of the trace store (for example Tempo `block_retention: 168h`) | Trace store config |
| Database backups | Backup CronJob keeps 7 daily and 4 weekly dumps; older dumps deleted by an S3 lifecycle rule on the backup prefix. Deleted rows survive in backups for up to 35 days, which the privacy notice must say | Helm `postgresql.backup` |
| Map chunk cache | In memory, bounded by size (`OUTPUT_CHUNK_CACHE_MB`); nothing to expire | — |
| Raw outputs in the bucket | Owned by the controller team; an S3 lifecycle rule if they agree a period | Bucket owner |

How `purge_retention` works:

- **Batched:** deletes and updates run in batches of 5,000 rows by primary
  key (`… WHERE id IN (SELECT id … WHERE at < :cutoff LIMIT 5000)`), each in
  its own short transaction, so no long locks and no huge transactions. The
  `at` indexes make each batch an index range scan.
- **Idempotent:** a failed or interrupted run is simply repeated the next
  night.
- **Observable:** logs `retention.purged` with table and row counts; metric
  `surimi_retention_rows_total{table,action}`; gauge
  `surimi_retention_oldest_seconds{table}` for the age of the oldest row, so an
  alert fires if purging stops.
- **Tested:** an integration test inserts rows on both sides of each cut-off,
  runs the task, and checks what is left.
- **Volume:** at about 110,000 sign-in rows a year, batched deletes are
  enough. If a table passes about 10 million rows, switch it to monthly
  partitions and drop whole partitions instead, which is instant and leaves no
  table bloat.

## Traceability: what stays, and why GDPR is not against it

GDPR does not forbid tracing who did what. It asks that personal data has a
stated purpose and is kept only as long as that purpose needs (Art. 5(1)(b),
(c), (e)), and it expects records that show the system is secure and
accountable (Art. 5(2), Art. 32). Security and audit logging is a recognised
legitimate interest (Recital 49). The rows in our tables are personal data
because they point to a person: `user_id`, email, IP address. So the question
is not *whether* to keep traceability but *for how long and how detailed*.

With the periods above, this stays traceable:

| Question | Answered by | For how long |
| --- | --- | --- |
| Who submitted, cancelled or deleted experiment X, when, with which inputs | `experiments.owner_id`, `request`, `experiment_events` | As long as the experiment exists, plus 12 months after deletion |
| Who changed whose role, created or deactivated a user, cancelled or deleted someone else's run, downloaded which outputs | `audit_events` | 24 months |
| When did user U sign in, by which method, did it fail | `login_events` | 13 months per event; monthly counts for ever |
| How many sign-ins, last sign-in | `users.login_count`, `last_login_at`, `login_stats_monthly` | For ever (life of the account) |
| From which IP and browser | `login_events.ip`, `user_agent` | 90 days |

Only the most identifying detail (IP, browser) goes early; the "who did what"
trail stays. If the project needs a longer trail, for example until the end of
the project for reporting, raise `RETENTION_AUDIT_DAYS` and
`RETENTION_LOGIN_EVENTS_DAYS` and write the reason here; the code does not
change. This is our reading, not legal advice; the project's data protection
contact decides.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep everything for ever | Breaks GDPR storage limitation; makes a breach worse |
| Store sign-ins only as counters on `users` | Loses per-period statistics and the security trail |
| Keep application logs in the database | Large, slow, mixes debugging data with business data |
| Rely only on the log platform's retention | It does not cover our tables |

## Consequences

- Statistics older than 13 months come from `login_stats_monthly`, at month
  granularity.
- The privacy notice for users must list these periods.
- Open question: confirmation of the periods by the project's data protection
  contact (User).
