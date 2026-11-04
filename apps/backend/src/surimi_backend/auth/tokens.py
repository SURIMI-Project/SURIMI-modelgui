"""Access tokens, refresh tokens, CSRF tokens and the SSO flow token (ADR 0004).

- Access token: JWT (HS256, JWT_SECRET), short-lived, names the user (`sub`),
  the session (`sid`) and the role.
- Refresh token: random, opaque; only its SHA-256 hash is stored.
- SSO flow token: JWT in a short-lived cookie carrying state, nonce and the
  PKCE verifier between the redirect to the provider and its callback. Its own
  audience, so it can never be used as an access token, nor the other way round.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from surimi_backend.auth.errors import NotAuthenticatedError, SsoError
from surimi_backend.core.config import Settings
from surimi_backend.users.models import Role

ISSUER = "surimi-modelgui"
ACCESS_AUDIENCE = "surimi-modelgui-api"
FLOW_AUDIENCE = "surimi-modelgui-sso-flow"
ALGORITHM = "HS256"
FLOW_MINUTES = 10


@dataclass(frozen=True, slots=True)
class AccessClaims:
    user_id: uuid.UUID
    session_id: uuid.UUID
    role: Role


def _secret(settings: Settings) -> str:
    return settings.jwt_secret.get_secret_value()


def create_access_token(
    settings: Settings, *, user_id: uuid.UUID, session_id: uuid.UUID, role: Role
) -> tuple[str, int]:
    """Returns the token and its lifetime in seconds."""
    now = datetime.now(UTC)
    lifetime = timedelta(minutes=settings.access_token_minutes)
    payload = {
        "iss": ISSUER,
        "aud": ACCESS_AUDIENCE,
        "sub": str(user_id),
        "sid": str(session_id),
        "role": role.value,
        "iat": now,
        "exp": now + lifetime,
    }
    return jwt.encode(payload, _secret(settings), algorithm=ALGORITHM), int(
        lifetime.total_seconds()
    )


def decode_access_token(settings: Settings, token: str) -> AccessClaims:
    try:
        payload = jwt.decode(
            token,
            _secret(settings),
            algorithms=[ALGORITHM],
            audience=ACCESS_AUDIENCE,
            issuer=ISSUER,
            options={"require": ["exp", "iat", "sub", "sid"]},
        )
        return AccessClaims(
            user_id=uuid.UUID(payload["sub"]),
            session_id=uuid.UUID(payload["sid"]),
            role=Role(payload["role"]),
        )
    except jwt.ExpiredSignatureError as exc:
        raise NotAuthenticatedError("the access token has expired") from exc
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise NotAuthenticatedError("the access token is not valid") from exc


def new_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tokens_equal(a: str, b: str) -> bool:
    return secrets.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def encode_flow(settings: Settings, data: dict[str, Any]) -> str:
    now = datetime.now(UTC)
    payload = {
        **data,
        "iss": ISSUER,
        "aud": FLOW_AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=FLOW_MINUTES),
    }
    return jwt.encode(payload, _secret(settings), algorithm=ALGORITHM)


def decode_flow(settings: Settings, token: str) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = jwt.decode(
            token, _secret(settings), algorithms=[ALGORITHM], audience=FLOW_AUDIENCE, issuer=ISSUER
        )
    except jwt.ExpiredSignatureError as exc:
        raise SsoError("the sign-in took too long; start again") from exc
    except jwt.InvalidTokenError as exc:
        raise SsoError("the sign-in state is not valid; start again") from exc
    return payload
