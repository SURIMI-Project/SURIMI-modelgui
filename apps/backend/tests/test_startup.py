"""The startup log: every setting in a section, no secret values, the URLs."""

from __future__ import annotations

import json

import pytest
from pydantic import SecretStr

from surimi_backend.core.config import Settings
from surimi_backend.startup import SECTIONS, config_summary, urls

SECRETS = {
    "jwt_secret": "j" * 40,
    "db_password": "db-password-value",
    "s3_secret_access_key": "s3-secret-value",
    "s3_session_token": "s3-token-value",
    "admin_password": "admin-password-value",
}


def make_settings(monkeypatch: pytest.MonkeyPatch, **extra: str) -> Settings:
    monkeypatch.setenv("OIDC_PROVIDERS", "keycloak")
    monkeypatch.setenv("OIDC_KEYCLOAK_ISSUER", "http://localhost:18081/realms/surimi")
    monkeypatch.setenv("OIDC_KEYCLOAK_CLIENT_ID", "surimi-modelgui")
    monkeypatch.setenv("OIDC_KEYCLOAK_CLIENT_SECRET", "oidc-client-secret-value")
    values: dict[str, object] = {
        **{k: SecretStr(v) for k, v in SECRETS.items()},
        "s3_access_key_id": "AKIAEXAMPLEKEYID",
        "admin_email": "admin@example.org",
        "public_base_url": "http://localhost:18080/",
        **extra,
    }
    return Settings(**values)  # type: ignore[arg-type]


def test_every_setting_is_in_exactly_one_section() -> None:
    listed = [name for names in SECTIONS.values() for name in names]
    assert len(listed) == len(set(listed))
    assert set(listed) == set(Settings.model_fields)


def test_no_secret_reaches_the_summary(monkeypatch: pytest.MonkeyPatch) -> None:
    text = json.dumps(config_summary(make_settings(monkeypatch)))
    for value in [*SECRETS.values(), "oidc-client-secret-value", "AKIAEXAMPLEKEYID"]:
        assert value not in text
    assert "admin@example.org" not in text


def test_summary_shows_what_is_set(monkeypatch: pytest.MonkeyPatch) -> None:
    summary = config_summary(make_settings(monkeypatch))
    assert summary["sessions"]["jwt_secret"] == "set"
    assert summary["outputs"]["s3_access_key_id"] == "set"
    assert summary["first_admin"]["admin_username"] == "not set"
    assert summary["database"]["database_url"] == "not set"
    assert summary["database"]["effective_url"] == (
        "postgresql+asyncpg://surimi_modelgui:***@127.0.0.1:5432/surimi_modelgui_db"
    )
    keycloak = summary["sso"]["providers"]["keycloak"]
    assert keycloak["client_secret"] == "set"
    assert keycloak["client_id"] == "surimi-modelgui"
    assert keycloak["callback_url"] == ("http://localhost:18080/api/v1/auth/sso/keycloak/callback")
    assert keycloak["discovery"] == (
        "http://localhost:18081/realms/surimi/.well-known/openid-configuration"
    )


def test_database_url_is_masked(monkeypatch: pytest.MonkeyPatch) -> None:
    url = "postgresql://app:url-password-value@db:5432/surimi_modelgui_db"
    summary = config_summary(make_settings(monkeypatch, database_url=url))
    assert summary["database"]["database_url"] == "set"
    assert "url-password-value" not in json.dumps(summary)
    assert summary["database"]["effective_url"] == (
        "postgresql+asyncpg://app:***@db:5432/surimi_modelgui_db"
    )


def test_urls(monkeypatch: pytest.MonkeyPatch) -> None:
    assert urls(make_settings(monkeypatch)) == {
        "public_base_url": "http://localhost:18080",
        "docs_url": "http://localhost:18080/api/v1/docs",
        "openapi_url": "http://localhost:18080/api/v1/openapi.json",
        "console_url": "http://localhost:18080/api/v1/console/",
        "listen": "http://0.0.0.0:8000",
    }
    no_console = make_settings(monkeypatch, console_enabled="false")
    assert urls(no_console)["console_url"] is None


def test_a_bad_provider_key_is_reported_not_raised(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = make_settings(monkeypatch, oidc_providers="Bad-Key")
    assert "error" in config_summary(settings)["sso"]["providers"]
