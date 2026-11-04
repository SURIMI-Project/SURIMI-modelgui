"""Against a real PostgreSQL 17 in Docker: the bootstrap script, the
migrations run as the application user, readiness with a database, and that
the migrations match the models (ADR 0014). Skipped without Docker."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient

from surimi_backend.cli import alembic_config
from tests.conftest import bootstrap

pytestmark = pytest.mark.integration


def test_bootstrap_can_run_again(postgres: Any, db_env: dict[str, str]) -> None:
    code, output = bootstrap(postgres)
    assert code == 0, output


def test_migrations_ran_as_the_application_user(sql: Callable[..., list[Any]]) -> None:
    [(version,)] = sql("SELECT version_num FROM alembic_version")
    [(owner,)] = sql("SELECT tableowner FROM pg_tables WHERE tablename = 'users'")
    [(superuser, createdb)] = sql(
        "SELECT rolsuper, rolcreatedb FROM pg_roles WHERE rolname = current_user"
    )
    assert version == ScriptDirectory.from_config(alembic_config()).get_current_head()
    assert owner == "surimi_modelgui"
    assert (superuser, createdb) == (False, False)


def test_the_tables_of_phase_3_exist(sql: Callable[..., list[Any]]) -> None:
    rows = sql("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")
    assert [r[0] for r in rows] == [
        "alembic_version", "audit_events", "identities", "login_events",
        "login_stats_monthly", "sessions", "users",
    ]  # fmt: skip


def test_readyz_is_ready_with_a_database(api: TestClient) -> None:
    response = api.get("/readyz")
    assert response.status_code == 200, response.text
    assert response.json()["checks"]["database"]["ok"] is True
