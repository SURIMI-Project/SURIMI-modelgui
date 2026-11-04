"""Application errors and their JSON form.

Every error the API returns has the same body:

    {"error": {"code": "controller_unavailable", "message": "...", "request_id": "..."}}

so clients and logs can match a failure to its request.
"""

from __future__ import annotations

from typing import Any, ClassVar

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

log = structlog.get_logger("surimi.errors")


class AppError(Exception):
    status_code: ClassVar[int] = 500
    code: ClassVar[str] = "internal_error"

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        self.headers = headers


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class InvalidInputError(AppError):
    status_code = 422
    code = "invalid_input"


def error_body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "message": message}
    if details:
        body["details"] = details
    request_id = structlog.contextvars.get_contextvars().get("request_id")
    if request_id:
        body["request_id"] = request_id
    return {"error": body}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        level = log.warning if exc.status_code >= 500 else log.info
        level("app.error", code=exc.code, status=exc.status_code, message=exc.message)
        return JSONResponse(
            error_body(exc.code, exc.message, exc.details),
            status_code=exc.status_code,
            headers=exc.headers,
        )
