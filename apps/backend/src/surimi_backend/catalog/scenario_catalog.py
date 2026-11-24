"""Per-scenario catalog: functional groups, species names, HCR eligibility and
output levels (ADR 0017, ADR 0023).

The controller contract lists species only as `species_code` + `life_stage`.
Which Ecopath group each one belongs to, the group's name, and whether a
harvest control rule can be set for it come from the partners' files, copied
into `catalog/data/<scenario>.json` by
`apps/backend/scripts/build_scenario_catalog.py`. Species names and higher
taxa come from the `species` table (`catalog/species.py`). Nothing is made up:
a name the sources do not have is null. `build_catalog` merges both with the
live contract: the contract decides what exists, the rest adds what it does
not say.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from surimi_backend.catalog.schemas import (
    OUTPUT_METRICS,
    FleetOut,
    FunctionalGroupOut,
    Level,
    ScenarioCatalogOut,
    SpeciesEntryOut,
    SpeciesRefOut,
)

if TYPE_CHECKING:
    from surimi_backend.catalog.species import SpeciesRow

CATALOG_DATA_DIR = Path(__file__).parent / "data"
CATALOG_FORMAT_VERSION = 1


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SpeciesRef(_Strict):
    species_code: str = Field(min_length=1)
    life_stage: str = ""


class GroupFile(_Strict):
    key: str = Field(min_length=1)
    name: str | None = None
    name_source: Literal["ewe_model", "manual"] | None = None
    members: list[SpeciesRef] = Field(min_length=1)


class ScenarioCatalogFile(_Strict):
    """The JSON file of one scenario."""

    format_version: Literal[1]
    scenario_name: str = Field(min_length=1)
    built_from: dict[str, str] = {}
    notes: list[str] = []
    functional_groups: list[GroupFile] = []
    hcr_eligible: list[SpeciesRef] = []


def load_catalog_files(directory: Path = CATALOG_DATA_DIR) -> dict[str, ScenarioCatalogFile]:
    """Read every `<scenario>.json`. A file that does not parse stops the app:
    a wrong catalog would accept experiments the controller rejects."""
    files: dict[str, ScenarioCatalogFile] = {}
    for path in sorted(directory.glob("*.json")):
        parsed = ScenarioCatalogFile.model_validate_json(path.read_bytes())
        if parsed.scenario_name != path.stem:
            raise ValueError(f"{path.name} holds scenario {parsed.scenario_name!r}")
        files[parsed.scenario_name] = parsed
    return files


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


def _codes(refs: Iterable[SpeciesRef]) -> str:
    return ", ".join(f"{r.species_code} {r.life_stage}".strip() for r in refs)


def _group_lookup(file: ScenarioCatalogFile) -> Callable[[str, str], str | None]:
    """A member without life stage stands for every life stage of its code,
    unless another member names that life stage (as Ecopath's semantics do:
    `HKE` and `HKE juvenile` -> 26, `HKE adult` -> 27)."""
    exact: dict[tuple[str, str], str] = {}
    by_code: dict[str, str] = {}
    for group in file.functional_groups:
        for member in group.members:
            exact[_key(member.species_code, member.life_stage)] = group.key
            if not member.life_stage:
                by_code[member.species_code] = group.key

    def group_of(code: str, stage: str) -> str | None:
        return exact.get(_key(code, stage)) or (by_code.get(code) if stage else None)

    return group_of


def _species(
    entries: list[tuple[str, str]],
    file: ScenarioCatalogFile,
    names: Mapping[str, SpeciesRow],
) -> list[SpeciesEntryOut]:
    group_of = _group_lookup(file)
    eligible = {_key(r.species_code, r.life_stage) for r in file.hcr_eligible}
    species: list[SpeciesEntryOut] = []
    for code, stage in entries:
        row = names.get(code)
        species.append(
            SpeciesEntryOut(
                species_code=code,
                life_stage=stage,
                name=row.name if row else None,
                scientific_name=row.scientific_name if row else None,
                family=row.family if row else None,
                order_or_higher_taxa=row.order_or_higher_taxa if row else None,
                isscaap_group=row.isscaap_group if row else None,
                functional_group=group_of(code, stage),
                hcr_eligible=_key(code, stage) in eligible,
            )
        )
    return species


@dataclass(frozen=True, slots=True)
class EntryNames:
    """What the catalog adds to a species entry the controller names only by
    code and life stage (plan 2026-11-23, requirement 11)."""

    species_name: str | None
    scientific_name: str | None
    family: str | None
    functional_group: str | None
    functional_group_name: str | None
    hcr_eligible: bool


def name_entries(
    file: ScenarioCatalogFile | None,
    names: Mapping[str, SpeciesRow],
    entries: Iterable[tuple[str, str]],
) -> list[EntryNames]:
    """Names, group and HCR eligibility of any `(species_code, life_stage)`,
    in or outside the contract, in the order given. Unknown: None and False."""
    file = file or ScenarioCatalogFile(format_version=1, scenario_name="-")
    group_of = _group_lookup(file)
    group_names = {g.key: g.name for g in file.functional_groups}
    eligible = {_key(r.species_code, r.life_stage) for r in file.hcr_eligible}
    out: list[EntryNames] = []
    for code, stage in entries:
        row = names.get(code)
        group = group_of(code, stage)
        out.append(
            EntryNames(
                species_name=row.name if row else None,
                scientific_name=row.scientific_name if row else None,
                family=row.family if row else None,
                functional_group=group,
                functional_group_name=group_names.get(group) if group else None,
                hcr_eligible=_key(code, stage) in eligible,
            )
        )
    return out


def _groups(
    file: ScenarioCatalogFile, species: list[SpeciesEntryOut], drift: list[str]
) -> list[FunctionalGroupOut]:
    members: dict[str, list[SpeciesRefOut]] = {}
    for s in species:
        if s.functional_group is not None:
            members.setdefault(s.functional_group, []).append(
                SpeciesRefOut(species_code=s.species_code, life_stage=s.life_stage)
            )
    groups: list[FunctionalGroupOut] = []
    for group in file.functional_groups:
        if group.key in members:
            groups.append(
                FunctionalGroupOut(
                    key=group.key,
                    name=group.name,
                    name_source=group.name_source,
                    members=members[group.key],
                )
            )
        else:
            label = f"{group.key} ({group.name})" if group.name else group.key
            drift.append(
                f"functional group {label}: none of {_codes(group.members)} is in the contract"
            )
    unassigned = [s for s in species if s.functional_group is None]
    if groups and unassigned:
        drift.append(
            "in the contract but in no functional group: "
            + ", ".join(f"{s.species_code} {s.life_stage}".strip() for s in unassigned)
        )
    return groups


def _levels(groups: list[FunctionalGroupOut]) -> tuple[list[Level], dict[str, Level]]:
    """Species level only where a group holds several species, so that species
    views show something groups do not. Biomass is a group value copied to each
    member species (verified on run 99c1e2a4…), so it stays at group level."""
    several_species = any(len({m.species_code for m in g.members}) > 1 for g in groups)
    levels: list[Level] = []
    if groups:
        levels.append("functional_group")
    if several_species or not groups:
        levels.append("species")
    finest: Level = "species" if "species" in levels else "functional_group"
    metric_levels: dict[str, Level] = dict.fromkeys(OUTPUT_METRICS, finest)
    if groups:
        metric_levels["biomass"] = "functional_group"
    return levels, metric_levels


def species_codes(contract: Mapping[str, Any], file: ScenarioCatalogFile | None) -> set[str]:
    """The codes whose names a catalog needs: the contract's and the file's."""
    codes = {code for code, _ in _contract_entries(contract)}
    if file:
        codes |= {m.species_code for g in file.functional_groups for m in g.members}
        codes |= {r.species_code for r in file.hcr_eligible}
    return codes


def build_catalog(
    scenario_name: str,
    contract: Mapping[str, Any],
    file: ScenarioCatalogFile | None,
    names: Mapping[str, SpeciesRow] | None = None,
) -> ScenarioCatalogOut:
    """`names`: the `species` rows of the codes involved (see `species_codes`);
    None when no name source was consulted, so missing rows are not reported."""
    entries = _contract_entries(contract)
    file = file or ScenarioCatalogFile(format_version=1, scenario_name=scenario_name)
    drift: list[str] = []
    in_contract = {_key(c, s) for c, s in entries}
    missing_hcr = [
        r for r in file.hcr_eligible if _key(r.species_code, r.life_stage) not in in_contract
    ]
    if missing_hcr:
        drift.append(f"HCR-eligible but not in the contract: {_codes(missing_hcr)}")
    if names is not None:
        unnamed = sorted({c for c, _ in entries if c not in names})
        if unnamed:
            drift.append(f"in the contract but with no species row: {', '.join(unnamed)}")
    species = _species(entries, file, names or {})
    groups = _groups(file, species, drift)
    levels, metric_levels = _levels(groups)

    items = contract.get("items", {})
    return ScenarioCatalogOut(
        scenario_name=scenario_name,
        status="complete" if groups else "partial",
        levels=levels,
        metric_levels=metric_levels,
        functional_groups=groups,
        species=species,
        climate_scenarios=[
            str(c["climate_scenario_code"])
            for c in items.get("climate_scenarios", [])
            if c.get("climate_scenario_code")
        ],
        fleets=[
            FleetOut(
                gear_code=str(f.get("gear_code", "")), country_code=str(f.get("country_code", ""))
            )
            for f in items.get("fleet_segments", [])
        ],
        markets=[str(m["market_code"]) for m in items.get("markets", []) if m.get("market_code")],
        built_from=dict(file.built_from),
        notes=list(file.notes),
        drift=drift,
    )
