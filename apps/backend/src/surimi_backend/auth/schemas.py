"""Request and response models for sign-in."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, SecretStr


class LoginIn(BaseModel):
    login: str = Field(
        min_length=1, max_length=320, description="E-mail or username", examples=["maria.k"]
    )
    password: SecretStr = Field(examples=["correct horse battery"])


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 - OAuth token type, not a secret
    expires_in: int = Field(description="Seconds", examples=[900])


class PasswordChangeIn(BaseModel):
    current_password: SecretStr
    new_password: SecretStr = Field(description="At least 12 characters")


class ProviderOut(BaseModel):
    key: str = Field(examples=["keycloak"])
    display_name: str = Field(examples=["Keycloak"])
    login_url: str = Field(examples=["/api/v1/auth/sso/keycloak/login"])
