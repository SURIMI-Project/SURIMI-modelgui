"""Sign-in, sessions and SSO (ADR 0004, ADR 0005). No HTTP here: the router
turns results into cookies and responses."""

from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, NoReturn

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit import service as audit
from surimi_backend.auth import sessions
from surimi_backend.auth.errors import (
    AccountInactiveError,
    EmailNotVerifiedError,
    EmailTakenError,
    InvalidCredentialsError,
    NoAccessError,
    SsoError,
    TooManyAttemptsError,
)
from surimi_backend.auth.history import ClientInfo, recent_failures, record_login
from surimi_backend.auth.models import LoginMethod, LoginResult, UserSession
from surimi_backend.auth.passwords import check_policy, hash_password, verify_password
from surimi_backend.auth.ratelimit import FailureCounter
from surimi_backend.auth.role_mapping import decide_role, role_claims_snapshot
from surimi_backend.auth.tokens import create_access_token, decode_flow, encode_flow
from surimi_backend.core.config import Settings
from surimi_backend.integrations.oidc import OidcProvider, new_pkce_pair
from surimi_backend.users import repository
from surimi_backend.users.models import Identity, Role, RoleSource, User, default_display_name
from surimi_backend.users.service import NoLocalPasswordError

log = structlog.get_logger("surimi.auth")


@dataclass(frozen=True, slots=True)
class SignedIn:
    user: User
    session: UserSession
    refresh_token: str


def access_token_for(settings: Settings, signed_in: SignedIn) -> tuple[str, int]:
    return create_access_token(
        settings,
        user_id=signed_in.user.id,
        session_id=signed_in.session.id,
        role=signed_in.user.role,
    )


def _successful_login(
    db: AsyncSession,
    settings: Settings,
    client: ClientInfo,
    user: User,
    *,
    method: LoginMethod,
    provider: str | None,
) -> None:
    user.last_login_at = datetime.now(UTC)
    user.login_count += 1
    record_login(
        db,
        settings,
        client,
        user_id=user.id,
        method=method,
        result=LoginResult.SUCCESS,
        provider=provider,
    )


# --- password -------------------------------------------------------------------


async def _check_password(
    db: AsyncSession,
    settings: Settings,
    limiter: FailureCounter,
    client: ClientInfo,
    *,
    login: str,
    password: str,
) -> User:
    """The user for these credentials, or the right error; every attempt is recorded."""
    method = LoginMethod.PASSWORD
    retry = {"Retry-After": str(settings.login_failure_window_minutes * 60)}
    if limiter.blocked(client.ip):
        record_login(db, settings, client, user_id=None, method=method, result=LoginResult.LOCKED)
        await db.commit()
        raise TooManyAttemptsError(
            "too many failed sign-ins from this address; try again later", headers=retry
        )

    user = await repository.get_by_login(db, login)
    if (
        user is not None
        and await recent_failures(db, settings, user.id) >= settings.login_max_failures
    ):
        record_login(
            db, settings, client, user_id=user.id, method=method, result=LoginResult.LOCKED
        )
        await db.commit()
        raise TooManyAttemptsError(
            "too many failed sign-ins for this account; try again later", headers=retry
        )

    matches, new_hash = await verify_password(password, user.password_hash if user else None)
    if user is None or not matches:
        limiter.add(client.ip)
        record_login(
            db,
            settings,
            client,
            user_id=user.id if user else None,
            method=method,
            result=LoginResult.BAD_CREDENTIALS,
        )
        await db.commit()
        raise InvalidCredentialsError("wrong login or password")
    if new_hash:
        user.password_hash = new_hash
    if not user.is_active:
        record_login(
            db, settings, client, user_id=user.id, method=method, result=LoginResult.INACTIVE
        )
        await db.commit()
        raise AccountInactiveError("this account is deactivated")
    return user


async def login_password(
    db: AsyncSession,
    settings: Settings,
    limiter: FailureCounter,
    client: ClientInfo,
    *,
    login: str,
    password: str,
) -> SignedIn:
    user = await _check_password(db, settings, limiter, client, login=login, password=password)
    session, refresh = sessions.create_session(db, settings, user, method=LoginMethod.PASSWORD)
    _successful_login(db, settings, client, user, method=LoginMethod.PASSWORD, provider=None)
    await db.commit()
    log.info("auth.login_succeeded", user_id=str(user.id), method="password")
    return SignedIn(user, session, refresh)


