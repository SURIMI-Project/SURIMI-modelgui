-- Creates the database and the application user of the SURIMI model GUI
-- (ADR 0014). The application user owns the schema: it runs the migrations
-- and is the user of the API and the worker.
--
-- Run as the instance admin, connected to the "postgres" database:
--
--   psql -h <host> -U <admin> -d postgres \
--        -v app_password=... [-v app_user=surimi_modelgui] [-v app_db=surimi_modelgui_db] \
--        -f bootstrap.sql
--
-- Safe to run on every start: it creates the user and the database if they
-- are missing, and sets the user's password every time, so a changed
-- DB_PASSWORD takes effect on the next start.
--
-- Run by the db-bootstrap service in deployments/compose.yml (and by the
-- Helm chart's bootstrap Job in phase 9).
-- Verified on postgres:17-alpine, 2026-11-03.

\set ON_ERROR_STOP on

\if :{?app_password}
\else
  -- A failing statement, so psql exits non-zero (\quit cannot set an exit code)
  -- and compose stops before migrate.
  DO $$ BEGIN RAISE EXCEPTION 'bootstrap.sql: -v app_password=... is required'; END $$;
\endif
\if :{?app_user}
\else
  \set app_user surimi_modelgui
\endif
\if :{?app_db}
\else
  \set app_db surimi_modelgui_db
\endif

-- Application user: created if missing, password set on every run.
SELECT format('CREATE ROLE %I LOGIN', :'app_user')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
              :'app_user', :'app_password') \gexec

-- Database owned by the application user.
SELECT format('CREATE DATABASE %I OWNER %I', :'app_db', :'app_user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'app_db') \gexec

\connect :"app_db"

ALTER SCHEMA public OWNER TO :"app_user";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
