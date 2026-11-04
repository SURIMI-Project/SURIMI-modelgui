"""Session cookies (ADR 0004). Access and refresh tokens are HttpOnly, so page
scripts cannot read them; the CSRF cookie is readable on purpose, so the
frontend can copy it into the X-CSRF-Token header (double submit)."""

from __future__ import annotations

from fastapi import Response

from surimi_backend.auth.tokens import FLOW_MINUTES, new_opaque_token
from surimi_backend.core.config import Settings

ACCESS_COOKIE = "surimi_access"
REFRESH_COOKIE = "surimi_refresh"
CSRF_COOKIE = "surimi_csrf"
FLOW_COOKIE = "surimi_sso_flow"
CSRF_HEADER = "x-csrf-token"

REFRESH_PATH = "/api/v1/auth"
FLOW_PATH = "/api/v1/auth/sso"


def set_session_cookies(
    response: Response, settings: Settings, *, access_token: str, refresh_token: str
) -> None:
    secure = settings.cookie_secure
    refresh_age = settings.refresh_token_days * 86400
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.access_token_minutes * 60,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=refresh_age,
        path=REFRESH_PATH,
        httponly=True,
        secure=secure,
        samesite="lax",
    )
    response.set_cookie(
        CSRF_COOKIE,
        new_opaque_token(),
        max_age=refresh_age,
        path="/",
        httponly=False,
        secure=secure,
        samesite="lax",
    )


def clear_session_cookies(response: Response, settings: Settings) -> None:
    for name, path in ((ACCESS_COOKIE, "/"), (REFRESH_COOKIE, REFRESH_PATH), (CSRF_COOKIE, "/")):
        response.delete_cookie(name, path=path, secure=settings.cookie_secure, samesite="lax")


def set_flow_cookie(response: Response, settings: Settings, flow_token: str) -> None:
    response.set_cookie(
        FLOW_COOKIE,
        flow_token,
        max_age=FLOW_MINUTES * 60,
        path=FLOW_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def clear_flow_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        FLOW_COOKIE, path=FLOW_PATH, secure=settings.cookie_secure, samesite="lax"
    )
