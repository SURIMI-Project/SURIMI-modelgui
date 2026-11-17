"""Prometheus metrics (ADR 0010; list and labels in
docs/features/observability-and-activity § Metrics).

Every label has a small fixed set of values: route templates, not paths; no
user or experiment ids. The API has no gauges, so its numbers stay right in
`prometheus-client`'s multiprocess mode (WEB_CONCURRENCY > 1); the gauges are
set by the worker leader.

Counters move when a change is made, before its transaction commits. They are
for rates and alerts; exact numbers come from the statistics endpoints.
"""

from __future__ import annotations

import asyncio
import hmac
import shutil
import threading
from collections.abc import Iterable
from pathlib import Path
from socketserver import ThreadingMixIn
from typing import Any
from wsgiref.simple_server import WSGIRequestHandler, WSGIServer, make_server
from wsgiref.types import StartResponse, WSGIEnvironment

import structlog
from fastapi import APIRouter, Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    REGISTRY,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    make_wsgi_app,
    multiprocess,
)
from pydantic import SecretStr

from surimi_backend.auth.errors import NotAuthenticatedError
from surimi_backend.core.config import Settings

log = structlog.get_logger("surimi.metrics")

METRICS_PATH = "/metrics"
UNMATCHED_ROUTE = "unmatched"
_METHODS = frozenset({"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"})

_RPC_BUCKETS = (0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0)
_CYCLE_BUCKETS = (0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0)

# --- API ---------------------------------------------------------------------------

HTTP_REQUESTS = Counter(
    "surimi_http_requests_total",
    "HTTP requests answered, by route template and status code.",
    ["method", "route", "status"],
)
HTTP_DURATION = Histogram(
    "surimi_http_request_duration_seconds",
    "Time to answer an HTTP request, by route template.",
    ["method", "route"],
)
LOGINS = Counter(
    "surimi_logins_total",
    "Sign-in attempts, by method (password, sso) and result (success, bad_credentials, ...).",
    ["method", "result"],
)
EXPERIMENTS_SUBMITTED = Counter(
    "surimi_experiments_submitted_total",
    "Experiments that entered the queue, by scenario.",
    ["scenario"],
)

# --- API and worker ----------------------------------------------------------------

EXPERIMENTS_ENDED = Counter(
    "surimi_experiments_ended_total",
    "Experiments that reached a final state, by scenario and status.",
    ["scenario", "status"],
)
CONTROLLER_RPC_DURATION = Histogram(
    "surimi_controller_rpc_duration_seconds",
    "Controller call attempts, by RPC and gRPC status code.",
    ["rpc", "code"],
    buckets=_RPC_BUCKETS,
)

# --- worker ------------------------------------------------------------------------
# multiprocess_mode only matters if PROMETHEUS_MULTIPROC_DIR is set for the worker
# too; "max" then keeps the leader's value over the standby's 0.

WORKER_LEADER = Gauge(
    "surimi_worker_leader",
    "1 while this worker holds the leader lock (ADR 0019).",
    multiprocess_mode="max",
)
WORKER_CYCLE_DURATION = Histogram(
    "surimi_worker_cycle_duration_seconds",
    "Time of one worker cycle: poll, dispatch, index.",
    buckets=_CYCLE_BUCKETS,
)
WORKER_STEP_FAILURES = Counter(
    "surimi_worker_step_failures_total",
    "Worker cycle steps that raised, by step.",
    ["step"],
)
EXPERIMENTS_ACTIVE = Gauge(
    "surimi_experiments_active",
    "Experiments not in a final state, by status (set by the worker leader).",
    ["status"],
    multiprocess_mode="max",
)
EXPERIMENTS_STALLED = Gauge(
    "surimi_experiments_stalled",
    "Experiments flagged as stalled (set by the worker leader).",
    multiprocess_mode="max",
)
ECOPATH_PODS_IN_USE = Gauge(
    "surimi_ecopath_pods_in_use",
    "Ecopath pods held by our in-flight experiments, by our count (ADR 0015).",
    multiprocess_mode="max",
)
RETENTION_ROWS = Counter(
    "surimi_retention_rows_total",
    "Rows rolled up, nulled or deleted by the retention purge (ADR 0013).",
    ["table", "action"],
)