async def token_for_script(
    db: AsyncSession,
    settings: Settings,
    limiter: FailureCounter,
    client: ClientInfo,
    *,
    login: str,
    password: str,
) -> SignedIn:
    """Bearer token for Bruno and scripts: a session that lives as long as one
    access token and cannot be refreshed."""
    user = await _check_password(db, settings, limiter, client, login=login, password=password)
    session, refresh = sessions.create_session(
        db,
        settings,
        user,
        method=LoginMethod.PASSWORD,
        lifetime=timedelta(minutes=settings.access_token_minutes),
    )
    _successful_login(db, settings, client, user, method=LoginMethod.PASSWORD, provider=None)
    await db.commit()
    return SignedIn(user, session, refresh)


async def refresh(db: AsyncSession, settings: Settings, refresh_token: str) -> SignedIn:
    session, user, new_refresh = await sessions.rotate_refresh_token(db, settings, refresh_token)
    await db.commit()
    return SignedIn(user, session, new_refresh)


async def logout(db: AsyncSession, session: UserSession) -> None:
    sessions.revoke(session, "logout")
    await db.commit()
    log.info("auth.logout", user_id=str(session.user_id))


async def change_password(
    db: AsyncSession, *, user: User, session: UserSession, current: str, new: str
) -> None:
    if user.password_hash is None:
        raise NoLocalPasswordError("you sign in through SSO; change the password at the provider")
    matches, _ = await verify_password(current, user.password_hash)
    if not matches:
        raise InvalidCredentialsError("the current password is wrong")
    check_policy(new, username=user.username, email=user.email)
    user.password_hash = await hash_password(new)
    user.must_change_password = False
    await sessions.revoke_all(db, user.id, "password_changed", except_session=session.id)
    audit.record(
        db,
        actor_id=user.id,
        action="user.password_changed",
        target_type="user",
        target_id=str(user.id),
    )
    await db.commit()


# --- SSO --------------------------------------------------------------------------


def callback_url(settings: Settings, provider: str) -> str:
    return f"{settings.public_base_url.rstrip('/')}/api/v1/auth/sso/{provider}/callback"


def safe_next(next_path: str | None) -> str:
    """Only local paths, so the sign-in cannot redirect to another site."""
    if next_path and next_path.startswith("/") and not next_path.startswith(("//", "/\\")):
        return next_path
    return "/"


async def sso_start(
    settings: Settings, provider: OidcProvider, next_path: str | None
) -> tuple[str, str]:
    """Returns (provider URL to redirect to, flow token for the cookie)."""
    state, nonce = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    verifier, challenge = new_pkce_pair()
    url = await provider.authorization_url(
        redirect_uri=callback_url(settings, provider.key),
        state=state,
        nonce=nonce,
        code_challenge=challenge,
    )
    flow = encode_flow(
        settings,
        {"p": provider.key, "s": state, "n": nonce, "v": verifier, "next": safe_next(next_path)},
    )
    return url, flow


async def _identity_claims(
    provider: OidcProvider, tokens: dict[str, Any], nonce: str
) -> dict[str, Any]:
    claims = await provider.verify_id_token(tokens["id_token"], nonce=nonce)
    # Some providers keep the ID token small and put the role claim or the
    # e-mail only in userinfo: merge it in, the verified ID token wins on overlap.
    role_root = provider.config.role_claim.split(".")[0] if provider.config.role_claim else ""
    if ((role_root and role_root not in claims) or "email" not in claims) and tokens.get(
        "access_token"
    ):
        info = await provider.userinfo(tokens["access_token"])
        if info.get("sub") == claims["sub"]:
            claims = {**info, **claims}
    return claims


