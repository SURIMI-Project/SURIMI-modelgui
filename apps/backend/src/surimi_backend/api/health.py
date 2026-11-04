"""Liveness and readiness (ADR 0010).

`/healthz` says the process runs. `/readyz` checks what the API needs to serve
requests: the database is required (503 without it); the controller is
reported but does not fail readiness, so a controller outage does not take the
backend out of rotation as well.
"""

from __future__ import annotations

import asyncio
import time
from importlib import resources
from typing import Literal

import structlog
from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

from surimi_backend import __version__
from surimi_backend.core.db import check_database

router = APIRouter(tags=["Health"])
log = structlog.get_logger("surimi.health")

CHECK_TIMEOUT_SECONDS = 2.0


def pinned_protocol() -> str:
    try:
        return resources.files("surimi").joinpath("PROTOCOL").read_text(encoding="utf-8").strip()
    except (FileNotFoundError, ModuleNotFoundError):
        return "unknown"


class Check(BaseModel):
    ok: bool
    required: bool
    latency_ms: float | None = None
    detail: str | None = None


class ReadyOut(BaseModel):
    status: Literal["ready", "not_ready"]
    version: str
    protocol: str
    checks: dict[str, Check]


@router.get("/healthz", summary="Liveness")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get(
    "/readyz", response_model=ReadyOut, summary="Readiness", responses={503: {"model": ReadyOut}}
)
async def readyz(request: Request, response: Response) -> ReadyOut:
    state = request.app.state
    checks: dict[str, Check] = {}

    try:
        async with asyncio.timeout(CHECK_TIMEOUT_SECONDS):
            latency = await check_database(state.engine)
        checks["database"] = Check(ok=True, required=True, latency_ms=round(latency, 1))
    except Exception as exc:  # noqa: BLE001 - any failure means not ready
        checks["database"] = Check(ok=False, required=True, detail=type(exc).__name__)
        log.warning("readyz.database_failed", error=str(exc))

    start = time.perf_counter()
    try:
        async with asyncio.timeout(CHECK_TIMEOUT_SECONDS):
            version = await state.controller.get_protocol_version()
        checks["controller"] = Check(
            ok=True,
            required=False,
            latency_ms=round((time.perf_counter() - start) * 1000, 1),
            detail=f"protocol {version}",
        )
    except Exception as exc:  # noqa: BLE001 - reported, not required
        checks["controller"] = Check(
            ok=False, required=False, detail=getattr(exc, "message", type(exc).__name__)
        )

    ready = all(c.ok for c in checks.values() if c.required)
    response.status_code = 200 if ready else 503
    return ReadyOut(
        status="ready" if ready else "not_ready",
        version=__version__,
        protocol=pinned_protocol(),
        checks=checks,
    )
