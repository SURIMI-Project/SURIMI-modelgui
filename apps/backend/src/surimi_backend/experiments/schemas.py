"""Request and response models for experiments and the queue."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, Field

from surimi_backend.experiments.models import ExperimentStatus, SimulationState
from surimi_backend.hcr.schemas import HcrIn

ExperimentSort = Literal["created_at", "-created_at", "name", "-name", "status", "-status"]


class ExperimentIn(BaseModel):
    name: str = Field(min_length=1, max_length=200, examples=["Hake and sardine HCR, to 2030"])
    scenario_name: str = Field(
        min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_\-]+$", examples=["northwestern_med"]
    )
    end_date_time: AwareDatetime = Field(
        description="After the contract's start and not after its maximum end",
        examples=["2030-12-01T00:00:00Z"],
    )
    is_mse_run: bool = Field(
        default=False,
        description="MSE: the controller runs CONTROLLER_MSE_SIMULATIONS simulations, one Ecopath "
        "pod each",
    )
    climate_scenario: str | None = Field(
        default=None,
        description="Required, and one of the catalog's climate_scenarios, when the scenario "
        "lists any; must be empty otherwise",
        examples=["RCP_4.5"],
    )
    harvest_control_rules: list[HcrIn] | None = Field(
        default=None,
        description="Biomass in kg, sent as given. Omitted: the rules of hcr_configuration_id, "
        "or none. An empty list sends none",
        examples=[
            [
                {
                    "species_code": "HKE",
                    "life_stage": "adult",
                    "biomass_limit_kg": 4000000,
                    "biomass_base_kg": 16000000,
                    "f_max": 0.3,
                }
            ]
        ],
    )
    hcr_configuration_id: uuid.UUID | None = Field(
        default=None,
        description="One of your HCR configurations for this scenario: its rules are copied "
        "into the request. Not together with harvest_control_rules",
    )


class ExperimentCloneIn(BaseModel):
    """Changes for the copy; anything omitted is taken from the original."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    end_date_time: AwareDatetime | None = None
    is_mse_run: bool | None = None
    climate_scenario: str | None = None
    harvest_control_rules: list[HcrIn] | None = None


class SimulationOut(BaseModel):
    """One simulation of the experiment on the controller: one for a normal run,
    `NR_OF_MSE_RUNS` (5) for an MSE run, run in parallel, one Ecopath pod each."""

    id: uuid.UUID = Field(description="The controller's simulation id")
    order: int
    status: SimulationState
    status_raw: str = Field(description="The controller's own string", examples=["Running"])
    progress: float = Field(description="0..1 for this simulation; 1 once Finished")
    start_date_time: datetime | None
    end_date_time: datetime | None
    simulation_current: datetime | None = Field(description="Month the model has reached")
    simulation_started: datetime | None
    duration: timedelta | None
    ecology_host: str | None
    status_since: datetime


class ExperimentOut(BaseModel):
    id: uuid.UUID = Field(description="Also the controller's experiment_id")
    name: str
    scenario_name: str
    owner_id: uuid.UUID
    owner_username: str | None = None
    status: ExperimentStatus
    controller_status_raw: str | None
    is_mse_run: bool
    pods_required: int = Field(
        description="Ecopath pods the run takes (ADR 0015): one per simulation, so also how "
        "many simulations it has (5 for an MSE run, 1 otherwise)"
    )
    simulation_counts: dict[str, int] = Field(
        default_factory=dict,
        description="How many of its simulations the controller reports in each state "
        "(initialising, initialised, running, finished, failed, cancelled, unknown); "
        "zeros left out, empty before the first report",
        examples=[{"initialising": 2, "initialised": 3}],
    )
    priority: int
    queue_position: int | None = Field(default=None, description="While queued: 1 = next")
    estimated_start_at: datetime | None = Field(
        default=None,
        description="While queued: from the median duration of recent runs of the same "
        "scenario and kind; null when unknown or next",
    )
    progress: float | None = Field(description="0..1")
    stalled: bool
    stalled_reason: str | None
    error: str | None
    end_date_time: str | None
    climate_scenario: str | None
    outputs_state: str | None = None
    cloned_from_id: uuid.UUID | None
    created_at: datetime
    queued_at: datetime
    submitted_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None = Field(
        description="When the run ended on the controller, or failed, or was cancelled"
    )
    completed_at: datetime | None = Field(
        description="When the results were in the bucket and indexed (status completed)"
    )
    cancel_requested_at: datetime | None


class EventOut(BaseModel):
    id: int
    type: str = Field(examples=["experiment.status_changed"])
    data: dict[str, Any]
    at: datetime


