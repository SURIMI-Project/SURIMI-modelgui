"""SSO through OIDC against a fake provider, with PostgreSQL (ADR 0004,
ADR 0005): user creation, role sync at every sign-in, account linking, no
access, and the round trip's defences (state, nonce, signature, audience,
expiry, redirects)."""

from __future__ import annotations

import time
from collections.abc import Callable, Iterator
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from surimi_backend.core.config import Settings
from surimi_backend.integrations.controller import FakeControllerClient
from surimi_backend.main import create_app
from surimi_backend.users.models import User
from tests.conftest import bearer
from tests.fake_idp import CLIENT_ID, CLIENT_SECRET, ISSUER, FakeIdp, _new_key

pytestmark = pytest.mark.integration

ROLE_CLAIM = "groups"


def roles(*values: str) -> dict[str, Any]:
    return {"groups": list(values)}


def person(
    sub: str = "kc-123", *role_values: str, email: str = "eleni@example.org", verified: bool = True
) -> dict[str, Any]:
    return {
        "sub": sub,
        "email": email,
        "email_verified": verified,
        "preferred_username": "eleni",
        "given_name": "Eleni",
        "family_name": "Markou",
        "name": "Eleni Markou",
        **roles(*role_values),
    }


@pytest.fixture
def idp() -> FakeIdp:
    return FakeIdp()


@pytest.fixture
def sso(
    db_settings: Settings, clean_db: None, idp: FakeIdp, monkeypatch: pytest.MonkeyPatch
) -> Iterator[TestClient]:
    for key, value in {
        "ISSUER": ISSUER,
        "CLIENT_ID": CLIENT_ID,
        "CLIENT_SECRET": CLIENT_SECRET,
        "DISPLAY_NAME": "Fake IdP",
        "ROLE_CLAIM": ROLE_CLAIM,
        "ADMIN_VALUES": "surimi-admins",
        "MEMBER_VALUES": "surimi-members",
        "DEFAULT_ROLE": "deny",
    }.items():
        monkeypatch.setenv(f"OIDC_FAKE_{key}", value)
    settings = db_settings.model_copy(update={"oidc_providers": "fake"})
    http = httpx.AsyncClient(transport=idp.transport())
    with TestClient(
        create_app(settings, controller=FakeControllerClient(), oidc_http=http)
    ) as client:
        yield client


def round_trip(
    client: TestClient,
    idp: FakeIdp,
    claims: dict[str, Any],
    next_path: str = "/scenario-runs",
    **override: Any,
) -> httpx.Response:
    start = client.get(
        "/api/v1/auth/sso/fake/login", params={"next": next_path}, follow_redirects=False
    )
    assert start.status_code == 302, start.text
    assert start.headers["location"].startswith(f"{ISSUER}/protocol/openid-connect/auth?")
    code, state = idp.sign_in(start.headers["location"], claims, **override)
    return client.get(
        "/api/v1/auth/sso/fake/callback",
        params={"code": code, "state": state},
        follow_redirects=False,
    )


def test_providers_are_listed(sso: TestClient) -> None:
    assert sso.get("/api/v1/auth/providers").json() == [
        {"key": "fake", "display_name": "Fake IdP", "login_url": "/api/v1/auth/sso/fake/login"}
    ]


def test_first_sign_in_creates_a_member(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]]
) -> None:
    done = round_trip(sso, idp, person("kc-1", "surimi-members"))
    assert done.status_code == 302, done.text
    assert done.headers["location"] == "http://localhost:18080/scenario-runs"
    me = sso.get("/api/v1/auth/me").json()
    assert (me["username"], me["email"], me["role"], me["role_source"], me["has_password"]) == (
        "eleni", "eleni@example.org", "member", "idp", False,
    )  # fmt: skip
    assert (me["first_name"], me["last_name"], me["display_name"], me["account"]) == (
        "Eleni", "Markou", "Eleni Markou", "sso",
    )  # fmt: skip
    [(snapshot,)] = sql("SELECT claims_snapshot FROM identities WHERE subject = 'kc-1'")
    assert snapshot[ROLE_CLAIM] == ["surimi-members"]
    assert sql("SELECT method, provider, result FROM login_events") == [("sso", "fake", "success")]
    assert sso.get("/api/v1/scenarios").status_code == 200


def test_role_is_synced_at_every_sign_in(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]]
) -> None:
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    sso.cookies.clear()
    round_trip(sso, idp, person("kc-1", "surimi-admins"))
    assert sso.get("/api/v1/auth/me").json()["role"] == "admin"
    assert sso.get("/api/v1/admin/users").status_code == 200
    [(details,)] = sql("SELECT details FROM audit_events WHERE action = 'role.synced'")
    assert (details["from"], details["to"]) == ("member", "admin")