async def sso_complete(
    db: AsyncSession,
    settings: Settings,
    provider: OidcProvider,
    client: ClientInfo,
    *,
    code: str,
    state: str,
    flow_token: str | None,
) -> tuple[SignedIn, str]:
    """Finishes the SSO round trip; returns the session and where to go next."""
    if not flow_token:
        raise SsoError("the sign-in state is missing (cookie blocked or expired); start again")
    flow = decode_flow(settings, flow_token)
    if flow.get("p") != provider.key or not secrets.compare_digest(str(flow.get("s", "")), state):
        raise SsoError("the sign-in state does not match; start again")

    tokens = await provider.exchange_code(
        code=code, redirect_uri=callback_url(settings, provider.key), code_verifier=flow["v"]
    )
    claims = await _identity_claims(provider, tokens, flow["n"])
    subject = str(claims["sub"])
    profile = SsoProfile.of(claims)
    decision = decide_role(claims, provider.config)
    method = LoginMethod.SSO

    # ADR 0016: an SSO user is found by (provider, sub) only, never by e-mail
    # or username; a local account with the same e-mail stays a separate user.
    identity = await repository.find_identity(db, provider.key, subject)
    user = await repository.get(db, identity.user_id) if identity else None

    if decision.role is None and (decision.managed or user is None):
        await _refuse_no_role(db, settings, client, provider.key, user=user)

    if user is None:
        user = await _create_sso_user(
            db,
            settings,
            client,
            provider.key,
            profile=profile,
            role=decision.role or Role.MEMBER,
            managed=decision.managed,
        )
    elif not user.is_active:
        record_login(
            db,
            settings,
            client,
            user_id=user.id,
            method=method,
            result=LoginResult.INACTIVE,
            provider=provider.key,
        )
        await db.commit()
        raise AccountInactiveError("this account is deactivated")
    else:
        if decision.managed and decision.role is not None:
            await _sync_role(db, user, decision.role, provider.key)
        await _sync_profile(db, user, profile, provider.key)

    if identity is None:
        identity = Identity(user_id=user.id, provider=provider.key, subject=subject)
        db.add(identity)
    identity.email = profile.email
    identity.email_verified = profile.email_verified
    identity.claims_snapshot = role_claims_snapshot(claims, provider.config)
    identity.last_login_at = datetime.now(UTC)

    session, refresh_token = sessions.create_session(
        db, settings, user, method=method, provider=provider.key
    )
    _successful_login(db, settings, client, user, method=method, provider=provider.key)
    await db.commit()
    log.info(
        "auth.login_succeeded",
        user_id=str(user.id),
        method="sso",
        provider=provider.key,
        role=user.role.value,
    )
    return SignedIn(user, session, refresh_token), str(flow.get("next") or "/")


@dataclass(frozen=True, slots=True)
class SsoProfile:
    """What the provider says about the person; it owns these for SSO users."""

    email: str | None
    email_verified: bool
    first_name: str | None
    last_name: str | None
    name: str | None
    preferred_username: str | None

    @classmethod
    def of(cls, claims: dict[str, Any]) -> SsoProfile:
        def text(key: str, limit: int) -> str | None:
            value = claims.get(key)
            if value is None:
                return None
            return str(value).strip()[:limit] or None

        return cls(
            email=text("email", 320),
            email_verified=claims.get("email_verified") is True,
            first_name=text("given_name", 100),
            last_name=text("family_name", 100),
            name=text("name", 200),
            preferred_username=text("preferred_username", 100),
        )

    def display_name(self, fallback: str) -> str:
        return self.name or default_display_name(self.first_name, self.last_name, fallback)


async def _email_rejected(
    db: AsyncSession,
    settings: Settings,
    client: ClientInfo,
    provider: str,
    error: EmailNotVerifiedError | EmailTakenError,
) -> EmailNotVerifiedError | EmailTakenError:
    """Records a first SSO sign-in refused for its e-mail; returns the error to raise."""
    record_login(
        db,
        settings,
        client,
        user_id=None,
        method=LoginMethod.SSO,
        result=LoginResult.EMAIL_REJECTED,
        provider=provider,
    )
    await db.commit()
    log.info("auth.sso_email_rejected", provider=provider, reason=error.code)
    return error


