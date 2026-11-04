"""Protobuf messages to plain Python values."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from google.protobuf import json_format
from google.protobuf.duration_pb2 import Duration
from google.protobuf.message import Message
from google.protobuf.timestamp_pb2 import Timestamp
from surimi.v1 import simulation_status_pb2

from surimi_backend.integrations.controller.base import SimulationStatus


def message_to_dict(message: Message) -> dict[str, Any]:
    """Protobuf JSON with the field names of the .proto (snake_case), so the API
    shows the same names as the protocol docs and the Bruno collection."""
    return json_format.MessageToDict(message, preserving_proto_field_name=True)


def _ts(message: Message, field: str) -> datetime | None:
    if not message.HasField(field):
        return None
    value: Timestamp = getattr(message, field)
    return value.ToDatetime(tzinfo=UTC)


def _duration(message: Message, field: str) -> timedelta | None:
    if not message.HasField(field):
        return None
    value: Duration = getattr(message, field)
    return value.ToTimedelta()


def status_from_proto(s: simulation_status_pb2.SimulationStatus) -> SimulationStatus:
    return SimulationStatus(
        simulation_id=s.simulation_id,
        experiment_id=s.experiment_id,
        scenario_name=s.scenario_name,
        status=s.status,
        start_date_time=_ts(s, "start_date_time"),
        end_date_time=_ts(s, "end_date_time"),
        simulation_started=_ts(s, "simulation_started"),
        simulation_duration=_duration(s, "simulation_duration"),
        simulation_current=_ts(s, "simulation_current"),
        ecology_host=s.ecology_host,
        order=s.order,
    )


def timestamp(value: datetime) -> Timestamp:
    ts = Timestamp()
    ts.FromDatetime(value)
    return ts
