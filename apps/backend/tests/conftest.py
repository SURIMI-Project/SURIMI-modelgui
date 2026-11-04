"""Shared fixtures.

Unit tests use `client` (fake controller, a fake signed-in member, no
database). Integration tests (`@pytest.mark.integration`) use `api`: a real
PostgreSQL 17 in Docker, bootstrapped and migrated once per run, emptied before
each test.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from surimi_backend import cli
from surimi_backend.auth.dependencies import Principal, current_principal
from surimi_backend.auth.models import LoginMethod, UserSession
from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.integrations.controller import FakeControllerClient
from surimi_backend.main import create_app
from surimi_backend.users import service as users_service
from surimi_backend.users.models import Role, RoleSource, User

JWT_SECRET = "test-only-jwt-secret-0123456789-abcdefghijklmnop"
BOOTSTRAP_DIR = Path(__file__).resolve().parents[3] / "deployments" / "postgres"
APP_DB_PASSWORD = "app-test-password"
PASSWORD = "a-long-test-password-1"  # passes the policy; for users made by `users`

TABLES = "users, identities, sessions, login_events, login_stats_monthly, audit_events"


# --- unit tests ---------------------------------------------------------------------


@pytest.fixture
def settings() -> Settings:
    # Port 1: nothing listens there, so database checks fail fast unless a test
    # brings its own database.
    return Settings(
        controller_mode="fake",
        db_host="127.0.0.1",
        db_port=1,
        log_format="console",
        jwt_secret=JWT_SECRET,
        cookie_secure=False,
    )


@pytest.fixture
def fake_controller() -> FakeControllerClient:
    return FakeControllerClient()


def fake_principal(role: Role = Role.MEMBER) -> Principal:
    now = datetime.now(UTC)
    user = User(
        id=uuid.uuid4(),
        email="unit@example.org",
        username="unit",
        role=role,
        role_source=RoleSource.LOCAL,
        is_active=True,
        must_change_password=False,
        login_count=0,
        created_at=now,
    )
    session = UserSession(
        id=uuid.uuid4(),
        user_id=user.id,
        method=LoginMethod.PASSWORD,
        refresh_token_hash="x",
        expires_at=now + timedelta(days=1),
        absolute_expires_at=now + timedelta(days=1),
    )
    return Principal(user=user, session=session, via_cookie=False)


@pytest.fixture
def client(settings: Settings, fake_controller: FakeControllerClient) -> Iterator[TestClient]:
    """Signed in as a member without a database (auth is overridden)."""
    app = create_app(settings, controller=fake_controller)
    app.dependency_overrides[current_principal] = fake_principal
    with TestClient(app) as c:
        yield c


@pytest.fixture
def anonymous_client(
    settings: Settings, fake_controller: FakeControllerClient
) -> Iterator[TestClient]:
    with TestClient(create_app(settings, controller=fake_controller)) as c:
        yield c


# --- integration: PostgreSQL in Docker ----------------------------------------------


def bootstrap(container: Any) -> tuple[int, str]:
    code, output = container.exec(
        [
            "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres",
            "-v", f"app_password={APP_DB_PASSWORD}", "-f", "/bootstrap/bootstrap.sql",
        ]
    )  # fmt: skip
    return code, output.decode()


@pytest.fixture(scope="session")
def postgres() -> Iterator[Any]:
    testcontainers = pytest.importorskip("testcontainers.postgres")
    try:
        container = testcontainers.PostgresContainer(
            "postgres:17-alpine",
            username="postgres",
            password="admin-test-password",
            dbname="postgres",
        ).with_volume_mapping(str(BOOTSTRAP_DIR), "/bootstrap", "ro")
        container.start()
    except Exception as exc:  # noqa: BLE001 - no Docker → skip, not fail
        pytest.skip(f"Docker not available: {exc}")
    try:
        yield container
    finally:
        container.stop()


@pytest.fixture(scope="session")
def db_env(postgres: Any) -> dict[str, str]:
    """Bootstrapped and migrated database; the env vars that point at it."""
    code, output = bootstrap(postgres)
    assert code == 0, output
    env = {
        "DB_HOST": postgres.get_container_host_ip(),
        "DB_PORT": str(postgres.get_exposed_port(5432)),
        "DB_NAME": "surimi_modelgui_db",
        "DB_USER": "surimi_modelgui",
        "DB_PASSWORD": APP_DB_PASSWORD,
        "CONTROLLER_MODE": "fake",
        "LOG_FORMAT": "console",
    }
    with pytest.MonkeyPatch.context() as mp:
        for key, value in env.items():
            mp.setenv(key, value)
        cli.migrate("head")
    return env


@pytest.fixture
def db_settings(db_env: dict[str, str]) -> Settings:
    return Settings(
        db_host=db_env["DB_HOST"],
        db_port=int(db_env["DB_PORT"]),
        db_password=APP_DB_PASSWORD,
        controller_mode="fake",
        log_format="console",
        jwt_secret=JWT_SECRET,
        cookie_secure=False,
    )


def run_sql(settings: Settings, query: str, params: dict[str, Any] | None = None) -> list[Any]:
    async def go() -> list[Any]:
        engine = create_engine(settings)
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text(query), params or {})
                return list(result.all()) if result.returns_rows else []
        finally:
            await engine.dispose()

    return asyncio.run(go())


@pytest.fixture
def clean_db(db_settings: Settings) -> None:
    run_sql(db_settings, f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE")


@pytest.fixture
def sql(db_settings: Settings) -> Callable[..., list[Any]]:
    return lambda query, **params: run_sql(db_settings, query, params)


@pytest.fixture
def users(db_settings: Settings, clean_db: None) -> Callable[..., User]:
    """Creates a user directly (not through the API). Password: PASSWORD."""

    def make(
        username: str,
        role: Role = Role.MEMBER,
        *,
        must_change_password: bool = False,
        role_source: RoleSource = RoleSource.LOCAL,
    ) -> User:
        async def go() -> User:
            engine = create_engine(db_settings)
            try:
                async with create_sessionmaker(engine)() as db:
                    user = await users_service.create_user(
                        db,
                        actor=None,
                        email=f"{username}@example.org",
                        username=username,
                        names=users_service.Names(
                            username.split(".", maxsplit=1)[0].title(), "Tester"
                        ),
                        role=role,
                        password=PASSWORD,
                        must_change_password=must_change_password,
                    )
                    if role_source is not RoleSource.LOCAL:
                        user.role_source = role_source
                        await db.commit()
                    return user
            finally:
                await engine.dispose()

        return asyncio.run(go())

    return make


@pytest.fixture
def api(
    db_settings: Settings, clean_db: None, fake_controller: FakeControllerClient
) -> Iterator[TestClient]:
    with TestClient(create_app(db_settings, controller=fake_controller)) as c:
        yield c


def csrf(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("surimi_csrf") or ""}


def login(client: TestClient, login_name: str, password: str = PASSWORD) -> Any:
    return client.post("/api/v1/auth/login", json={"login": login_name, "password": password})


def bearer(client: TestClient, login_name: str, password: str = PASSWORD) -> dict[str, str]:
    response = client.post("/api/v1/auth/token", json={"login": login_name, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
