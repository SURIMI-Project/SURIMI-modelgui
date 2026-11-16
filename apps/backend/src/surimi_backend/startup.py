"""What the backend runs with, logged once when the API (`app.started`,
`app.config`) or the worker (`worker.config`) starts.

Every setting is listed in one section of `SECTIONS`; a test fails when a new
setting is in none. Secrets never reach the log: a `SecretStr` is shown as
`set` or `not set`, and so are the fields in `_MASKED`.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, SecretStr

from surimi_backend.auth.service import callback_url
from surimi_backend.console import CONSOLE_PATH
from surimi_backend.core.config import Settings

DOCS_PATH = "/api/v1/docs"
OPENAPI_PATH = "/api/v1/openapi.json"

SECTIONS: dict[str, tuple[str, ...]] = {
    "logging": ("log_level", "log_format", "log_client_ip"),
    "http": (
        "host",
        "port",
        "web_concurrency",
        "trusted_proxies",
        "public_base_url",
        "console_enabled",
    ),
    "database": (
        "db_host",
        "db_port",
        "db_name",
        "db_user",
        "db_password",
        "db_sslmode",
        "db_pool_size",
        "database_url",
    ),
    "controller": (
        "controller_mode",
        "controller_grpc_url",
        "controller_timeout_seconds",
        "controller_read_retries",
        "fake_controller_init_seconds",
        "fake_controller_run_seconds",
    ),
    "catalog": ("catalog_cache_seconds", "catalog_import_max_mb"),
    "queue": (
        "ecopath_pods",
        "controller_mse_simulations",
        "max_pods_per_user",
        "max_queued_experiments_per_user",
        "max_head_wait_minutes",
        "poll_interval_seconds",
        "start_timeout_minutes",
        "init_timeout_minutes",
        "stall_after_minutes",
        "lost_after_polls",
        "cancel_timeout_minutes",
    ),
    "outputs": (
        "outputs_uri",
        "s3_endpoint_url",
        "s3_access_key_id",
        "s3_secret_access_key",
        "s3_session_token",
        "s3_region",
        "s3_public_endpoint",
        "presigned_url_ttl_seconds",
        "output_chunk_cache_mb",
        "output_range_merge_gap_kb",
        "output_stable_seconds",
        "output_wait_minutes",
        "output_index_max_attempts",
        "outputs_nginx_prefix",
    ),
    "sessions": (
        "jwt_secret",
        "access_token_minutes",
        "refresh_token_days",
        "session_max_age_hours",
        "sso_session_max_age_hours",
        "cookie_secure",
    ),
    "sign_in": ("login_max_failures", "login_ip_max_failures", "login_failure_window_minutes"),
    "retention": ("retention_login_ip_days", "retention_login_user_agent_days"),
    "sso": ("oidc_providers",),
    "first_admin": (
        "admin_email",
        "admin_username",
        "admin_first_name",
        "admin_last_name",
        "admin_password",
    ),
}

# Shown only as set or not set besides every SecretStr: DATABASE_URL is a
# SecretStr that is None when unset; an S3 key id is half a credential; the
# first admin's details are personal data (ADR 0013).
_MASKED = frozenset(
    {
        "database_url",
        "s3_access_key_id",
        "admin_email",
        "admin_username",
        "admin_first_name",
        "admin_last_name",
    }
)


def _show(name: str, value: object) -> object:
    if isinstance(value, SecretStr):
        return "set" if value.get_secret_value() else "not set"
    if name in _MASKED:
        return "set" if value else "not set"
    return value


def _fields(model: BaseModel, names: tuple[str, ...]) -> dict[str, object]:
    return {name: _show(name, getattr(model, name)) for name in names}


def urls(settings: Settings) -> dict[str, str | None]:
    """Where people reach the API, through PUBLIC_BASE_URL (nginx forwards
    /api/v1/ to the API), and where the API itself listens."""
    base = settings.public_base_url.rstrip("/")
    return {
        "public_base_url": base,
        "docs_url": base + DOCS_PATH,
        "openapi_url": base + OPENAPI_PATH,
        "console_url": f"{base}{CONSOLE_PATH}/" if settings.console_enabled else None,
        "listen": f"http://{settings.host}:{settings.port}",
    }


def sso_providers(settings: Settings) -> dict[str, dict[str, object]]:
    """Each OIDC provider with the callback URL to register at the provider."""
    try:
        providers = settings.oidc_provider_settings()
    except ValueError as exc:
        return {"error": {"message": str(exc)}}
    out: dict[str, dict[str, object]] = {}
    for key, provider in providers.items():
        shown = _fields(provider, tuple(type(provider).model_fields))
        shown["discovery"] = provider.discovery
        shown["callback_url"] = callback_url(settings, key)
        out[key] = shown
    return out


def config_summary(settings: Settings) -> dict[str, Any]:
    """Every setting by section, secrets masked, plus the effective database
    URL (password hidden) and the SSO providers."""
    summary: dict[str, Any] = {
        section: _fields(settings, names) for section, names in SECTIONS.items()
    }
    summary["database"]["effective_url"] = settings.sqlalchemy_url.render_as_string(
        hide_password=True
    )
    summary["sso"]["providers"] = sso_providers(settings)
    return summary
