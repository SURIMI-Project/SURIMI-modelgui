"""Per-scenario catalog: what each contract entry is, its names, its member
species and whether it can carry a harvest control rule (ADR 0017, 0029).

The controller contract lists entries only as `species_code` + `life_stage`.
An entry is either a species, named from the `species` table (FAO ASFIS), or
a functional group, named from the scenario's catalog data
(`catalog/scenario_data.py`), whose code is what the controller receives and
whose members are FAO species. Nothing is made up: a name the sources lack is
null. `build_catalog` merges both with the live contract: the contract
decides what exists, the rest adds what it does not say.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from surimi_backend.catalog.scenario_data import Group, ScenarioData
from surimi_backend.catalog.schemas import (
    OUTPUT_METRICS,
    EntryKind,
    FleetOut,
    Level,
    LocationOut,
    MemberSpeciesOut,
    ScenarioCatalogOut,
    SpeciesEntryOut,
)

if TYPE_CHECKING:
    from surimi_backend.catalog.species import SpeciesRow


def _key(code: str, life_stage: str) -> tuple[str, str]:
    """Life stages are compared case-insensitively: the contract writes
    `adult`, the fisheries authority files `ADULT`."""
    return code, life_stage.strip().lower()


def _contract_entries(contract: Mapping[str, Any]) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for item in contract.get("items", {}).get("species", []):
        code = str(item.get("species_code", ""))
        stage = str(item.get("life_stage", ""))
        if code and _key(code, stage) not in seen:
            seen.add(_key(code, stage))
            entries.append((code, stage))
    return entries


def _members(group: Group, names: Mapping[str, SpeciesRow]) -> list[MemberSpeciesOut]:
    out: list[MemberSpeciesOut] = []
    for s in group.species:
        row = names.get(s.species_code)
        out.append(
            MemberSpeciesOut(
                species_code=s.species_code,
                species_name=row.name if row else None,
                scientific_name=row.scientific_name if row else None,
                name_in_source=s.name_in_source,
                cmsy_group=s.cmsy_group,
                cmsy_stock_id=s.cmsy_stock_id,
            )
        )
    return out


@dataclass(frozen=True, slots=True)
class EntryNames:
    """What the catalog adds to an entry the controller names only by code
    and life stage (plan 2026-11-23, requirement 11; ADR 0029)."""

    kind: EntryKind
    species_name: str | None  # a group's name for a functional group
    scientific_name: str | None
    family: str | None
    members: list[MemberSpeciesOut]
    hcr_eligible: bool


def _empty(scenario_name: str) -> ScenarioData:
    return ScenarioData(scenario_name=scenario_name)


def name_entries(
    data: ScenarioData | None,
    names: Mapping[str, SpeciesRow],
    entries: Iterable[tuple[str, str]],
) -> list[EntryNames]:
    """Kind, names, members and HCR eligibility of any `(species_code,
    life_stage)`, in or outside the contract, in the order given. Unknown:
    None and False. A group is matched by its code whatever the life stage."""
    data = data or _empty("-")
    groups = {g.code: g for g in data.groups}
    eligible = {_key(c, s) for c, s in data.hcr_eligible}
    out: list[EntryNames] = []
    for code, stage in entries:
        group = groups.get(code)
        row = None if group else names.get(code)
        out.append(
            EntryNames(
                kind="functional_group" if group else "species",
                species_name=group.name if group else (row.name if row else None),
                scientific_name=row.scientific_name if row else None,
                family=row.family if row else None,
                members=_members(group, names) if group else [],
                hcr_eligible=_key(code, stage) in eligible,
            )
        )
    return out


def _species(
    entries: list[tuple[str, str]], data: ScenarioData, names: Mapping[str, SpeciesRow]
) -> list[SpeciesEntryOut]:
    named = name_entries(data, names, entries)
    species: list[SpeciesEntryOut] = []
    for (code, stage), n in zip(entries, named, strict=True):
        row = None if n.kind == "functional_group" else names.get(code)
        species.append(
            SpeciesEntryOut(
                species_code=code,
                life_stage=stage,
                kind=n.kind,
                name=n.species_name,
                scientific_name=n.scientific_name,
                family=n.family,
                order_or_higher_taxa=row.order_or_higher_taxa if row else None,
                isscaap_group=row.isscaap_group if row else None,
                hcr_eligible=n.hcr_eligible,
                members=n.members,
            )
        )
    return species


def _levels() -> tuple[list[Level], dict[str, Level]]:
    """Every metric is read per contract entry (ADR 0029): a functional group
    is an entry of the outputs' species axis, not a set of them."""
    return ["species"], dict.fromkeys(OUTPUT_METRICS, "species")


