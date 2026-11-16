from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.auth.dependencies import current_principal
from surimi_backend.core.config import Settings
from surimi_backend.integrations.controller import (
    ControllerUnavailableError,
    FakeControllerClient,
    SimulationStatus,
)
from surimi_backend.main import create_app
from tests.conftest import fake_principal


def test_lists_scenarios_and_caches_them(
    client: TestClient, fake_controller: FakeControllerClient
) -> None:
    first = client.get("/api/v1/scenarios")
    second = client.get("/api/v1/scenarios")
    assert first.status_code == second.status_code == 200
    assert first.json() == {
        "scenarios": [{"name": "aegean_sea"}, {"name": "anchovy_bay"}, {"name": "northwestern_med"}]
    }
    assert fake_controller.calls["GetScenarioNames"] == 1


def test_contract_uses_the_proto_field_names(
    client: TestClient, fake_controller: FakeControllerClient
) -> None:
    for _ in range(2):
        response = client.get("/api/v1/scenarios/northwestern_med/contract")
    assert response.status_code == 200
    body = response.json()
    assert body["scenario_name"] == "northwestern_med"
    simulation = body["simulation"]
    assert simulation["case_study_name"] == "Northwestern Mediterranean Sea"
    assert simulation["start_date_time"] == "2013-01-01T00:00:00Z"
    assert simulation["time_step"] == "P1M"
    assert {"species_code": "HKE", "life_stage": "adult"} in simulation["items"]["species"]
    assert fake_controller.calls["GetSimulationContract"] == 1


async def test_fake_gives_a_minimal_contract_for_a_scenario_without_a_copy() -> None:
    contract = await FakeControllerClient(["atlantis"]).get_simulation_contract("atlantis")
    assert contract["case_study_name"] == "atlantis"
    assert "items" not in contract


def test_unknown_scenario_is_404_with_the_error_body(client: TestClient) -> None:
    response = client.get("/api/v1/scenarios/atlantis/contract", headers={"X-Request-ID": "r1"})
    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "scenario 'atlantis' does not exist",
            "request_id": "r1",
        }
    }


def test_scenario_name_is_validated(client: TestClient) -> None:
    assert client.get("/api/v1/scenarios/bad%20name!/contract").status_code == 422


class _DownController(FakeControllerClient):
    async def get_scenario_names(self) -> list[str]:
        raise ControllerUnavailableError("SURIMI controller at x:443 is unreachable")

    async def get_simulation_statuses(
        self, experiment_ids: Sequence[str]
    ) -> list[SimulationStatus]:
        return []

    async def get_simulation_contract(self, scenario_name: str) -> dict[str, Any]:
        raise AssertionError("not called")


def test_controller_down_is_502_with_its_code(settings: Settings) -> None:
    app = create_app(settings, controller=_DownController())
    app.dependency_overrides[current_principal] = fake_principal
    with TestClient(app) as c:
        response = c.get("/api/v1/scenarios")
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "controller_unavailable"


def test_initial_biomasses_come_from_the_controller_every_time(
    client: TestClient, fake_controller: FakeControllerClient
) -> None:
    for _ in range(2):
        response = client.get("/api/v1/scenarios/northwestern_med/initial-biomasses")
    assert response.status_code == 200
    body = response.json()
    assert body["scenario_name"] == "northwestern_med"
    rows = {(r["species_code"], r["life_stage"]): r for r in body["initial_biomasses"]}
    assert len(rows) == 91
    # The values project-surimi returned on 2026-11-12.
    assert rows["ANE", "adult"] == {
        "species_code": "ANE",
        "life_stage": "adult",
        "length_class": "",
        "age": "",
        "biomass": 123719.1598388878,
    }
    # Members of one functional group share its biomass.
    assert rows["ALB", ""]["biomass"] == rows["BON", ""]["biomass"]
    assert fake_controller.calls["GetInitialBiomasses"] == 2  # not cached


def test_initial_fishing_mortalities_match_the_controller(
    client: TestClient, fake_controller: FakeControllerClient
) -> None:
    response = client.get("/api/v1/scenarios/northwestern_med/initial-fishing-mortalities")
    assert response.status_code == 200
    rows = {
        (r["species_code"], r["life_stage"]): r["fishing_mortality"]
        for r in response.json()["initial_fishing_mortalities"]
    }
    assert rows["ANE", "adult"] == pytest.approx(4.224581647364614)
    assert rows["PIL", "adult"] == pytest.approx(7.129252471519714)
    assert rows["BON", ""] == 0.0
    assert fake_controller.calls["GetInitialFishingMortalities"] == 1


def test_initial_state_of_a_scenario_without_files_is_502(client: TestClient) -> None:
    response = client.get("/api/v1/scenarios/anchovy_bay/initial-biomasses")
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "controller_error"
    assert client.get("/api/v1/scenarios/atlantis/initial-biomasses").status_code == 404


def test_scenarios_need_a_signed_in_user(anonymous_client: TestClient) -> None:
    for path in (
        "/api/v1/scenarios",
        "/api/v1/scenarios/anchovy_bay/contract",
        "/api/v1/scenarios/northwestern_med/initial-biomasses",
        "/api/v1/scenarios/northwestern_med/initial-fishing-mortalities",
    ):
        response = anonymous_client.get(path)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "not_authenticated"
