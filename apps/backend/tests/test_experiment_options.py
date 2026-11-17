"""`GET /api/v1/scenarios/{name}/experiment-options`: the experiment form's data
(docs/features/experiments § Experiment form options), against PostgreSQL and
the fake controller (which serves copies of the real contracts and of
Ecopath's northwestern_med initial-state files)."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.integrations.controller.fake import FAKE_CONTRACTS_DIR
from surimi_backend.users.models import User
from tests.conftest import bearer

pytestmark = pytest.mark.integration

URL = "/api/v1/scenarios/{}/experiment-options"


def _options(api: TestClient, headers: dict[str, str], scenario: str) -> dict[str, Any]:
    response = api.get(URL.format(scenario), headers=headers)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def test_northwestern_med_options(api: TestClient, users: Callable[..., User]) -> None:
    users("maria")
    maria = bearer(api, "maria")
    body = _options(api, maria, "northwestern_med")

    assert body["start_date_time"].startswith("2013-01-01")
    assert body["maximum_end_date_time"].startswith("2050-01-01")
    assert body["climate_scenarios"] == ["RCP_2.6", "RCP_4.5", "RCP_8.5"]
    assert body["climate_scenario_required"] is True
    assert (body["pods_single_run"], body["pods_mse_run"]) == (1, 5)
    assert body["initial_values_available"] is True

    # Every species entry of the contract, each saying whether it can carry an HCR.
    contract = json.loads((FAKE_CONTRACTS_DIR / "northwestern_med.json").read_text("utf-8"))
    items = contract.get("simulation", contract)["items"]["species"]
    rows = {(r["species_code"], r["life_stage"]): r for r in body["species"]}
    assert len(rows) == len(items)
    ane = rows[("ANE", "adult")]
    assert ane["hcr_eligible"] is False
    assert ane["initial_fishing_mortality"] == pytest.approx(4.225, rel=1e-3)
    # In the contract, but the controller has no initial values for it.
    assert (
        rows[("SWO", "")]["initial_biomass"],
        rows[("SWO", "")]["initial_fishing_mortality"],
    ) == (
        None,
        None,
    )
    eligible = {k: r for k, r in rows.items() if r["hcr_eligible"]}
    assert sorted(eligible) == [
        ("BFT", ""),
        ("BOG", ""),
        ("HKE", "adult"),
        ("HKE", "juvenile"),
        ("MUT", "adult"),
        ("PIL", "adult"),
    ]
    bft = rows[("BFT", "")]
    assert bft["species_name"] == "Atlantic bluefin tuna"
    assert bft["initial_biomass"] == pytest.approx(54016.12, rel=1e-6)
    assert bft["initial_fishing_mortality"] == pytest.approx(2.082, rel=1e-3)
    assert body["hcr_configurations"] == []  # maria saved none; there are no defaults
    assert rows[("HKE", "adult")]["functional_group_name"] == "Adult hake"


def test_saved_configurations_are_listed(api: TestClient, users: Callable[..., User]) -> None:
    users("nikos")
    nikos = bearer(api, "nikos")
    rule = {
        "species_code": "BFT",
        "life_stage": "",
        "biomass_limit_kg": 364376,
        "biomass_base_kg": 1457504,
        "f_max": 0.622,
    }
    created = api.post(
        "/api/v1/scenarios/northwestern_med/hcr-configurations",
        json={"name": "Tuna only", "rules": [rule]},
        headers=nikos,
    )
    assert created.status_code == 201, created.text

    body = _options(api, nikos, "northwestern_med")
    [summary] = body["hcr_configurations"]
    assert (summary["id"], summary["name"], summary["rule_count"]) == (
        created.json()["id"],
        "Tuna only",
        1,
    )
    assert "rule" not in body["species"][0]
    # Configurations are per scenario.
    assert _options(api, nikos, "anchovy_bay")["hcr_configurations"] == []


def test_a_scenario_without_initial_values_or_hcrs(
    api: TestClient, users: Callable[..., User]
) -> None:
    users("maria")
    body = _options(api, bearer(api, "maria"), "aegean_sea")
    assert body["climate_scenarios"] == []
    assert body["climate_scenario_required"] is False
    assert not any(r["hcr_eligible"] for r in body["species"])
    assert body["initial_values_available"] is False
    assert any("No initial biomass" in n for n in body["notes"])
    assert any("can carry a harvest control rule" in n for n in body["notes"])


def test_unknown_scenario_and_sign_in(api: TestClient, users: Callable[..., User]) -> None:
    users("maria")
    maria = bearer(api, "maria")
    assert api.get(URL.format("nowhere"), headers=maria).status_code == 404
    assert api.get(URL.format("northwestern_med")).status_code == 401
