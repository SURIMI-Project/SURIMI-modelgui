"""HCR configurations (ADR 0018, 0024, 0025: several named sets of rules per
user and scenario, rules in a jsonb array, no scenario defaults), against
PostgreSQL."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.hcr.schemas import MAX_CONFIGURATIONS
from surimi_backend.users.models import Role, User
from tests.conftest import bearer

pytestmark = pytest.mark.integration

BASE = "/api/v1/scenarios/northwestern_med/hcr-configurations"
HKE = {
    "species_code": "HKE",
    "life_stage": "adult",
    "biomass_limit_kg": 4_000_000,
    "biomass_base_kg": 16_000_000,
    "f_max": 0.3,
}
BFT = {
    "species_code": "BFT",
    "life_stage": "",
    "biomass_limit_kg": 364_376,
    "biomass_base_kg": 1_457_504,
    "f_max": 0.622,
}


def _entries(configuration: dict[str, Any]) -> list[tuple[str, str, float]]:
    return [(r["species_code"], r["life_stage"], r["f_max"]) for r in configuration["rules"]]


def test_several_configurations_per_scenario(api: TestClient, users: Callable[..., User]) -> None:
    users("maria")
    maria = bearer(api, "maria")
    assert api.get(BASE, headers=maria).json() == {
        "scenario_name": "northwestern_med",
        "configurations": [],
    }

    cautious = api.post(BASE, json={"name": "Cautious", "rules": [HKE, BFT]}, headers=maria)
    assert cautious.status_code == 201, cautious.text
    body = cautious.json()
    assert _entries(body) == [("HKE", "adult", 0.3), ("BFT", "", 0.622)]
    assert body["rules"][0]["eligible"] is True
    assert body["rules"][0]["species_name"] == "European hake"
    assert (
        api.post(BASE, json={"name": "  Tuna only ", "rules": [BFT]}, headers=maria).json()["name"]
        == "Tuna only"
    )
    assert api.post(BASE, json={"name": "Empty"}, headers=maria).json()["rules"] == []

    listed = api.get(BASE, headers=maria).json()["configurations"]
    assert [c["name"] for c in listed] == ["Cautious", "Empty", "Tuna only"]
    one = api.get(f"{BASE}/{body['id']}", headers=maria).json()
    assert _entries(one) == _entries(body)

    # PUT renames and replaces the whole set; the others are untouched.
    changed = api.put(
        f"{BASE}/{body['id']}",
        json={"name": "Cautious hake", "rules": [{**HKE, "life_stage": "ADULT", "f_max": 0.4}]},
        headers=maria,
    )
    assert changed.status_code == 200, changed.text
    assert (changed.json()["name"], _entries(changed.json())) == (
        "Cautious hake",
        [("HKE", "adult", 0.4)],
    )
    assert len(api.get(BASE, headers=maria).json()["configurations"]) == 3

    assert api.delete(f"{BASE}/{body['id']}", headers=maria).status_code == 204
    assert api.get(f"{BASE}/{body['id']}", headers=maria).status_code == 404
    names = [c["name"] for c in api.get(BASE, headers=maria).json()["configurations"]]
    assert names == ["Empty", "Tuna only"]


def test_configurations_are_per_user_and_scenario(
    api: TestClient, users: Callable[..., User]
) -> None:
    users("maria")
    users("nikos")
    maria, nikos = bearer(api, "maria"), bearer(api, "nikos")
    mine = api.post(BASE, json={"name": "Mine", "rules": [HKE]}, headers=maria).json()

    assert api.get(BASE, headers=nikos).json()["configurations"] == []
    anchovy = "/api/v1/scenarios/anchovy_bay/hcr-configurations"
    assert api.get(anchovy, headers=maria).json()["configurations"] == []
    # The same name is fine for another user and in another scenario.
    assert api.post(BASE, json={"name": "mine"}, headers=nikos).status_code == 201
    assert api.post(anchovy, json={"name": "Mine"}, headers=maria).status_code == 201

    # Someone else's configuration, or one asked for under another scenario, is a 404.
    assert api.get(f"{BASE}/{mine['id']}", headers=nikos).status_code == 404
    assert api.put(f"{BASE}/{mine['id']}", json={"name": "x"}, headers=nikos).status_code == 404
    assert api.delete(f"{BASE}/{mine['id']}", headers=nikos).status_code == 404
    assert api.get(f"{anchovy}/{mine['id']}", headers=maria).status_code == 404
    assert _entries(api.get(f"{BASE}/{mine['id']}", headers=maria).json()) == [
        ("HKE", "adult", 0.3)
    ]


def test_validation_is_all_or_nothing(api: TestClient, users: Callable[..., User]) -> None:
    users("maria")
    maria = bearer(api, "maria")
    saved = api.post(BASE, json={"name": "Tuna", "rules": [BFT]}, headers=maria).json()

    refused = api.put(
        f"{BASE}/{saved['id']}",
        json={
            "name": "Tuna",
            "rules": [HKE, {**HKE, "species_code": "ANE"}, {**HKE, "life_stage": "Adult"}],
        },
        headers=maria,
    )
    assert refused.status_code == 422
    details = refused.json()["error"]["details"]
    assert details["problems"] == [
        "ANE adult cannot carry a harvest control rule in northwestern_med",
        "more than one harvest control rule for HKE adult",
    ]
    assert details["eligible"] == [
        "BFT",
        "BOG",
        "HKE adult",
        "HKE juvenile",
        "MUT adult",
        "PIL adult",
    ]
    assert _entries(api.get(f"{BASE}/{saved['id']}", headers=maria).json()) == [("BFT", "", 0.622)]

    for bad in (  # the protocol's bounds, per field
        {**HKE, "f_max": 0},
        {**HKE, "f_max": 100.5},
        {**HKE, "biomass_base_kg": 3.4e12},
        {**HKE, "biomass_limit_kg": 0},
    ):
        assert (
            api.post(BASE, json={"name": "Bad", "rules": [bad]}, headers=maria).status_code == 422
        )
    assert api.post(BASE, json={"name": "   "}, headers=maria).status_code == 422
    assert api.post(BASE, json={"name": "x" * 101}, headers=maria).status_code == 422
    assert api.get("/api/v1/scenarios/nowhere/hcr-configurations", headers=maria).status_code == 404


def test_a_limit_at_or_above_the_base_is_accepted(
    api: TestClient, users: Callable[..., User]
) -> None:
    # The fisheries authority runs such a rule as all-or-nothing at the limit
    # (EwE cMSEQuotaCalculator), so it is the user's choice, not an error.
    users("maria")
    maria = bearer(api, "maria")
    above = {**HKE, "biomass_limit_kg": 20_000_000}
    equal = {**BFT, "biomass_base_kg": BFT["biomass_limit_kg"]}
    saved = api.post(BASE, json={"name": "Switch", "rules": [above, equal]}, headers=maria)
    assert saved.status_code == 201, saved.text
    rules = api.get(f"{BASE}/{saved.json()['id']}", headers=maria).json()["rules"]
    assert [(r["biomass_limit_kg"], r["biomass_base_kg"]) for r in rules] == [
        (20_000_000, 16_000_000),
        (364_376, 364_376),
    ]


def test_names_are_unique_and_the_count_is_capped(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("maria")
    maria = bearer(api, "maria")
    first = api.post(BASE, json={"name": "Plan A"}, headers=maria).json()
    second = api.post(BASE, json={"name": "Plan B"}, headers=maria).json()

    taken = api.post(BASE, json={"name": "plan a"}, headers=maria)
    assert taken.status_code == 409
    assert "already have a configuration called 'plan a'" in taken.json()["error"]["message"]
    rename = api.put(f"{BASE}/{second['id']}", json={"name": "PLAN A"}, headers=maria)
    assert rename.status_code == 409
    # Renaming to its own name in another case is fine.
    assert (
        api.put(f"{BASE}/{first['id']}", json={"name": "PLAN A"}, headers=maria).status_code == 200
    )

    sql(
        "INSERT INTO hcr_configurations (id, owner_id, scenario_name, name) "
        "SELECT gen_random_uuid(), u.id, 'northwestern_med', 'Filler ' || n "
        "FROM users AS u, generate_series(1, :fillers) AS n WHERE u.username = 'maria'",
        fillers=MAX_CONFIGURATIONS - 2,
    )
    full = api.post(BASE, json={"name": "One too many"}, headers=maria)
    assert full.status_code == 409
    assert "delete one first" in full.json()["error"]["message"]


def test_no_admin_or_old_routes(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    users("root", Role.ADMIN)
    admin = bearer(api, "root")
    old = "/api/v1/scenarios/northwestern_med/hcr"
    assert api.get(old, headers=admin).status_code == 404
    assert (
        api.get("/api/v1/admin/scenarios/northwestern_med/hcr-defaults", headers=admin).status_code
        == 404
    )
    # The rules are a jsonb array (migration 0007_hcr_configurations).
    assert sql(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_name = 'hcr_configurations' AND column_name = 'rules'"
    ) == [("jsonb",)]
    assert sql("SELECT to_regclass('harvest_control_rules')") == [(None,)]
