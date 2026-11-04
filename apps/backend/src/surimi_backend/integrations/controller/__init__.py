"""Access to the SURIMI controller (ADR 0006)."""

from __future__ import annotations

from surimi_backend.core.config import Settings
from surimi_backend.integrations.controller.base import (
    ControllerClient,
    ControllerError,
    ControllerTimeoutError,
    ControllerUnavailableError,
    SimulationStatus,
)
from surimi_backend.integrations.controller.fake import FakeControllerClient
from surimi_backend.integrations.controller.grpc_client import GrpcControllerClient

__all__ = [
    "ControllerClient",
    "ControllerError",
    "ControllerTimeoutError",
    "ControllerUnavailableError",
    "FakeControllerClient",
    "GrpcControllerClient",
    "SimulationStatus",
    "build_controller_client",
]


def build_controller_client(settings: Settings) -> ControllerClient:
    if settings.controller_mode == "fake":
        return FakeControllerClient()
    return GrpcControllerClient(
        settings.controller_grpc_url,
        timeout=settings.controller_timeout_seconds,
        read_retries=settings.controller_read_retries,
    )
