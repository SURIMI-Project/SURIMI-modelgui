"""Species names and higher taxa (ADR 0023, step 1): the CSV format, the
shipped file, the seed into the `species` table, and `/api/v1/species`."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from surimi_backend.catalog.models import Species
from surimi_backend.catalog.repository import _order, search_condition
from surimi_backend.catalog.scenario_data import read_shipped
from surimi_backend.catalog.species import (
    SPECIES_CSV,
    CsvSpeciesLookup,
    SeedReport,
    SpeciesRow,
    format_species_csv,
    parse_species_csv,
    read_species_file,
    seed_species,
)
from surimi_backend.core.config import Settings
from surimi_backend.core.db import create_engine, create_sessionmaker
from surimi_backend.integrations.controller.fake import FAKE_CONTRACTS_DIR
from surimi_backend.users.models import User
from tests.conftest import bearer

HEADER = "species_code,name,scientific_name,family,order_or_higher_taxa,isscaap_group,source\n"

# --- the file format ------------------------------------------------------------------


def test_parse_reads_empty_cells_as_none_and_skips_blank_lines() -> None:
    rows = parse_species_csv(
        "﻿" + HEADER + "HKE,European hake,Merluccius merluccius,MERLUCCIIDAE,GADIFORMES,32,"
        "asfis\n,,,,,,\nGRM,,,,,,manual\n"
    )
    assert rows == [
        SpeciesRow(
            "HKE", "European hake", "Merluccius merluccius", "MERLUCCIIDAE", "GADIFORMES", "32"
        ),
        SpeciesRow("GRM", source="manual"),
    ]


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ("HKE,a,b,c,d,e,asfis\n", "header must be"),
        (HEADER + "HK E,,,,,,asfis\n", "line 2: species_code 'HK E' is not a code"),
        (HEADER + "HKE,,,,,,fao\n", "line 2: source must be asfis or manual"),
        (HEADER + "HKE,,,,,,asfis\nHKE,,,,,,asfis\n", "line 3: species_code HKE appears twice"),
        (HEADER + "HKE,,,asfis\n", "line 2: 4 cells, expected 7"),
    ],
)
def test_parse_refuses_a_broken_file(body: str, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        parse_species_csv(body)


def test_format_sorts_by_code_and_round_trips() -> None:
    rows = [SpeciesRow("PIL", "European pilchard", family="CLUPEIDAE"), SpeciesRow("ALB")]
    text = format_species_csv(rows)
    assert text.startswith(HEADER + "ALB,")
    assert "\r" not in text
    assert parse_species_csv(text) == sorted(rows, key=lambda r: r.species_code)


# --- the shipped file -------------------------------------------------------------------


def _needed_codes() -> set[str]:
    codes: set[str] = set()
    for path in FAKE_CONTRACTS_DIR.glob("*.json"):
        contract: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        items = contract.get("simulation", contract).get("items", {})
        codes |= {s["species_code"] for s in items.get("species", [])}
    groups: set[str] = set()
    for data in read_shipped().values():
        groups |= {g.code for g in data.groups}
        codes |= data.member_codes() | {code for code, _ in data.hcr_eligible}
    return codes - groups  # a functional group's code is not a species (ADR 0029)


def test_the_shipped_file_holds_all_of_asfis_and_every_code_in_use() -> None:
    rows = {r.species_code: r for r in read_species_file()}
    assert sum(r.source == "asfis" for r in rows.values()) == 13567  # ASFIS_sp_2024.csv
    assert _needed_codes() <= set(rows)
    hake = rows["HKE"]
    assert (hake.name, hake.family, hake.order_or_higher_taxa, hake.source) == (
        "European hake",
        "MERLUCCIIDAE",
        "GADIFORMES",
        "asfis",
    )
    # Codes ASFIS lacks: a manual row, nothing made up.
    for code in ("GRM", "OTH", "YRC"):
        assert rows[code] == SpeciesRow(code, source="manual")


def test_the_shipped_file_is_written_as_the_script_writes_it() -> None:
    raw = SPECIES_CSV.read_bytes()
    assert b"\r" not in raw
    assert raw.decode("utf-8") == format_species_csv(read_species_file())


async def test_the_csv_lookup_returns_only_known_codes() -> None:
    lookup = CsvSpeciesLookup()
    found = await lookup.get(["HKE", "NOPE"])
    assert list(found) == ["HKE"]


def test_the_catalog_carries_names_and_higher_taxa(client: TestClient) -> None:
    body = client.get("/api/v1/scenarios/northwestern_med/catalog").json()
    hake = next(s for s in body["species"] if s["species_code"] == "HKE")
    assert hake["name"] == "European hake"
    assert hake["family"] == "MERLUCCIIDAE"
    assert hake["order_or_higher_taxa"] == "GADIFORMES"
    aegean = client.get("/api/v1/scenarios/aegean_sea/catalog").json()
    assert not any("species row" in d for d in aegean["drift"])  # GRM, OTH, YRC have rows


# --- the table and the API (PostgreSQL) ------------------------------------------------


def _seed(settings: Settings, rows: list[SpeciesRow], *, update: bool = False) -> SeedReport:
    async def go() -> SeedReport:
        engine = create_engine(settings)
        try:
            async with create_sessionmaker(engine)() as db:
                return await seed_species(db, rows, update=update)
        finally:
            await engine.dispose()

    return asyncio.run(go())


@pytest.mark.integration
def test_seed_inserts_updates_and_never_deletes(
    db_settings: Settings, sql: Callable[..., list[Any]]
) -> None:
    shipped = read_species_file()
    try:
        assert _seed(db_settings, shipped).unchanged == len(shipped)  # loaded by db_env
        changed = [
            SpeciesRow("HKE", "Hake", "Merluccius merluccius", "MERLUCCIIDAE", "GADIFORMES", "32")
            if r.species_code == "HKE"
            else r
            for r in shipped
            if r.species_code != "BFT"
        ] + [SpeciesRow("T1T", source="manual")]
        # Default: missing codes only; an admin's (here: changed) row is kept.
        report = _seed(db_settings, changed)
        assert (report.inserted, report.kept, report.not_in_file) == (["T1T"], ["HKE"], ["BFT"])
        assert sql("SELECT name FROM species WHERE species_code = 'HKE'") == [("European hake",)]
        # --update overwrites.
        report = _seed(db_settings, changed, update=True)
        assert (report.inserted, report.updated) == ([], ["HKE"])
        assert sql("SELECT name FROM species WHERE species_code = 'HKE'") == [("Hake",)]
        assert sql("SELECT count(*) FROM species WHERE species_code = 'BFT'") == [(1,)]
    finally:
        sql("DELETE FROM species WHERE species_code = 'T1T'")
        _seed(db_settings, shipped, update=True)


@pytest.mark.integration
def test_species_api(api: TestClient, users: Callable[..., User]) -> None:
    users("maria")
    maria = bearer(api, "maria")

    def get(query: str) -> dict[str, Any]:
        response = api.get(f"/api/v1/species{query}", headers=maria)
        assert response.status_code == 200, response.text
        body: dict[str, Any] = response.json()
        return body

    def codes(query: str) -> list[str]:
        return [s["species_code"] for s in get(query)["items"]]

    first = get("")
    assert (first["total"], first["page"], first["size"]) == (len(read_species_file()), 1, 50)
    assert len(first["items"]) == 50
    page2 = codes("?page=2&size=50")
    assert page2[0] > first["items"][-1]["species_code"]  # sorted by code across pages

    assert codes("?code=HKE&code=BFT&code=NOPE") == ["BFT", "HKE"]

    # Word-prefix search on code, English and scientific name, ignoring case.
    assert "HKE" in codes("?q=merluc&size=200")
    assert "HKE" in codes("?q=European%20hake")
    assert codes("?q=hke") == ["HKE"]
    assert codes("?q=erluc") == []  # inside a word, never at its start
    assert codes("?q=%25%3B") == codes("")  # only punctuation: no word, no filter

    hakes = get("?family=MERLUCCIIDAE&size=200")
    assert "HKE" in [s["species_code"] for s in hakes["items"]]
    assert all(s["family"] == "MERLUCCIIDAE" for s in hakes["items"])
    assert all(s["isscaap_group"] == "32" for s in get("?isscaap_group=32&size=200")["items"])
    gadiformes = get("?order_or_higher_taxa=GADIFORMES&q=hake&size=200")["items"]
    assert gadiformes
    assert all(s["order_or_higher_taxa"] == "GADIFORMES" for s in gadiformes)

    # Sorting: by code (default), English or scientific name, either way; ties by code.
    assert codes("?q=hake&sort=-species_code&size=200") == sorted(
        codes("?q=hake&size=200"), reverse=True
    )
    by_name = get("?q=hake&sort=name&size=200")["items"]
    keys = [(s["name"], s["species_code"]) for s in by_name]
    assert keys == sorted(keys)
    by_latin = get("?family=MERLUCCIIDAE&sort=-scientific_name&size=200")["items"]
    latin = [s["scientific_name"] for s in by_latin]
    assert latin == sorted(latin, reverse=True)
    assert get("?sort=name&size=1")["items"][0]["name"] is not None  # unnamed rows last
    assert get("?sort=-name&size=1")["items"][0]["name"] is None  # and first descending
    assert api.get("/api/v1/species?sort=family", headers=maria).status_code == 422

    assert api.get("/api/v1/species?size=201", headers=maria).status_code == 422
    one = api.get("/api/v1/species/HKE", headers=maria)
    assert one.json() == {
        "species_code": "HKE",
        "name": "European hake",
        "scientific_name": "Merluccius merluccius",
        "family": "MERLUCCIIDAE",
        "order_or_higher_taxa": "GADIFORMES",
        "isscaap_group": "32",
        "source": "asfis",
    }
    assert api.get("/api/v1/species/NOPE", headers=maria).status_code == 404
    assert api.get("/api/v1/species/bad code", headers=maria).status_code == 422


def _plan(settings: Settings, statement: Any) -> str:
    """EXPLAIN of a query, with sequential scans priced out, so the plan shows
    whether an index can serve it at all (on a small table the planner may
    still prefer a scan, which is fine)."""

    async def go() -> str:
        engine = create_engine(settings)
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SET enable_seqscan = off"))
                compiled = statement.compile(
                    dialect=engine.dialect, compile_kwargs={"literal_binds": True}
                )
                rows = await conn.execute(text(f"EXPLAIN {compiled}"))
                return "\n".join(r[0] for r in rows)
        finally:
            await engine.dispose()

    return asyncio.run(go())


@pytest.mark.integration
def test_the_search_and_filters_can_use_their_indexes(db_settings: Settings) -> None:
    condition = search_condition("european hake")
    assert condition is not None
    assert "species_search_idx" in _plan(db_settings, select(Species).where(condition))
    for column, index in (
        (Species.family, "species_family_idx"),
        (Species.order_or_higher_taxa, "species_order_or_higher_taxa_idx"),
        (Species.isscaap_group, "species_isscaap_group_idx"),
    ):
        assert index in _plan(db_settings, select(Species).where(column == "X")), index
    by_code = select(Species).where(Species.species_code.in_(["HKE", "BFT"]))
    assert "species_pkey" in _plan(db_settings, by_code)
    for sort, index in (
        ("name", "species_name_idx"),
        ("-name", "species_name_idx"),
        ("-scientific_name", "species_scientific_name_idx"),
    ):
        page = select(Species).order_by(*_order(sort)).limit(50)
        assert index in _plan(db_settings, page), sort


def test_species_need_a_signed_in_user(anonymous_client: TestClient) -> None:
    assert anonymous_client.get("/api/v1/species").status_code == 401
    assert anonymous_client.get("/api/v1/species/HKE").status_code == 401


def test_a_path_outside_the_data_folder_is_read_by_the_lookup(tmp_path: Path) -> None:
    path = tmp_path / "species.csv"
    path.write_text(HEADER + "XXA,Test fish,,,,,manual\n", encoding="utf-8", newline="\n")
    assert asyncio.run(CsvSpeciesLookup(path).get(["XXA"]))["XXA"].name == "Test fish"