def test_demotion_at_the_provider_ends_the_old_admin_sessions(
    sso: TestClient, idp: FakeIdp
) -> None:
    round_trip(sso, idp, person("kc-1", "surimi-admins"))
    old_admin = {"Authorization": f"Bearer {sso.cookies.get('surimi_access')}"}
    assert sso.get("/api/v1/admin/users", headers=old_admin).status_code == 200
    sso.cookies.clear()
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    assert sso.get("/api/v1/auth/me", headers=old_admin).status_code == 401
    assert sso.get("/api/v1/auth/me").json()["role"] == "member"


def test_no_matching_role_means_no_access(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]]
) -> None:
    refused = round_trip(sso, idp, person("kc-9", "something-else"))
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "no_access"
    assert sql("SELECT count(*) FROM users") == [(0,)]
    assert sql("SELECT result FROM login_events") == [("no_role",)]


def test_access_removed_at_the_provider_refuses_the_next_sign_in_and_ends_sessions(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]]
) -> None:
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    old = {"Authorization": f"Bearer {sso.cookies.get('surimi_access')}"}
    assert sso.get("/api/v1/auth/me", headers=old).status_code == 200
    sso.cookies.clear()
    assert round_trip(sso, idp, person("kc-1")).status_code == 403
    assert sso.get("/api/v1/auth/me", headers=old).status_code == 401
    assert sql("SELECT revoked_reason FROM sessions") == [("access_removed",)]
    assert sql("SELECT count(*) FROM audit_events WHERE action = 'access.removed'") == [(1,)]


def test_a_local_account_with_the_same_email_refuses_the_first_sso_sign_in(
    sso: TestClient, idp: FakeIdp, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    # ADR 0016: accounts are never linked by e-mail, and e-mails are unique.
    users("maria.k")
    local = bearer(sso, "maria.k")
    refused = round_trip(sso, idp, person("kc-2", "surimi-members", email="Maria.K@example.org"))
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "email_taken"
    assert sso.get("/api/v1/auth/me", headers=local).status_code == 200
    assert sql("SELECT count(*) FROM users") == [(1,)]
    assert sql("SELECT count(*) FROM identities") == [(0,)]
    assert sql("SELECT result FROM login_events WHERE method = 'sso'") == [("email_rejected",)]


@pytest.mark.parametrize(
    "claims",
    [
        person("kc-3", "surimi-members", verified=False),
        {k: v for k, v in person("kc-3", "surimi-members").items() if k != "email"},
    ],
    ids=["unverified", "missing"],
)
def test_first_sso_sign_in_needs_a_verified_email(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]], claims: dict[str, Any]
) -> None:
    refused = round_trip(sso, idp, claims)
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "email_not_verified"
    assert sql("SELECT count(*) FROM users") == [(0,)]


def test_email_and_names_follow_the_provider_at_every_sign_in(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]]
) -> None:
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    sso.cookies.clear()
    changed = {
        **person("kc-1", "surimi-members", email="eleni.markou@example.org"),
        "given_name": "Elena",
        "name": "Elena Markou",
    }
    round_trip(sso, idp, changed)
    me = sso.get("/api/v1/auth/me").json()
    assert (me["email"], me["first_name"], me["display_name"]) == (
        "eleni.markou@example.org", "Elena", "Elena Markou",
    )  # fmt: skip
    [(details,)] = sql("SELECT details FROM audit_events WHERE action = 'profile.synced'")
    assert sorted(details["fields"]) == ["display_name", "email", "first_name"]


@pytest.mark.parametrize("taken", [True, False], ids=["taken", "unverified"])
def test_an_unusable_new_email_keeps_the_old_one_and_still_signs_in(
    sso: TestClient, idp: FakeIdp, users: Callable[..., User], taken: bool
) -> None:
    users("maria.k")
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    sso.cookies.clear()
    if taken:
        claims = person("kc-1", "surimi-members", email="maria.k@example.org")
    else:
        claims = person("kc-1", "surimi-members", email="new@example.org", verified=False)
    assert round_trip(sso, idp, claims).status_code == 302
    assert sso.get("/api/v1/auth/me").json()["email"] == "eleni@example.org"


