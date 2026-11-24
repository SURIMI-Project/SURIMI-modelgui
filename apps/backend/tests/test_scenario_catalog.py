"""Scenario catalog (ADR 0017): merge rules, the generated files, the endpoint."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.catalog.scenario_catalog import (
    EntryNames,
    ScenarioCatalogFile,
    build_catalog,
    load_catalog_files,
    name_entries,
    species_codes,
)
from surimi_backend.catalog.species import SpeciesRow
from surimi_backend.integrations.controller import FakeControllerClient


def contract(*species: tuple[str, str], climate: tuple[str, ...] = ()) -> dict[str, Any]:
    return {
        "items": {
            "species": [
                {"species_code": c, **({"life_stage": s} if s else {})} for c, s in species
            ],
            "climate_scenarios": [{"climate_scenario_code": c} for c in climate],
            "fleet_segments": [{"gear_code": "OTB", "country_code": "ESP", "model": "EwE"}],
            "markets": [{"market_code": "ES"}],
        }
    }


def catalog_file(
    groups: list[dict[str, Any]], hcr: list[dict[str, str]] | None = None
) -> ScenarioCatalogFile:
    return ScenarioCatalogFile.model_validate(
        {
            "format_version": 1,
            "scenario_name": "s",
            "notes": ["a known gap"],
            "functional_groups": groups,
            "hcr_eligible": hcr or [],
        }
    )


HAKE = SpeciesRow(
    species_code="HKE",
    name="European hake",
    scientific_name="Merluccius merluccius",
    family="MERLUCCIIDAE",
    order_or_higher_taxa="GADIFORMES",
    isscaap_group="32",
)


def group(key: str, *members: tuple[str, str], name: str | None = None) -> dict[str, Any]:
    return {
        "key": key,
        "name": name,
        "name_source": "ewe_model" if name else None,
        "members": [{"species_code": c, "life_stage": s} for c, s in members],
    }


def test_a_life_stage_member_wins_over_the_code_only_member() -> None:
    # As in northwestern_med.semantics: HKE and HKE juvenile -> 26, HKE adult -> 27.
    file = catalog_file(
        [group("26", ("HKE", ""), ("HKE", "juvenile")), group("27", ("HKE", "adult"))]
    )
    result = build_catalog(
        "s", contract(("HKE", "juvenile"), ("HKE", "adult")), file, {"HKE": HAKE}
    )
    assert [(s.life_stage, s.functional_group) for s in result.species] == [
        ("juvenile", "26"),
        ("adult", "27"),
    ]
    hake = result.species[0]
    assert (hake.name, hake.family, hake.order_or_higher_taxa, hake.isscaap_group) == (
        "European hake",
        "MERLUCCIIDAE",
        "GADIFORMES",
        "32",
    )
    assert result.drift == []


def test_a_code_only_member_covers_every_life_stage() -> None:
    # As in anchovy_bay: semantics map ANE, the contract has ANE juvenile and adult.
    file = catalog_file([group("7", ("ANE", ""), name="Anchovy")])
    result = build_catalog("s", contract(("ANE", "juvenile"), ("ANE", "adult")), file)
    assert {s.functional_group for s in result.species} == {"7"}
    assert len(result.functional_groups[0].members) == 2


def test_life_stages_match_case_insensitively_and_keep_the_contract_spelling() -> None:
    file = catalog_file(
        [group("27", ("HKE", "adult"))], hcr=[{"species_code": "HKE", "life_stage": "ADULT"}]
    )
    result = build_catalog("s", contract(("HKE", "Adult")), file)
    assert result.species[0].hcr_eligible
    assert result.species[0].life_stage == "Adult"


def test_name_entries_names_entries_in_and_outside_the_contract() -> None:
    # The controller's initial HCR data lists entries the contract does not
    # (`HKE` with no life stage); each gets names, group and eligibility.
    file = catalog_file(
        [
            group("26", ("HKE", ""), ("HKE", "juvenile"), name="Juvenile hake"),
            group("27", ("HKE", "adult"), name="Adult hake"),
        ],
        hcr=[{"species_code": "HKE", "life_stage": "ADULT"}],
    )
    named = name_entries(file, {"HKE": HAKE}, [("HKE", "adult"), ("HKE", ""), ("XYZ", "adult")])
    hake = {
        "species_name": "European hake",
        "scientific_name": "Merluccius merluccius",
        "family": "MERLUCCIIDAE",
    }
    unknown = dict.fromkeys(hake) | {"functional_group": None, "functional_group_name": None}
    assert named == [
        EntryNames(
            **hake, functional_group="27", functional_group_name="Adult hake", hcr_eligible=True
        ),
        EntryNames(
            **hake,
            functional_group="26",
            functional_group_name="Juvenile hake",
            hcr_eligible=False,
        ),
        EntryNames(**unknown, hcr_eligible=False),  # no species row, no group
    ]


def test_name_entries_without_a_catalog_file_gives_names_only() -> None:
    [only] = name_entries(None, {"HKE": HAKE}, [("HKE", "adult")])
    assert (only.species_name, only.functional_group, only.hcr_eligible) == (
        "European hake",
        None,
        False,
    )


def test_a_group_without_a_name_stays_unnamed() -> None:
    result = build_catalog("s", contract(("HKE", "")), catalog_file([group("1", ("HKE", ""))]))
    assert result.functional_groups[0].name is None
    assert result.functional_groups[0].name_source is None


def test_drift_is_reported_not_hidden() -> None:
    file = catalog_file(
        [group("1", ("HKE", "")), group("2", ("HUW", ""), ("GRW", ""), name="Whales")],
        hcr=[{"species_code": "SAA", "life_stage": ""}],
    )
    result = build_catalog("s", contract(("HKE", ""), ("SWO", "")), file)
    assert [g.key for g in result.functional_groups] == ["1"]
    assert result.drift == [
        "HCR-eligible but not in the contract: SAA",
        "functional group 2 (Whales): none of HUW, GRW is in the contract",
        "in the contract but in no functional group: SWO",
    ]
    assert [s.species_code for s in result.species] == ["HKE", "SWO"]
    assert result.notes == ["a known gap"]


def test_a_contract_code_without_a_species_row_is_drift() -> None:
    result = build_catalog("s", contract(("HKE", ""), ("GRM", "")), None, {"HKE": HAKE})
    assert result.drift == ["in the contract but with no species row: GRM"]
    assert [s.name for s in result.species] == ["European hake", None]


def test_the_codes_a_catalog_needs_names_for() -> None:
    file = catalog_file([group("1", ("HUW", ""))], hcr=[{"species_code": "SAA", "life_stage": ""}])
    assert species_codes(contract(("HKE", "adult")), file) == {"HKE", "HUW", "SAA"}


def test_levels_when_groups_hold_several_species() -> None:
    file = catalog_file([group("14", ("FAM", ""), ("SKM", ""))])
    result = build_catalog("s", contract(("FAM", ""), ("SKM", "")), file)
    assert result.status == "complete"
    assert result.levels == ["functional_group", "species"]
    assert result.metric_levels["biomass"] == "functional_group"
    assert result.metric_levels["gross_catch"] == "species"


def test_levels_when_each_group_is_one_species() -> None:
    file = catalog_file([group("7", ("ANE", ""))])
    result = build_catalog("s", contract(("ANE", "juvenile"), ("ANE", "adult")), file)
    assert result.levels == ["functional_group"]
    assert set(result.metric_levels.values()) == {"functional_group"}


def test_without_a_file_the_contract_is_served_at_species_level() -> None:
    result = build_catalog("s", contract(("HKE", ""), climate=("RCP_4.5",)), None)
    assert result.status == "partial"
    assert result.levels == ["species"]
    assert result.metric_levels["biomass"] == "species"
    assert result.species[0].name is None
    assert result.climate_scenarios == ["RCP_4.5"]
    assert result.fleets[0].gear_code == "OTB"
    assert result.markets == ["ES"]


def test_the_shipped_files_load_and_name_every_group_from_a_model() -> None:
    files = load_catalog_files()
    assert set(files) == {"aegean_sea", "anchovy_bay", "northwestern_med"}
    for scenario in ("anchovy_bay", "northwestern_med"):
        groups = files[scenario].functional_groups
        assert groups
        assert all(g.name and g.name_source == "ewe_model" for g in groups), scenario


def test_a_file_named_for_another_scenario_is_refused(tmp_path: Path) -> None:
    (tmp_path / "x.json").write_text(
        '{"format_version": 1, "scenario_name": "y"}', encoding="utf-8"
    )
    with pytest.raises(ValueError, match="holds scenario 'y'"):
        load_catalog_files(tmp_path)


def test_northwestern_med_catalog(
    client: TestClient, fake_controller: FakeControllerClient
) -> None:
    client.get("/api/v1/scenarios/northwestern_med/contract")
    response = client.get("/api/v1/scenarios/northwestern_med/catalog")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert body["levels"] == ["functional_group", "species"]
    assert body["metric_levels"]["biomass"] == "functional_group"
    assert len(body["functional_groups"]) == 42
    groups = {g["key"]: g for g in body["functional_groups"]}
    assert groups["14"]["name"] == "Other shrimps"
    assert [m["species_code"] for m in groups["14"]["members"]] == ["FAM", "LKO", "LKT", "SKM"]
    assert groups["27"]["name"] == "Adult hake"
    assert len(body["species"]) == 92
    eligible = sorted(
        (s["species_code"], s["life_stage"]) for s in body["species"] if s["hcr_eligible"]
    )
    assert eligible == [
        ("BFT", ""),
        ("BOG", ""),
        ("HKE", "adult"),
        ("HKE", "juvenile"),
        ("MUT", "adult"),
        ("PIL", "adult"),
    ]
    assert body["climate_scenarios"] == ["RCP_2.6", "RCP_4.5", "RCP_8.5"]
    assert body["drift"] == ["in the contract but in no functional group: SWO, VMA"]
    assert body["notes"] == []
    # The catalog reuses the cached contract.
    assert fake_controller.calls["GetSimulationContract"] == 1


def test_anchovy_bay_has_only_functional_groups(client: TestClient) -> None:
    body = client.get("/api/v1/scenarios/anchovy_bay/catalog").json()
    assert body["levels"] == ["functional_group"]
    assert [(g["key"], g["name"]) for g in body["functional_groups"]] == [("7", "Anchovy")]
    assert len(body["drift"]) == 6


def test_aegean_sea_is_partial_at_species_level(client: TestClient) -> None:
    body = client.get("/api/v1/scenarios/aegean_sea/catalog").json()
    assert body["status"] == "partial"
    assert body["levels"] == ["species"]
    assert body["functional_groups"] == []
    assert body["climate_scenarios"] == []
    assert len(body["species"]) == 271
    assert any("functional groups unknown" in n for n in body["notes"])


def test_unknown_scenario_catalog_is_404(client: TestClient) -> None:
    assert client.get("/api/v1/scenarios/atlantis/catalog").status_code == 404


def test_catalog_needs_a_signed_in_user(anonymous_client: TestClient) -> None:
    assert anonymous_client.get("/api/v1/scenarios/anchovy_bay/catalog").status_code == 401
