"""Imports every table module, so `Base.metadata` knows all tables (Alembic
autogenerate, tests). Add new model modules here."""

from surimi_backend.audit.models import AuditEvent
from surimi_backend.auth.models import LoginEvent, LoginStatsMonthly, UserSession
from surimi_backend.catalog.models import Species
from surimi_backend.experiments.models import AppSetting, Experiment, ExperimentEvent, Simulation
from surimi_backend.hcr.models import HcrConfiguration
from surimi_backend.initial_hcr.models import InitialHcrSnapshot
from surimi_backend.outputs.models import ExperimentOutput
from surimi_backend.users.models import Identity, User

__all__ = [
    "AppSetting",
    "AuditEvent",
    "Experiment",
    "ExperimentEvent",
    "ExperimentOutput",
    "HcrConfiguration",
    "Identity",
    "InitialHcrSnapshot",
    "LoginEvent",
    "LoginStatsMonthly",
    "Simulation",
    "Species",
    "User",
    "UserSession",
]
