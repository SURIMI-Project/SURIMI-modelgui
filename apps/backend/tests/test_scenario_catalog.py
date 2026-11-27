"""Scenario catalog (ADR 0017, 0029, 0030): entries as species or functional
groups, the shipped files, the endpoint."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.catalog.scenario_catalog import build_catalog, name_entries, species_codes
from surimi_backend.catalog.scenario_data import (
    GROUP_COLUMNS,
    Group,
    GroupSpecies,
    Location,
    ScenarioData,
    build_groups,
    format_groups_csv,
    read_shipped,
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


HAKE = SpeciesRow(
    species_code="HKE",
    name="European hake",
    scientific_name="Merluccius merluccius",
    family="MERLUCCIIDAE",
    order_or_higher_taxa="GADIFORMES",
    isscaap_group="32",
)
WHITING = SpeciesRow(
    species_code="WHB", name="Blue whiting(=Poutassou)", scientific_name="Micromesistius poutassou"
)
NAMES = {"HKE": HAKE, "WHB": WHITING}

DF2 = Group(
    code="DF2",
    name="Demersal fish 2",
    name_source="model_team",
    species=(
        GroupSpecies("HKE", "Hake", "Large demersal fishes", "Hake_Aegean_Sea"),
        GroupSpecies("WHB", "Blue whiting", "Large demersal fishes", "Blue whiting_Aegean_Sea"),
    ),
)


def data(
    *groups: Group, hcr: tuple[tuple[str, str], ...] = (), notes: tuple[str, ...] = ("a gap",)
) -> ScenarioData:
    return ScenarioData(
        scenario_name="s",
        notes=notes,
        location=Location("Europe", "Mediterranean Sea", "Aegean Sea"),
        groups=groups,
        hcr_eligible=hcr,
    )


def test_a_contract_entry_that_is_a_group_carries_its_name_and_members() -> None:
    result = build_catalog("s", contract(("DF2", "")), data(DF2, hcr=(("DF2", ""),)), NAMES)
    [entry] = result.species
    assert (entry.kind, entry.name, entry.scientific_name, entry.hcr_eligible) == (
        "functional_group",
        "Demersal fish 2",
        None,
        True,
    )
    assert [(m.species_code, m.species_name, m.name_in_source) for m in entry.members] == [
        ("HKE", "European hake", "Hake"),
        ("WHB", "Blue whiting(=Poutassou)", "Blue whiting"),
    ]
    assert entry.members[0].cmsy_stock_id == "Hake_Aegean_Sea"
    assert entry.functional_group is None
    assert result.functional_groups == []
    assert result.status == "complete"
    assert result.drift == []
    assert result.location.subregion == "Aegean Sea"


def test_a_species_entry_is_named_from_the_species_table() -> None:
    result = build_catalog("s", contract(("HKE", "adult")), data(hcr=(("HKE", "adult"),)), NAMES)
    [hake] = result.species
    assert (hake.kind, hake.name, hake.family, hake.isscaap_group, hake.members) == (
        "species",
        "European hake",
        "MERLUCCIIDAE",
        "32",
        [],
    )
    assert hake.hcr_eligible


def test_life_stages_match_case_insensitively_and_keep_the_contract_spelling() -> None:
    result = build_catalog("s", contract(("HKE", "Adult")), data(hcr=(("HKE", "adult"),)))
    assert result.species[0].hcr_eligible
    assert result.species[0].life_stage == "Adult"


def test_name_entries_names_groups_species_and_unknown_codes() -> None:
    named = name_entries(
        data(DF2, hcr=(("DF2", ""),)), NAMES, [("DF2", ""), ("HKE", "adult"), ("XYZ", "")]
    )
    assert [(n.kind, n.species_name, n.hcr_eligible, len(n.members)) for n in named] == [
        ("functional_group", "Demersal fish 2", True, 2),
        ("species", "European hake", False, 0),
        ("species", None, False, 0),
    ]


def test_name_entries_without_catalog_data_gives_species_names_only() -> None:
    [only] = name_entries(None, {"HKE": HAKE}, [("HKE", "adult")])
    assert (only.kind, only.species_name, only.hcr_eligible) == ("species", "European hake", False)


def test_drift_is_reported_not_hidden() -> None:
    result = build_catalog(
        "s", contract(("HKE", ""), ("GRM", "")), data(DF2, hcr=(("SAA", ""),)), {"HKE": HAKE}
    )
    assert result.drift == [
        "functional group DF2 (Demersal fish 2) is not in the contract",
        "HCR-eligible but not in the contract: SAA",
        "in the contract but with no species row: GRM",
        "member species with no species row: WHB",
    ]
    assert [s.species_code for s in result.species] == ["HKE", "GRM"]
    assert result.status == "partial"  # GRM has no name
    assert result.notes == ["a gap"]


def test_the_codes_a_catalog_needs_names_for_skip_group_codes() -> None:
    codes = species_codes(contract(("DF2", ""), ("BFT", "")), data(DF2, hcr=(("SAA", ""),)))
    assert codes == {"BFT", "HKE", "WHB", "SAA"}


def test_every_metric_is_served_per_entry() -> None:
    result = build_catalog("s", contract(("DF2", "")), data(DF2))
    assert result.levels == ["species"]
    assert set(result.metric_levels.values()) == {"species"}


def test_without_catalog_data_the_contract_is_served_with_a_note() -> None:
    result = build_catalog("s", contract(("HKE", ""), climate=("RCP_4.5",)), None)
    assert result.status == "partial"
    assert result.species[0].name is None
    assert result.notes == ["The catalog has no data for s: entries are named from species only"]
    assert result.climate_scenarios == ["RCP_4.5"]
    assert result.fleets[0].gear_code == "OTB"
    assert result.markets == ["ES"]


def test_a_null_climate_scenario_list_is_empty() -> None:
    # The Aegean contract on project-surimi sends climate_scenarios: null (2026-11-27).
    raw = contract(("DF2", ""))
    raw["items"]["climate_scenarios"] = None
    assert build_catalog("s", raw, data(DF2)).climate_scenarios == []


# --- the groups format ----------------------------------------------------------------


def row(group: str, species: str, **values: str) -> dict[str, str | None]:
    return {"group_code": group, "species_code": species, "group_name": f"Group {group}", **values}


def test_groups_from_rows_are_sorted_and_keep_the_location() -> None:
    place = {"continent": "Europe", "region": "Mediterranean Sea", "subregion": "Aegean Sea"}
    built = build_groups(
        [
            (2, row("PF1", "ANE", **place)),
            (3, row("DF2", "HKE", **place)),
            (4, row("PF1", "PIL", **place)),
        ]
    )
    assert built.errors == []
    assert [(g.code, [s.species_code for s in g.species]) for g in built.groups] == [
        ("DF2", ["HKE"]),
        ("PF1", ["ANE", "PIL"]),
    ]
    assert built.location == Location("Europe", "Mediterranean Sea", "Aegean Sea")


@pytest.mark.parametrize(
    ("rows", "message"),
    [
        ([(2, row("DF2", "HKE")), (3, row("DF3", "HKE"))], "also on line 2"),
        (
            [(2, row("DF2", "HKE")), (3, row("DF2", "WHB", group_name="Other"))],
            "group_name differs",
        ),
        ([(2, row("DF 2", "HKE"))], "is not a code"),
        ([(2, row("DF2", ""))], "species_code '' is not a code"),
        ([(2, row("DF2", "HKE", name_source="ewe"))], "name_source must be"),
        (
            [(2, row("DF2", "HKE", region="A")), (3, row("DF2", "WHB", region="B"))],
            "one place per scenario",
        ),
    ],
)
def test_bad_group_rows_are_refused(
    rows: list[tuple[int, dict[str, str | None]]], message: str
) -> None:
    built = build_groups(rows)
    assert built.errors
    assert message in built.errors[0][1]


def test_the_groups_format_round_trips() -> None:
    text = format_groups_csv(data(DF2))
    assert text.splitlines()[0] == ",".join(GROUP_COLUMNS)
    lines = [
        (i, dict(zip(GROUP_COLUMNS, cells.split(","), strict=True)))
        for i, cells in enumerate(text.splitlines()[1:], start=2)
    ]
    assert build_groups(lines).groups == [DF2]


# --- the shipped files ----------------------------------------------------------------


def test_the_shipped_catalog_loads() -> None:
    shipped = read_shipped()
    assert set(shipped) == {"aegean_sea", "anchovy_bay", "northwestern_med"}
    aegean = shipped["aegean_sea"]
    assert [g.code for g in aegean.groups] == ["CCR1", "CCR2", "DF1", "DF2", "DF3", "PF1", "PF2"]
    assert sum(len(g.species) for g in aegean.groups) == 50
    assert all(g.name and g.name_source == "model_team" for g in aegean.groups)
    assert sorted(c for c, _ in aegean.hcr_eligible) == sorted(g.code for g in aegean.groups)
    assert shipped["northwestern_med"].groups == ()
    assert shipped["anchovy_bay"].groups == ()
    assert len(shipped["northwestern_med"].hcr_eligible) == 6


def test_a_groups_file_for_an_unknown_scenario_is_refused(tmp_path: Path) -> None:
    (tmp_path / "scenarios.csv").write_text("scenario_name,notes\ns,\n", encoding="utf-8")
    (tmp_path / "hcr_eligible.csv").write_text(
        "scenario_name,species_code,life_stage\n", encoding="utf-8"
    )
    (tmp_path / "x.groups.csv").write_text(",".join(GROUP_COLUMNS) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match=r"x.groups.csv: scenario not in scenarios.csv"):
        read_shipped(tmp_path)


# --- the endpoint ---------------------------------------------------------------------


def test_northwestern_med_catalog_has_species_only(
    client: TestClient, fake_controller: FakeControllerClient
) -> None:
    client.get("/api/v1/scenarios/northwestern_med/contract")
    response = client.get("/api/v1/scenarios/northwestern_med/catalog")
    assert response.status_code == 200
    body = response.json()
    assert body["levels"] == ["species"]
    assert body["functional_groups"] == []
    assert len(body["species"]) == 92
    assert {s["kind"] for s in body["species"]} == {"species"}
    assert all(s["functional_group"] is None and s["members"] == [] for s in body["species"])
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
    assert body["notes"] == []
    # The catalog reuses the cached contract.
    assert fake_controller.calls["GetSimulationContract"] == 1


def test_aegean_sea_catalog_has_its_seven_groups(client: TestClient) -> None:
    body = client.get("/api/v1/scenarios/aegean_sea/catalog").json()
    assert body["status"] == "complete"
    assert body["drift"] == []
    assert body["climate_scenarios"] == []
    entries = {s["species_code"]: s for s in body["species"]}
    assert sorted(entries) == ["CCR1", "CCR2", "DF1", "DF2", "DF3", "PF1", "PF2"]
    assert all(s["kind"] == "functional_group" and s["hcr_eligible"] for s in entries.values())
    df2 = entries["DF2"]
    assert df2["name"] == "Demersal fish 2"
    assert len(df2["members"]) == 14
    hake = next(m for m in df2["members"] if m["species_code"] == "HKE")
    assert hake == {
        "species_code": "HKE",
        "species_name": "European hake",
        "scientific_name": "Merluccius merluccius",
        "name_in_source": "Hake",
        "cmsy_group": "Large demersal fishes",
        "cmsy_stock_id": "Hake_Aegean_Sea",
    }
    assert body["location"] == {
        "continent": "Europe",
        "region": "Mediterranean Sea",
        "subregion": "Aegean Sea",
    }


def test_unknown_scenario_catalog_is_404(client: TestClient) -> None:
    assert client.get("/api/v1/scenarios/atlantis/catalog").status_code == 404


def test_catalog_needs_a_signed_in_user(anonymous_client: TestClient) -> None:
    assert anonymous_client.get("/api/v1/scenarios/anchovy_bay/catalog").status_code == 401
