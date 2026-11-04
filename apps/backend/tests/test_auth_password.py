"""Password sign-in, sessions, CSRF, refresh, sign-out, own password, against
PostgreSQL (ADR 0004, ADR 0013)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.auth import sessions
from surimi_backend.users.models import Role, User
from tests.conftest import PASSWORD, bearer, csrf, login

pytestmark = pytest.mark.integration


def test_sign_in_with_username_or_email_sets_cookies(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria.k")
    for name in ("maria.k", "MARIA.K@Example.org"):
        api.cookies.clear()
        response = login(api, name)
        assert response.status_code == 200, response.text
        assert response.json()["username"] == "maria.k"
        assert response.json()["has_password"] is True
        assert {"surimi_access", "surimi_refresh", "surimi_csrf"} <= set(api.cookies.keys())
        assert api.get("/api/v1/auth/me").json()["email"] == "maria.k@example.org"
    [(count, last)] = sql("SELECT login_count, last_login_at FROM users WHERE username = 'maria.k'")
    assert count == 2
    assert last is not None
    assert sql("SELECT count(*) FROM login_events WHERE result = 'success'") == [(2,)]


def test_cookies_are_http_only_and_lax(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k")
    cookies = login(api, "maria.k").headers.get_list("set-cookie")
    by_name = {c.split("=")[0]: c.lower() for c in cookies}
    assert "httponly" in by_name["surimi_access"]
    assert "httponly" in by_name["surimi_refresh"]
    assert "path=/api/v1/auth" in by_name["surimi_refresh"]
    assert "httponly" not in by_name["surimi_csrf"]  # the frontend reads it on purpose
    assert all("samesite=lax" in c for c in by_name.values())


def test_wrong_password_and_unknown_user_look_the_same(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria.k")
    wrong = login(api, "maria.k", "not-the-password")
    unknown = login(api, "nobody", "not-the-password")
    assert wrong.status_code == unknown.status_code == 401
    assert (
        wrong.json()["error"]["message"]
        == unknown.json()["error"]["message"]
        == "wrong login or password"
    )
    # the failed attempt on an unknown login stores no user and not the typed login
    rows = sql("SELECT user_id IS NULL, result FROM login_events ORDER BY id")
    assert rows == [(False, "bad_credentials"), (True, "bad_credentials")]


def test_account_is_locked_after_five_failures(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k")
    for _ in range(5):
        assert login(api, "maria.k", "not-the-password").status_code == 401
    locked = login(api, "maria.k")  # even the right password
    assert locked.status_code == 429
    assert locked.json()["error"]["code"] == "too_many_attempts"
    assert locked.headers["retry-after"] == "900"


def test_a_successful_sign_in_resets_the_failure_count(
    api: TestClient, users: Callable[..., User]
) -> None:
    users("maria.k")
    for _ in range(4):
        login(api, "maria.k", "not-the-password")
    assert login(api, "maria.k").status_code == 200
    login(api, "maria.k", "not-the-password")
    assert login(api, "maria.k").status_code == 200


def test_deactivated_user_cannot_sign_in(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria.k")
    sql("UPDATE users SET is_active = false WHERE username = 'maria.k'")
    response = login(api, "maria.k")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "account_inactive"


def test_protected_routes_need_a_session(api: TestClient, users: Callable[..., User]) -> None:
    for path in ("/api/v1/auth/me", "/api/v1/scenarios", "/api/v1/admin/users"):
        response = api.get(path)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "not_authenticated"
    users("maria.k")
    headers = bearer(api, "maria.k")
    assert api.get("/api/v1/scenarios", headers=headers).status_code == 200


def test_csrf_header_is_needed_for_cookie_requests_that_change_data(
    api: TestClient, users: Callable[..., User]
) -> None:
    users("maria.k")
    login(api, "maria.k")
    refused = api.post("/api/v1/auth/logout")
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "csrf_failed"
    assert api.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "guess"}).status_code == 403
    assert api.post("/api/v1/auth/logout", headers=csrf(api)).status_code == 204


def test_bearer_requests_need_no_csrf_header(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k")
    headers = bearer(api, "maria.k")
    api.cookies.clear()
    assert api.post("/api/v1/auth/logout", headers=headers).status_code == 204


def test_sign_out_ends_the_session_at_once(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k")
    login(api, "maria.k")
    access = api.cookies.get("surimi_access")
    assert api.post("/api/v1/auth/logout", headers=csrf(api)).status_code == 204
    # the access token itself is still unexpired, but its session is revoked
    response = api.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert response.status_code == 401


def test_refresh_rotates_the_refresh_token(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k")
    login(api, "maria.k")
    first = api.cookies.get("surimi_refresh")
    assert api.post("/api/v1/auth/refresh", headers=csrf(api)).status_code == 204
    second = api.cookies.get("surimi_refresh")
    assert second
    assert second != first
    assert api.get("/api/v1/auth/me").status_code == 200


def test_refresh_needs_the_csrf_header(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k")
    login(api, "maria.k")
    assert api.post("/api/v1/auth/refresh").status_code == 403


def replaying(api: TestClient, refresh_token: str | None) -> dict[str, str]:
    """Headers that present an old refresh token; an explicit Cookie header
    replaces the client's cookie jar for that request."""
    token = api.cookies.get("surimi_csrf") or ""
    return {
        "X-CSRF-Token": token,
        "Cookie": f"surimi_refresh={refresh_token or ''}; surimi_csrf={token}",
    }


