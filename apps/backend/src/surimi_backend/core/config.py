"""Settings, read from environment variables (names as in deployments/.env.example).

Database settings follow ADR 0014: one application user for migrations and
the app; `DATABASE_URL` overrides the separate `DB_*` pieces. Authentication
settings follow ADR 0004 and ADR 0005; OIDC providers are configured with
`OIDC_PROVIDERS` plus one `OIDC_<KEY>_*` group of variables per provider.
"""

from __future__ import annotations

import re
from functools import cached_property
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url

SslMode = Literal["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]

MIN_JWT_SECRET_LENGTH = 32
_PROVIDER_KEY = re.compile(r"^[a-z][a-z0-9]{0,30}$")


class OidcProviderSettings(BaseSettings):
    """One OIDC provider, from `OIDC_<KEY>_*` (ADR 0004, ADR 0005)."""

    model_config = SettingsConfigDict(extra="ignore", frozen=True)

    issuer: str
    # Where the backend fetches the discovery document. Defaults to
    # <issuer>/.well-known/openid-configuration; set it when the backend reaches
    # the provider under another address than browsers do (compose: keycloak:8080).
    discovery_url: str = ""
    client_id: str
    client_secret: SecretStr
    scopes: str = "openid email profile"
    display_name: str = ""
    # Role mapping: dotted path to a claim holding a string or a list, the
    # values that mean admin and member, and what to do when none matches.
    role_claim: str = ""
    admin_values: str = ""
    member_values: str = ""
    default_role: Literal["deny", "member"] = "deny"

    @property
    def discovery(self) -> str:
        return self.discovery_url or self.issuer.rstrip("/") + "/.well-known/openid-configuration"

    @staticmethod
    def values(raw: str) -> frozenset[str]:
        return frozenset(v.strip() for v in raw.split(",") if v.strip())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", frozen=True)

    # --- logging (ADR 0010, ADR 0013) -------------------------------------------
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"
    log_client_ip: bool = True

    # --- HTTP server --------------------------------------------------------------
    host: str = "0.0.0.0"  # noqa: S104 - inside a container
    port: int = 8000
    # API processes `serve` starts (uvicorn workers; user, 2026-11-16). One async
    # process already overlaps waits on the database and the controller; more help
    # CPU-bound work (charts and maps from .nc files, password hashing). Each has its
    # own DB pool (DB_POOL_SIZE + 10 overflow), chunk cache and sign-in IP limiter.
    # On Kubernetes keep 1 and scale replicas instead.
    web_concurrency: int = Field(default=1, ge=1, le=32)
    # Proxies whose X-Forwarded-For is trusted (uvicorn forwarded_allow_ips).
    trusted_proxies: str = "127.0.0.1"
    # Address browsers use for the app; SSO callbacks and redirects are built on it.
    public_base_url: str = "http://localhost:18080"
    # Sign-in and home page at /api/v1/console/ (docs/features/backend-console).
    console_enabled: bool = True

    # --- database (ADR 0014) ---------------------------------------------------------
    # 127.0.0.1, not localhost: on Windows localhost resolves to ::1 first and
    # compose publishes postgres on IPv4 only.
    db_host: str = "127.0.0.1"
    db_port: int = 5432
    db_name: str = "surimi_modelgui_db"
    db_user: str = "surimi_modelgui"
    db_password: SecretStr = SecretStr("")
    db_sslmode: SslMode = "disable"
    db_pool_size: int = 10
    database_url: SecretStr | None = None

    # --- SURIMI controller (ADR 0006) ------------------------------------------------
    controller_mode: Literal["grpc", "fake"] = "grpc"
    # https://host[:port] (TLS) or http://host[:port] (plaintext h2c)
    controller_grpc_url: str = ""
    controller_timeout_seconds: float = 10.0
    controller_read_retries: int = 2
    # CONTROLLER_MODE=fake: how long a fake simulation initialises, then runs.
    fake_controller_init_seconds: float = 5.0
    fake_controller_run_seconds: float = 60.0

    # --- catalog ---------------------------------------------------------------------
    catalog_cache_seconds: float = 600.0
    # Largest species CSV an admin may import (docs/features/scenario-catalog).
    # nginx's limit for that path (deployments/nginx) must match.
    catalog_import_max_mb: int = 10

    # --- experiment queue and worker (ADR 0015, ADR 0019) ------------------------------
    # Must equal the controller's ECOPATH_NR_OF_PODS and NR_OF_MSE_RUNS.
    ecopath_pods: int = 10
    controller_mse_simulations: int = 5
    max_pods_per_user: int = 5
    max_queued_experiments_per_user: int = 10
    # After this, nothing overtakes the head of the queue.
    max_head_wait_minutes: int = 30
    poll_interval_seconds: float = 10.0
    # A submitted experiment the controller never reports after this did not
    # start (no free Ecopath pod, or init failed before any simulation existed).
    start_timeout_minutes: int = 5
    # Initialising longer than this, or no progress for STALL_AFTER: stalled.
    init_timeout_minutes: int = 10
    stall_after_minutes: int = 30
    # Polls in a row in which a known experiment is missing: lost (controller restart).
    lost_after_polls: int = 3
    # How long the worker keeps calling RemoveExperiment for a cancel.
    cancel_timeout_minutes: int = 10

    # --- outputs (ADR 0009, ADR 0020) ---------------------------------------------------
    # Where <experiment id>/<experiment id>.nc lives: s3://bucket/prefix or file:///dir
    outputs_uri: str = "file:///data/experiments"
    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: SecretStr = SecretStr("")
    s3_session_token: SecretStr = SecretStr("")
    s3_region: str = "us-east-1"
    # Endpoint browsers reach; download links are signed for it. Empty = S3_ENDPOINT_URL.
    s3_public_endpoint: str = ""
    # Lifetime of a presigned download link (user, 2026-11-16: 1 hour). At most 7 days,
    # the longest an S3 SigV4 signature may live; with S3_SESSION_TOKEN a link also
    # stops working when those temporary credentials expire.
    presigned_url_ttl_seconds: int = Field(default=3600, ge=60, le=604_800)
    output_chunk_cache_mb: int = 256
    output_range_merge_gap_kb: int = 64
    # The .nc must keep the same size this long before it is indexed.
    output_stable_seconds: int = 60
    # Give up waiting for the .nc after this long.
    output_wait_minutes: int = 60
    output_index_max_attempts: int = 5
    # Local mode: internal nginx location mapped to the outputs folder.
    outputs_nginx_prefix: str = "/protected-outputs/"

    # --- sessions and tokens (ADR 0004) ----------------------------------------------
    # Signs access tokens and the SSO flow cookie. Required, >= 32 characters.
    jwt_secret: SecretStr = SecretStr("")
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    # Absolute session lifetime: password sign-in, and SSO (role re-read at the
    # next sign-in, ADR 0005).
    session_max_age_hours: int = 720
    sso_session_max_age_hours: int = 12
    # False only for plain-http local runs; browsers drop Secure cookies on http.
    cookie_secure: bool = True

    # --- sign-in protection (ADR 0004) ------------------------------------------------
    login_max_failures: int = 5
    login_ip_max_failures: int = 20
    login_failure_window_minutes: int = 15

    # --- retention of personal data (ADR 0013) ----------------------------------------
    # 0 = never store the field at all.
    retention_login_ip_days: int = 90
    retention_login_user_agent_days: int = 90

    # --- OIDC single sign-on (ADR 0004) ------------------------------------------------
    # Comma-separated provider keys, e.g. "keycloak"; each reads OIDC_<KEY>_*.
    oidc_providers: str = ""

    # --- first admin (`surimi-backend create-admin --from-env`) ------------------------
    admin_email: str = ""
    admin_username: str = ""
    admin_first_name: str = ""
    admin_last_name: str = ""
    admin_password: SecretStr = SecretStr("")

    @cached_property
    def sqlalchemy_url(self) -> URL:
        """Async SQLAlchemy URL; the password is escaped by URL.create."""
        if self.database_url is not None:
            url = make_url(self.database_url.get_secret_value())
            if url.drivername in ("postgresql", "postgres"):
                url = url.set(drivername="postgresql+asyncpg")
            return url
        return URL.create(
            "postgresql+asyncpg",
            username=self.db_user,
            password=self.db_password.get_secret_value() or None,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )

    @property
    def db_user_is_admin_like(self) -> bool:
        """True when the app runs as a typical instance admin (allowed, warned)."""
        user = self.sqlalchemy_url.username or ""
        return user in ("postgres", "admin", "root")

    def oidc_provider_settings(self) -> dict[str, OidcProviderSettings]:
        """Reads `OIDC_<KEY>_*` for every key in OIDC_PROVIDERS."""
        providers: dict[str, OidcProviderSettings] = {}
        for raw in self.oidc_providers.split(","):
            key = raw.strip().lower()
            if not key:
                continue
            if not _PROVIDER_KEY.match(key):
                raise ValueError(f"OIDC provider key {key!r}: use lower-case letters and digits")
            providers[key] = OidcProviderSettings(_env_prefix=f"OIDC_{key.upper()}_")  # type: ignore[call-arg]
        return providers

    def validate_for_api(self) -> None:
        """Checks that only the API needs (the migrate job builds Settings too)."""
        if len(self.jwt_secret.get_secret_value()) < MIN_JWT_SECRET_LENGTH:
            raise ValueError(
                f"JWT_SECRET must be set to at least {MIN_JWT_SECRET_LENGTH} characters "
                '(for example: python -c "import secrets; print(secrets.token_urlsafe(48))")'
            )