def species_codes(contract: Mapping[str, Any], data: ScenarioData | None) -> set[str]:
    """The codes whose `species` rows a catalog needs: the contract's (less
    its groups), the members' and the HCR-eligible entries'."""
    codes = {code for code, _ in _contract_entries(contract)}
    if data:
        codes -= {g.code for g in data.groups}
        codes |= data.member_codes()
        codes |= {
            code for code, _ in data.hcr_eligible if code not in {g.code for g in data.groups}
        }
    return codes


def _drift(
    entries: list[tuple[str, str]],
    data: ScenarioData,
    names: Mapping[str, SpeciesRow] | None,
) -> list[str]:
    drift: list[str] = []
    in_contract = {_key(c, s) for c, s in entries}
    codes = {c for c, _ in entries}
    group_codes = {g.code for g in data.groups}
    missing_groups = [g for g in data.groups if g.code not in codes]
    for g in missing_groups:
        label = f"{g.code} ({g.name})" if g.name else g.code
        drift.append(f"functional group {label} is not in the contract")
    missing_hcr = [(c, s) for c, s in data.hcr_eligible if _key(c, s) not in in_contract]
    if missing_hcr:
        drift.append(
            "HCR-eligible but not in the contract: "
            + ", ".join(f"{c} {s}".strip() for c, s in missing_hcr)
        )
    if names is not None:
        unnamed = sorted({c for c, _ in entries if c not in names and c not in group_codes})
        if unnamed:
            drift.append(f"in the contract but with no species row: {', '.join(unnamed)}")
        members = sorted(data.member_codes() - names.keys())
        if members:
            drift.append(f"member species with no species row: {', '.join(members)}")
    return drift


def build_catalog(
    scenario_name: str,
    contract: Mapping[str, Any],
    data: ScenarioData | None,
    names: Mapping[str, SpeciesRow] | None = None,
) -> ScenarioCatalogOut:
    """`names`: the `species` rows of the codes involved (see `species_codes`);
    None when no name source was consulted, so missing rows are not reported."""
    entries = _contract_entries(contract)
    known = data is not None
    data = data or _empty(scenario_name)
    drift = _drift(entries, data, names)
    species = _species(entries, data, names or {})
    levels, metric_levels = _levels()
    complete = known and all(s.name for s in species)
    items = contract.get("items", {})
    place = data.location
    return ScenarioCatalogOut(
        scenario_name=scenario_name,
        status="complete" if complete else "partial",
        levels=levels,
        metric_levels=metric_levels,
        species=species,
        climate_scenarios=[
            str(c["climate_scenario_code"])
            for c in items.get("climate_scenarios") or []
            if c.get("climate_scenario_code")
        ],
        fleets=[
            FleetOut(
                gear_code=str(f.get("gear_code", "")), country_code=str(f.get("country_code", ""))
            )
            for f in items.get("fleet_segments") or []
        ],
        markets=[str(m["market_code"]) for m in items.get("markets") or [] if m.get("market_code")],
        location=LocationOut(
            continent=place.continent, region=place.region, subregion=place.subregion
        ),
        notes=list(data.notes)
        if known
        else [f"The catalog has no data for {scenario_name}: entries are named from species only"],
        drift=drift,
    )
