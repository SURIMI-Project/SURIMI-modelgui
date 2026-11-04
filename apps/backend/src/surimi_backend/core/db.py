"""Database engine and the declarative base (ADR 0003).

Constraint names follow one convention, so Alembic migrations name them the
same way everywhere and can drop them again.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

from fastapi import Request
from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from surimi_backend.core.config import Settings

NAMING_CONVENTION = {
    "ix": "%(table_name)s_%(column_0_N_name)s_idx",
    "uq": "%(table_name)s_%(column_0_N_name)s_uq",
    "ck": "%(table_name)s_%(constraint_name)s_ck",
    "fk": "%(table_name)s_%(column_0_N_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def create_engine(settings: Settings) -> AsyncEngine:
    connect_args: dict[str, Any] = {}
    if settings.database_url is None and settings.db_sslmode != "disable":
        connect_args["ssl"] = settings.db_sslmode  # asyncpg accepts libpq-style modes
    return create_async_engine(
        settings.sqlalchemy_url,
        pool_size=settings.db_pool_size,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


def create_sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def check_database(engine: AsyncEngine) -> float:
    """Run `SELECT 1`; returns the latency in ms. Callers bound it with
    `asyncio.timeout`."""
    start = time.perf_counter()
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return (time.perf_counter() - start) * 1000


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request."""
    sessionmaker: async_sessionmaker[AsyncSession] = request.app.state.sessionmaker
    async with sessionmaker() as session:
        yield session
