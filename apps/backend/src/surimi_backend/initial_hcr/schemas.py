"""Responses of the initial HCR data routes (ADR 0027, 0028). Biomass in kg
(ADR 0022). A default of 0 from the controller means "no default" and is
served as null, since 0 is outside the protocol's bounds for a rule; snapshots
keep the 0."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from surimi_backend.catalog.schemas import DEPRECATED, KIND_DESCRIPTION, EntryKind, MemberSpeciesOut


class InitialHcrEntryOut(BaseModel):
    """One species entry of `GetInitialHCRData`, named from the catalog."""

    species_code: str = Field(examples=["HKE"])
    life_stage: str = Field(
        description="As the controller spells it; empty when none", examples=["adult"]
    )
    length_class: str = Field(description="Empty when the controller sends none", examples=[""])
    age: str = Field(description="Empty when the controller sends none", examples=[""])
    kind: EntryKind = Field(description=KIND_DESCRIPTION, examples=["species"])
    species_name: str | None = Field(
        description="species: English name from the `species` table (FAO ASFIS); "
        "functional_group: the group's name. Null when unknown",
        examples=["European hake"],
    )
    scientific_name: str | None = Field(examples=["Merluccius merluccius"])
    family: str | None = Field(examples=["MERLUCCIIDAE"])
    functional_group: str | None = Field(
        default=None,
        description="Deprecated, always null (ADR 0029): see `kind` and `members`",
        examples=[None],
        json_schema_extra=DEPRECATED,
    )
    functional_group_name: str | None = Field(
        default=None,
        description="Deprecated, always null (ADR 0029): a group's name is in `species_name`",
        examples=[None],
        json_schema_extra=DEPRECATED,
    )
    members: list[MemberSpeciesOut] = Field(
        default_factory=list,
        description="The species of a functional group; empty for a species entry",
    )
    hcr_eligible: bool = Field(
        description="Whether a rule may be set on it (the fisheries authority has its "
        "inputs, ADR 0017). The controller lists more entries than are eligible",
        examples=[True],
    )
    initial_biomass_kg: float = Field(
        description="Biomass at the end of the scenario's spin-up, kg", examples=[414734.75]
    )
    initial_fishing_mortality: float = Field(
        description="Gross catch of the last 12 spin-up months / initial biomass, per year; "
        "0 when the species was not caught",
        examples=[0.0912],
    )
    default_biomass_limit_kg: float | None = Field(
        description="The controller's default biomass limit (no catch below it), kg; null "
        "when it has none",
        examples=[15983.46],
    )
    default_biomass_base_kg: float | None = Field(
        description="The controller's default biomass base (f_max above it), kg; null when "
        "it has none",
        examples=[63933.86],
    )
    default_f_max: float | None = Field(
        description="The controller's default maximum fishing mortality; null when it has none",
        examples=[0.2352],
    )


class InitialHcrDataOut(BaseModel):
    """One answer of the controller, live or from a snapshot."""

    scenario_name: str = Field(examples=["northwestern_med"])
    snapshot_id: uuid.UUID = Field(
        description="The snapshot equal to this answer (ADR 0028): the same id until the "
        "controller's values change"
    )
    first_seen_at: datetime = Field(description="When these exact values were first seen")
    entries: list[InitialHcrEntryOut]


class InitialHcrSnapshotSummaryOut(BaseModel):
    id: uuid.UUID
    content_hash: str = Field(
        description="SHA-256 of the entries; equal hashes, equal values",
        examples=["9f2c41e0a7b3d5c6e8f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7"],
    )
    entry_count: int = Field(examples=[91])
    first_seen_at: datetime


class InitialHcrHistoryOut(BaseModel):
    scenario_name: str = Field(examples=["northwestern_med"])
    snapshots: list[InitialHcrSnapshotSummaryOut] = Field(
        description="Every distinct answer seen for the scenario, newest first"
    )


class RuleAgainstDefaultOut(BaseModel):
    """A rule the experiment sent, next to the default it could start from."""

    species_code: str = Field(examples=["HKE"])
    life_stage: str = Field(examples=["adult"])
    biomass_limit_kg: float = Field(examples=[20000.0])
    biomass_base_kg: float = Field(examples=[63933.86])
    f_max: float = Field(examples=[0.2352])
    default_biomass_limit_kg: float | None = Field(examples=[15983.46])
    default_biomass_base_kg: float | None = Field(examples=[63933.86])
    default_f_max: float | None = Field(examples=[0.2352])
    changed_from_default: bool | None = Field(
        description="True when any of the three values differs from the default; null when "
        "the snapshot has no default for the entry",
        examples=[True],
    )


class ExperimentInitialHcrOut(BaseModel):
    experiment_id: uuid.UUID
    initial_hcr_data: InitialHcrDataOut = Field(
        description="What the controller answered when the experiment was submitted"
    )
    rules: list[RuleAgainstDefaultOut]
