"""Request and response models for harvest control rules (biomass in kg, ADR 0022)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

# The protocol's bounds (`buf.validate` on `surimi.v1.TargetFishingMortality`,
# SURIMI-protocol `250f617`): biomass in (0, 3.3e12] kg, f_max in (0, 100].
# The limit and the base are not compared: a base at or below the limit is a
# valid all-or-nothing rule in the fisheries authority (see the HCR README).
MAX_BIOMASS_KG = 3.3e12
MAX_F = 100.0
# More than any scenario has HCR-eligible entries (northwestern_med: 6).
MAX_RULES = 200
# Configurations per user and scenario: keeps the list answer small.
MAX_CONFIGURATIONS = 50

SpeciesCode = Field(min_length=1, max_length=20, pattern=r"^[A-Za-z0-9_]+$", examples=["HKE"])


class HcrValues(BaseModel):
    biomass_limit_kg: float = Field(
        gt=0, le=MAX_BIOMASS_KG, description="Kilograms, at most 3.3e12", examples=[4000000.0]
    )
    biomass_base_kg: float = Field(
        gt=0,
        le=MAX_BIOMASS_KG,
        description=(
            "Kilograms, at most 3.3e12. Normally above the limit; at or below it the rule "
            "is all-or-nothing: f_max above the limit, no fishing at or below it"
        ),
        examples=[16000000.0],
    )
    f_max: float = Field(gt=0, le=MAX_F, description="At most 100", examples=[0.3])


class HcrIn(HcrValues):
    species_code: str = SpeciesCode
    life_stage: str = Field(
        default="",
        max_length=30,
        description="As in the catalog; empty when the species has no life stage. "
        "Compared case-insensitively",
        examples=["adult"],
    )


class HcrRuleOut(BaseModel):
    species_code: str = Field(examples=["HKE"])
    life_stage: str = Field(examples=["adult"])
    biomass_limit_kg: float = Field(examples=[4000000.0])
    biomass_base_kg: float = Field(examples=[16000000.0])
    f_max: float = Field(examples=[0.3])
    eligible: bool = Field(
        description="False when the scenario's catalog no longer accepts an HCR for this "
        "entry; such a rule is kept but refused when an experiment is submitted",
        examples=[True],
    )
    species_name: str | None = Field(examples=["European hake"])
    functional_group: str | None = Field(
        description="Key of the entry's functional group", examples=["27"]
    )


class HcrConfigurationIn(BaseModel):
    """A named set of rules for one scenario."""

    name: str = Field(
        min_length=1,
        max_length=100,
        description="Unique among your configurations for the scenario, compared without case",
        examples=["Cautious hake and tuna"],
    )
    rules: list[HcrIn] = Field(
        default_factory=list,
        max_length=MAX_RULES,
        description="Biomass in kg. One rule per species entry; may be empty",
    )

    @field_validator("name")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class HcrConfigurationOut(BaseModel):
    id: uuid.UUID
    scenario_name: str = Field(examples=["northwestern_med"])
    name: str = Field(examples=["Cautious hake and tuna"])
    rules: list[HcrRuleOut]
    created_at: datetime
    updated_at: datetime


class HcrConfigurationListOut(BaseModel):
    scenario_name: str = Field(examples=["northwestern_med"])
    configurations: list[HcrConfigurationOut] = Field(
        description="Yours for the scenario, by name; empty when you saved none (there are "
        "no scenario defaults, ADR 0024)"
    )
