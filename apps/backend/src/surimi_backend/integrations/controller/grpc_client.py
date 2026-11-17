"""Native gRPC client for `surimi.v1.ControllerService` (ADR 0006).

Every call has a deadline. Read-only calls are retried on UNAVAILABLE with a
short back-off; calls that change state never are, so a timeout can never
submit an experiment twice.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable, Sequence
from typing import Any, TypeVar
from urllib.parse import urlsplit

import grpc
import structlog
from google.protobuf.message import Message
from surimi.v1 import (
    controller_service_pb2_grpc,
    get_all_simulation_statuses_pb2,
    get_initial_biomasses_pb2,
    get_initial_fishing_mortalities_pb2,
    get_protocol_version_pb2,
    get_scenario_names_pb2,
    get_simulation_contract_pb2,
    get_simulation_statuses_pb2,
    regulation_definition_pb2,
    remove_experiment_pb2,
    species_pb2,
    submit_experiment_pb2,
)

from surimi_backend.integrations.controller.base import (
    ControllerError,
    ControllerTimeoutError,
    ControllerUnavailableError,
    ExperimentSubmission,
    SimulationStatus,
    SpeciesValue,
)
from surimi_backend.integrations.controller.convert import (
    message_to_dict,
    status_from_proto,
    timestamp,
)
from surimi_backend.observability import metrics

log = structlog.get_logger("surimi.controller")

R = TypeVar("R", bound=Message)

_CHANNEL_OPTIONS = [
    ("grpc.keepalive_time_ms", 30_000),
    ("grpc.keepalive_timeout_ms", 10_000),
    ("grpc.max_receive_message_length", 64 * 1024 * 1024),
]


def parse_target(url: str) -> tuple[str, bool]:
    """`https://host[:port]` → ("host:443", secure); `http://host[:port]` → ("host:80", plaintext)."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError(
            f"CONTROLLER_GRPC_URL must be http://host[:port] or https://host[:port], got {url!r} "
            "(or set CONTROLLER_MODE=fake to run without a controller)"
        )
    secure = parts.scheme == "https"
    port = parts.port or (443 if secure else 80)
    return f"{parts.hostname}:{port}", secure


class GrpcControllerClient:
    def __init__(self, url: str, *, timeout: float, read_retries: int) -> None:
        self.target, secure = parse_target(url)
        self._timeout = timeout
        self._read_retries = read_retries
        self._channel = (
            grpc.aio.secure_channel(
                self.target, grpc.ssl_channel_credentials(), options=_CHANNEL_OPTIONS
            )
            if secure
            else grpc.aio.insecure_channel(self.target, options=_CHANNEL_OPTIONS)
        )
        # The generated *_pb2_grpc module has no type hints.
        self._stub = controller_service_pb2_grpc.ControllerServiceStub(self._channel)  # type: ignore[no-untyped-call]

    async def close(self) -> None:
        await self._channel.close()

    async def _call(
        self, rpc: str, method: Callable[..., Awaitable[R]], request: Message, *, read_only: bool
    ) -> R:
        attempts = 1 + (self._read_retries if read_only else 0)
        for attempt in range(1, attempts + 1):
            start = time.perf_counter()
            try:
                response = await method(request, timeout=self._timeout)
            except grpc.aio.AioRpcError as exc:
                code = exc.code()
                metrics.CONTROLLER_RPC_DURATION.labels(rpc, code.name).observe(
                    time.perf_counter() - start
                )
                log.warning(
                    "controller.rpc_failed",
                    rpc=rpc,
                    code=code.name,
                    details=exc.details(),
                    attempt=attempt,
                    duration_ms=round((time.perf_counter() - start) * 1000, 1),
                )
                if code == grpc.StatusCode.UNAVAILABLE and attempt < attempts:
                    await asyncio.sleep(0.2 * 2 ** (attempt - 1))
                    continue
                raise _map_error(rpc, self.target, exc) from exc
            metrics.CONTROLLER_RPC_DURATION.labels(rpc, "OK").observe(time.perf_counter() - start)
            log.debug(
                "controller.rpc",
                rpc=rpc,
                duration_ms=round((time.perf_counter() - start) * 1000, 1),
            )
            return response
        raise AssertionError("unreachable")  # pragma: no cover

    async def get_protocol_version(self) -> str:
        response = await self._call(
            "GetProtocolVersion",
            self._stub.GetProtocolVersion,
            get_protocol_version_pb2.GetProtocolVersionRequest(),
            read_only=True,
        )
        return str(response.protocol_version)

    async def get_scenario_names(self) -> list[str]:
        response = await self._call(
            "GetScenarioNames",
            self._stub.GetScenarioNames,
            get_scenario_names_pb2.GetScenarioNamesRequest(),
            read_only=True,
        )
        return list(response.scenario_names)

    async def get_simulation_contract(self, scenario_name: str) -> dict[str, Any]:
        response = await self._call(
            "GetSimulationContract",
            self._stub.GetSimulationContract,
            get_simulation_contract_pb2.GetSimulationContractRequest(scenario_name=scenario_name),
            read_only=True,
        )
        return message_to_dict(response.simulation)

    async def get_initial_biomasses(self, scenario_name: str) -> list[SpeciesValue]:
        response = await self._call(
            "GetInitialBiomasses",
            self._stub.GetInitialBiomasses,
            get_initial_biomasses_pb2.GetInitialBiomassesRequest(scenario_name=scenario_name),
            read_only=True,
        )
        return [
            _species_value(b.species, b.biomass)
            for b in response.initial_biomass_summary.initial_biomasses
        ]

    async def get_initial_fishing_mortalities(self, scenario_name: str) -> list[SpeciesValue]:
        response = await self._call(
            "GetInitialFishingMortalities",
            self._stub.GetInitialFishingMortalities,
            get_initial_fishing_mortalities_pb2.GetInitialFishingMortalitiesRequest(
                scenario_name=scenario_name
            ),
            read_only=True,
        )
        return [
            _species_value(f.species, f.fishing_mortality)
            for f in response.initial_fishing_mortality_summary.initial_fishing_mortalities
        ]

    async def get_simulation_statuses(
        self, experiment_ids: Sequence[str]
    ) -> list[SimulationStatus]:
        response = await self._call(
            "GetSimulationStatuses",
            self._stub.GetSimulationStatuses,
            get_simulation_statuses_pb2.GetSimulationStatusesRequest(
                experiment_ids=list(experiment_ids)
            ),
            read_only=True,
        )
        return [status_from_proto(s) for s in response.simulation_statuses]

    async def get_all_simulation_statuses(self) -> list[SimulationStatus]:
        response = await self._call(
            "GetAllSimulationStatuses",
            self._stub.GetAllSimulationStatuses,
            get_all_simulation_statuses_pb2.GetAllSimulationStatusesRequest(),
            read_only=True,
        )
        return [status_from_proto(s) for s in response.simulation_statuses]

    async def submit_experiment(self, submission: ExperimentSubmission) -> None:
        await self._call(
            "SubmitExperiment",
            self._stub.SubmitExperiment,
            submit_request(submission),
            read_only=False,
        )

    async def remove_experiment(self, experiment_id: str) -> None:
        await self._call(
            "RemoveExperiment",
            self._stub.RemoveExperiment,
            remove_experiment_pb2.RemoveExperimentRequest(experiment_id=experiment_id),
            read_only=False,
        )