async def _create_sso_user(
    db: AsyncSession,
    settings: Settings,
    client: ClientInfo,
    provider: str,
    *,
    profile: SsoProfile,
    role: Role,
    managed: bool,
) -> User:
    """First sign-in: every user has a real, verified, unique e-mail (ADR 0016)."""
    email = profile.email if profile.email_verified else None
    if email is None:
        raise await _email_rejected(
            db,
            settings,
            client,
            provider,
            EmailNotVerifiedError(
                "your account at the sign-in provider has no verified e-mail address; "
                "verify it there, or ask an administrator"
            ),
        )
    if await repository.email_taken(db, email):
        raise await _email_rejected(
            db,
            settings,
            client,
            provider,
            EmailTakenError(
                "a SURIMI account with this e-mail already exists; sign in with it, "
                "or ask an administrator"
            ),
        )

    username = await repository.free_username(db, profile.preferred_username or email.split("@")[0])
    user = User(
        id=uuid.uuid4(),
        email=email,
        username=username,
        first_name=profile.first_name,
        last_name=profile.last_name,
        display_name=profile.display_name(username),
        password_hash=None,
        role=role,
        role_source=RoleSource.IDP if managed else RoleSource.LOCAL,
        role_synced_at=datetime.now(UTC) if managed else None,
        is_active=True,
        login_count=0,
    )
    db.add(user)
    # Write the user now: the identity, session and login event refer to it,
    # and without ORM relationships the flush would not order them.
    await db.flush()
    audit.record(
        db,
        actor_id=None,
        action="user.created",
        target_type="user",
        target_id=str(user.id),
        details={"via": f"sso:{provider}", "role": user.role.value},
    )
    return user


async def _sync_profile(db: AsyncSession, user: User, profile: SsoProfile, provider: str) -> None:
    """Later sign-ins: e-mail and names follow the provider (ADR 0016)."""
    changed: list[str] = []
    for field, value in (
        ("first_name", profile.first_name),
        ("last_name", profile.last_name),
        ("display_name", profile.display_name(user.username)),
    ):
        if getattr(user, field) != value:
            setattr(user, field, value)
            changed.append(field)

    new_email = profile.email
    if new_email and new_email != user.email:
        same_address = new_email.lower() == user.email.lower()
        if not same_address and not profile.email_verified:
            log.warning("auth.sso_email_not_synced", user_id=str(user.id), reason="unverified")
        elif not same_address and await repository.email_taken(db, new_email, excluding=user.id):
            log.warning("auth.sso_email_not_synced", user_id=str(user.id), reason="taken")
        else:
            user.email = new_email
            changed.append("email")

    if changed:
        # Field names only: the values are personal data and live in users.
        audit.record(
            db,
            actor_id=None,
            action="profile.synced",
            target_type="user",
            target_id=str(user.id),
            details={"provider": provider, "fields": changed},
        )


async def _refuse_no_role(
    db: AsyncSession,
    settings: Settings,
    client: ClientInfo,
    provider: str,
    *,
    user: User | None,
) -> NoReturn:
    record_login(
        db,
        settings,
        client,
        user_id=user.id if user else None,
        method=LoginMethod.SSO,
        result=LoginResult.NO_ROLE,
        provider=provider,
    )
    if user is not None:
        # Access removed at the provider: the sessions it granted end now, not
        # when their refresh tokens expire.
        await sessions.revoke_all(db, user.id, "access_removed")
        audit.record(
            db,
            actor_id=None,
            action="access.removed",
            target_type="user",
            target_id=str(user.id),
            details={"provider": provider, "role_was": user.role.value},
        )
    await db.commit()
    log.info("auth.sso_no_role", provider=provider, user_id=str(user.id) if user else None)
    raise NoAccessError(
        "your account at the sign-in provider has no access to SURIMI; ask an administrator"
    )


async def _sync_role(db: AsyncSession, user: User, role: Role, provider: str) -> None:
    """ADR 0005: the provider's role wins at every sign-in."""
    old_role, old_source = user.role, user.role_source
    user.role, user.role_source, user.role_synced_at = role, RoleSource.IDP, datetime.now(UTC)
    if (old_role, old_source) != (role, RoleSource.IDP):
        audit.record(
            db,
            actor_id=None,
            action="role.synced",
            target_type="user",
            target_id=str(user.id),
            details={
                "provider": provider,
                "from": old_role.value,
                "to": role.value,
                "source_was": old_source.value,
            },
        )
        if old_role is Role.ADMIN and role is not Role.ADMIN:
            await sessions.revoke_all(db, user.id, "demoted")