def test_display_name_falls_back_to_first_and_last_then_username(
    sso: TestClient, idp: FakeIdp
) -> None:
    claims = {k: v for k, v in person("kc-1", "surimi-members").items() if k != "name"}
    round_trip(sso, idp, claims)
    assert sso.get("/api/v1/auth/me").json()["display_name"] == "Eleni Markou"
    sso.cookies.clear()
    bare = {
        k: v
        for k, v in person("kc-1", "surimi-members").items()
        if k not in {"name", "given_name", "family_name"}
    }
    round_trip(sso, idp, bare)
    me = sso.get("/api/v1/auth/me").json()
    assert (me["first_name"], me["display_name"]) == (None, "eleni")


def test_deactivated_user_cannot_sign_in_through_sso(
    sso: TestClient, idp: FakeIdp, sql: Callable[..., list[Any]]
) -> None:
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    sql("UPDATE users SET is_active = false")
    sso.cookies.clear()
    refused = round_trip(sso, idp, person("kc-1", "surimi-members"))
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "account_inactive"


def test_the_next_path_cannot_leave_the_site(sso: TestClient, idp: FakeIdp) -> None:
    done = round_trip(sso, idp, person("kc-1", "surimi-members"), next_path="//evil.example/steal")
    assert done.headers["location"] == "http://localhost:18080/"


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"nonce": "not-the-one-we-sent"}, "nonce"),
        ({"aud": "another-client"}, "not valid"),
        ({"iss": "https://evil.example"}, "not valid"),
        ({"exp": int(time.time()) - 3600, "iat": int(time.time()) - 7200}, "not valid"),
    ],
)
def test_tampered_id_tokens_are_refused(
    sso: TestClient,
    idp: FakeIdp,
    sql: Callable[..., list[Any]],
    override: dict[str, Any],
    message: str,
) -> None:
    refused = round_trip(sso, idp, person("kc-1", "surimi-members"), **override)
    assert refused.status_code == 400, refused.text
    assert refused.json()["error"]["code"] == "sso_failed"
    assert message in refused.json()["error"]["message"]
    assert sql("SELECT count(*) FROM sessions") == [(0,)]


def test_a_token_signed_by_another_key_is_refused(
    sso: TestClient, idp: FakeIdp, monkeypatch: pytest.MonkeyPatch
) -> None:
    attacker = _new_key()
    original = idp.sign
    monkeypatch.setattr(idp, "sign", lambda claims, key=None: original(claims, attacker))
    refused = round_trip(sso, idp, person("kc-1", "surimi-admins"))
    assert refused.status_code == 400
    assert refused.json()["error"]["code"] == "sso_failed"


def test_wrong_state_or_missing_flow_cookie_is_refused(sso: TestClient, idp: FakeIdp) -> None:
    start = sso.get("/api/v1/auth/sso/fake/login", follow_redirects=False)
    code, _ = idp.sign_in(start.headers["location"], person("kc-1", "surimi-members"))
    wrong = sso.get(
        "/api/v1/auth/sso/fake/callback",
        params={"code": code, "state": "forged"},
        follow_redirects=False,
    )
    assert wrong.status_code == 400
    sso.cookies.clear()
    code, state = idp.sign_in(start.headers["location"], person("kc-1", "surimi-members"))
    missing = sso.get(
        "/api/v1/auth/sso/fake/callback",
        params={"code": code, "state": state},
        follow_redirects=False,
    )
    assert missing.status_code == 400
    assert "missing" in missing.json()["error"]["message"]


def test_provider_refusing_the_code_is_a_clear_error(sso: TestClient, idp: FakeIdp) -> None:
    idp.fail_token_endpoint = True
    refused = round_trip(sso, idp, person("kc-1", "surimi-members"))
    assert refused.status_code == 400
    assert "refused the authorization code" in refused.json()["error"]["message"]


def test_unknown_provider_is_404(sso: TestClient) -> None:
    assert sso.get("/api/v1/auth/sso/nope/login", follow_redirects=False).status_code == 404


def test_sso_users_have_no_password_to_change(sso: TestClient, idp: FakeIdp) -> None:
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    response = sso.post(
        "/api/v1/auth/password",
        json={"current_password": "anything-long-1", "new_password": "something-new-2026"},
        headers={"X-CSRF-Token": sso.cookies.get("surimi_csrf") or ""},
    )
    assert response.status_code == 409


def test_local_and_sso_users_coexist(
    sso: TestClient, idp: FakeIdp, users: Callable[..., User]
) -> None:
    users("maria.k")
    round_trip(sso, idp, person("kc-1", "surimi-members"))
    assert sso.get("/api/v1/scenarios", headers=bearer(sso, "maria.k")).status_code == 200
