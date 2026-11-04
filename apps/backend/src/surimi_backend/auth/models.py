"""Sessions and the sign-in history (docs/database/schema.dbml, ADR 0004, ADR 0013)."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    LargeBinary,
    PrimaryKeyConstraint,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base
from surimi_backend.users.models import pg_enum


class LoginMethod(enum.StrEnum):
    PASSWORD = "password"  # noqa: S105 - the sign-in method, not a secret
    SSO = "sso"


class LoginResult(enum.StrEnum):
    SUCCESS = "success"
    BAD_CREDENTIALS = "bad_credentials"
    LOCKED = "locked"  # rate limit
    INACTIVE = "inactive"
    NO_ROLE = "no_role"  # SSO claims matched no role and the default is deny
    EMAIL_REJECTED = "email_rejected"  # first SSO sign-in: e-mail missing, unverified or taken
    ERROR = "error"


class UserSession(Base):
    """One signed-in session. The access JWT carries its id (`sid`); the
    refresh token is stored only as a SHA-256 hash."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    method: Mapped[LoginMethod] = mapped_column(pg_enum(LoginMethod, "login_method"))
    provider: Mapped[str | None] = mapped_column(Text)
    refresh_token_hash: Mapped[str] = mapped_column(Text)
    # The hash before the last rotation: presenting it again means the token
    # was copied, so the whole session is revoked.
    previous_refresh_token_hash: Mapped[str | None] = mapped_column(Text)
    idp_refresh_token_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    absolute_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_reason: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index("sessions_refresh_token_hash_uq", refresh_token_hash, unique=True),
        Index(
            "sessions_previous_refresh_token_hash_idx",
            previous_refresh_token_hash,
            postgresql_where=text("previous_refresh_token_hash IS NOT NULL"),
        ),
    )


class LoginEvent(Base):
    __tablename__ = "login_events"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    # None when the login matched no user; the typed login is not stored (ADR 0013).
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    method: Mapped[LoginMethod] = mapped_column(pg_enum(LoginMethod, "login_method"))
    provider: Mapped[str | None] = mapped_column(Text)
    result: Mapped[LoginResult] = mapped_column(pg_enum(LoginResult, "login_result"))
    ip: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("login_events_user_at_idx", user_id, at.desc()),
        Index("login_events_at_idx", at),
        Index("login_events_ip_at_idx", at, postgresql_where=text("ip IS NOT NULL")),
        Index("login_events_ua_at_idx", at, postgresql_where=text("user_agent IS NOT NULL")),
        Index(
            "login_events_failed_at_idx",
            at.desc(),
            postgresql_where=text("result <> 'success'"),
        ),
    )


class LoginStatsMonthly(Base):
    """Roll-up of login_events older than 13 months (ADR 0013)."""

    __tablename__ = "login_stats_monthly"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    month: Mapped[date] = mapped_column(Date)
    method: Mapped[LoginMethod] = mapped_column(pg_enum(LoginMethod, "login_method"))
    successes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    failures: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    __table_args__ = (
        PrimaryKeyConstraint(user_id, month, method),
        Index("login_stats_monthly_month_idx", month),
    )
