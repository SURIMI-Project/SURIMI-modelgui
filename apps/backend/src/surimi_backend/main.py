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
from surimi_backend.audit import router as audit_router
from surimi_backend.auth import router as auth_router
from surimi_backend.auth.ratelimit import FailureCounter
from surimi_backend.catalog import router as catalog_router
from surimi_backend.catalog.scenario_data import DbScenarioData, ScenarioDataSource
from surimi_backend.catalog.service import CatalogService
from surimi_backend.catalog.species import DbSpeciesLookup, SpeciesLookup
from surimi_backend.console import install_console
from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.core.errors import install_error_handlers
from surimi_backend.core.logging import RequestContextMiddleware, configure_logging
from surimi_backend.experiments import router as experiments_router
from surimi_backend.hcr import router as hcr_router
from surimi_backend.initial_hcr import router as initial_hcr_router
from surimi_backend.integrations.controller import ControllerClient, build_controller_client
from surimi_backend.integrations.oidc import build_providers
from surimi_backend.notifications import router as events_router
from surimi_backend.observability import router as activity_router
from surimi_backend.observability.metrics import metrics_router
from surimi_backend.observability.tracing import (
    API_SERVICE,
    configure_tracing,
    instrument_app,
    shutdown_tracing,
)
from surimi_backend.outputs import router as outputs_router
from surimi_backend.outputs.read import OutputReader
from surimi_backend.outputs.storage import OutputStorage
from surimi_backend.startup import DOCS_PATH, OPENAPI_PATH, config_summary, urls
from surimi_backend.users import router as users_router

log = structlog.get_logger("surimi.app")

OIDC_HTTP_TIMEOUT_SECONDS = 10.0


def _attach_outputs(app: FastAPI, settings: Settings) -> None:
    app.state.output_storage = OutputStorage(settings)
    app.state.output_reader = OutputReader(
        app.state.output_storage,
        cache_mb=settings.output_chunk_cache_mb,
        merge_gap_kb=settings.output_range_merge_gap_kb,
    )


def create_app(
    settings: Settings | None = None,
    *,
    controller: ControllerClient | None = None,
    oidc_http: httpx.AsyncClient | None = None,
    species: SpeciesLookup | None = None,
    scenario_data: ScenarioDataSource | None = None,
) -> FastAPI:
    """`controller` and `oidc_http` let tests pass their own clients; otherwise
    they follow CONTROLLER_MODE and talk to the real OIDC providers. `species`
    and `scenario_data` let tests without a database read the shipped CSVs;
    otherwise they come from the `species` and `catalog_*` tables."""
    settings = settings or Settings()
    configure_logging(settings)
    settings.validate_for_api()
    provider_settings = settings.oidc_provider_settings()
    # Before the engine and the controller channel exist: the instrumentations
    # patch their creation.
    tracer_provider = configure_tracing(settings, API_SERVICE)

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
        app.state.catalog = CatalogService(
            client,
            settings.catalog_cache_seconds,
            scenario_data=scenario_data or DbScenarioData(app.state.sessionmaker),
            species=species or DbSpeciesLookup(app.state.sessionmaker),
        )
        app.state.oidc_providers = build_providers(provider_settings, http)
        _attach_outputs(app, settings)
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
            **urls(settings),
            controller_mode=settings.controller_mode,
            controller=settings.controller_grpc_url or None,
            database=f"{settings.sqlalchemy_url.host}/{settings.sqlalchemy_url.database}",
            sso_enabled=bool(provider_settings),
            sso_providers=sorted(provider_settings),
            metrics_enabled=settings.metrics_enabled,
            metrics_multiprocess=bool(settings.prometheus_multiproc_dir),
            tracing_enabled=tracer_provider is not None,
        )
        log.info("app.config", **config_summary(settings))
        try:
            yield
        finally:
            await client.close()
            if oidc_http is None:
                await http.aclose()
            await engine.dispose()
            shutdown_tracing()
            log.info("app.stopped")

    app = FastAPI(
        title="SURIMI model GUI API",
        version=__version__,
        lifespan=lifespan,
        openapi_url=OPENAPI_PATH,
        docs_url=DOCS_PATH,
        redoc_url=None,
    )
    install_error_handlers(app)
    for router in (
        health.router,
        auth_router.router,
        users_router.router,
        catalog_router.router,
        catalog_router.species_router,
        catalog_router.species_admin_router,
        catalog_router.catalog_admin_router,
        hcr_router.router,
        initial_hcr_router.router,
        experiments_router.router,
        experiments_router.queue_router,
        experiments_router.admin_router,
        experiments_router.scenario_router,
        outputs_router.router,
        outputs_router.admin_router,
        events_router.router,
        activity_router.router,
        audit_router.router,
    ):
        app.include_router(router)
    if settings.metrics_enabled:
        app.include_router(metrics_router(settings))
    install_console(app, settings)
    app.add_middleware(RequestContextMiddleware, log_client_ip=settings.log_client_ip)
    # Outermost, so the request log line and every span below carry the trace.
    instrument_app(app, tracer_provider)
    return app
