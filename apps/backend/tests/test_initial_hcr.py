"""The controller's initial HCR data (ADR 0027) and its snapshots (ADR 0028),
against PostgreSQL and the fake controller, which serves a copy of Ecopath's
`northwestern_med_initial_hrc_data.csv` (SURIMI-Ecopath `3819d2c`) and fails
the other scenarios as `project-surimi` does."""

from __future__ import annotations

import asyncio
import dataclasses
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.integrations.controller import (
    ControllerError,
    FakeControllerClient,
    InitialHcrData,
)
from surimi_backend.users.models import Role, User
from tests.conftest import bearer
from tests.world import body

pytestmark = pytest.mark.integration

LIVE = "/api/v1/scenarios/{}/initial-hcr-data"
HISTORY = "/api/v1/scenarios/{}/initial-hcr-data/history"

# HKE adult in the file: the defaults a rule can start from.
HKE_ADULT_DEFAULT = {
    "biomass_limit_kg": 15983.459953308105,
    "biomass_base_kg": 63933.85917663574,
    "f_max": 0.23520450294017792,
}


def _get(api: TestClient, headers: dict[str, str], path: str) -> dict[str, Any]:
    response = api.get(path, headers=headers)
    assert response.status_code == 200, response.text
    result: dict[str, Any] = response.json()
    return result


