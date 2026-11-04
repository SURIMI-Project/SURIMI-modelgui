"""`surimi-backend create-admin`, against PostgreSQL."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend import cli
from surimi_backend.users.models import Role, RoleSource, User
from tests.conftest import PASSWORD, login

pytestmark = pytest.mark.integration


@pytest.fixture
def env(
    db_env: dict[str, str], clean_db: None, monkeypatch: pytest.MonkeyPatch
) -> pytest.MonkeyPatch:
    for key, value in db_env.items():
        monkeypatch.setenv(key, value)
    return monkeypatch


def run(*args: str) -> int:
    with pytest.raises(SystemExit) as exit_info:
        cli.main(["create-admin", *args])
    return int(exit_info.value.code or 0)


def test_from_env_without_settings_does_nothing(
    env: pytest.MonkeyPatch, sql: Callable[..., list[Any]], capsys: pytest.CaptureFixture[str]
) -> None:
    assert run("--from-env") == 0
    assert "nothing to do" in capsys.readouterr().out
    assert sql("SELECT count(*) FROM users") == [(0,)]


def test_creates_the_admin_once(
    env: pytest.MonkeyPatch, sql: Callable[..., list[Any]], api: TestClient
) -> None:
    env.setenv("ADMIN_EMAIL", "chief@example.org")
    env.setenv("ADMIN_USERNAME", "chief")
    env.setenv("ADMIN_FIRST_NAME", "Chief")
    env.setenv("ADMIN_LAST_NAME", "Admin")
    env.setenv("ADMIN_PASSWORD", "first-admin-pass-2026")
    assert run("--from-env") == 0
    assert run("--from-env") == 0  # idempotent: runs on every start
    assert sql(
        "SELECT username, first_name, last_name, display_name, role, must_change_password "
        "FROM users"
    ) == [("chief", "Chief", "Admin", "Chief Admin", "admin", False)]
    assert login(api, "chief", "first-admin-pass-2026").json()["role"] == "admin"


def test_partly_set_admin_settings_fail_loudly(
    env: pytest.MonkeyPatch, sql: Callable[..., list[Any]], capsys: pytest.CaptureFixture[str]
) -> None:
    # A forgotten ADMIN_FIRST_NAME must not silently leave the install without an admin.
    env.setenv("ADMIN_EMAIL", "chief@example.org")
    env.setenv("ADMIN_USERNAME", "chief")
    env.setenv("ADMIN_PASSWORD", "first-admin-pass-2026")
    assert run("--from-env") == 2
    assert "first name" in capsys.readouterr().err
    assert sql("SELECT count(*) FROM users") == [(0,)]


def test_makes_an_existing_member_admin_without_touching_the_password(
    env: pytest.MonkeyPatch,
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
    api: TestClient,
) -> None:
    users("maria.k")
    env.setenv("ADMIN_EMAIL", "maria.k@example.org")
    env.setenv("ADMIN_USERNAME", "maria.k")
    env.setenv("ADMIN_FIRST_NAME", "Chief")
    env.setenv("ADMIN_LAST_NAME", "Admin")
    env.setenv("ADMIN_PASSWORD", "some-other-pass-2026")
    assert run("--from-env") == 0
    assert sql("SELECT role FROM users") == [("admin",)]
    assert login(api, "maria.k", PASSWORD).status_code == 200  # old password still valid
    assert run("--from-env", "--reset-password") == 0
    assert login(api, "maria.k", "some-other-pass-2026").status_code == 200


def test_leaves_sso_managed_roles_alone(
    env: pytest.MonkeyPatch,
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
    capsys: pytest.CaptureFixture[str],
) -> None:
    users("eleni", Role.MEMBER, role_source=RoleSource.IDP)
    env.setenv("ADMIN_EMAIL", "eleni@example.org")
    env.setenv("ADMIN_USERNAME", "eleni")
    env.setenv("ADMIN_FIRST_NAME", "Chief")
    env.setenv("ADMIN_LAST_NAME", "Admin")
    env.setenv("ADMIN_PASSWORD", "some-other-pass-2026")
    assert run("--from-env") == 0
    assert "managed by the sign-in provider" in capsys.readouterr().out
    assert sql("SELECT role FROM users") == [("member",)]


def test_weak_password_is_refused(
    env: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    env.setenv("ADMIN_EMAIL", "chief@example.org")
    env.setenv("ADMIN_USERNAME", "chief")
    env.setenv("ADMIN_FIRST_NAME", "Chief")
    env.setenv("ADMIN_LAST_NAME", "Admin")
    env.setenv("ADMIN_PASSWORD", "short")
    assert run("--from-env") == 1
    assert "at least 12" in capsys.readouterr().err
