-- Exact definitions of the indexes that DBML cannot express (partial, DESC,
-- INCLUDE, GIN). The Alembic migrations use these definitions;
-- schema.dbml lists the same indexes by name. Why each one exists:
-- docs/database/README.md § Indexing.
-- Verified on postgres:17-alpine with synthetic data, 2026-11-03.

-- login_events ---------------------------------------------------------------
DROP INDEX IF EXISTS login_events_user_at_idx;
CREATE INDEX login_events_user_at_idx ON login_events (user_id, at DESC);

DROP INDEX IF EXISTS login_events_ip_at_idx;
CREATE INDEX login_events_ip_at_idx ON login_events (at) WHERE ip IS NOT NULL;

DROP INDEX IF EXISTS login_events_ua_at_idx;
CREATE INDEX login_events_ua_at_idx ON login_events (at) WHERE user_agent IS NOT NULL;

DROP INDEX IF EXISTS login_events_failed_at_idx;
CREATE INDEX login_events_failed_at_idx ON login_events (at DESC) WHERE result <> 'success';

-- experiments ----------------------------------------------------------------
DROP INDEX IF EXISTS experiments_stalled_idx;
CREATE INDEX experiments_stalled_idx ON experiments (last_progress_at) WHERE stalled;

DROP INDEX IF EXISTS experiments_owner_created_idx;
CREATE INDEX experiments_owner_created_idx ON experiments (owner_id, created_at DESC)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS experiments_created_idx;
CREATE INDEX experiments_created_idx ON experiments (created_at DESC)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS experiments_status_created_idx;
CREATE INDEX experiments_status_created_idx ON experiments (status, created_at DESC)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS experiments_in_flight_idx;
CREATE INDEX experiments_in_flight_idx ON experiments (status) INCLUDE (owner_id, pods_required)
  WHERE status IN ('submitting', 'submitted', 'initialising', 'initialised', 'running', 'cancelling');

DROP INDEX IF EXISTS experiments_queue_idx;
CREATE INDEX experiments_queue_idx ON experiments (priority DESC, queued_at)
  WHERE status = 'queued';

DROP INDEX IF EXISTS experiments_owner_finished_idx;
CREATE INDEX experiments_owner_finished_idx ON experiments (owner_id, finished_at) INCLUDE (status)
  WHERE finished_at IS NOT NULL;

DROP INDEX IF EXISTS experiments_cloned_from_idx;
CREATE INDEX experiments_cloned_from_idx ON experiments (cloned_from_id)
  WHERE cloned_from_id IS NOT NULL;

DROP INDEX IF EXISTS experiments_deleted_idx;
CREATE INDEX experiments_deleted_idx ON experiments (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- sessions -------------------------------------------------------------------
DROP INDEX IF EXISTS sessions_previous_refresh_token_hash_idx;
CREATE INDEX sessions_previous_refresh_token_hash_idx ON sessions (previous_refresh_token_hash)
    WHERE previous_refresh_token_hash IS NOT NULL;

-- audit_events ---------------------------------------------------------------
DROP INDEX IF EXISTS audit_events_actor_at_idx;
CREATE INDEX audit_events_actor_at_idx ON audit_events (actor_id, at DESC);

DROP INDEX IF EXISTS audit_events_target_at_idx;
CREATE INDEX audit_events_target_at_idx ON audit_events (target_type, target_id, at DESC);

DROP INDEX IF EXISTS audit_events_action_at_idx;
CREATE INDEX audit_events_action_at_idx ON audit_events (action, at DESC);

-- experiment_outputs ---------------------------------------------------------
DROP INDEX IF EXISTS experiment_outputs_todo_idx;
CREATE INDEX experiment_outputs_todo_idx ON experiment_outputs (next_attempt_at)
  WHERE state IN ('pending', 'waiting_for_file', 'indexing');

-- hcr_configurations (ADR 0025) -------------------------------------------------
-- One name per owner and scenario, without case; also serves a user's list for a scenario
-- (GET /scenarios/{name}/hcr-configurations, the experiment options). Expression column:
-- not expressible in DBML. Migration 0007_hcr_configurations.
DROP INDEX IF EXISTS hcr_configurations_name_uq;
CREATE UNIQUE INDEX hcr_configurations_name_uq ON hcr_configurations
  (owner_id, scenario_name, lower(name));

-- initial_hcr_snapshots (ADR 0028) -------------------------------------------------
-- One row per distinct GetInitialHCRData answer per scenario: the conflict target of
-- INSERT ... ON CONFLICT DO NOTHING, and the scenario filter of the history list
-- (GET /scenarios/{name}/initial-hcr-data/history). Migration 0008_initial_hcr_snapshots.
-- experiments.initial_hcr_snapshot_id has no index: no query filters by it, and
-- snapshots are never deleted, so its ON DELETE RESTRICT never scans.
DROP INDEX IF EXISTS initial_hcr_snapshots_scenario_hash_uq;
CREATE UNIQUE INDEX initial_hcr_snapshots_scenario_hash_uq ON initial_hcr_snapshots
  (scenario_name, content_hash);

-- species (ADR 0023) ----------------------------------------------------------
-- Word search on code, English and scientific name. The expression must be the
-- one in catalog/models.py SEARCH_DOCUMENT, or the planner cannot use it.
DROP INDEX IF EXISTS species_search_idx;
CREATE INDEX species_search_idx ON species USING gin
  (to_tsvector('simple', species_code || ' ' || coalesce(name, '') || ' ' || coalesce(scientific_name, '')));

DROP INDEX IF EXISTS species_isscaap_group_idx;
CREATE INDEX species_isscaap_group_idx ON species (isscaap_group);

DROP INDEX IF EXISTS species_family_idx;
CREATE INDEX species_family_idx ON species (family);

DROP INDEX IF EXISTS species_order_or_higher_taxa_idx;
CREATE INDEX species_order_or_higher_taxa_idx ON species (order_or_higher_taxa);

-- sort=name / sort=scientific_name, ties by code; read backwards for descending.
DROP INDEX IF EXISTS species_name_idx;
CREATE INDEX species_name_idx ON species (name, species_code);

DROP INDEX IF EXISTS species_scientific_name_idx;
CREATE INDEX species_scientific_name_idx ON species (scientific_name, species_code);

-- catalog_* (ADR 0030) -----------------------------------------------------------
-- A scenario's rows are read by primary-key prefix (scenario_name). These two
-- serve the foreign keys: the cascade from catalog_groups, and the check made
-- when a species row is deleted.
DROP INDEX IF EXISTS catalog_group_species_group_idx;
CREATE INDEX catalog_group_species_group_idx ON catalog_group_species (scenario_name, group_code);

DROP INDEX IF EXISTS catalog_group_species_species_code_idx;
CREATE INDEX catalog_group_species_species_code_idx ON catalog_group_species (species_code);

-- Full-text search on the experiment name. GIN is not a DBML index type, so
-- schema.dbml lists this index without its type.
DROP INDEX IF EXISTS experiments_name_fts_idx;
CREATE INDEX experiments_name_fts_idx ON experiments USING gin (to_tsvector('simple', name));
