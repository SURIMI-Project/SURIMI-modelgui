"""Application factory. Run with `surimi-backend serve`, or
`uvicorn --factory surimi_backend.main:create_app`."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
import structlog
from fastapi import FastAPI

from surimi_backend import __version__
from surimi_backend.api import health
from surimi_backend.auth import router as auth_router
from surimi_backend.auth.ratelimit import FailureCounter
from surimi_backend.catalog import router as catalog_router
from surimi_backend.catalog.service import CatalogService
from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.core.errors import install_error_handlers
from surimi_backend.core.logging import RequestContextMiddleware, configure_logging
from surimi_backend.integrations.controller import ControllerClient, build_controller_client
from surimi_backend.integrations.oidc import build_providers
from surimi_backend.users import router as users_router

log = structlog.get_logger("surimi.app")

OIDC_HTTP_TIMEOUT_SECONDS = 10.0


def create_app(
    settings: Settings | None = None,
    *,
    controller: ControllerClient | None = None,
    oidc_http: httpx.AsyncClient | None = None,
) -> FastAPI:
    """`controller` and `oidc_http` let tests pass their own clients; otherwise
    they follow CONTROLLER_MODE and talk to the real OIDC providers."""
    settings = settings or Settings()
    configure_logging(settings)
    settings.validate_for_api()
    provider_settings = settings.oidc_provider_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_engine(settings)
        client = controller or build_controller_client(settings)
        http = oidc_http or httpx.AsyncClient(
            timeout=OIDC_HTTP_TIMEOUT_SECONDS, follow_redirects=False
        )
        app.state.settings = settings
        app.state.engine = engine
        app.state.sessionmaker = create_sessionmaker(engine)
        app.state.controller = client
        app.state.catalog = CatalogService(client, settings.catalog_cache_seconds)
        app.state.oidc_providers = build_providers(provider_settings, http)
        app.state.login_limiter = FailureCounter(
            max_failures=settings.login_ip_max_failures,
            window_seconds=settings.login_failure_window_minutes * 60,
        )
        if settings.db_user_is_admin_like:
            log.warning("config.db_user_is_admin", db_user=settings.sqlalchemy_url.username)
        if not settings.cookie_secure:
            log.warning("config.cookie_not_secure", hint="only for plain-http local runs")
        log.info(
            "app.started",
            version=__version__,
            controller_mode=settings.controller_mode,
            controller=settings.controller_grpc_url or None,
            database=f"{settings.sqlalchemy_url.host}/{settings.sqlalchemy_url.database}",
            sso_providers=sorted(provider_settings),
        )
        try:
            yield
        finally:
            await client.close()
            if oidc_http is None:
                await http.aclose()
            await engine.dispose()
            log.info("app.stopped")

    app = FastAPI(
        title="SURIMI model GUI API",
        version=__version__,
        lifespan=lifespan,
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url=None,
    )
    install_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth_router.router)
    app.include_router(users_router.router)
    app.include_router(catalog_router.router)
    app.add_middleware(RequestContextMiddleware, log_client_ip=settings.log_client_ip)
    return app
