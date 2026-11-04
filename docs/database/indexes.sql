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
  WHERE status IN ('submitting', 'submitted', 'initialising', 'running', 'cancelling');

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
CREATE INDEX experiment_outputs_todo_idx ON experiment_outputs (updated_at) WHERE state <> 'ready';

-- Full-text search on the experiment name. GIN is not a DBML index type, so
-- schema.dbml lists this index without its type.
DROP INDEX IF EXISTS experiments_name_fts_idx;
CREATE INDEX experiments_name_fts_idx ON experiments USING gin (to_tsvector('simple', name));
