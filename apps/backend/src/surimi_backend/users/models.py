"""Users and their sign-in identities (docs/database/schema.dbml)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Text,
    false,
    func,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from surimi_backend.core.db import Base


class Role(enum.StrEnum):
    ADMIN = "admin"
    MEMBER = "member"


class RoleSource(enum.StrEnum):
    LOCAL = "local"  # set by an admin in our app
    IDP = "idp"  # computed from SSO claims at every sign-in (ADR 0005)


def pg_enum(cls: type[enum.StrEnum], name: str) -> Enum:
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text)
    username: Mapped[str] = mapped_column(Text)
    first_name: Mapped[str | None] = mapped_column(Text)  # required for local users (API)
    last_name: Mapped[str | None] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(Text)  # defaults to "first last"
    password_hash: Mapped[str | None] = mapped_column(Text)  # Argon2id; None for SSO-only
    role: Mapped[Role] = mapped_column(
        pg_enum(Role, "user_role"), default=Role.MEMBER, server_default=Role.MEMBER.value
    )
    role_source: Mapped[RoleSource] = mapped_column(
        pg_enum(RoleSource, "role_source"),
        default=RoleSource.LOCAL,
        server_default=RoleSource.LOCAL.value,
    )
    role_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    login_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("users_email_lower_uq", func.lower(email), unique=True),
        Index("users_username_lower_uq", func.lower(username), unique=True),
    )

    @property
    def is_sso(self) -> bool:
        """Created by an SSO sign-in (ADR 0016). Local users always have a
        password and SSO users never get one, so the password tells them apart;
        an SSO user's e-mail and names come from the provider."""
        return self.password_hash is None


def default_display_name(first_name: str | None, last_name: str | None, fallback: str) -> str:
    return " ".join(part for part in (first_name, last_name) if part) or fallback


class Identity(Base):
    __tablename__ = "identities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(Text)  # "local" or an OIDC provider key
    subject: Mapped[str] = mapped_column(Text)  # OIDC sub
    email: Mapped[str | None] = mapped_column(Text)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    claims_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("identities_provider_subject_uq", provider, subject, unique=True),)
