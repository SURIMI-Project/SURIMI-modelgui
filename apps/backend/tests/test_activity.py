"""Activity statistics and the audit log for admins, against PostgreSQL
(docs/features/observability-and-activity § Activity statistics, § Audit log)."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.users.models import Role, User
from tests.conftest import PASSWORD, bearer, login

pytestmark = pytest.mark.integration

NOW = datetime.now(UTC)
HOUR = timedelta(hours=1)
OLD = datetime(2024, 1, 10, tzinfo=UTC)
ROUTES = (
    "/api/v1/admin/stats",
    "/api/v1/admin/stats/users",
    f"/api/v1/admin/users/{uuid.uuid4()}/activity",
    "/api/v1/admin/audit-events",
)


def run(
    sql: Callable[..., list[Any]],
    owner: User,
    status: str,
    *,
    queued: datetime = NOW - 3 * HOUR,
    submitted: datetime | None = NOW - 2 * HOUR,
    finished: datetime | None = None,
    scenario: str = "northwestern_med",
    deleted: datetime | None = None,
) -> None:
    sql(
        "INSERT INTO experiments (id, owner_id, name, scenario_name, request, protocol_version,"
        " status, is_mse_run, pods_required, queued_at, submitted_at, finished_at, deleted_at)"
        " VALUES (:id, :owner, :name, :scenario, '{}'::jsonb, '1.4.0', CAST(:status AS"
        " experiment_status), false, 1, :queued, :submitted, :finished, :deleted)",
        id=uuid.uuid4(),
        owner=owner.id,
        name=f"{status} run",
        scenario=scenario,
        status=status,
        queued=queued,
        submitted=submitted,
        finished=finished,
        deleted=deleted,
    )


@pytest.fixture
def world(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> dict[str, Any]:
    """An admin, maria (2 sign-ins, 1 wrong password, 5 rolled-up old ones, six
    runs) and nikos (nothing), plus a failed attempt on an unknown login."""
    admin = users("ada", Role.ADMIN)
    maria = users("maria")
    nikos = users("nikos")
    for _ in range(2):
        assert login(api, "maria").status_code == 200
    assert login(api, "maria", "wrong-password-123").status_code == 401
    assert login(api, "nobody-here", PASSWORD).status_code == 401
    api.cookies.clear()
    sql(
        "INSERT INTO login_stats_monthly (user_id, month, method, successes, failures)"
        " VALUES (:u, '2024-01-01', 'password', 5, 1)",
        u=maria.id,
    )
    run(sql, maria, "completed", finished=NOW - HOUR)  # 3600 s
    run(sql, maria, "completed", queued=OLD, submitted=OLD, finished=OLD + 2 * HOUR)  # 7200 s
    run(sql, maria, "cancelled", finished=NOW - HOUR)
    run(sql, maria, "failed", finished=NOW - HOUR, scenario="anchovy_bay")
    run(sql, maria, "submit_failed", submitted=None, finished=NOW - HOUR, deleted=NOW)
    run(sql, maria, "running")
    headers = bearer(api, "ada")
    return {"admin": admin, "maria": maria, "nikos": nikos, "h": headers}


def test_members_and_anonymous_are_refused(api: TestClient, users: Callable[..., User]) -> None:
    users("maria")
    for path in ROUTES:
        assert api.get(path).status_code == 401, path
    h = bearer(api, "maria")
    for path in ROUTES:
        assert api.get(path, headers=h).status_code == 403, path


def test_per_user_counts_add_the_roll_up_and_follow_the_period(
    api: TestClient, world: dict[str, Any]
) -> None:
    h = world["h"]
    page = api.get("/api/v1/admin/stats/users", params={"sort": "-sign_ins"}, headers=h).json()
    assert page["total"] == 3
    maria = page["items"][0]
    assert maria["username"] == "maria"
    assert (maria["sign_ins"], maria["failed_sign_ins"]) == (2 + 5, 1 + 1)
    assert maria["last_login_method"] == "password"
    assert maria["account"] == "local"
    assert {k: maria[k] for k in maria if k.startswith("experiments_")} == {
        "experiments_submitted": 6,
        "experiments_completed": 2,
        "experiments_failed": 2,  # failed and submit_failed; a deleted run still counts
        "experiments_cancelled": 1,
        "experiments_active": 1,
    }
    assert maria["mean_run_seconds"] == pytest.approx(5400, abs=1)
    assert page["period"] == {"from": None, "to": None}

    since = api.get(
        "/api/v1/admin/stats/users",
        params={"from": "2025-01-01T00:00:00Z", "q": "mar"},
        headers=h,
    ).json()
    [maria] = since["items"]
    assert (maria["sign_ins"], maria["failed_sign_ins"]) == (2, 1)
    assert (maria["experiments_submitted"], maria["experiments_completed"]) == (5, 1)
    assert maria["mean_run_seconds"] == pytest.approx(3600, abs=1)
    assert maria["experiments_active"] == 1  # whatever the period
    assert since["period"]["from"].startswith("2025-01-01T00:00:00")

    # The roll-up month alone: no raw rows, no runs ended then except the old one.
    jan = api.get(
        "/api/v1/admin/stats/users",
        params={"from": "2024-01-15T00:00:00Z", "to": "2024-02-01T00:00:00Z", "q": "maria"},
        headers=h,
    ).json()["items"][0]
    assert (jan["sign_ins"], jan["failed_sign_ins"]) == (5, 1)  # the month overlaps
    assert jan["experiments_completed"] == 0  # finished 2024-01-10, before `from`

    nikos = api.get("/api/v1/admin/stats/users", params={"q": "nikos"}, headers=h).json()
    [row] = nikos["items"]
    assert (row["sign_ins"], row["experiments_submitted"], row["mean_run_seconds"]) == (0, 0, None)
    assert row["last_login_method"] is None


def test_platform_totals_by_scenario_and_week(api: TestClient, world: dict[str, Any]) -> None:
    h = world["h"]
    stats = api.get("/api/v1/admin/stats", headers=h).json()
    assert stats["users"] == {
        "total": 3,
        "active": 3,
        "admins": 1,
        "members": 2,
        "sso": 0,
        "local": 3,
        "active_in_period": 2,  # maria and ada (the bearer token)
    }
    # ada 1 + maria 2 + roll-up 5; failures: maria 1, unknown login 1, roll-up 1.
    assert stats["sign_ins"] == {"sign_ins": 8, "failed_sign_ins": 3}
    assert stats["experiments"]["experiments_submitted"] == 6
    assert [s["scenario_name"] for s in stats["by_scenario"]] == ["anchovy_bay", "northwestern_med"]
    assert stats["by_scenario"][0]["experiments_failed"] == 1
    weeks = {w["week"][:10]: w for w in stats["by_week"]}
    assert weeks["2024-01-08"]["experiments_submitted"] == 1  # Monday of 2024-01-10
    assert sum(w["sign_ins"] for w in stats["by_week"]) == 3  # raw rows only

    one = api.get("/api/v1/admin/stats", params={"scenario": "anchovy_bay"}, headers=h).json()
    assert one["scenario_name"] == "anchovy_bay"
    assert one["experiments"]["experiments_submitted"] == 1
    assert [s["scenario_name"] for s in one["by_scenario"]] == ["anchovy_bay"]


def test_one_users_activity(api: TestClient, world: dict[str, Any]) -> None:
    h = world["h"]
    maria = world["maria"]
    body = api.get(f"/api/v1/admin/users/{maria.id}/activity", headers=h).json()
    assert body["stats"]["username"] == "maria"
    results = [s["result"] for s in body["recent_sign_ins"]]
    assert results == ["bad_credentials", "success", "success"]  # newest first
    assert body["recent_sign_ins"][0]["user_agent"] == "testclient"
    assert len(body["recent_experiments"]) == 6
    assert [e["deleted"] for e in body["recent_experiments"]].count(True) == 1
    missing = api.get(f"/api/v1/admin/users/{uuid.uuid4()}/activity", headers=h)
    assert missing.status_code == 404


def test_an_empty_period_is_refused(api: TestClient, world: dict[str, Any]) -> None:
    params = {"from": "2026-02-01T00:00:00Z", "to": "2026-01-01T00:00:00Z"}
    for path in ROUTES[:2] + ROUTES[3:]:
        response = api.get(path, params=params, headers=world["h"])
        assert response.status_code == 422, path
        assert response.json()["error"]["code"] == "invalid_input"


def test_the_audit_log_filters_and_names_the_actor(api: TestClient, world: dict[str, Any]) -> None:
    h = world["h"]
    created = api.post(
        "/api/v1/admin/users",
        json={
            "email": "eleni@example.org",
            "username": "eleni",
            "first_name": "Eleni",
            "last_name": "Tester",
            "temporary_password": "first-sign-in-2026",
        },
        headers=h,
    )
    assert created.status_code == 201, created.text
    page = api.get(
        "/api/v1/admin/audit-events",
        params={"action": "user.created", "actor_id": str(world["admin"].id)},
        headers=h,
    ).json()
    [event] = page["items"]
    assert (event["actor_username"], event["target_type"]) == ("ada", "user")
    assert event["target_id"] == created.json()["id"]

    system = api.get(
        "/api/v1/admin/audit-events", params={"action": "user.created"}, headers=h
    ).json()
    # The fixture's users were created with no actor: the system.
    assert {e["actor_username"] for e in system["items"]} == {"ada", None}
    later = api.get(
        "/api/v1/admin/audit-events",
        params={"from": (NOW + timedelta(days=1)).isoformat()},
        headers=h,
    ).json()
    assert later["total"] == 0
