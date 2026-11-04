"""Sign-in history (`login_events`) and the per-account failure count used for
rate limiting. IP and user agent are stored only if their retention is not 0
(ADR 0013); the typed login of a failed attempt is never stored."""

from __future__ import annotations

import ipaddress
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.auth.models import LoginEvent, LoginMethod, LoginResult
from surimi_backend.core.config import Settings

MAX_USER_AGENT = 512


def valid_ip(host: str | None) -> str | None:
    """The address if it is an IP; None for anything else (a Unix socket, a test
    client, a malformed proxy header), which the inet column would reject."""
    if not host:
        return None
    try:
        return str(ipaddress.ip_address(host))
    except ValueError:
        return None


@dataclass(frozen=True, slots=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


def record_login(
    db: AsyncSession,
    settings: Settings,
    client: ClientInfo,
    *,
    user_id: uuid.UUID | None,
    method: LoginMethod,
    result: LoginResult,
    provider: str | None = None,
) -> None:
    db.add(
        LoginEvent(
            user_id=user_id,
            method=method,
            provider=provider,
            result=result,
            ip=valid_ip(client.ip) if settings.retention_login_ip_days > 0 else None,
            user_agent=(client.user_agent or "")[:MAX_USER_AGENT] or None
            if settings.retention_login_user_agent_days > 0
            else None,
            at=datetime.now(UTC),
        )
    )


async def recent_failures(db: AsyncSession, settings: Settings, user_id: uuid.UUID) -> int:
    """Wrong passwords for this account inside the window and after its last
    successful sign-in (a success resets the count)."""
    since = datetime.now(UTC) - timedelta(minutes=settings.login_failure_window_minutes)
    last_success = (
        await db.execute(
            select(func.max(LoginEvent.at)).where(
                LoginEvent.user_id == user_id,
                LoginEvent.result == LoginResult.SUCCESS,
                LoginEvent.at > since,
            )
        )
    ).scalar_one()
    if last_success is not None:
        since = last_success
    statement = select(func.count()).where(
        LoginEvent.user_id == user_id,
        LoginEvent.result == LoginResult.BAD_CREDENTIALS,
        LoginEvent.at > since,
    )
    return int((await db.execute(statement)).scalar_one())
