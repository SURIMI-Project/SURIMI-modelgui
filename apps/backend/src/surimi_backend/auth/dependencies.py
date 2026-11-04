"""Who is calling (ADR 0004, ADR 0005).

The token comes from `Authorization: Bearer` (scripts, Bruno) or the access
cookie (browsers). Its session and user are loaded on every request, so a
logout, a deactivation or a demotion takes effect at once, not when the
15-minute token expires. Cookie requests that change data must also send the
CSRF header (double submit); bearer requests cannot be forged by another site.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.auth.cookies import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER
from surimi_backend.auth.errors import (
    CsrfError,
    ForbiddenError,
    NotAuthenticatedError,
    PasswordChangeRequiredError,
)
from surimi_backend.auth.models import UserSession
from surimi_backend.auth.sessions import session_is_live
from surimi_backend.auth.tokens import decode_access_token, tokens_equal
from surimi_backend.core.config import Settings
from surimi_backend.core.db import get_session
from surimi_backend.users.models import Role, User

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


@dataclass(frozen=True, slots=True)
class Principal:
    user: User
    session: UserSession
    via_cookie: bool

    @property
    def is_admin(self) -> bool:
        return self.user.role is Role.ADMIN


Db = Annotated[AsyncSession, Depends(get_session)]


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


AppSettings = Annotated[Settings, Depends(get_settings)]


def _token(request: Request) -> tuple[str, bool]:
    header = request.headers.get("authorization", "")
    scheme, _, value = header.partition(" ")
    if scheme.lower() == "bearer" and value.strip():
        return value.strip(), False
    cookie = request.cookies.get(ACCESS_COOKIE)
    if cookie:
        return cookie, True
    raise NotAuthenticatedError("sign in first")


def check_csrf(request: Request) -> None:
    if request.method in SAFE_METHODS:
        return
    sent = request.headers.get(CSRF_HEADER, "")
    expected = request.cookies.get(CSRF_COOKIE, "")
    if not sent or not expected or not tokens_equal(sent, expected):
        raise CsrfError(f"missing or wrong {CSRF_HEADER} header")


async def principal_allowing_password_change(
    request: Request, db: Db, settings: AppSettings
) -> Principal:
    token, via_cookie = _token(request)
    claims = decode_access_token(settings, token)
    session = await db.get(UserSession, claims.session_id)
    user = await db.get(User, claims.user_id)
    if (
        session is None
        or user is None
        or session.user_id != user.id
        or not session_is_live(session, datetime.now(UTC))
        or not user.is_active
        or user.deleted_at is not None
    ):
        raise NotAuthenticatedError("the session has ended; sign in again")
    if via_cookie:
        check_csrf(request)
    structlog.contextvars.bind_contextvars(user_id=str(user.id))
    return Principal(user=user, session=session, via_cookie=via_cookie)


async def current_principal(
    principal: Annotated[Principal, Depends(principal_allowing_password_change)],
) -> Principal:
    if principal.user.must_change_password:
        raise PasswordChangeRequiredError("change your password first (POST /api/v1/auth/password)")
    return principal


async def admin_principal(principal: Annotated[Principal, Depends(current_principal)]) -> Principal:
    if not principal.is_admin:
        raise ForbiddenError("admins only")
    return principal


CurrentUser = Annotated[Principal, Depends(current_principal)]
CurrentUserAllowingPasswordChange = Annotated[
    Principal, Depends(principal_allowing_password_change)
]
AdminUser = Annotated[Principal, Depends(admin_principal)]
