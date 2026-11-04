"""Imports every table module, so `Base.metadata` knows all tables (Alembic
autogenerate, tests). Add new model modules here."""

from surimi_backend.audit.models import AuditEvent
from surimi_backend.auth.models import LoginEvent, LoginStatsMonthly, UserSession
from surimi_backend.users.models import Identity, User

__all__ = ["AuditEvent", "Identity", "LoginEvent", "LoginStatsMonthly", "User", "UserSession"]
