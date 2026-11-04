"""Structured logging (ADR 0010): JSON lines on stdout, one per event, with the
request id and other context bound per request. Sensitive keys are dropped
(ADR 0013)."""

from __future__ import annotations

import logging
import re
import sys
import time
import uuid
from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any

import structlog
from starlette.datastructures import MutableHeaders

from surimi_backend.core.config import Settings

_SENSITIVE = ("password", "secret", "token", "authorization", "cookie")
_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
_QUIET_PATHS = ("/healthz", "/readyz")

log = structlog.get_logger("surimi.http")


def _drop_sensitive(_: Any, __: str, event: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    for key in list(event):
        if any(s in key.lower() for s in _SENSITIVE):
            event[key] = "[removed]"
    return event


def configure_logging(settings: Settings) -> None:
    shared: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _drop_sensitive,
        structlog.processors.format_exc_info,
    ]
    renderer: Any = (
        structlog.processors.JSONRenderer()
        if settings.log_format == "json"
        else structlog.dev.ConsoleRenderer()
    )
    structlog.configure(
        processors=[*shared, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            foreign_pre_chain=shared,
            processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, renderer],
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())
    # uvicorn's own loggers go through ours; its access log is replaced by
    # RequestContextMiddleware, which logs the route template, not the raw path.
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True
    logging.getLogger("uvicorn.access").disabled = True


Scope = MutableMapping[str, Any]
Message = MutableMapping[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]
ASGIApp = Callable[[Scope, Receive, Send], Awaitable[None]]


class RequestContextMiddleware:
    """Pure ASGI middleware (safe for streaming responses such as SSE): binds a
    request id, returns it as X-Request-ID, and logs one line per request."""

    def __init__(self, app: ASGIApp, *, log_client_ip: bool) -> None:
        self.app = app
        self.log_client_ip = log_client_ip

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = dict(scope.get("headers") or []).get(b"x-request-id", b"").decode("latin-1")
        request_id = incoming if _REQUEST_ID.match(incoming) else uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        status = 500
        start = time.perf_counter()

        async def send_with_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message).append("x-request-id", request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            route = scope.get("route")
            fields: dict[str, Any] = {
                "method": scope["method"],
                "path": getattr(route, "path", None) or scope["path"],
                "status": status,
                "duration_ms": round((time.perf_counter() - start) * 1000, 1),
            }
            if self.log_client_ip and scope.get("client"):
                fields["client_ip"] = scope["client"][0]
            if scope["path"] in _QUIET_PATHS and status < 400:
                log.debug("http.request", **fields)
            else:
                log.info("http.request", **fields)
            structlog.contextvars.clear_contextvars()
