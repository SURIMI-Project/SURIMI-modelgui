"""Experiments, the admission queue and the worker's poll and dispatch
(ADR 0015, ADR 0019), against PostgreSQL and the fake controller on a clock
the tests move. Exit criteria of plan 2026-11-05 step 4c and phase 5."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest

from surimi_backend.users.models import Role, User
from tests.conftest import bearer
from tests.world import RULES, World, body

pytestmark = pytest.mark.integration


def test_validation_lists_every_problem(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    users("maria")
    h = bearer(w.client, "maria")
    bad = w.client.post(
        "/api/v1/experiments",
        json=body(
            end_date_time="2060-01-01T00:00:00Z",
            climate_scenario=None,
            harvest_control_rules=[{**RULES[0], "species_code": "ANE"}, RULES[1], RULES[1]],
        ),
        headers=h,
    )
    assert bad.status_code == 422
    problems = bad.json()["error"]["details"]["problems"]
    assert any("must not be after 2050-01-01" in p for p in problems)
    assert any("climate_scenario must be one of RCP_2.6" in p for p in problems)
    assert any(p.startswith("ANE adult cannot carry a harvest control rule") for p in problems)
    assert any("more than one harvest control rule for PIL adult" in p for p in problems)

    aegean = w.client.post(
        "/api/v1/experiments",
        json=body(scenario_name="aegean_sea", harvest_control_rules=[]),
        headers=h,
    )
    assert aegean.status_code == 422
    assert "aegean_sea takes no climate scenario" in aegean.text
    assert (
        w.client.post(
            "/api/v1/experiments", json=body(scenario_name="nowhere"), headers=h
        ).status_code
        == 404
    )


def test_a_run_from_queue_to_copying_results(
    make_world: Callable[..., World], users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    w = make_world()
    users("maria")
    h = bearer(w.client, "maria")
    created = w.client.post("/api/v1/experiments", json=body(), headers=h)
    assert created.status_code == 202, created.text
    e = created.json()
    assert (e["status"], e["queue_position"], e["pods_required"]) == ("queued", 1, 1)

    assert w.dispatch() == 1
    sent = w.fake.submissions[e["id"]]
    assert [
        (t.species_code, t.biomass_limit_kg, t.biomass_base_kg)
        for t in sent.target_fishing_mortalities
    ] == [
        ("HKE", 4_000_000.0, 16_000_000.0),
        ("PIL", 9_000_000.0, 30_000_000.0),
    ]
    assert w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()["status"] == "submitted"

    w.poll()
    first = w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()
    assert (first["status"], first["simulation_counts"]) == ("initialising", {"initialising": 1})
    w.clock.advance(6)
    w.poll()
    ready = w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()
    assert (ready["status"], ready["simulation_counts"]) == ("initialised", {"initialised": 1})
    assert ready["simulations"][0]["status_raw"] == "Initialised"
    w.clock.advance(54)
    w.poll()
    running = w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()
    assert running["status"] == "running"
    assert 0 < running["progress"] < 1
    assert running["simulations"][0]["status_raw"] == "Running"
    assert running["simulations"][0]["progress"] == pytest.approx(running["progress"])

    w.clock.advance(100)
    w.poll()
    done = w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()
    # Finished on the controller: the results are not in the bucket yet.
    assert done["status"] == "copying_results"
    assert done["outputs_state"] == "pending"
    assert done["finished_at"] is not None
    assert done["completed_at"] is None
    assert w.client.post(f"/api/v1/experiments/{e['id']}/cancel", headers=h).status_code == 409
    assert w.client.get("/api/v1/queue", headers=h).json()["pods_in_use"] == 0
    assert done["request"]["harvest_control_rules"][0]["biomass_limit_kg"] == 4_000_000  # as sent
    changes = [
        (ev["type"], ev["data"]["status"], (ev["data"].get("simulation") or {}).get("status"))
        for ev in reversed(done["events"])
    ]
    assert changes == [
        ("experiment.queued", "queued", None),
        ("experiment.submitted", "submitted", None),
        ("simulation.status_changed", "initialising", "initialising"),
        ("experiment.status_changed", "initialising", None),
        ("simulation.status_changed", "initialised", "initialised"),
        ("experiment.status_changed", "initialised", None),
        ("simulation.status_changed", "running", "running"),
        ("experiment.status_changed", "running", None),
        ("simulation.status_changed", "copying_results", "finished"),
        ("experiment.status_changed", "copying_results", None),
    ]
    [(uri,)] = sql("SELECT uri FROM experiment_outputs")
    assert uri.endswith(f"/{e['id']}/{e['id']}.nc")


def test_an_mse_run_follows_all_its_simulations(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    """The controller initialises the 5 simulations of an MSE run in parallel
    and starts them together once all are Initialised (SURIMI-controller
    `117e604`); the experiment shows the slowest one, and each counts."""
    w = make_world()
    w.fake.init_stagger_seconds = 2  # Initialised at 5, 7, 9, 11, 13 s; all run from 18 s
    users("maria")
    h = bearer(w.client, "maria")
    e = w.client.post("/api/v1/experiments", json=body(is_mse_run=True), headers=h).json()
    assert e["pods_required"] == 5
    w.dispatch()

    def seen(after: float) -> dict[str, Any]:
        w.clock.advance(after)
        w.poll()
        out: dict[str, Any] = w.client.get(f"/api/v1/experiments/{e['id']}", headers=h).json()
        return out

    start = seen(0)
    assert (start["status"], start["simulation_counts"]) == ("initialising", {"initialising": 5})
    mixed = seen(8)
    assert (mixed["status"], mixed["simulation_counts"]) == (
        "initialising",
        {"initialising": 3, "initialised": 2},
    )
    assert [s["status"] for s in mixed["simulations"]] == [
        "initialised", "initialised", "initialising", "initialising", "initialising",
    ]  # fmt: skip
    listed = w.client.get("/api/v1/experiments", headers=h).json()["items"][0]
    assert listed["simulation_counts"] == {"initialising": 3, "initialised": 2}

    ready = seen(6)  # 14 s: all Initialised, waiting for the controller to start them
    assert (ready["status"], ready["simulation_counts"]) == ("initialised", {"initialised": 5})
    running = seen(16)  # 30 s: running since 18 s
    assert (running["status"], running["simulation_counts"]) == ("running", {"running": 5})
    assert all(0 < s["progress"] < 1 for s in running["simulations"])
    done = seen(120)
    assert (done["status"], done["simulation_counts"]) == ("copying_results", {"finished": 5})

    sim_events = [
        ev["data"] for ev in w.client.get("/api/v1/events?after=0", headers=h).json()["events"]
        if ev["type"] == "simulation.status_changed"
    ]  # fmt: skip
    # Each of the 5 simulations: first seen, initialised, running, finished.
    assert len(sim_events) == 20
    assert {d["simulation"]["order"] for d in sim_events} == {
        s["order"] for s in done["simulations"]
    }
    assert sim_events[-1]["simulations"] == {"finished": 5}


def test_members_see_their_own_admins_see_all(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    maria_user = users("maria")
    users("nikos")
    users("root", Role.ADMIN)
    maria, nikos, admin = (
        bearer(w.client, "maria"),
        bearer(w.client, "nikos"),
        bearer(w.client, "root"),
    )
    mine = w.client.post(
        "/api/v1/experiments", json=body(name="sardine stock"), headers=maria
    ).json()
    w.client.post("/api/v1/experiments", json=body(name="hake only"), headers=nikos)

    listed = w.client.get("/api/v1/experiments", headers=maria).json()
    assert [x["name"] for x in listed["items"]] == ["sardine stock"]
    assert w.client.get(f"/api/v1/experiments/{mine['id']}", headers=nikos).status_code == 404
    assert (
        w.client.post(f"/api/v1/experiments/{mine['id']}/cancel", headers=nikos).status_code == 404
    )

    everything = w.client.get("/api/v1/experiments", headers=admin).json()
    assert everything["total"] == 2
    by_owner = w.client.get(f"/api/v1/experiments?owner_id={maria_user.id}", headers=admin).json()
    assert [x["owner_username"] for x in by_owner["items"]] == ["maria"]
    found = w.client.get("/api/v1/experiments?q=sard", headers=admin).json()
    assert [x["name"] for x in found["items"]] == ["sardine stock"]


def test_cancel_queued_running_and_initialising(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    users("maria")
    h = bearer(w.client, "maria")
    queued = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    cancelled = w.client.post(f"/api/v1/experiments/{queued['id']}/cancel", headers=h)
    assert cancelled.json()["status"] == "cancelled"
    assert "RemoveExperiment" not in w.fake.calls  # nothing on the controller yet
    assert w.client.post(f"/api/v1/experiments/{queued['id']}/cancel", headers=h).status_code == 409

    early = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    w.dispatch()
    w.poll()
    asked = w.client.post(f"/api/v1/experiments/{early['id']}/cancel", headers=h).json()
    assert asked["status"] == "cancelling"
    w.poll()  # still initialising: RemoveExperiment cannot stop it yet
    assert (
        w.client.get(f"/api/v1/experiments/{early['id']}", headers=h).json()["status"]
        == "cancelling"
    )
    w.clock.advance(20)
    w.poll()  # running now: the worker repeats RemoveExperiment
    w.poll()
    assert (
        w.client.get(f"/api/v1/experiments/{early['id']}", headers=h).json()["status"]
        == "cancelled"
    )

    deleted = w.client.delete(f"/api/v1/experiments/{early['id']}", headers=h)
    assert deleted.status_code == 204
    assert w.client.get(f"/api/v1/experiments/{early['id']}", headers=h).status_code == 404


def test_the_queue_waits_while_error_runs_hold_the_pods(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world(pods=5)
    users("maria")
    users("root", Role.ADMIN)
    h, admin = bearer(w.client, "maria"), bearer(w.client, "root")
    mse = w.client.post("/api/v1/experiments", json=body(is_mse_run=True), headers=h).json()
    assert mse["pods_required"] == 5
    assert w.dispatch() == 1
    w.poll()
    w.fake.fail(mse["id"])  # 5 simulations in Error: their pods are never released
    w.poll()
    assert w.client.get(f"/api/v1/experiments/{mse['id']}", headers=h).json()["status"] == "failed"

    waiting = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    assert w.dispatch() == 0  # not submitted into "No available pods"
    queue = w.client.get("/api/v1/queue", headers=h).json()
    assert (queue["pods_in_use"], queue["queued_total"]) == (5, 1)
    assert queue["items"][0]["id"] == waiting["id"]
    view = w.client.get("/api/v1/admin/queue", headers=admin).json()
    assert view["pods_free"] == 0
    assert view["in_flight"][0]["leaked"] is True

    w.fake.restart()  # what frees the pods today
    assert w.dispatch() == 1


def test_never_started_and_lost_experiments_fail_with_the_reason(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    # The app thinks there are 2 pods, the controller has 1: the second run is
    # dropped silently by the controller, as with "No available pods".
    w = make_world(pods=2, start_timeout_minutes=0, lost_after_polls=2)
    w.fake.pods = 1
    users("maria")
    h = bearer(w.client, "maria")
    first = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    second = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    assert w.dispatch() == 2
    w.poll()
    dropped = w.client.get(f"/api/v1/experiments/{second['id']}", headers=h).json()
    assert dropped["status"] == "failed"
    assert "never started" in dropped["error"]
    assert "No available pods" in dropped["error"]

    w.fake.restart()
    w.poll()
    assert (
        w.client.get(f"/api/v1/experiments/{first['id']}", headers=h).json()["status"]
        == "initialising"
    )
    w.poll()
    lost = w.client.get(f"/api/v1/experiments/{first['id']}", headers=h).json()
    assert (lost["status"], lost["error"]) == (
        "failed",
        "lost: the controller no longer knows this experiment (restarted?)",
    )


def test_limits_pause_priority_and_clone(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world(max_queued_experiments_per_user=1)
    users("maria")
    users("root", Role.ADMIN)
    h, admin = bearer(w.client, "maria"), bearer(w.client, "root")
    assert w.client.post("/api/v1/admin/queue/pause", headers=admin).status_code == 204
    first = w.client.post("/api/v1/experiments", json=body(), headers=h).json()
    assert w.client.post("/api/v1/experiments", json=body(), headers=h).status_code == 409
    assert w.dispatch() == 0  # paused
    raised = w.client.patch(
        f"/api/v1/admin/queue/{first['id']}", json={"priority": 10}, headers=admin
    )
    assert raised.json()["priority"] == 10
    assert w.client.post("/api/v1/admin/queue/resume", headers=admin).status_code == 204
    assert w.dispatch() == 1

    copy = w.client.post(
        f"/api/v1/experiments/{first['id']}/clone",
        json={"end_date_time": "2015-01-01T00:00:00Z"},
        headers=h,
    )
    assert copy.status_code == 202, copy.text
    clone = w.client.get(f"/api/v1/experiments/{copy.json()['id']}", headers=h).json()
    assert clone["cloned_from_id"] == first["id"]
    assert (
        clone["request"]["harvest_control_rules"]
        == w.client.get(f"/api/v1/experiments/{first['id']}", headers=h).json()["request"][
            "harvest_control_rules"
        ]
    )
    assert clone["end_date_time"].startswith("2015-01-01")


def test_a_saved_configuration_is_used_by_id(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    users("maria")
    users("nikos")
    h = bearer(w.client, "maria")
    without_rules = {k: v for k, v in body().items() if k != "harvest_control_rules"}
    url = "/api/v1/scenarios/northwestern_med/hcr-configurations"
    hake = w.client.post(url, json={"name": "Hake", "rules": [RULES[0]]}, headers=h).json()
    w.client.post(url, json={"name": "Sardine", "rules": [RULES[1]]}, headers=h)

    created = w.client.post(
        "/api/v1/experiments", json={**without_rules, "hcr_configuration_id": hake["id"]}, headers=h
    ).json()
    request = w.client.get(f"/api/v1/experiments/{created['id']}", headers=h).json()["request"]
    assert request["harvest_control_rules_source"] == "configuration"
    assert (request["hcr_configuration_id"], request["hcr_configuration_name"]) == (
        hake["id"],
        "Hake",
    )
    assert [r["species_code"] for r in request["harvest_control_rules"]] == ["HKE"]

    # Neither rules nor a configuration: no rules (there are no defaults).
    none = w.client.post("/api/v1/experiments", json=without_rules, headers=h).json()
    detail = w.client.get(f"/api/v1/experiments/{none['id']}", headers=h).json()
    assert detail["request"]["harvest_control_rules_source"] == "none"
    assert detail["request"]["harvest_control_rules"] == []

    both = {**body(), "hcr_configuration_id": hake["id"]}
    refused = w.client.post("/api/v1/experiments", json=both, headers=h)
    assert refused.status_code == 422
    assert "not both" in refused.text
    # Someone else's configuration is a 404, like a missing one.
    nikos = bearer(w.client, "nikos")
    theirs = {**without_rules, "hcr_configuration_id": hake["id"]}
    assert w.client.post("/api/v1/experiments", json=theirs, headers=nikos).status_code == 404


def test_events_are_polled_from_a_cursor_and_scoped(
    make_world: Callable[..., World], users: Callable[..., User]
) -> None:
    w = make_world()
    users("maria")
    users("nikos")
    users("root", Role.ADMIN)
    maria, nikos, admin = (
        bearer(w.client, "maria"),
        bearer(w.client, "nikos"),
        bearer(w.client, "root"),
    )
    start = w.client.get("/api/v1/events", headers=maria).json()
    assert start == {
        "events": [],
        "last_id": 0,
        "has_more": False,
        "poll_after_seconds": w.settings.poll_interval_seconds,
    }
    mine = w.client.post("/api/v1/experiments", json=body(), headers=maria).json()
    w.client.post("/api/v1/experiments", json=body(), headers=nikos)

    feed = w.client.get(f"/api/v1/events?after={start['last_id']}", headers=maria).json()
    assert [(e["type"], e["data"]["experiment_id"]) for e in feed["events"]] == [
        ("experiment.queued", mine["id"])
    ]
    cursor = feed["last_id"]
    assert w.client.get(f"/api/v1/events?after={cursor}", headers=maria).json()["events"] == []

    w.dispatch()
    newer = w.client.get(f"/api/v1/events?after={cursor}", headers=maria).json()
    assert [e["type"] for e in newer["events"]] == ["experiment.submitted"]
    assert newer["last_id"] > cursor

    everything = w.client.get("/api/v1/events?after=0", headers=admin).json()
    assert len(everything["events"]) == 4  # both users' queued and submitted
    paged = w.client.get("/api/v1/events?after=0&limit=3", headers=admin).json()
    assert (len(paged["events"]), paged["has_more"]) == (3, True)
    assert w.client.get("/api/v1/events?after=0&scope=mine", headers=admin).json()["events"] == []
