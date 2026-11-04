"""First and last name on users; display_name required; login result for a
refused SSO e-mail.

Separate local and SSO accounts, the provider owns an SSO user's profile
(ADR 0016).

Revision ID: 0003_user_names
Revises: 0002_auth
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_user_names"
down_revision: str | None = "0002_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.Text(), nullable=True))
    # Users created before this revision may have no display name: use the username.
    op.execute(
        "UPDATE users SET display_name = username "
        "WHERE display_name IS NULL OR btrim(display_name) = ''"
    )
    op.alter_column("users", "display_name", existing_type=sa.Text(), nullable=False)
    # Allowed inside a transaction since PostgreSQL 12; the value is not used here.
    op.execute("ALTER TYPE login_result ADD VALUE IF NOT EXISTS 'email_rejected' AFTER 'no_role'")


def downgrade() -> None:
    # PostgreSQL cannot drop an enum value: rebuild the type without it.
    op.execute("UPDATE login_events SET result = 'error' WHERE result = 'email_rejected'")
    # The partial index compares with a login_result literal: rebuild it too.
    op.execute("DROP INDEX login_events_failed_at_idx")
    op.execute("ALTER TYPE login_result RENAME TO login_result_old")
    op.execute(
        "CREATE TYPE login_result AS ENUM "
        "('success', 'bad_credentials', 'locked', 'inactive', 'no_role', 'error')"
    )
    op.execute(
        "ALTER TABLE login_events ALTER COLUMN result TYPE login_result "
        "USING result::text::login_result"
    )
    op.execute("DROP TYPE login_result_old")
    op.execute(
        "CREATE INDEX login_events_failed_at_idx ON login_events (at DESC) "
        "WHERE result <> 'success'"
    )
    op.alter_column("users", "display_name", existing_type=sa.Text(), nullable=True)
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
