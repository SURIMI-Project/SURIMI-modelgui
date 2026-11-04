"""SQL for users and identities."""

from __future__ import annotations

import re
import uuid
from typing import Literal

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from surimi_backend.users.models import Identity, Role, RoleSource, User

UserSort = Literal[
    "created_at",
    "-created_at",
    "username",
    "-username",
    "last_name",
    "-last_name",
    "last_login_at",
    "-last_login_at",
]


async def get(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    user = await db.get(User, user_id)
    return user if user is not None and user.deleted_at is None else None


async def get_by_login(db: AsyncSession, login: str) -> User | None:
    """By e-mail or username, case-insensitive (uses the lower() indexes)."""
    needle = login.strip().lower()
    statement = select(User).where(
        or_(func.lower(User.email) == needle, func.lower(User.username) == needle),
        User.deleted_at.is_(None),
    )
    return (await db.execute(statement)).scalars().first()


async def email_taken(db: AsyncSession, email: str, *, excluding: uuid.UUID | None = None) -> bool:
    """Case-insensitive; deleted users count, so an address is never reused."""
    statement = select(func.count()).where(func.lower(User.email) == email.strip().lower())
    if excluding is not None:
        statement = statement.where(User.id != excluding)
    return bool(await db.scalar(statement))


async def username_taken(db: AsyncSession, username: str) -> bool:
    """Case-insensitive; deleted users count, so a name is never reused."""
    count = await db.scalar(
        select(func.count()).where(func.lower(User.username) == username.strip().lower())
    )
    return bool(count)


async def count_active_admins(db: AsyncSession, *, excluding: uuid.UUID | None = None) -> int:
    statement = select(func.count()).where(
        User.role == Role.ADMIN, User.is_active.is_(True), User.deleted_at.is_(None)
    )
    if excluding is not None:
        statement = statement.where(User.id != excluding)
    return int(await db.scalar(statement) or 0)


async def free_username(db: AsyncSession, wanted: str) -> str:
    """A free username based on `wanted` (SSO users): safe characters only,
    with a number appended when taken."""
    base = re.sub(r"[^A-Za-z0-9._-]", "", wanted)[:40] or "user"
    if len(base) < 3:
        base = f"{base}user"
    candidate, n = base, 1
    while await username_taken(db, candidate):
        n += 1
        candidate = f"{base}{n}"
    return candidate


async def list_users(
    db: AsyncSession,
    *,
    q: str | None,
    role: Role | None,
    role_source: RoleSource | None,
    active: bool | None,
    page: int,
    size: int,
    sort: UserSort,
) -> tuple[list[User], int]:
    conditions: list[ColumnElement[bool]] = [User.deleted_at.is_(None)]
    if q:
        pattern = f"%{q.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(User.email).like(pattern),
                func.lower(User.username).like(pattern),
                func.lower(User.display_name).like(pattern),
                func.lower(func.coalesce(User.first_name, "")).like(pattern),
                func.lower(func.coalesce(User.last_name, "")).like(pattern),
            )
        )
    if role is not None:
        conditions.append(User.role == role)
    if role_source is not None:
        conditions.append(User.role_source == role_source)
    if active is not None:
        conditions.append(User.is_active.is_(active))
    total = int(await db.scalar(select(func.count()).select_from(User).where(*conditions)) or 0)
    column = getattr(User, sort.lstrip("-"))
    order = column.desc().nulls_last() if sort.startswith("-") else column.asc().nulls_last()
    statement = (
        select(User)
        .where(*conditions)
        .order_by(order, User.id)
        .offset((page - 1) * size)
        .limit(size)
    )
    return list((await db.execute(statement)).scalars()), total


async def find_identity(db: AsyncSession, provider: str, subject: str) -> Identity | None:
    statement = select(Identity).where(Identity.provider == provider, Identity.subject == subject)
    return (await db.execute(statement)).scalar_one_or_none()
