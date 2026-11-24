"""Response models of the scenario catalog (ADR 0017)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["functional_group", "species"]
OUTPUT_METRICS = (
    "biomass",
    "gross_catch",
    "dead_discards",
    "live_discards",
    "sales_quantity",
    "sales_value",
    "price",
)


class SpeciesRefOut(BaseModel):
    species_code: str = Field(examples=["HKE"])
    life_stage: str = Field(
        description="As spelled in the contract; empty when the species has no life stage",
        examples=["adult"],
    )


class SpeciesEntryOut(SpeciesRefOut):
    name: str | None = Field(
        description="English name from the FAO ASFIS list; null when ASFIS has none",
        examples=["European hake"],
    )
    scientific_name: str | None = Field(examples=["Merluccius merluccius"])
    family: str | None = Field(
        default=None, description="Family from the ASFIS list", examples=["MERLUCCIIDAE"]
    )
    order_or_higher_taxa: str | None = Field(
        default=None,
        description="Order, or a higher rank, as the ASFIS list spells it",
        examples=["GADIFORMES"],
    )
    isscaap_group: str | None = Field(
        description="FAO ISSCAAP group code from the ASFIS list, a standard broad category",
        examples=["32"],
    )
    functional_group: str | None = Field(
        description="Key of the functional group (Ecopath group) this entry belongs to; "
        "null when the model maps it to none",
        examples=["27"],
    )
    hcr_eligible: bool = Field(
        description="True when the fisheries authority has the inputs to apply a harvest "
        "control rule to this entry",
        examples=[True],
    )


class FunctionalGroupOut(BaseModel):
    key: str = Field(description="Ecopath group id (DBID)", examples=["27"])
    name: str | None = Field(
        description="Group name from the Ecopath model; null when the model is not available",
        examples=["Adult hake"],
    )
    name_source: Literal["ewe_model", "manual"] | None = Field(
        description="ewe_model: GroupName in the EwE model file; manual: set by hand in the "
        "catalog file; null: no name known",
        examples=["ewe_model"],
    )
    members: list[SpeciesRefOut]


class FleetOut(BaseModel):
    gear_code: str = Field(examples=["OTB"])
    country_code: str = Field(examples=["ESP"])


class ScenarioCatalogOut(BaseModel):
    scenario_name: str = Field(examples=["northwestern_med"])
    status: Literal["complete", "partial"] = Field(
        description="partial: no functional groups are known for this scenario yet; see notes",
        examples=["complete"],
    )
    levels: list[Level] = Field(
        description="Levels at which this scenario's outputs and pickers make sense",
        examples=[["functional_group", "species"]],
    )
    metric_levels: dict[str, Level] = Field(
        description="Finest level at which each output metric holds its own values. "
        "Biomass is a group value copied to each member species, so it is "
        "functional_group whenever groups exist",
        examples=[{"biomass": "functional_group", "gross_catch": "species"}],
    )
    functional_groups: list[FunctionalGroupOut]
    species: list[SpeciesEntryOut] = Field(
        description="Every species entry of the contract, in contract order"
    )
    climate_scenarios: list[str] = Field(examples=[["RCP_2.6", "RCP_4.5", "RCP_8.5"]])
    fleets: list[FleetOut]
    markets: list[str] = Field(examples=[["ES", "ESALC"]])
    built_from: dict[str, str] = Field(
        description="Sources and commits the catalog file was generated from",
        examples=[{"SURIMI-Ecopath": "156c130", "ewe_model": "SURIMI-data_preprocessing@92f4ad6"}],
    )
    notes: list[str] = Field(
        description="Known gaps of this scenario's catalog, written in the catalog file",
        examples=[["Functional groups come from a MICE model not yet published (issue #154)"]],
    )
    drift: list[str] = Field(
        description="Differences between the catalog file and the live contract; "
        "entries of the file that the contract does not have are left out",
        examples=[["functional group 2 (Whales): none of HUW, GRW is in the contract"]],
    )


# --- initial state from the controller (not part of the catalog) -----------------------


class SpeciesOut(BaseModel):
    """One species code with its names and higher taxa (`species` table)."""

    species_code: str = Field(examples=["HKE"])
    name: str | None = Field(
        description="English name from the FAO ASFIS list; null when unknown",
        examples=["European hake"],
    )
    scientific_name: str | None = Field(examples=["Merluccius merluccius"])
    family: str | None = Field(examples=["MERLUCCIIDAE"])
    order_or_higher_taxa: str | None = Field(
        description="Order, or a higher rank, as the ASFIS list spells it",
        examples=["GADIFORMES"],
    )
    isscaap_group: str | None = Field(examples=["32"])
    source: Literal["asfis", "manual"] = Field(
        description="asfis: copied from the FAO ASFIS list; manual: a code ASFIS lacks",
        examples=["asfis"],
    )


# A leading "-" sorts descending; ties are broken by species_code.
SpeciesSort = Literal[
    "species_code", "-species_code", "name", "-name", "scientific_name", "-scientific_name"
]


class SpeciesPage(BaseModel):
    items: list[SpeciesOut]
    total: int = Field(examples=[13570])
    page: int = Field(examples=[1])
    size: int = Field(examples=[50])


SpeciesImportMode = Literal["upsert", "replace"]


class ImportProblem(BaseModel):
    line: int | None = Field(description="Line of the file; null for the whole file", examples=[12])
    message: str = Field(examples=["species_code 'HK E' is not a code"])


class ImportCount(BaseModel):
    count: int = Field(examples=[3])
    codes: list[str] = Field(description="The first 50", examples=[["GRM", "HKE"]])


class SpeciesImportReport(BaseModel):
    mode: SpeciesImportMode
    dry_run: bool
    applied: bool = Field(description="True when the table was changed")
    mapping: dict[str, str] = Field(
        description="Table column -> file column used",
        examples=[{"species_code": "Alpha3_Code", "name": "English_name"}],
    )
    default_source: Literal["asfis", "manual"]
    rows_read: int
    inserted: ImportCount
    updated: ImportCount
    unchanged: int
    deleted: ImportCount
    errors: list[ImportProblem] = Field(description="Any error: nothing is changed")
    warnings: list[str]
