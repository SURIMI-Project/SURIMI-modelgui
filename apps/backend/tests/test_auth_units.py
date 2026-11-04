"""Authentication pieces that need no database."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from surimi_backend.auth.errors import NotAuthenticatedError, SsoError, WeakPasswordError
from surimi_backend.auth.history import valid_ip
from surimi_backend.auth.passwords import check_policy, hash_password, verify_password
from surimi_backend.auth.ratelimit import FailureCounter
from surimi_backend.auth.role_mapping import claim_values, decide_role, role_claims_snapshot
from surimi_backend.auth.service import safe_next
from surimi_backend.auth.tokens import (
    create_access_token,
    decode_access_token,
    decode_flow,
    encode_flow,
    hash_token,
)
from surimi_backend.core.config import OidcProviderSettings, Settings
from surimi_backend.main import create_app
from surimi_backend.users.models import Role
from tests.conftest import JWT_SECRET


@pytest.fixture
def s() -> Settings:
    return Settings(controller_mode="fake", jwt_secret=JWT_SECRET)


# --- tokens ---------------------------------------------------------------------------


def test_access_token_round_trip(s: Settings) -> None:
    uid, sid = uuid.uuid4(), uuid.uuid4()
    token, expires_in = create_access_token(s, user_id=uid, session_id=sid, role=Role.ADMIN)
    claims = decode_access_token(s, token)
    assert (claims.user_id, claims.session_id, claims.role, expires_in) == (
        uid,
        sid,
        Role.ADMIN,
        900,
    )


def test_access_token_with_another_secret_is_refused(s: Settings) -> None:
    token, _ = create_access_token(
        s, user_id=uuid.uuid4(), session_id=uuid.uuid4(), role=Role.ADMIN
    )
    other = Settings(controller_mode="fake", jwt_secret="another-secret-" + "y" * 40)
    with pytest.raises(NotAuthenticatedError, match="not valid"):
        decode_access_token(other, token)


def test_expired_access_token_is_refused(s: Settings) -> None:
    now = datetime.now(UTC)
    token = jwt.encode(
        {"iss": "surimi-modelgui", "aud": "surimi-modelgui-api", "sub": str(uuid.uuid4()),
         "sid": str(uuid.uuid4()), "role": "member", "iat": now - timedelta(hours=1),
         "exp": now - timedelta(minutes=1)},
        JWT_SECRET, algorithm="HS256",
    )  # fmt: skip
    with pytest.raises(NotAuthenticatedError, match="expired"):
        decode_access_token(s, token)


def test_flow_token_cannot_be_used_as_access_token(s: Settings) -> None:
    flow = encode_flow(s, {"sub": str(uuid.uuid4()), "sid": str(uuid.uuid4()), "role": "admin"})
    with pytest.raises(NotAuthenticatedError):
        decode_access_token(s, flow)
    access, _ = create_access_token(
        s, user_id=uuid.uuid4(), session_id=uuid.uuid4(), role=Role.ADMIN
    )
    with pytest.raises(SsoError):
        decode_flow(s, access)


def test_token_hash_is_stable_and_not_the_token() -> None:
    assert hash_token("abc") == hash_token("abc") != "abc"
    assert len(hash_token("abc")) == 64


# --- passwords ------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("short", "at least 12"),
        ("x" * 300, "at most 256"),
        ("Password1234", "too common"),
        ("maria.k-is-great-2026", "must not contain"),
        ("my-maria-mail-pass", "must not contain"),
    ],
)
def test_password_policy_rejects(password: str, message: str) -> None:
    with pytest.raises(WeakPasswordError, match=message):
        check_policy(password, username="maria.k", email="maria@example.org")


def test_password_policy_accepts_a_long_passphrase() -> None:
    check_policy("correct horse battery staple", username="maria.k", email="maria@example.org")


async def test_hash_and_verify() -> None:
    hashed = await hash_password("correct horse battery staple")
    assert hashed.startswith("$argon2id$")
    assert (await verify_password("correct horse battery staple", hashed))[0] is True
    assert (await verify_password("wrong horse battery staple", hashed))[0] is False
    assert await verify_password("anything at all", None) == (False, None)


# --- role mapping -----------------------------------------------------------------------


def provider(**kwargs: str) -> OidcProviderSettings:
    base = {
        "issuer": "https://idp.test/realms/x",
        "client_id": "surimi-modelgui",
        "client_secret": "s",
    }
    return OidcProviderSettings(**(base | kwargs))  # type: ignore[arg-type]


CLAIMS = {
    "resource_access": {
        "surimi-modelgui": {"roles": ["surimi-member"]},
        "other-app": {"roles": ["surimi-admin"]},
    },
    "realm_access": {"roles": ["offline_access"]},
    "groups": ["surimi-admins"],
    "email": "maria@example.org",
    "secret_claim": "not kept",
}


def test_claim_values_follow_dotted_paths() -> None:
    assert claim_values(CLAIMS, "resource_access.surimi-modelgui.roles") == {"surimi-member"}
    assert claim_values(CLAIMS, "groups") == {"surimi-admins"}
    assert claim_values(CLAIMS, "email") == {"maria@example.org"}
    assert claim_values(CLAIMS, "resource_access.nothing.roles") == set()
    assert claim_values(CLAIMS, "realm_access") == set()  # a dict is not a value


def test_group_values_match_exactly() -> None:
    # Keycloak's full group path ("/surimi-admins") is a different value: the
    # mapper must have full path off, or the configured values must carry the slash.
    config = provider(
        role_claim="groups", admin_values="surimi-admins", member_values="surimi-members"
    )
    assert decide_role({"groups": ["/surimi-admins"]}, config).role is None
    assert decide_role({"groups": ["surimi-admins"]}, config).role is Role.ADMIN


@pytest.mark.parametrize(
    ("claim", "admin", "member", "default", "expected"),
    [
        (
            "resource_access.surimi-modelgui.roles",
            "surimi-admin",
            "surimi-member",
            "deny",
            Role.MEMBER,
        ),
        ("groups", "surimi-admins", "surimi-members", "deny", Role.ADMIN),
        # the admin role of another client must not count
        ("resource_access.surimi-modelgui.roles", "surimi-admin", "", "deny", None),
        ("realm_access.roles", "surimi-admin", "surimi-member", "member", Role.MEMBER),
    ],
)
def test_decide_role(
    claim: str, admin: str, member: str, default: str, expected: Role | None
) -> None:
    config = provider(
        role_claim=claim, admin_values=admin, member_values=member, default_role=default
    )
    decision = decide_role(CLAIMS, config)
    assert decision.managed is True
    assert decision.role == expected


def test_admin_wins_when_both_match() -> None:
    config = provider(
        role_claim="groups", admin_values="surimi-admins", member_values="surimi-admins"
    )
    assert decide_role(CLAIMS, config).role is Role.ADMIN


def test_provider_without_role_claim_does_not_manage_roles() -> None:
    assert decide_role(CLAIMS, provider()).managed is False
    assert decide_role(CLAIMS, provider()).role is None
    assert decide_role(CLAIMS, provider(default_role="member")).role is Role.MEMBER


def test_snapshot_keeps_only_role_and_identity_fields() -> None:
    config = provider(role_claim="groups")
    assert role_claims_snapshot(CLAIMS, config) == {
        "email": "maria@example.org",
        "groups": ["surimi-admins"],
    }


# --- other pieces -----------------------------------------------------------------------


def test_failure_counter_blocks_and_forgets() -> None:
    counter = FailureCounter(max_failures=2, window_seconds=0.2)
    counter.add("1.2.3.4")
    assert not counter.blocked("1.2.3.4")
    counter.add("1.2.3.4")
    assert counter.blocked("1.2.3.4")
    assert not counter.blocked("5.6.7.8")
    assert not counter.blocked(None)
    time.sleep(0.25)
    assert not counter.blocked("1.2.3.4")


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("/scenario-runs", "/scenario-runs"),
        ("/a?b=c", "/a?b=c"),
        (None, "/"),
        ("https://evil.example", "/"),
        ("//evil.example/x", "/"),
        ("/\\evil.example", "/"),
        ("javascript:alert(1)", "/"),
    ],
)
def test_safe_next_only_allows_local_paths(given: str | None, expected: str) -> None:
    assert safe_next(given) == expected


def test_api_refuses_to_start_without_a_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET"):
        create_app(Settings(controller_mode="fake", jwt_secret="too-short"))


def test_oidc_providers_are_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OIDC_KEYCLOAK_ISSUER", "https://kc.test/realms/surimi")
    monkeypatch.setenv("OIDC_KEYCLOAK_CLIENT_ID", "surimi-modelgui")
    monkeypatch.setenv("OIDC_KEYCLOAK_CLIENT_SECRET", "s3cret")
    monkeypatch.setenv("OIDC_KEYCLOAK_ADMIN_VALUES", "surimi-admin, chief")
    providers = Settings(
        controller_mode="fake", oidc_providers=" Keycloak "
    ).oidc_provider_settings()
    cfg = providers["keycloak"]
    assert cfg.discovery == "https://kc.test/realms/surimi/.well-known/openid-configuration"
    assert cfg.values(cfg.admin_values) == {"surimi-admin", "chief"}
    assert cfg.default_role == "deny"


def test_oidc_provider_key_must_be_simple() -> None:
    with pytest.raises(ValueError, match="lower-case"):
        Settings(controller_mode="fake", oidc_providers="key-cloak").oidc_provider_settings()


@pytest.mark.parametrize(
    ("host", "expected"),
    [
        ("10.0.0.7", "10.0.0.7"),
        ("::1", "::1"),
        ("testclient", None),
        ("", None),
        (None, None),
        ("1.2.3.4, 5.6.7.8", None),
    ],
)
def test_valid_ip(host: str | None, expected: str | None) -> None:
    assert valid_ip(host) == expected