def submit_request(
    submission: ExperimentSubmission,
) -> submit_experiment_pb2.SubmitExperimentRequest:
    """The protobuf request. Biomass values are already in kg."""
    return submit_experiment_pb2.SubmitExperimentRequest(
        experiment_id=submission.experiment_id,
        scenario_name=submission.scenario_name,
        end_date_time=timestamp(submission.end_date_time),
        is_mse_run=submission.is_mse_run,
        climate_scenario=submission.climate_scenario,
        regulations_definitions_summary=regulation_definition_pb2.RegulationDefinitionsSummary(
            target_fishing_mortalities=[
                regulation_definition_pb2.TargetFishingMortality(
                    species=species_pb2.Species(
                        species_code=t.species_code, life_stage=t.life_stage
                    ),
                    biomass_limit=t.biomass_limit_kg,
                    biomass_base=t.biomass_base_kg,
                    f_max=t.f_max,
                )
                for t in submission.target_fishing_mortalities
            ]
        ),
    )


def _species_value(species: species_pb2.Species, value: float) -> SpeciesValue:
    # proto3 leaves a 0.0 out of the message; reading the field gives 0.0 back.
    return SpeciesValue(
        species_code=species.species_code,
        life_stage=species.life_stage,
        length_class=species.length_class,
        age=species.age,
        value=float(value),
    )


def _map_error(rpc: str, target: str, exc: grpc.aio.AioRpcError) -> ControllerError:
    code = exc.code()
    details = {"rpc": rpc, "grpc_code": code.name}
    if code == grpc.StatusCode.UNAVAILABLE:
        return ControllerUnavailableError(
            f"SURIMI controller at {target} is unreachable", details=details
        )
    if code == grpc.StatusCode.DEADLINE_EXCEEDED:
        return ControllerTimeoutError(
            f"SURIMI controller did not answer {rpc} in time", details=details
        )
    if code == grpc.StatusCode.UNIMPLEMENTED:
        # Also what an HTTP 404 from an ingress in front of a stopped controller becomes.
        return ControllerUnavailableError(
            f"SURIMI controller at {target} does not serve {rpc} (wrong host, or not running)",
            details=details,
        )
    return ControllerError(
        f"SURIMI controller failed {rpc}: {exc.details() or code.name}", details=details
    )
