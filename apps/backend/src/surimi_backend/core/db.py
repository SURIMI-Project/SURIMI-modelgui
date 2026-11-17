"""Database engine and the declarative base (ADR 0003).

Constraint names follow one convention, so Alembic migrations name them the
same way everywhere and can drop them again.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import asyncpg
import sqlalchemy.ext.asyncio as sa_asyncio
from fastapi import Request
from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker
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
    # Looked up at call time: with tracing on, the OpenTelemetry SQLAlchemy
    # instrumentation replaces sqlalchemy.ext.asyncio.create_async_engine.
    return sa_asyncio.create_async_engine(
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


async def connect_raw(settings: Settings) -> asyncpg.Connection:
    """A connection outside the pool, for LISTEN and the worker's advisory
    lock (ADR 0008, ADR 0019): both belong to one session for its lifetime."""
    url = settings.sqlalchemy_url.set(drivername="postgresql")
    ssl: str | None = None
    if settings.database_url is None and settings.db_sslmode != "disable":
        ssl = settings.db_sslmode
    connection: asyncpg.Connection = await asyncpg.connect(
        url.render_as_string(hide_password=False), ssl=ssl
    )
    return connection
