"""Admin species import and export (docs/features/scenario-catalog, step 2)."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from surimi_backend.catalog.species import read_species_file, seed_species
from surimi_backend.catalog.species_import import ImportOptions, parse_import, parse_mapping
from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.core.errors import InvalidInputError
from surimi_backend.users.models import Role, User
from tests.conftest import bearer, csrf, login
from tests.test_species import _needed_codes

ASFIS_HEADER = (
    "ISSCAAP_Group ,Taxonomic_Code,Alpha3_Code,Scientific_Name,English_name,French_name,"
    "Family,Order or higher taxa\n"
)
URL = "/api/v1/admin/species/import"
CSV = {"Content-Type": "text/csv"}

# --- parsing and mapping, no database ---------------------------------------------------


def test_an_asfis_file_maps_itself() -> None:
    data = (
        "﻿" + ASFIS_HEADER + "32,1480071018,HKE,Merluccius merluccius,European hake,"
        "Merlu,MERLUCCIIDAE,GADIFORMES\n"
    ).encode()
    parsed = parse_import(data, ImportOptions())
    assert parsed.errors == []
    assert parsed.mapping == {
        "species_code": "Alpha3_Code",
        "name": "English_name",
        "scientific_name": "Scientific_Name",
        "family": "Family",
        "order_or_higher_taxa": "Order or higher taxa",
        "isscaap_group": "ISSCAAP_Group",
    }
    assert parsed.rows == [
        {
            "species_code": "HKE",
            "name": "European hake",
            "scientific_name": "Merluccius merluccius",
            "family": "MERLUCCIIDAE",
            "order_or_higher_taxa": "GADIFORMES",
            "isscaap_group": "32",
            "source": "manual",
        }
    ]
    assert any("Taxonomic_Code" in w and "French_name" in w for w in parsed.warnings)


def test_an_explicit_mapping_and_another_delimiter() -> None:
    data = b"Code;Common name;Kind\nGRM;Grey mullets;asfis\n"
    options = ImportOptions(
        mapping=parse_mapping(["species_code:Code", "name:common NAME", "source:Kind"]),
        delimiter=";",
    )
    parsed = parse_import(data, options)
    assert parsed.errors == []
    assert parsed.rows == [{"species_code": "GRM", "name": "Grey mullets", "source": "asfis"}]


@pytest.mark.parametrize(
    ("data", "options", "message"),
    [
        (b"a,b\n1,2\n", ImportOptions(), "no file column for species_code"),
        (b"Code\nHKE\n", ImportOptions(mapping={"colour": "Code"}), "unknown table column"),
        (b"Code\nHKE\n", ImportOptions(mapping={"species_code": "Nope"}), "no column 'Nope'"),
        (b"species_code\nHK E\n", ImportOptions(), "line 2: species_code 'HK E' is not a code"),
        (
            b"species_code\nHKE\nHKE\n",
            ImportOptions(),
            "line 3: species_code HKE is also on line 2",
        ),
        (b"species_code,source\nHKE,fao\n", ImportOptions(), "source must be asfis or manual"),
        (b"species_code,name\nHKE,a,b\n", ImportOptions(), "line 2: 3 cells, the header has 2"),
        (b"species_code,name\nHKE," + b"x" * 301 + b"\n", ImportOptions(), "over 300 characters"),
        ("species_code\nHKE\n".encode("utf-16"), ImportOptions(), "not UTF-8"),
        (b"", ImportOptions(), "empty or has no header"),
    ],
)
def test_parse_reports_errors(data: bytes, options: ImportOptions, message: str) -> None:
    parsed = parse_import(data, options)
    text = [f"line {e.line}: {e.message}" if e.line else e.message for e in parsed.errors]
    assert any(message in t for t in text), text


def test_a_mapping_without_a_colon_is_refused() -> None:
    with pytest.raises(InvalidInputError):
        parse_mapping(["species_code"])
    assert parse_mapping(["name:Name: English"]) == {"name": "Name: English"}


def test_an_empty_header_leaves_a_column_unmapped() -> None:
    data = b"species_code,name,family\nHKE,European hake,MERLUCCIIDAE\n"
    parsed = parse_import(data, ImportOptions(mapping=parse_mapping(["family:"])))
    assert parsed.mapping == {"species_code": "species_code", "name": "name"}
    assert parsed.rows == [{"species_code": "HKE", "name": "European hake", "source": "manual"}]


# --- the endpoints (PostgreSQL) ----------------------------------------------------------


@pytest.fixture
def restore_species(db_settings: Settings, sql: Callable[..., list[Any]]) -> Iterator[None]:
    """Each test may change the shared table: put the shipped rows back."""
    yield
    sql("DELETE FROM species WHERE species_code LIKE 'T1%'")

    async def go() -> None:
        engine = create_engine(db_settings)
        try:
            async with create_sessionmaker(engine)() as db:
                await seed_species(db, read_species_file(), update=True)
        finally:
            await engine.dispose()

    asyncio.run(go())


def _admin(api: TestClient, users: Callable[..., User]) -> dict[str, str]:
    users("ada", Role.ADMIN)
    return bearer(api, "ada")


@pytest.mark.integration
@pytest.mark.usefixtures("restore_species")
def test_upsert_dry_run_then_apply(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    admin = _admin(api, users)
    body = b"species_code,name\nHKE,Hake (edited)\nT1A,Test fish\n"

    dry = api.post(URL, content=body, headers={**admin, **CSV})
    assert dry.status_code == 200, dry.text
    report = dry.json()
    assert (report["dry_run"], report["applied"]) == (True, False)
    assert (report["inserted"]["codes"], report["updated"]["codes"]) == (["T1A"], ["HKE"])
    assert sql("SELECT name FROM species WHERE species_code = 'HKE'") == [("European hake",)]

    applied = api.post(f"{URL}?dry_run=false", content=body, headers={**admin, **CSV})
    assert applied.status_code == 200, applied.text
    assert applied.json()["applied"] is True
    # Only the mapped column changed; source and the taxa stayed.
    assert sql("SELECT name, family, source FROM species WHERE species_code = 'HKE'") == [
        ("Hake (edited)", "MERLUCCIIDAE", "asfis")
    ]
    assert sql("SELECT source FROM species WHERE species_code = 'T1A'") == [("manual",)]
    assert sql("SELECT count(*) FROM audit_events WHERE action = 'species.imported'") == [(1,)]


@pytest.mark.integration
@pytest.mark.usefixtures("restore_species")
def test_an_apply_with_errors_changes_nothing(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    admin = _admin(api, users)
    body = b"species_code,name\nT1B,Fine\nbad code,Broken\n"
    response = api.post(f"{URL}?dry_run=false", content=body, headers={**admin, **CSV})
    assert response.status_code == 422
    details = response.json()["error"]["details"]
    assert details["errors"][0]["line"] == 3
    assert sql("SELECT count(*) FROM species WHERE species_code = 'T1B'") == [(0,)]


@pytest.mark.integration
@pytest.mark.usefixtures("restore_species")
def test_replace_deletes_but_never_a_code_in_use(
    api: TestClient, users: Callable[..., User], sql: Callable[..., list[Any]]
) -> None:
    admin = _admin(api, users)
    sql("INSERT INTO species (species_code, source) VALUES ('T1C', 'manual')")
    everything = api.get("/api/v1/admin/species/export.csv", headers=admin).text

    # The whole table minus T1C: replace deletes T1C only.
    without = "\n".join(line for line in everything.splitlines() if not line.startswith("T1C,"))
    response = api.post(
        f"{URL}?mode=replace&dry_run=false", content=without.encode(), headers={**admin, **CSV}
    )
    assert response.status_code == 200, response.text
    assert response.json()["deleted"]["codes"] == ["T1C"]
    assert sql("SELECT count(*) FROM species WHERE species_code = 'T1C'") == [(0,)]

    # Without HKE (in the NW Med catalog and contract) the file is refused.
    without_hake = "\n".join(
        line for line in everything.splitlines() if not line.startswith(("HKE,", "T1C,"))
    )
    refused = api.post(
        f"{URL}?mode=replace", content=without_hake.encode(), headers={**admin, **CSV}
    )
    assert refused.status_code == 200  # dry run: the errors are in the report
    messages = [e["message"] for e in refused.json()["errors"]]
    assert messages == [
        "cannot delete 1 code(s) still used by a catalog, an HCR or a contract: HKE"
    ]

    # A one-row file would delete every code in use: one error, with the count.
    only_one = b"species_code,name\nT1D,Lonely fish\n"
    [message] = [
        e["message"]
        for e in api.post(f"{URL}?mode=replace", content=only_one, headers={**admin, **CSV}).json()[
            "errors"
        ]
    ]
    assert message.startswith("cannot delete ")
    # Every code the contracts and the catalog use (a group's code is no species row).
    assert int(message.split()[2]) == len(_needed_codes())


@pytest.mark.integration
def test_export_imports_back_unchanged(api: TestClient, users: Callable[..., User]) -> None:
    admin = _admin(api, users)
    exported = api.get("/api/v1/admin/species/export.csv", headers=admin)
    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert 'filename="species.csv"' in exported.headers["content-disposition"]
    report = api.post(URL, content=exported.content, headers={**admin, **CSV}).json()
    assert report["errors"] == []
    assert (report["inserted"]["count"], report["updated"]["count"]) == (0, 0)
    assert report["unchanged"] == len(read_species_file())


@pytest.mark.integration
def test_limits_type_and_roles(
    api: TestClient, users: Callable[..., User], db_settings: Settings
) -> None:
    admin = _admin(api, users)
    assert api.post(URL, content=b"species_code\nHKE\n", headers=admin).status_code == 415
    huge = b"species_code\n" + b"T1E\n" * (db_settings.catalog_import_max_mb * 300_000)
    assert api.post(URL, content=huge, headers={**admin, **CSV}).status_code == 413

    users("mia")
    member = bearer(api, "mia")
    assert (
        api.post(URL, content=b"species_code\nHKE\n", headers={**member, **CSV}).status_code == 403
    )
    assert api.get("/api/v1/admin/species/export.csv", headers=member).status_code == 403


@pytest.mark.integration
def test_a_cookie_session_needs_the_csrf_token(api: TestClient, users: Callable[..., User]) -> None:
    """The console signs in with cookies: its import must send X-CSRF-Token."""
    users("ada", Role.ADMIN)
    assert login(api, "ada").status_code == 200
    without = api.post(URL, content=b"species_code\nHKE\n", headers=CSV)
    assert without.status_code == 403
    with_token = api.post(URL, content=b"species_code\nHKE\n", headers={**CSV, **csrf(api)})
    assert with_token.status_code == 200, with_token.text
