"""Sessions: creation, refresh-token rotation with reuse detection, revocation
(ADR 0004). Every change is added to the caller's transaction."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.auth.errors import NotAuthenticatedError
from surimi_backend.auth.models import LoginMethod, UserSession
from surimi_backend.auth.tokens import hash_token, new_opaque_token
from surimi_backend.core.config import Settings
from surimi_backend.users.models import User

log = structlog.get_logger("surimi.auth")

# Two tabs refreshing at the same moment send the same token; the second one
# arrives after the first rotated it. Within this window that is a race, not
# theft: answer 401 without revoking, the client retries with the new cookie.
REFRESH_RACE_SECONDS = 30


def _max_age(settings: Settings, method: LoginMethod) -> timedelta:
    hours = (
        settings.sso_session_max_age_hours
        if method is LoginMethod.SSO
        else settings.session_max_age_hours
    )
    return timedelta(hours=hours)


def create_session(
    db: AsyncSession,
    settings: Settings,
    user: User,
    *,
    method: LoginMethod,
    provider: str | None = None,
    lifetime: timedelta | None = None,
) -> tuple[UserSession, str]:
    """Returns the session and its refresh token (shown once, stored hashed).
    `lifetime` caps the absolute lifetime (token-only sessions for scripts)."""
    now = datetime.now(UTC)
    absolute = now + (lifetime or _max_age(settings, method))
    refresh = new_opaque_token()
    session = UserSession(
        id=uuid.uuid4(),
        user_id=user.id,
        method=method,
        provider=provider,
        refresh_token_hash=hash_token(refresh),
        created_at=now,
        last_used_at=now,
        expires_at=min(now + timedelta(days=settings.refresh_token_days), absolute),
        absolute_expires_at=absolute,
    )
    db.add(session)
    return session, refresh


def session_is_live(session: UserSession, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    return session.revoked_at is None and session.absolute_expires_at > now


async def rotate_refresh_token(
    db: AsyncSession, settings: Settings, refresh: str
) -> tuple[UserSession, User, str]:
    """Checks a refresh token and replaces it with a new one."""
    now = datetime.now(UTC)
    presented = hash_token(refresh)
    session = (
        await db.execute(select(UserSession).where(UserSession.refresh_token_hash == presented))
    ).scalar_one_or_none()

    if session is None:
        reused = (
            await db.execute(
                select(UserSession).where(UserSession.previous_refresh_token_hash == presented)
            )
        ).scalar_one_or_none()
        if reused is not None and reused.revoked_at is None:
            rotated_at = reused.last_used_at or reused.created_at
            if (now - rotated_at).total_seconds() <= REFRESH_RACE_SECONDS:
                raise NotAuthenticatedError("the refresh token was just rotated; retry")
            revoke(reused, "refresh_token_reuse", now)
            await db.commit()
            log.warning(
                "auth.refresh_token_reused", session_id=str(reused.id), user_id=str(reused.user_id)
            )
        raise NotAuthenticatedError("the session has ended; sign in again")

    if not session_is_live(session, now) or session.expires_at <= now:
        raise NotAuthenticatedError("the session has ended; sign in again")
    user = await db.get(User, session.user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        revoke(session, "user_inactive", now)
        await db.commit()
        raise NotAuthenticatedError("the session has ended; sign in again")

    new_refresh = new_opaque_token()
    session.previous_refresh_token_hash = session.refresh_token_hash
    session.refresh_token_hash = hash_token(new_refresh)
    session.last_used_at = now
    session.expires_at = min(
        now + timedelta(days=settings.refresh_token_days), session.absolute_expires_at
    )
    return session, user, new_refresh


def revoke(session: UserSession, reason: str, now: datetime | None = None) -> None:
    if session.revoked_at is None:
        session.revoked_at = now or datetime.now(UTC)
        session.revoked_reason = reason


async def revoke_all(
    db: AsyncSession, user_id: uuid.UUID, reason: str, *, except_session: uuid.UUID | None = None
) -> None:
    statement = (
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC), revoked_reason=reason)
    )
    if except_session is not None:
        statement = statement.where(UserSession.id != except_session)
    await db.execute(statement)
