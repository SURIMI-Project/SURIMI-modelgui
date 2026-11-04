"""Baseline: the database exists and is managed by Alembic; no tables yet.

Tables arrive with their features (users and sessions in phase 3), each in its
own revision, following docs/database/schema.dbml and indexes.sql.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-11-03
"""

from collections.abc import Sequence

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
