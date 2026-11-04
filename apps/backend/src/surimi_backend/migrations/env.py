"""Alembic environment. The database URL comes from the app settings (DB_* or
DATABASE_URL), never from alembic.ini, so migrations and the API always use
the same connection settings."""

from __future__ import annotations

import asyncio

from alembic import context
from sqlalchemy.engine import Connection

import surimi_backend.models  # noqa: F401 - registers every table on Base.metadata
from surimi_backend.core.config import Settings
from surimi_backend.core.db import Base, create_engine

config = context.config
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=Settings().sqlalchemy_url.render_as_string(hide_password=True),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_engine(Settings())
    async with engine.connect() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
