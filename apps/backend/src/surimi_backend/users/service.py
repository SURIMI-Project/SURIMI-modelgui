"""User management by admins (ADR 0005), and the first admin (`create-admin`)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.audit import service as audit
from surimi_backend.auth import sessions
from surimi_backend.auth.passwords import check_policy, hash_password
from surimi_backend.core.errors import ConflictError, InvalidInputError, NotFoundError
from surimi_backend.users import repository
from surimi_backend.users.models import Role, RoleSource, User, default_display_name


@dataclass(frozen=True, slots=True)
class Names:
    """First and last name are required for local users; the display name
    defaults to "first last"."""

    first_name: str
    last_name: str
    display_name: str | None = None


class LastAdminError(ConflictError):
    code = "last_admin"


class RoleManagedByProviderError(ConflictError):
    code = "role_managed_by_provider"


class NoLocalPasswordError(ConflictError):
    code = "no_local_password"


class ProfileManagedByProviderError(ConflictError):
    code = "profile_managed_by_provider"


async def _get(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await repository.get(db, user_id)
    if user is None:
        raise NotFoundError(f"user {user_id} does not exist")
    return user


async def create_user(
    db: AsyncSession,
    *,
    actor: User | None,
    email: str,
    username: str,
    names: Names,
    role: Role,
    password: str,
    must_change_password: bool,
) -> User:
    email_taken = await repository.email_taken(db, email)
    name_taken = await repository.username_taken(db, username)
    if email_taken or name_taken:
        raise ConflictError(
            "a user with this " + ("e-mail" if email_taken else "username") + " already exists",
            details={"field": "email" if email_taken else "username"},
        )
    check_policy(password, username=username, email=email)
    user = User(
        id=uuid.uuid4(),
        email=email.strip(),
        username=username.strip(),
        first_name=names.first_name.strip(),
        last_name=names.last_name.strip(),
        display_name=(names.display_name or "").strip()
        or default_display_name(
            names.first_name.strip(), names.last_name.strip(), username.strip()
        ),
        password_hash=await hash_password(password),
        role=role,
        role_source=RoleSource.LOCAL,
        must_change_password=must_change_password,
        is_active=True,
        login_count=0,
    )
    db.add(user)
    audit.record(
        db,
        actor_id=actor.id if actor else None,
        action="user.created",
        target_type="user",
        target_id=str(user.id),
        details={"role": role.value, "username": user.username},
    )
    await db.commit()
    return user


async def update_user(
    db: AsyncSession,
    *,
    actor: User,
    user_id: uuid.UUID,
    role: Role | None,
    is_active: bool | None,
    first_name: str | None = None,
    last_name: str | None = None,
    display_name: str | None = None,
) -> User:
    user = await _get(db, user_id)
    changes: dict[str, Any] = {}
    _update_names(user, changes, first_name, last_name, display_name)

    if role is not None and role != user.role:
        if user.role_source is RoleSource.IDP:
            raise RoleManagedByProviderError(
                "this user's role comes from the sign-in provider and is set at every sign-in"
            )
        if (
            user.role is Role.ADMIN
            and await repository.count_active_admins(db, excluding=user.id) == 0
        ):
            raise LastAdminError("the last active admin cannot lose the admin role")
        changes["role"] = {"from": user.role.value, "to": role.value}
        user.role = role

    if is_active is not None and is_active != user.is_active:
        if not is_active and user.id == actor.id:
            raise InvalidInputError("you cannot deactivate your own account")
        if (
            not is_active
            and user.role is Role.ADMIN
            and await repository.count_active_admins(db, excluding=user.id) == 0
        ):
            raise LastAdminError("the last active admin cannot be deactivated")
        changes["is_active"] = {"from": user.is_active, "to": is_active}
        user.is_active = is_active
        if not is_active:
            await sessions.revoke_all(db, user.id, "deactivated")

    if changes:
        audit.record(
            db,
            actor_id=actor.id,
            action="user.updated",
            target_type="user",
            target_id=str(user.id),
            details=changes,
        )
        await db.commit()
    return user


def _update_names(
    user: User,
    changes: dict[str, Any],
    first_name: str | None,
    last_name: str | None,
    display_name: str | None,
) -> None:
    """Names of local users; an SSO user's come from the provider (ADR 0016)."""
    wanted = {"first_name": first_name, "last_name": last_name, "display_name": display_name}
    wanted = {k: v.strip() for k, v in wanted.items() if v is not None}
    if not any(getattr(user, k) != v for k, v in wanted.items()):
        return
    if user.is_sso:
        raise ProfileManagedByProviderError(
            "this user's e-mail and names come from the sign-in provider at every sign-in"
        )
    # A display name that was the default follows the new first and last name.
    was_default = user.display_name == default_display_name(
        user.first_name, user.last_name, user.username
    )
    for field, value in wanted.items():
        if getattr(user, field) != value:
            changes[field] = {"from": getattr(user, field), "to": value}
            setattr(user, field, value)
    if "display_name" not in wanted and was_default:
        new = default_display_name(user.first_name, user.last_name, user.username)
        if new != user.display_name:
            changes["display_name"] = {"from": user.display_name, "to": new}
            user.display_name = new


async def reset_password(
    db: AsyncSession, *, actor: User, user_id: uuid.UUID, password: str
) -> None:
    user = await _get(db, user_id)
    if user.password_hash is None:
        raise NoLocalPasswordError("this user signs in through SSO only and has no password here")
    check_policy(password, username=user.username, email=user.email)
    user.password_hash = await hash_password(password)
    user.must_change_password = True
    await sessions.revoke_all(db, user.id, "password_reset")
    audit.record(
        db,
        actor_id=actor.id,
        action="user.password_reset",
        target_type="user",
        target_id=str(user.id),
    )
    await db.commit()


async def ensure_admin(
    db: AsyncSession,
    *,
    email: str,
    username: str,
    first_name: str,
    last_name: str,
    password: str,
    reset_password: bool,
) -> tuple[User, str]:
    """For `surimi-backend create-admin`: creates the admin if missing, or makes
    an existing local user an active admin. Returns the user and what was done.
    Names are used only when the user is created."""
    user = await repository.get_by_login(db, email) or await repository.get_by_login(db, username)
    if user is None:
        user = await create_user(
            db,
            actor=None,
            email=email,
            username=username,
            names=Names(first_name, last_name),
            role=Role.ADMIN,
            password=password,
            must_change_password=False,
        )
        return user, "created"
    done: list[str] = []
    if user.role_source is RoleSource.IDP:
        return user, "exists; role is managed by the sign-in provider, left unchanged"
    if user.role is not Role.ADMIN:
        user.role = Role.ADMIN
        done.append("made admin")
    if not user.is_active:
        user.is_active = True
        done.append("activated")
    if reset_password:
        check_policy(password, username=user.username, email=user.email)
        user.password_hash = await hash_password(password)
        user.must_change_password = False
        done.append("password reset")
    if done:
        audit.record(
            db,
            actor_id=None,
            action="user.admin_ensured",
            target_type="user",
            target_id=str(user.id),
            details={"done": done},
        )
        await db.commit()
    return user, "exists; " + (", ".join(done) if done else "nothing to change")
