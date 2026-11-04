"""`/api/v1/admin/users`: user management for admins (ADR 0005)."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, status

from surimi_backend.auth.dependencies import AdminUser, Db
from surimi_backend.core.errors import NotFoundError
from surimi_backend.users import repository, service
from surimi_backend.users.models import Role, RoleSource
from surimi_backend.users.repository import UserSort
from surimi_backend.users.schemas import PasswordResetIn, UserIn, UserOut, UserPage, UserUpdateIn

router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin: users"])

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"description": "Not signed in"},
    403: {"description": "Not an admin"},
    404: {"description": "No such user"},
    409: {"description": "Conflict: duplicate, last admin, role managed by SSO, SSO-only user"},
    422: {"description": "Invalid input or weak password"},
}


@router.get("", response_model=UserPage, summary="List and search users", responses=ERRORS)
async def list_users(
    _: AdminUser,
    db: Db,
    q: Annotated[
        str | None, Query(max_length=100, description="Part of e-mail, username or name")
    ] = None,
    role: Role | None = None,
    role_source: RoleSource | None = None,
    active: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=200)] = 50,
    sort: UserSort = "-created_at",
) -> UserPage:
    users, total = await repository.list_users(
        db, q=q, role=role, role_source=role_source, active=active, page=page, size=size, sort=sort
    )
    return UserPage(items=[UserOut.of(u) for u in users], total=total, page=page, size=size)


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a local user",
    responses=ERRORS,
)
async def create_user(body: UserIn, admin: AdminUser, db: Db) -> UserOut:
    user = await service.create_user(
        db,
        actor=admin.user,
        email=str(body.email),
        username=body.username,
        names=service.Names(body.first_name, body.last_name, body.display_name),
        role=body.role,
        password=body.temporary_password.get_secret_value(),
        must_change_password=True,
    )
    return UserOut.of(user)


@router.get("/{user_id}", response_model=UserOut, summary="One user", responses=ERRORS)
async def get_user(user_id: uuid.UUID, _: AdminUser, db: Db) -> UserOut:
    user = await repository.get(db, user_id)
    if user is None:
        raise NotFoundError(f"user {user_id} does not exist")
    return UserOut.of(user)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    summary="Change role, names, activate or deactivate",
    responses=ERRORS,
)
async def update_user(user_id: uuid.UUID, body: UserUpdateIn, admin: AdminUser, db: Db) -> UserOut:
    user = await service.update_user(
        db,
        actor=admin.user,
        user_id=user_id,
        role=body.role,
        is_active=body.is_active,
        first_name=body.first_name,
        last_name=body.last_name,
        display_name=body.display_name,
    )
    return UserOut.of(user)


@router.post(
    "/{user_id}/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Set a temporary password; the user must change it and their sessions end",
    responses=ERRORS,
)
async def reset_password(
    user_id: uuid.UUID, body: PasswordResetIn, admin: AdminUser, db: Db
) -> None:
    await service.reset_password(
        db, actor=admin.user, user_id=user_id, password=body.temporary_password.get_secret_value()
    )
