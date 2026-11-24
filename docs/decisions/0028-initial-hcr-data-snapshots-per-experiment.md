# 0028 — Every distinct answer of `GetInitialHCRData` is kept as a snapshot, and each experiment points to the one it was submitted with

**Status:** Accepted 2026-11-23 (user)
**Date:** 2026-11-23
**Related:** [0027](0027-hcr-initial-data-and-defaults-from-the-controller.md), [plan 2026-11-23-hcr-initial-data-from-controller](../plans/2026-11-23-hcr-initial-data-from-controller.md), [features/experiments](../features/experiments/README.md), [features/harvest-control-rules](../features/harvest-control-rules/README.md)

## Context

- ADR 0027: the form always reads the initial values and default rules live
  from `GetInitialHCRData`; nothing is cached for it.
- The values change whenever the Ecopath team regenerates
  `<scenario>_initial_hrc_data.csv`. They already changed once without a
  version mark: the new initial biomasses are 12× the old RPC's
  (**Verified** 2026-11-23). The defaults look about 54× too small and may be
  corrected (see [ISSUES.md](../ISSUES.md)).
- An experiment stores the rules it sent (`experiments.request`), but not
  the reference values and defaults the user built them from. Once the file
  changes, nobody can tell what a rule was compared against, or which
  experiments used the old values.
- The user, 2026-11-23: keep the initial HCR data so we can track whether it
  changes over time, per experiment.
- Size: `northwestern_med` has 91 entries with nine fields each, about 15 KB of
  JSON. Most experiments of a scenario will see the same answer.

## Decision

A table `initial_hcr_snapshots` holds every distinct answer per scenario:
`id`, `scenario_name`, `content_hash` (SHA-256 of the entries in canonical
JSON, sorted by `species_code`, `length_class`, `age`, lower-cased
`life_stage`), `entries` (`jsonb`, the values as the controller sent them, 0
kept as 0), `entry_count` and `first_seen_at`; unique on
`(scenario_name, content_hash)`. Every time the backend gets an answer (form
options, `GET …/initial-hcr-data`, experiment submit) it inserts it with
`ON CONFLICT DO NOTHING`, so a row appears only when the values change.
`POST /experiments` calls the controller once more and sets
`experiments.initial_hcr_snapshot_id` (nullable foreign key) to that answer's
snapshot. If the controller fails then, the experiment is still accepted
without one and its events say so. Snapshots are a record only: the form never
reads them (ADR 0027) and they are never purged. Read them at
`GET /api/v1/experiments/{id}/initial-hcr-data` (owner or admin: the snapshot
plus, per rule, the default it could start from and whether the user changed
it) and `GET /api/v1/scenarios/{name}/initial-hcr-data/history[/{snapshot_id}]`
(any signed-in user: the snapshots newest first, and one with its entries).

## Why

- The user wants the change over time per experiment; a pointer per
  experiment answers "what did this run see", and the table ordered by
  `first_seen_at` answers "when did the values change" for a scenario, also
  when no experiment ran in between.
- The hash removes duplicates: one row per version, not one copy per
  experiment, and detecting a change is a unique-key conflict, not a JSON
  comparison.
- Storing the values as sent (0 included, no renaming) keeps the record
  faithful even if our mapping changes later.
- Capturing at submit is the moment the user's rules are fixed; an experiment
  must not fail because a reference read failed (ADR 0027, requirement 6 of the
  plan).

## Alternatives considered

| Option | Why not |
| --- | --- |
| Do nothing (ADR 0027 alone) | The user asked for the history; without it a corrected file silently changes what past experiments appear to have been compared against |
| Copy the answer into each experiment (`request` or a new `jsonb` column) | About 15 KB duplicated per experiment; no history for a scenario between experiments; `request` must stay what was sent to the controller |
| Keep only the entries the experiment has rules for | Loses the other reference values and makes snapshots of one scenario incomparable |
| Record only at submit, not on every fetch | Misses changes seen in the form between experiments; recording on every fetch costs one `INSERT … ON CONFLICT DO NOTHING` |
| Use the latest snapshot when the controller fails at submit | Claims a value the experiment never saw at that time |

## Consequences

- Migration: table `initial_hcr_snapshots`, its unique index, and column
  `experiments.initial_hcr_snapshot_id` (no `ON DELETE CASCADE`: purging an
  experiment leaves its snapshot as history). `docs/database/schema.dbml`,
  `indexes.sql` and the database README gain them.
- Every fetch writes when the values are new, so a GET can insert a row;
  that is acceptable for a record that changes a few times a year.
- Submit makes one more controller call (about the same cost as the form's).
- The table grows by one row per distinct answer per scenario, a few KB each,
  and is never purged.
- Snapshots taken before the Ecopath file is corrected stay as they were, so
  the experiments that used them can be found by `initial_hcr_snapshot_id`.
