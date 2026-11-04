"""The real gRPC client against an in-process gRPC server that implements
`surimi.v1.ControllerService` with the same generated stubs. Checks the wire
path, retries, deadlines and error mapping without EDITO."""

from __future__ import annotations

import asyncio
from collections import Counter
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import grpc
import pytest
from surimi.v1 import (
    controller_service_pb2_grpc,
    get_protocol_version_pb2,
    get_scenario_names_pb2,
    get_simulation_contract_pb2,
    get_simulation_statuses_pb2,
    simulation_pb2,
    simulation_status_pb2,
)

from surimi_backend.integrations.controller import (
    ControllerError,
    ControllerTimeoutError,
    ControllerUnavailableError,
    GrpcControllerClient,
)
from surimi_backend.integrations.controller.convert import timestamp
from surimi_backend.integrations.controller.grpc_client import parse_target


class Servicer(controller_service_pb2_grpc.ControllerServiceServicer):
    def __init__(self) -> None:
        self.calls: Counter[str] = Counter()
        self.unavailable_left = 0
        self.delay = 0.0

    async def GetProtocolVersion(self, request, context):  # type: ignore[no-untyped-def]
        return get_protocol_version_pb2.GetProtocolVersionResponse(protocol_version="1.4.0")

    async def GetScenarioNames(self, request, context):  # type: ignore[no-untyped-def]
        self.calls["GetScenarioNames"] += 1
        if self.unavailable_left:
            self.unavailable_left -= 1
            await context.abort(grpc.StatusCode.UNAVAILABLE, "warming up")
        await asyncio.sleep(self.delay)
        return get_scenario_names_pb2.GetScenarioNamesResponse(
            scenario_names=["aegean_sea", "anchovy_bay"]
        )

    async def GetSimulationContract(self, request, context):  # type: ignore[no-untyped-def]
        if request.scenario_name != "anchovy_bay":
            await context.abort(grpc.StatusCode.INTERNAL, f"no scenario {request.scenario_name}")
        return get_simulation_contract_pb2.GetSimulationContractResponse(
            simulation=simulation_pb2.Simulation(case_study_name="anchovy_bay", time_step="P1M")
        )

    async def GetSimulationStatuses(self, request, context):  # type: ignore[no-untyped-def]
        status = simulation_status_pb2.SimulationStatus(
            simulation_id="s-1",
            experiment_id=request.experiment_ids[0],
            scenario_name="anchovy_bay",
            status="Running",
            start_date_time=timestamp(datetime(2013, 1, 1, tzinfo=UTC)),
            order=3,
        )
        status.simulation_duration.FromTimedelta(timedelta(seconds=90))
        return get_simulation_statuses_pb2.GetSimulationStatusesResponse(
            simulation_statuses=[status]
        )


@pytest.fixture
async def server() -> AsyncIterator[tuple[Servicer, str]]:
    servicer = Servicer()
    srv = grpc.aio.server()
    controller_service_pb2_grpc.add_ControllerServiceServicer_to_server(servicer, srv)  # type: ignore[no-untyped-call]
    port = srv.add_insecure_port("127.0.0.1:0")
    await srv.start()
    yield servicer, f"http://127.0.0.1:{port}"
    await srv.stop(0)


@pytest.fixture
async def empty_server() -> AsyncIterator[str]:
    """A gRPC server with no services: every call is UNIMPLEMENTED, like a
    host that is not the controller."""
    srv = grpc.aio.server()
    port = srv.add_insecure_port("127.0.0.1:0")
    await srv.start()
    yield f"http://127.0.0.1:{port}"
    await srv.stop(0)


async def test_reads_map_to_plain_values(server: tuple[Servicer, str]) -> None:
    _, url = server
    client = GrpcControllerClient(url, timeout=2, read_retries=0)
    try:
        assert await client.get_protocol_version() == "1.4.0"
        assert await client.get_scenario_names() == ["aegean_sea", "anchovy_bay"]
        assert await client.get_simulation_contract("anchovy_bay") == {
            "case_study_name": "anchovy_bay",
            "time_step": "P1M",
        }
        [status] = await client.get_simulation_statuses(["exp-1"])
        assert status.experiment_id == "exp-1"
        assert status.status == "Running"
        assert status.start_date_time == datetime(2013, 1, 1, tzinfo=UTC)
        assert status.simulation_duration == timedelta(seconds=90)
        assert status.simulation_current is None
        assert status.order == 3
    finally:
        await client.close()


async def test_unavailable_is_retried_for_reads(server: tuple[Servicer, str]) -> None:
    servicer, url = server
    servicer.unavailable_left = 2
    client = GrpcControllerClient(url, timeout=2, read_retries=2)
    try:
        assert await client.get_scenario_names() == ["aegean_sea", "anchovy_bay"]
    finally:
        await client.close()
    assert servicer.calls["GetScenarioNames"] == 3


async def test_retries_stop_and_map_to_unavailable(server: tuple[Servicer, str]) -> None:
    servicer, url = server
    servicer.unavailable_left = 10
    client = GrpcControllerClient(url, timeout=2, read_retries=2)
    try:
        with pytest.raises(ControllerUnavailableError, match="unreachable"):
            await client.get_scenario_names()
    finally:
        await client.close()
    assert servicer.calls["GetScenarioNames"] == 3


async def test_controller_error_keeps_its_message(server: tuple[Servicer, str]) -> None:
    _, url = server
    client = GrpcControllerClient(url, timeout=2, read_retries=2)
    try:
        with pytest.raises(ControllerError, match="no scenario atlantis") as info:
            await client.get_simulation_contract("atlantis")
    finally:
        await client.close()
    assert info.value.details == {"rpc": "GetSimulationContract", "grpc_code": "INTERNAL"}


async def test_deadline_maps_to_timeout(server: tuple[Servicer, str]) -> None:
    servicer, url = server
    servicer.delay = 1.0
    client = GrpcControllerClient(url, timeout=0.2, read_retries=0)
    try:
        with pytest.raises(ControllerTimeoutError):
            await client.get_scenario_names()
    finally:
        await client.close()


async def test_a_host_without_the_service_is_unavailable(empty_server: str) -> None:
    client = GrpcControllerClient(empty_server, timeout=2, read_retries=2)
    try:
        with pytest.raises(ControllerUnavailableError, match="does not serve GetScenarioNames"):
            await client.get_scenario_names()
    finally:
        await client.close()


async def test_nothing_listening_is_unavailable() -> None:
    # Generous deadline: on Windows a refused localhost connection takes ~2 s.
    client = GrpcControllerClient("http://127.0.0.1:1", timeout=5, read_retries=0)
    try:
        with pytest.raises(ControllerUnavailableError):
            await client.get_protocol_version()
    finally:
        await client.close()


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "https://project-surimi-surimi-controller.lab.dive.edito.eu",
            ("project-surimi-surimi-controller.lab.dive.edito.eu:443", True),
        ),
        ("https://controller:8443", ("controller:8443", True)),
        ("http://controller", ("controller:80", False)),
        ("http://127.0.0.1:50051/", ("127.0.0.1:50051", False)),
    ],
)
def test_parse_target(url: str, expected: tuple[str, bool]) -> None:
    assert parse_target(url) == expected


@pytest.mark.parametrize("url", ["", "controller:443", "grpc://controller", "https://"])
def test_parse_target_rejects_unusable_urls(url: str) -> None:
    with pytest.raises(ValueError, match="CONTROLLER_GRPC_URL"):
        parse_target(url)
