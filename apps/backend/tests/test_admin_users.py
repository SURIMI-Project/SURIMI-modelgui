"""User management by admins, against PostgreSQL (ADR 0005). Each rule is
checked as an admin, and the endpoints as a member (forbidden)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.users.models import Role, RoleSource, User
from tests.conftest import bearer, login

pytestmark = pytest.mark.integration

NEW_USER = {
    "email": "nikos@example.org",
    "username": "nikos",
    "first_name": "Nikos",
    "last_name": "Papadopoulos",
    "role": "member",
    "temporary_password": "first-sign-in-2026",
}


@pytest.fixture
def admin(api: TestClient, users: Callable[..., User]) -> dict[str, str]:
    users("chief", Role.ADMIN)
    return bearer(api, "chief")


def test_members_cannot_use_admin_endpoints(api: TestClient, users: Callable[..., User]) -> None:
    target = users("maria.k")
    headers = bearer(api, "maria.k")
    calls = [
        api.get("/api/v1/admin/users", headers=headers),
        api.post("/api/v1/admin/users", json=NEW_USER, headers=headers),
        api.get(f"/api/v1/admin/users/{target.id}", headers=headers),
        api.patch(f"/api/v1/admin/users/{target.id}", json={"role": "admin"}, headers=headers),
        api.post(
            f"/api/v1/admin/users/{target.id}/reset-password",
            json={"temporary_password": "x" * 20},
            headers=headers,
        ),
    ]
    assert [c.status_code for c in calls] == [403] * 5


def test_admin_creates_a_user_who_must_change_the_password(
    api: TestClient, admin: dict[str, str], sql: Callable[..., list[Any]]
) -> None:
    created = api.post("/api/v1/admin/users", json=NEW_USER, headers=admin)
    assert created.status_code == 201, created.text
    body = created.json()
    assert (body["username"], body["role"], body["role_source"], body["must_change_password"]) == (
        "nikos", "member", "local", True,
    )  # fmt: skip
    api.cookies.clear()
    assert login(api, "nikos", "first-sign-in-2026").json()["must_change_password"] is True
    assert sql(
        "SELECT action, actor_id IS NOT NULL FROM audit_events WHERE action = 'user.created' AND target_id = :t",
        t=body["id"],
    ) == [("user.created", True)]


@pytest.mark.parametrize(
    ("change", "field"),
    [({"email": "CHIEF@example.org"}, "email"), ({"username": "Chief"}, "username")],
)
def test_duplicates_are_refused_case_insensitively(
    api: TestClient, admin: dict[str, str], change: dict[str, str], field: str
) -> None:
    response = api.post("/api/v1/admin/users", json=NEW_USER | change, headers=admin)
    assert response.status_code == 409
    assert response.json()["error"]["details"] == {"field": field}


def test_weak_or_invalid_input_is_refused(api: TestClient, admin: dict[str, str]) -> None:
    weak = api.post(
        "/api/v1/admin/users", json=NEW_USER | {"temporary_password": "nikos-123456"}, headers=admin
    )
    assert weak.status_code == 422
    assert weak.json()["error"]["code"] == "weak_password"
    for bad in (
        {"email": "not-an-email"},
        {"username": "a"},
        {"username": "with space"},
        {"role": "owner"},
        {"first_name": ""},
        {"last_name": "x" * 101},
    ):
        assert (
            api.post("/api/v1/admin/users", json=NEW_USER | bad, headers=admin).status_code == 422
        ), bad


@pytest.mark.parametrize("missing", ["first_name", "last_name"])
def test_local_users_need_first_and_last_name(
    api: TestClient, admin: dict[str, str], missing: str
) -> None:
    body = {k: v for k, v in NEW_USER.items() if k != missing}
    assert api.post("/api/v1/admin/users", json=body, headers=admin).status_code == 422


def test_display_name_defaults_to_first_and_last_and_follows_them(
    api: TestClient, admin: dict[str, str]
) -> None:
    created = api.post("/api/v1/admin/users", json=NEW_USER, headers=admin).json()
    assert (created["display_name"], created["account"]) == ("Nikos Papadopoulos", "local")
    renamed = api.patch(
        f"/api/v1/admin/users/{created['id']}", json={"last_name": "Pappas"}, headers=admin
    ).json()
    assert (renamed["last_name"], renamed["display_name"]) == ("Pappas", "Nikos Pappas")
    chosen = api.patch(
        f"/api/v1/admin/users/{created['id']}", json={"display_name": "Nick"}, headers=admin
    ).json()
    assert chosen["display_name"] == "Nick"
    kept = api.patch(
        f"/api/v1/admin/users/{created['id']}", json={"first_name": "Nikolaos"}, headers=admin
    ).json()
    assert (kept["first_name"], kept["display_name"]) == ("Nikolaos", "Nick")
    found = api.get("/api/v1/admin/users", params={"q": "pappa"}, headers=admin).json()
    assert [u["username"] for u in found["items"]] == ["nikos"]


def test_sso_users_profile_is_read_only(
    api: TestClient,
    admin: dict[str, str],
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
) -> None:
    target = users("sso.only")
    sql("UPDATE users SET password_hash = NULL WHERE id = :id", id=str(target.id))
    response = api.patch(
        f"/api/v1/admin/users/{target.id}", json={"first_name": "Other"}, headers=admin
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "profile_managed_by_provider"
    assert api.get(f"/api/v1/admin/users/{target.id}", headers=admin).json()["account"] == "sso"


def test_list_filters_and_pages(
    api: TestClient, admin: dict[str, str], users: Callable[..., User]
) -> None:
    for name in ("anna", "bob", "carol"):
        users(name)
    everyone = api.get("/api/v1/admin/users", params={"sort": "username"}, headers=admin).json()
    assert [u["username"] for u in everyone["items"]] == ["anna", "bob", "carol", "chief"]
    assert everyone["total"] == 4
    admins = api.get("/api/v1/admin/users", params={"role": "admin"}, headers=admin).json()
    assert [u["username"] for u in admins["items"]] == ["chief"]
    found = api.get("/api/v1/admin/users", params={"q": "CAR"}, headers=admin).json()
    assert [u["username"] for u in found["items"]] == ["carol"]
    page2 = api.get(
        "/api/v1/admin/users", params={"sort": "username", "size": 3, "page": 2}, headers=admin
    ).json()
    assert ([u["username"] for u in page2["items"]], page2["total"]) == (["chief"], 4)


def test_change_role_and_audit(
    api: TestClient,
    admin: dict[str, str],
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
) -> None:
    target = users("maria.k")
    response = api.patch(f"/api/v1/admin/users/{target.id}", json={"role": "admin"}, headers=admin)
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    [(details,)] = sql("SELECT details FROM audit_events WHERE action = 'user.updated'")
    assert details == {"role": {"from": "member", "to": "admin"}}


def test_roles_managed_by_sso_cannot_be_edited(
    api: TestClient, admin: dict[str, str], users: Callable[..., User]
) -> None:
    target = users("sso.user", role_source=RoleSource.IDP)
    response = api.patch(f"/api/v1/admin/users/{target.id}", json={"role": "admin"}, headers=admin)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "role_managed_by_provider"
    # deactivating them is still allowed
    assert (
        api.patch(
            f"/api/v1/admin/users/{target.id}", json={"is_active": False}, headers=admin
        ).status_code
        == 200
    )


def test_deactivation_ends_the_users_sessions(
    api: TestClient, admin: dict[str, str], users: Callable[..., User]
) -> None:
    target = users("maria.k")
    their_session = bearer(api, "maria.k")
    assert api.get("/api/v1/auth/me", headers=their_session).status_code == 200
    assert (
        api.patch(
            f"/api/v1/admin/users/{target.id}", json={"is_active": False}, headers=admin
        ).status_code
        == 200
    )
    assert api.get("/api/v1/auth/me", headers=their_session).status_code == 401
    assert login(api, "maria.k").status_code == 403


def test_admins_cannot_lock_themselves_or_the_system_out(
    api: TestClient, admin: dict[str, str]
) -> None:
    me = api.get("/api/v1/auth/me", headers=admin).json()["id"]
    self_off = api.patch(f"/api/v1/admin/users/{me}", json={"is_active": False}, headers=admin)
    assert self_off.status_code == 422
    last = api.patch(f"/api/v1/admin/users/{me}", json={"role": "member"}, headers=admin)
    assert last.status_code == 409
    assert last.json()["error"]["code"] == "last_admin"


def test_with_two_admins_one_may_step_down(
    api: TestClient, admin: dict[str, str], users: Callable[..., User]
) -> None:
    users("second", Role.ADMIN)
    me = api.get("/api/v1/auth/me", headers=admin).json()["id"]
    assert (
        api.patch(f"/api/v1/admin/users/{me}", json={"role": "member"}, headers=admin).status_code
        == 200
    )
    # the change takes effect at once: the same token no longer reaches admin endpoints
    assert api.get("/api/v1/admin/users", headers=admin).status_code == 403


def test_reset_password(
    api: TestClient,
    admin: dict[str, str],
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
) -> None:
    target = users("maria.k")
    their_session = bearer(api, "maria.k")
    response = api.post(
        f"/api/v1/admin/users/{target.id}/reset-password",
        json={"temporary_password": "reset-by-admin-2026"},
        headers=admin,
    )
    assert response.status_code == 204
    assert api.get("/api/v1/auth/me", headers=their_session).status_code == 401
    api.cookies.clear()
    assert login(api, "maria.k", "reset-by-admin-2026").json()["must_change_password"] is True
    assert sql("SELECT count(*) FROM audit_events WHERE action = 'user.password_reset'") == [(1,)]


def test_sso_only_users_have_no_password_to_reset(
    api: TestClient,
    admin: dict[str, str],
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
) -> None:
    target = users("sso.only")
    sql("UPDATE users SET password_hash = NULL WHERE id = :id", id=str(target.id))
    response = api.post(
        f"/api/v1/admin/users/{target.id}/reset-password",
        json={"temporary_password": "reset-by-admin-2026"},
        headers=admin,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "no_local_password"


def test_unknown_user_is_404(api: TestClient, admin: dict[str, str]) -> None:
    missing = "00000000-0000-0000-0000-000000000000"
    assert api.get(f"/api/v1/admin/users/{missing}", headers=admin).status_code == 404
    assert (
        api.patch(
            f"/api/v1/admin/users/{missing}", json={"role": "admin"}, headers=admin
        ).status_code
        == 404
    )