class ExperimentDetailOut(ExperimentOut):
    request: dict[str, Any] = Field(
        description="What was sent; harvest control rule biomass in kg, as on the wire"
    )
    protocol_version: str
    initial_hcr_snapshot_id: uuid.UUID | None = Field(
        description="The controller's initial HCR data when it was submitted (ADR 0028), at "
        "GET /api/v1/experiments/{id}/initial-hcr-data; null when the controller did not "
        "answer then"
    )
    simulations: list[SimulationOut]
    events: list[EventOut] = Field(description="The 50 newest")


class ExperimentPage(BaseModel):
    items: list[ExperimentOut]
    total: int
    page: int
    size: int


class EventPage(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    size: int


class QueueOut(BaseModel):
    paused: bool
    pods_total: int
    pods_in_use: int | None = Field(
        description="From the controller's own list; null when it cannot be reached"
    )
    queued_total: int
    items: list[ExperimentOut] = Field(description="Your queued experiments, in dispatch order")


class InFlightOut(BaseModel):
    experiment_id: str
    managed: bool = Field(description="False: started outside this app (Bruno, other tools)")
    owner_username: str | None
    name: str | None
    scenario_name: str
    pods: int = Field(description="Simulations that hold (or may hold) an Ecopath pod")
    statuses: dict[str, int] = Field(examples=[{"Running": 1}])
    leaked: bool = Field(
        description="Holds pods in Error: the controller frees them only on restart"
    )
    stalled: bool


class AdminQueueOut(BaseModel):
    paused: bool
    pods_total: int
    pods_in_use: int | None
    pods_free: int | None
    queued: list[ExperimentOut] = Field(description="Every queued experiment in dispatch order")
    in_flight: list[InFlightOut]
    controller_error: str | None = None


class PriorityIn(BaseModel):
    priority: int = Field(ge=-100, le=100, examples=[10])


class AdoptIn(BaseModel):
    owner_id: uuid.UUID
    name: str | None = Field(default=None, min_length=1, max_length=200)


class HcrConfigurationSummaryOut(BaseModel):
    id: uuid.UUID
    name: str = Field(examples=["Cautious hake and tuna"])
    rule_count: int = Field(examples=[2])
    updated_at: datetime


class SpeciesOptionOut(BaseModel):
    """One species entry of the scenario's contract."""

    species_code: str = Field(examples=["BFT"])
    life_stage: str = Field(examples=[""])
    hcr_eligible: bool = Field(
        description="Whether it can carry a harvest control rule: the fisheries authority has "
        "recruitment, initial quota and quota share settings for it (ADR 0017). A rule on any "
        "other entry is refused",
        examples=[True],
    )
    species_name: str | None = Field(examples=["Atlantic bluefin tuna"])
    scientific_name: str | None = Field(examples=["Thunnus thynnus"])
    functional_group: str | None = Field(examples=["35"])
    functional_group_name: str | None = Field(examples=["Bluefin tuna"])
    initial_biomass_kg: float | None = Field(
        description="GetInitialHCRData: biomass at the end of spin-up, kg; null when the "
        "controller has none for this scenario or this entry",
        examples=[647973.51],
    )
    initial_fishing_mortality: float | None = Field(
        description="GetInitialHCRData, per year; 0 when the species is not caught; null "
        "when the controller has no initial values for the entry",
        examples=[0.1736],
    )
    default_biomass_limit_kg: float | None = Field(
        description="The controller's default biomass limit, kg, to prefill a new rule "
        "with (ADR 0027); null when it has none",
        examples=[6768.0],
    )
    default_biomass_base_kg: float | None = Field(
        description="The controller's default biomass base, kg; null when it has none",
        examples=[27072.0],
    )
    default_f_max: float | None = Field(
        description="The controller's default maximum fishing mortality; null when it has none",
        examples=[0.6217],
    )


class ExperimentOptionsOut(BaseModel):
    """Everything the experiment form needs for one scenario."""

    scenario_name: str = Field(examples=["northwestern_med"])
    start_date_time: datetime | None = Field(description="The end date must be after this")
    maximum_end_date_time: datetime | None = Field(description="The end date may not pass this")
    climate_scenarios: list[str] = Field(examples=[["RCP_2.6", "RCP_4.5", "RCP_8.5"]])
    climate_scenario_required: bool
    pods_single_run: int = Field(examples=[1])
    pods_mse_run: int = Field(
        description="Ecopath pods an MSE run takes: CONTROLLER_MSE_SIMULATIONS", examples=[5]
    )
    species: list[SpeciesOptionOut] = Field(
        description="Every species entry of the contract, in catalog order, with hcr_eligible"
    )
    hcr_configurations: list[HcrConfigurationSummaryOut] = Field(
        description="Your saved HCR configurations for the scenario, by name; their rules "
        "are at GET /api/v1/scenarios/{name}/hcr-configurations/{id}"
    )
    initial_values_available: bool
    initial_hcr_snapshot_id: uuid.UUID | None = Field(
        description="The snapshot of the controller's initial HCR data these values come "
        "from (ADR 0028); null when the controller did not answer"
    )
    notes: list[str]