def test_reused_refresh_token_inside_the_race_window_is_not_theft(
    api: TestClient, users: Callable[..., User]
) -> None:
    users("maria.k")
    login(api, "maria.k")
    old = api.cookies.get("surimi_refresh")
    api.post("/api/v1/auth/refresh", headers=csrf(api))
    raced = api.post("/api/v1/auth/refresh", headers=replaying(api, old))
    assert raced.status_code == 401
    assert "retry" in raced.json()["error"]["message"]
    assert api.get("/api/v1/auth/me").status_code == 200  # session still alive


def test_reused_refresh_token_later_revokes_the_session(
    api: TestClient,
    users: Callable[..., User],
    monkeypatch: pytest.MonkeyPatch,
    sql: Callable[..., list[Any]],
) -> None:
    monkeypatch.setattr(sessions, "REFRESH_RACE_SECONDS", -1)
    users("maria.k")
    login(api, "maria.k")
    stolen = api.cookies.get("surimi_refresh")
    api.post("/api/v1/auth/refresh", headers=csrf(api))  # the real user refreshes
    attacker = api.post("/api/v1/auth/refresh", headers=replaying(api, stolen))
    assert attacker.status_code == 401
    assert api.get("/api/v1/auth/me").status_code == 401  # the whole session is gone
    assert sql("SELECT revoked_reason FROM sessions") == [("refresh_token_reuse",)]


def test_token_sessions_cannot_be_refreshed(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria.k")
    bearer(api, "maria.k")
    [(lifetime,)] = sql("SELECT absolute_expires_at - created_at FROM sessions")
    assert lifetime.total_seconds() <= 15 * 60 + 1


def test_forced_password_change(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria.k", must_change_password=True)
    other = bearer(api, "maria.k")  # a second session, which the change ends
    login(api, "maria.k")
    assert api.get("/api/v1/auth/me").json()["must_change_password"] is True
    blocked = api.get("/api/v1/scenarios")
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "password_change_required"

    weak = api.post(
        "/api/v1/auth/password",
        json={"current_password": PASSWORD, "new_password": "short"},
        headers=csrf(api),
    )
    assert weak.status_code == 422
    assert weak.json()["error"]["code"] == "weak_password"
    wrong = api.post(
        "/api/v1/auth/password",
        json={"current_password": "not-it-at-all", "new_password": "a-brand-new-passphrase"},
        headers=csrf(api),
    )
    assert wrong.status_code == 401

    changed = api.post(
        "/api/v1/auth/password",
        json={"current_password": PASSWORD, "new_password": "a-brand-new-passphrase"},
        headers=csrf(api),
    )
    assert changed.status_code == 204
    assert api.get("/api/v1/scenarios").status_code == 200  # this session lives on
    assert api.get("/api/v1/auth/me", headers=other).status_code == 401  # the other one ended
    assert login(api, "maria.k", "a-brand-new-passphrase").status_code == 200
    assert sql("SELECT action FROM audit_events") == [("user.created",), ("user.password_changed",)]


def test_ip_and_user_agent_follow_their_retention_setting(
    db_settings: Any,
    users: Callable[..., User],
    sql: Callable[..., list[Any]],
    fake_controller: Any,
) -> None:
    from surimi_backend.main import create_app

    users("maria.k")
    stored = db_settings.model_copy(update={"retention_login_user_agent_days": 0})
    with TestClient(create_app(stored, controller=fake_controller)) as client:
        login(client, "maria.k")
    [(ip, agent)] = sql("SELECT ip, user_agent FROM login_events")
    assert ip is None  # the test client's address "testclient" is not an IP: dropped, no error
    assert agent is None  # retention 0: never stored


def test_providers_list_is_empty_without_sso(api: TestClient) -> None:
    assert api.get("/api/v1/auth/providers").json() == []


def test_member_role_is_not_admin(api: TestClient, users: Callable[..., User]) -> None:
    users("maria.k", Role.MEMBER)
    response = api.get("/api/v1/admin/users", headers=bearer(api, "maria.k"))
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"