def _entries(answer: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    return {(e["species_code"], e["life_stage"]): e for e in answer["entries"]}


def _file(fake: FakeControllerClient) -> list[InitialHcrData]:
    fake.initial_hcr_overrides.pop("northwestern_med", None)
    return asyncio.run(fake.get_initial_hcr_data("northwestern_med"))


def test_live_answer_is_named_and_recorded_once(
    api: TestClient,
    users: Callable[..., User],
    fake_controller: FakeControllerClient,
    sql: Callable[..., list[Any]],
) -> None:
    users("maria")
    maria = bearer(api, "maria")
    first = _get(api, maria, LIVE.format("northwestern_med"))
    second = _get(api, maria, LIVE.format("northwestern_med"))

    assert fake_controller.calls["GetInitialHCRData"] == 2  # never cached
    assert first["snapshot_id"] == second["snapshot_id"]  # same values, same snapshot
    assert sql("SELECT count(*) FROM initial_hcr_snapshots")[0][0] == 1

    rows = _entries(first)
    assert len(rows) == 91
    hake = rows[("HKE", "adult")]
    assert hake == {
        "species_code": "HKE",
        "life_stage": "adult",
        "length_class": "",
        "age": "",
        "kind": "species",
        "species_name": "European hake",
        "scientific_name": "Merluccius merluccius",
        "family": "MERLUCCIIDAE",
        "functional_group": None,
        "functional_group_name": None,
        "members": [],
        "hcr_eligible": True,
        "initial_biomass_kg": 414734.74893034395,
        "initial_fishing_mortality": pytest.approx(0.0911555, rel=1e-5),
        "default_biomass_limit_kg": HKE_ADULT_DEFAULT["biomass_limit_kg"],
        "default_biomass_base_kg": HKE_ADULT_DEFAULT["biomass_base_kg"],
        "default_f_max": HKE_ADULT_DEFAULT["f_max"],
    }
    # Outside the contract and not eligible, but named.
    assert rows[("HKE", "")]["species_name"] == "European hake"
    assert rows[("HKE", "")]["hcr_eligible"] is False
    # Not caught during spin-up: F 0, still served.
    assert any(e["initial_fishing_mortality"] == 0 for e in first["entries"])
    eligible = sorted(k for k, e in rows.items() if e["hcr_eligible"])
    assert eligible == [
        ("BFT", ""),
        ("BOG", ""),
        ("HKE", "adult"),
        ("HKE", "juvenile"),
        ("MUT", "adult"),
        ("PIL", "adult"),
    ]


def test_changed_values_make_a_new_snapshot_and_the_old_one_stays(
    api: TestClient,
    users: Callable[..., User],
    fake_controller: FakeControllerClient,
) -> None:
    users("maria")
    maria = bearer(api, "maria")
    old = _get(api, maria, LIVE.format("northwestern_med"))

    # Ecopath regenerates its file: HKE adult's default limit changes, and one
    # entry loses its defaults (0 means none).
    data = _file(fake_controller)
    changed = [
        dataclasses.replace(d, default_biomass_limit_kg=860_000.0)
        if (d.species_code, d.life_stage) == ("HKE", "adult")
        else dataclasses.replace(d, default_biomass_limit_kg=0, default_biomass_base_kg=0)
        if (d.species_code, d.life_stage) == ("BFT", "")
        else d
        for d in data
    ]
    fake_controller.initial_hcr_overrides["northwestern_med"] = changed
    new = _get(api, maria, LIVE.format("northwestern_med"))
    assert new["snapshot_id"] != old["snapshot_id"]
    assert _entries(new)[("HKE", "adult")]["default_biomass_limit_kg"] == 860_000.0
    assert _entries(new)[("BFT", "")]["default_biomass_limit_kg"] is None

    history = _get(api, maria, HISTORY.format("northwestern_med"))
    assert [s["id"] for s in history["snapshots"]] == [new["snapshot_id"], old["snapshot_id"]]
    assert {s["entry_count"] for s in history["snapshots"]} == {91}

    kept = _get(api, maria, f"{HISTORY.format('northwestern_med')}/{old['snapshot_id']}")
    assert _entries(kept)[("HKE", "adult")]["default_biomass_limit_kg"] == pytest.approx(
        HKE_ADULT_DEFAULT["biomass_limit_kg"]
    )
    assert kept["first_seen_at"] == old["first_seen_at"]

    # Going back to the first values finds the first snapshot again.
    fake_controller.initial_hcr_overrides.pop("northwestern_med")
    assert _get(api, maria, LIVE.format("northwestern_med"))["snapshot_id"] == old["snapshot_id"]


def test_names_are_todays_in_an_old_snapshot(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria")
    maria = bearer(api, "maria")
    snapshot = _get(api, maria, LIVE.format("northwestern_med"))["snapshot_id"]
    [(name,)] = sql("SELECT name FROM species WHERE species_code = 'HKE'")
    try:
        sql("UPDATE species SET name = 'Hake (renamed)' WHERE species_code = 'HKE'")
        read = _get(api, maria, f"{HISTORY.format('northwestern_med')}/{snapshot}")
        assert _entries(read)[("HKE", "adult")]["species_name"] == "Hake (renamed)"
        # A name is not part of the values: no new snapshot.
        live = _get(api, maria, LIVE.format("northwestern_med"))
        assert live["snapshot_id"] == snapshot
    finally:
        sql("UPDATE species SET name = :name WHERE species_code = 'HKE'", name=name)


def test_missing_file_unknown_scenario_and_foreign_snapshot(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria")
    maria = bearer(api, "maria")
    missing = api.get(LIVE.format("anchovy_bay"), headers=maria)
    assert missing.status_code == 502
    assert "anchovy_bay_initial_hrc_data.csv" in missing.json()["error"]["message"]
    assert sql("SELECT count(*) FROM initial_hcr_snapshots")[0][0] == 0
    assert _get(api, maria, HISTORY.format("anchovy_bay"))["snapshots"] == []

    assert api.get(LIVE.format("atlantis"), headers=maria).status_code == 404
    assert api.get(HISTORY.format("atlantis"), headers=maria).status_code == 404
    nw = _get(api, maria, LIVE.format("northwestern_med"))["snapshot_id"]
    # A snapshot is found only under its own scenario.
    assert api.get(f"{HISTORY.format('anchovy_bay')}/{nw}", headers=maria).status_code == 404
    assert api.get(LIVE.format("northwestern_med")).status_code == 401


def test_an_experiment_points_to_its_snapshot_and_compares_rules(
    api: TestClient, users: Callable[..., User]
) -> None:
    users("maria")
    users("nikos")
    users("ana", Role.ADMIN)
    maria = bearer(api, "maria")
    rules = [
        # The default as the console prefills it: kg -> tonnes (6 decimals) -> kg.
        {
            "species_code": "HKE",
            "life_stage": "adult",
            "biomass_limit_kg": 15983.46,
            "biomass_base_kg": 63933.859,
            "f_max": HKE_ADULT_DEFAULT["f_max"],
        },
        {
            "species_code": "PIL",
            "life_stage": "adult",
            "biomass_limit_kg": 9_000_000,
            "biomass_base_kg": 30_000_000,
            "f_max": 0.25,
        },
    ]
    created = api.post("/api/v1/experiments", json=body(harvest_control_rules=rules), headers=maria)
    assert created.status_code == 202, created.text
    experiment_id = created.json()["id"]

    detail = _get(api, maria, f"/api/v1/experiments/{experiment_id}")
    live = _get(api, maria, LIVE.format("northwestern_med"))
    assert detail["initial_hcr_snapshot_id"] == live["snapshot_id"]

    path = f"/api/v1/experiments/{experiment_id}/initial-hcr-data"
    own = _get(api, maria, path)
    assert own["initial_hcr_data"]["snapshot_id"] == live["snapshot_id"]
    compared = {r["species_code"]: r for r in own["rules"]}
    assert compared["HKE"]["changed_from_default"] is False
    assert compared["PIL"]["changed_from_default"] is True
    assert compared["PIL"]["default_f_max"] == pytest.approx(0.6974325776100159)

    assert api.get(path, headers=bearer(api, "nikos")).status_code == 404  # not his
    assert _get(api, bearer(api, "ana"), path)["experiment_id"] == experiment_id  # admin


def test_an_experiment_is_accepted_when_the_controller_cannot_answer(
    api: TestClient,
    users: Callable[..., User],
    fake_controller: FakeControllerClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    users("maria")
    maria = bearer(api, "maria")

    async def fails(scenario_name: str) -> list[InitialHcrData]:
        raise ControllerError("MinIO API responded with message=ecopath/x")

    monkeypatch.setattr(fake_controller, "get_initial_hcr_data", fails)
    created = api.post("/api/v1/experiments", json=body(), headers=maria)
    assert created.status_code == 202, created.text
    experiment_id = created.json()["id"]

    detail = _get(api, maria, f"/api/v1/experiments/{experiment_id}")
    assert detail["initial_hcr_snapshot_id"] is None
    assert "experiment.initial_hcr_unavailable" in {e["type"] for e in detail["events"]}
    missing = api.get(f"/api/v1/experiments/{experiment_id}/initial-hcr-data", headers=maria)
    assert missing.status_code == 404


def test_entries_a_rule_cannot_name_are_left_out_of_the_form(
    api: TestClient, users: Callable[..., User], fake_controller: FakeControllerClient
) -> None:
    users("maria")
    maria = bearer(api, "maria")
    data = _file(fake_controller)
    hake = next(d for d in data if (d.species_code, d.life_stage) == ("HKE", "adult"))
    # A per-length-class row for HKE adult must not replace the plain one.
    sized = dataclasses.replace(hake, length_class="Large", default_f_max=9.0)
    fake_controller.initial_hcr_overrides["northwestern_med"] = [sized, *data]
    options = _get(api, maria, "/api/v1/scenarios/northwestern_med/experiment-options")
    row = next(
        s for s in options["species"] if (s["species_code"], s["life_stage"]) == ("HKE", "adult")
    )
    assert row["default_f_max"] == pytest.approx(HKE_ADULT_DEFAULT["f_max"])
    # It is still part of the live answer and of the snapshot.
    live = _get(api, maria, LIVE.format("northwestern_med"))
    assert any(e["length_class"] == "Large" for e in live["entries"])
