"""An experiment's stored request to what the controller takes.

The request is kept as sent: harvest control rule biomass in kg, the unit of
the API, the database and the gRPC request alike (ADR 0022; the controller
takes kg, **Confirmed by the controller team, 2026-10-16**). No unit is converted here.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from surimi_backend.integrations.controller.base import (
    ExperimentSubmission,
    TargetFishingMortality,
)


def to_submission(experiment_id: str, request: dict[str, Any]) -> ExperimentSubmission:
    """`request` is the `experiments.request` JSON: `scenario_name`,
    `end_date_time` (ISO 8601), `is_mse_run`, `climate_scenario` and
    `harvest_control_rules` with `biomass_limit_kg`, `biomass_base_kg`, `f_max`."""
    return ExperimentSubmission(
        experiment_id=experiment_id,
        scenario_name=request["scenario_name"],
        end_date_time=datetime.fromisoformat(request["end_date_time"]),
        is_mse_run=bool(request["is_mse_run"]),
        climate_scenario=request.get("climate_scenario") or "",
        target_fishing_mortalities=tuple(
            TargetFishingMortality(
                species_code=rule["species_code"],
                life_stage=rule.get("life_stage", ""),
                biomass_limit_kg=float(rule["biomass_limit_kg"]),
                biomass_base_kg=float(rule["biomass_base_kg"]),
                f_max=float(rule["f_max"]),
            )
            for rule in request.get("harvest_control_rules", [])
        ),
    )