def method_label(method: str) -> str:
    return method if method in _METHODS else "other"


def registry(settings: Settings) -> CollectorRegistry:
    """The registry `/metrics` reads: every process's values in multiprocess
    mode, otherwise this process's (with the process collector)."""
    if settings.prometheus_multiproc_dir:
        merged = CollectorRegistry()
        multiprocess.MultiProcessCollector(merged, path=settings.prometheus_multiproc_dir)  # type: ignore[no-untyped-call]  # untyped in prometheus-client
        return merged
    return REGISTRY


def authorized(token: SecretStr, header: str | None) -> bool:
    """True without METRICS_TOKEN; otherwise only for `Bearer <token>`, compared
    in constant time so the token cannot be guessed from response times."""
    expected = token.get_secret_value()
    if not expected:
        return True
    scheme, _, given = (header or "").partition(" ")
    return scheme.lower() == "bearer" and hmac.compare_digest(
        given.strip().encode(), expected.encode()
    )


def metrics_router(settings: Settings) -> APIRouter:
    router = APIRouter()

    @router.get(METRICS_PATH, include_in_schema=False)
    async def metrics(request: Request) -> Response:
        if not authorized(settings.metrics_token, request.headers.get("authorization")):
            raise NotAuthenticatedError(
                "/metrics needs the METRICS_TOKEN bearer token",
                headers={"WWW-Authenticate": 'Bearer realm="metrics"'},
            )
        # Multiprocess mode reads one small file per process: off the event loop.
        body = await asyncio.to_thread(generate_latest, registry(settings))
        return Response(body, media_type=CONTENT_TYPE_LATEST)

    return router


def prepare_multiprocess_dir(path: str) -> None:
    """Empties the folder before the API processes start: values left by an
    earlier run would be added to the new ones."""
    folder = Path(path)
    if folder.exists():
        for child in folder.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    folder.mkdir(parents=True, exist_ok=True)


class _ThreadingServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


class _QuietHandler(WSGIRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        """Scrapes every 15 s would fill the log; nothing is logged per request."""


def serve_metrics(port: int, token: SecretStr) -> WSGIServer:
    """/metrics of this process's own registry, behind the same token check as
    the API, from a daemon thread. Port 0 picks a free port (tests)."""
    inner = make_wsgi_app(REGISTRY)

    def app(environ: WSGIEnvironment, start_response: StartResponse) -> Iterable[bytes]:
        if not authorized(token, environ.get("HTTP_AUTHORIZATION")):
            start_response(
                "401 Unauthorized",
                [("WWW-Authenticate", 'Bearer realm="metrics"'), ("Content-Type", "text/plain")],
            )
            return [b"/metrics needs the METRICS_TOKEN bearer token\n"]
        body: Iterable[bytes] = inner(environ, start_response)  # make_wsgi_app is loosely typed
        return body

    server = make_server(
        "0.0.0.0",  # noqa: S104 - inside a container; scraped over the container network
        port,
        app,
        server_class=_ThreadingServer,
        handler_class=_QuietHandler,
    )
    threading.Thread(target=server.serve_forever, name="metrics", daemon=True).start()
    return server


def start_worker_metrics_server(settings: Settings) -> None:
    """The worker has no HTTP server of its own: /metrics on WORKER_METRICS_PORT.
    Always this process's own registry: the worker is one process, and a
    multiprocess folder may hold the API's files."""
    if not settings.metrics_enabled:
        return
    serve_metrics(settings.worker_metrics_port, settings.metrics_token)
    log.info(
        "metrics.worker_server",
        port=settings.worker_metrics_port,
        token_required=bool(settings.metrics_token.get_secret_value()),
    )
