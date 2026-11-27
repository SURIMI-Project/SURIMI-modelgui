"""Scenario catalog tables (ADR 0030): seeding, the database source, the
admin import and export of a scenario's functional groups."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.catalog.group_import import GroupImportOptions, convert, parse_groups
from surimi_backend.catalog.scenario_data import (
    DbScenarioData,
    ScenarioData,
    read_shipped,
    seed_catalog,
)
from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.users.models import Role, User
from tests.conftest import bearer

PARTNER_CSV = (
    Path(__file__).parents[1] / "scripts" / "sources" / ("aegean_sea_species_functional_groups.csv")
)
URL = "/api/v1/admin/scenarios/aegean_sea/groups"
CSV = {"Content-Type": "text/csv"}


def _sorted(data: ScenarioData) -> ScenarioData:
    return ScenarioData(
        scenario_name=data.scenario_name,
        notes=data.notes,
        location=data.location,
        groups=tuple(sorted(data.groups, key=lambda g: g.code)),
        hcr_eligible=tuple(sorted(data.hcr_eligible)),
    )


def _seed(settings: Settings, *, update: bool) -> list[str]:
    async def go() -> list[str]:
        engine = create_engine(settings)
        try:
            async with create_sessionmaker(engine)() as db:
                return (await seed_catalog(db, read_shipped(), update=update)).lines()
        finally:
            await engine.dispose()

    return asyncio.run(go())


@pytest.fixture
def restore_catalog(db_settings: Settings) -> Iterator[None]:
    """Each test may change the shared tables: put the shipped catalog back."""
    yield
    _seed(db_settings, update=True)


def _admin(api: TestClient, users: Callable[..., User]) -> dict[str, str]:
    users("ada", Role.ADMIN)
    return bearer(api, "ada")


# --- no database ----------------------------------------------------------------------


def test_the_partner_list_imports_without_a_mapping() -> None:
    parsed = parse_groups(PARTNER_CSV.read_bytes(), GroupImportOptions())
    assert parsed.errors == []
    assert parsed.warnings == []
    assert parsed.mapping == {
        "group_code": "Stock",
        "group_name": "GroupMICE",
        "species_code": "Species",
        "name_in_source": "Name",
        "cmsy_group": "GroupCMSY",
        "cmsy_stock_id": "SpecCode",
        "continent": "Continent",
        "region": "Region",
        "subregion": "Subregion",
        "scientific_name": "ScientificName",
    }
    assert len(parsed.rows) == 50


def test_the_shipped_groups_file_is_the_partner_list_converted() -> None:
    shipped = Path(__file__).parents[1] / "src/surimi_backend/catalog/data/catalog"
    expected = (shipped / "aegean_sea.groups.csv").read_text(encoding="utf-8")
    options = GroupImportOptions(default_name_source="model_team")
    assert convert(PARTNER_CSV.read_bytes(), options) == expected


# --- PostgreSQL ------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.usefixtures("restore_catalog")
def test_seed_loads_the_shipped_files_once(db_settings: Settings) -> None:
    # The session fixture already seeded: a second run keeps every scenario.
    assert _seed(db_settings, update=False) == [
        "inserted none; replaced none; kept as they are aegean_sea, anchovy_bay, "
        "northwestern_med (use --update to replace them from the files)"
    ]
    assert _seed(db_settings, update=True)[0].startswith(
        "inserted none; replaced aegean_sea, anchovy_bay, northwestern_med"
    )

    async def load() -> dict[str, ScenarioData | None]:
        engine = create_engine(db_settings)
        try:
            source = DbScenarioData(create_sessionmaker(engine))
            return {name: await source.get(name) for name in read_shipped()}
        finally:
            await engine.dispose()

    loaded = asyncio.run(load())
    for name, data in read_shipped().items():
        found = loaded[name]
        assert found is not None
        assert _sorted(found) == _sorted(data), name


@pytest.mark.integration
def test_the_catalog_endpoint_reads_the_tables(api: TestClient, users: Callable[..., User]) -> None:
    users("mia")
    body = api.get("/api/v1/scenarios/aegean_sea/catalog", headers=bearer(api, "mia")).json()
    entries = {s["species_code"]: s for s in body["species"]}
    assert sorted(entries) == ["CCR1", "CCR2", "DF1", "DF2", "DF3", "PF1", "PF2"]
    assert entries["DF2"]["name"] == "Demersal fish 2"
    assert len(entries["DF2"]["members"]) == 14
    assert body["drift"] == []


@pytest.mark.integration
@pytest.mark.usefixtures("restore_catalog")
def test_import_dry_run_then_apply(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    admin = _admin(api, users)
    partner = PARTNER_CSV.read_bytes()

    same = api.post(
        f"{URL}/import?name_source=model_team", content=partner, headers={**admin, **CSV}
    )
    assert same.status_code == 200, same.text
    report = same.json()
    assert (report["dry_run"], report["applied"], report["errors"]) == (True, False, [])
    assert (report["groups"]["count"], report["species"]) == (7, 50)
    assert (report["added"]["count"], report["removed"]["count"], report["changed"]["count"]) == (
        0,
        0,
        0,
    )

    # Hake moves to a new group DF9; CCR2 is gone.
    lines = partner.decode().splitlines()
    edited = [lines[0]] + [
        line.replace(",DF2,Hake,", ",DF9,Hake,").replace(
            "Demersal fish 2,DF9", "Demersal fish 9,DF9"
        )
        for line in lines[1:]
        if ",CCR2," not in line
    ]
    body = ("\n".join(edited) + "\n").encode()
    applied = api.post(
        f"{URL}/import?dry_run=false&name_source=model_team", content=body, headers={**admin, **CSV}
    )
    assert applied.status_code == 200, applied.text
    report = applied.json()
    assert report["applied"] is True
    assert (report["added"]["codes"], report["removed"]["codes"], report["changed"]["codes"]) == (
        ["DF9"],
        ["CCR2"],
        ["DF2"],
    )
    assert "groups not in the contract: DF9" in report["warnings"]
    assert sql(
        "SELECT group_code FROM catalog_group_species "
        "WHERE scenario_name = 'aegean_sea' AND species_code = 'HKE'"
    ) == [("DF9",)]
    assert sql("SELECT count(*) FROM catalog_groups WHERE group_code = 'CCR2'") == [(0,)]
    assert sql("SELECT count(*) FROM audit_events WHERE action = 'catalog.groups_imported'") == [
        (1,)
    ]
    # The catalog is rebuilt at once: DF9 is not in the contract, CCR2 is no group.
    catalog = api.get("/api/v1/scenarios/aegean_sea/catalog", headers=admin).json()
    assert "functional group DF9 (Demersal fish 9) is not in the contract" in catalog["drift"]
    ccr2 = next(s for s in catalog["species"] if s["species_code"] == "CCR2")
    assert (ccr2["kind"], ccr2["name"]) == ("species", None)


@pytest.mark.integration
@pytest.mark.usefixtures("restore_catalog")
def test_an_apply_with_errors_changes_nothing(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    admin = _admin(api, users)
    body = b"group_code,group_name,species_code\nDF2,Demersal fish 2,HKE\nDF2,Demersal fish 2,ZZZ\n"
    response = api.post(f"{URL}/import?dry_run=false", content=body, headers={**admin, **CSV})
    assert response.status_code == 422
    [error] = response.json()["error"]["details"]["errors"]
    assert (error["line"], error["message"]) == (
        3,
        "species_code ZZZ is not in the species table: add it first",
    )
    assert sql("SELECT count(*) FROM catalog_groups WHERE scenario_name = 'aegean_sea'") == [(7,)]


@pytest.mark.integration
def test_a_differing_scientific_name_is_a_warning(
    api: TestClient, users: Callable[..., User]
) -> None:
    admin = _admin(api, users)
    body = b"Stock,GroupMICE,Species,ScientificName\nDF2,Demersal fish 2,HKE,Gadus morhua\n"
    report = api.post(f"{URL}/import", content=body, headers={**admin, **CSV}).json()
    assert report["errors"] == []
    assert (
        "line 2: HKE is 'Merluccius merluccius' in the species table, 'Gadus morhua' in the file"
        in report["warnings"]
    )


@pytest.mark.integration
def test_export_imports_back_unchanged(api: TestClient, users: Callable[..., User]) -> None:
    admin = _admin(api, users)
    exported = api.get(f"{URL}/export.csv", headers=admin)
    assert exported.status_code == 200
    assert 'filename="aegean_sea.groups.csv"' in exported.headers["content-disposition"]
    report = api.post(f"{URL}/import", content=exported.content, headers={**admin, **CSV}).json()
    assert report["errors"] == []
    assert (report["species"], report["changed"]["count"]) == (50, 0)
    # A scenario without groups exports only the header.
    empty = api.get("/api/v1/admin/scenarios/northwestern_med/groups/export.csv", headers=admin)
    assert empty.text.count("\n") == 1


@pytest.mark.integration
def test_roles_type_and_unknown_scenarios(api: TestClient, users: Callable[..., User]) -> None:
    admin = _admin(api, users)
    body = b"group_code,species_code\nDF2,HKE\n"
    assert api.post(f"{URL}/import", content=body, headers=admin).status_code == 415
    unknown = "/api/v1/admin/scenarios/atlantis/groups"
    assert api.post(f"{unknown}/import", content=body, headers={**admin, **CSV}).status_code == 404
    assert api.get(f"{unknown}/export.csv", headers=admin).status_code == 404
    users("mia")
    member = bearer(api, "mia")
    assert api.post(f"{URL}/import", content=body, headers={**member, **CSV}).status_code == 403
    assert api.get(f"{URL}/export.csv", headers=member).status_code == 403
    assert api.get(f"{URL}/export.csv").status_code == 401


@pytest.mark.integration
def test_a_species_replace_cannot_delete_a_group_member(
    api: TestClient, users: Callable[..., User]
) -> None:
    # OCM (musky octopus) is only in the Aegean groups.
    admin = _admin(api, users)
    everything = api.get("/api/v1/admin/species/export.csv", headers=admin).text
    without = "\n".join(line for line in everything.splitlines() if not line.startswith("OCM,"))
    report = api.post(
        "/api/v1/admin/species/import?mode=replace",
        content=without.encode(),
        headers={**admin, **CSV},
    ).json()
    assert [e["message"] for e in report["errors"]] == [
        "cannot delete 1 code(s) still used by a catalog, an HCR or a contract: OCM"
    ]
