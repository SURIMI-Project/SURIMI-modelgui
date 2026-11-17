"""Activity statistics for admins (docs/features/observability-and-activity
§ Activity statistics). Counts are exact, from the database (ADR 0010)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from surimi_backend.auth.models import LoginMethod, LoginResult
from surimi_backend.experiments.models import ExperimentStatus
from surimi_backend.users.models import Role

UserStatsSort = Literal[
    "username",
    "-last_login_at",
    "-sign_ins",
    "-experiments_submitted",
    "-experiments_completed",
]


class Period(BaseModel):
    """The period the numbers cover, in UTC; written as `from` and `to` like
    the query parameters."""

    start: datetime | None = Field(
        default=None, serialization_alias="from", description="Inclusive; none = since the start"
    )
    end: datetime | None = Field(
        default=None, serialization_alias="to", description="Exclusive; none = now"
    )


class SignInCounts(BaseModel):
    sign_ins: int = Field(description="Successful sign-ins", examples=[42])
    failed_sign_ins: int = Field(
        description="Any other result: wrong password, locked, no role, ...", examples=[3]
    )


class ExperimentCounts(BaseModel):
    experiments_submitted: int = Field(description="Entered the queue in the period", examples=[12])
    experiments_completed: int = Field(description="Ended `completed` in the period", examples=[9])
    experiments_failed: int = Field(
        description="Ended `failed` or `submit_failed` in the period", examples=[1]
    )
    experiments_cancelled: int = Field(description="Ended `cancelled` in the period", examples=[1])
    experiments_active: int = Field(
        description="Not in a final state now, whatever the period", examples=[1]
    )
    mean_run_seconds: float | None = Field(
        description="Mean of finished_at - submitted_at over the completed runs in the period",
        examples=[1830.5],
    )


class UserStatsOut(SignInCounts, ExperimentCounts):
    user_id: uuid.UUID
    username: str = Field(examples=["maria.k"])
    display_name: str = Field(examples=["Maria Kostaki"])
    email: str = Field(examples=["maria@example.org"])
    role: Role
    is_active: bool
    account: Literal["local", "sso"]
    last_login_at: datetime | None
    last_login_method: LoginMethod | None = Field(
        description="Method of the latest successful sign-in still in the history (13 months)"
    )


class UserStatsPage(BaseModel):
    items: list[UserStatsOut]
    total: int
    page: int
    size: int
    period: Period


class UserTotals(BaseModel):
    total: int = Field(examples=[87])
    active: int = Field(description="Accounts not deactivated", examples=[80])
    admins: int = Field(examples=[4])
    members: int = Field(examples=[83])
    sso: int = Field(examples=[70])
    local: int = Field(examples=[17])
    active_in_period: int = Field(
        description="Users with at least one successful sign-in in the period", examples=[35]
    )


class ScenarioCounts(ExperimentCounts):
    scenario_name: str = Field(examples=["northwestern_med"])


class WeekCounts(BaseModel):
    week: datetime = Field(description="Monday 00:00 UTC of the ISO week")
    sign_ins: int = Field(description="Successful sign-ins (raw rows only, not the roll-up)")
    experiments_submitted: int


class PlatformStatsOut(BaseModel):
    period: Period
    scenario_name: str | None = Field(description="The `scenario` filter, if any")
    users: UserTotals
    sign_ins: SignInCounts
    experiments: ExperimentCounts
    by_scenario: list[ScenarioCounts]
    by_week: list[WeekCounts]


class SignInOut(BaseModel):
    at: datetime
    method: LoginMethod
    provider: str | None = Field(examples=["keycloak"])
    result: LoginResult
    ip: str | None = Field(description="Kept RETENTION_LOGIN_IP_DAYS (90)", examples=["192.0.2.10"])
    user_agent: str | None = Field(description="Kept RETENTION_LOGIN_USER_AGENT_DAYS (90)")


class RecentExperimentOut(BaseModel):
    id: uuid.UUID
    name: str = Field(examples=["Hake and sardine to 2014"])
    scenario_name: str = Field(examples=["northwestern_med"])
    status: ExperimentStatus
    queued_at: datetime
    finished_at: datetime | None
    deleted: bool


class UserActivityOut(BaseModel):
    stats: UserStatsOut
    period: Period
    recent_sign_ins: list[SignInOut] = Field(description="The latest 20, any result")
    recent_experiments: list[RecentExperimentOut] = Field(description="The latest 20 submitted")
