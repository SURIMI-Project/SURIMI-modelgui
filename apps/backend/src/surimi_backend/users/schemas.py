"""Request and response models for users."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr

from surimi_backend.users.models import Role, RoleSource

Username = Annotated[str, Field(pattern=r"^[A-Za-z0-9._-]{3,50}$", examples=["maria.k"])]
Name = Annotated[str, Field(min_length=1, max_length=100)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str = Field(examples=["maria@example.org"])
    username: str = Field(examples=["maria.k"])
    first_name: str | None = Field(examples=["Maria"], description="Always set for local users")
    last_name: str | None = Field(examples=["Kostaki"], description="Always set for local users")
    display_name: str = Field(examples=["Maria Kostaki"])
    account: Literal["local", "sso"] = Field(
        default="local",
        description="`sso`: created by an SSO sign-in; e-mail and names come from the provider "
        "at every sign-in and are read-only here",
    )
    role: Role
    role_source: RoleSource = Field(
        description="`local`: set by an admin here; `idp`: synced from SSO at every sign-in, read-only here"
    )
    is_active: bool
    must_change_password: bool
    has_password: bool = Field(default=False, description="False for SSO-only users")
    last_login_at: datetime | None
    login_count: int
    created_at: datetime

    @classmethod
    def of(cls, user: object) -> UserOut:
        out = cls.model_validate(user)
        out.has_password = getattr(user, "password_hash", None) is not None
        out.account = "local" if out.has_password else "sso"
        return out


class UserIn(BaseModel):
    email: EmailStr = Field(examples=["maria@example.org"])
    username: Username
    first_name: Name = Field(examples=["Maria"])
    last_name: Name = Field(examples=["Kostaki"])
    display_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description='Defaults to "first_name last_name"',
        examples=["Maria K."],
    )
    role: Role = Role.MEMBER
    temporary_password: SecretStr = Field(
        description="At least 12 characters; the user must change it at first sign-in",
        examples=["first-sign-in-2026"],
    )


class UserUpdateIn(BaseModel):
    role: Role | None = Field(default=None, description="Only for users with role_source `local`")
    is_active: bool | None = Field(default=None, description="False also ends all their sessions")
    first_name: Name | None = Field(default=None, description="Local users only")
    last_name: Name | None = Field(default=None, description="Local users only")
    display_name: str | None = Field(
        default=None, min_length=1, max_length=200, description="Local users only"
    )


class PasswordResetIn(BaseModel):
    temporary_password: SecretStr = Field(examples=["reset-by-admin-2026"])


class UserPage(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    size: int
