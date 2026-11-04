import datetime

from google.protobuf import duration_pb2 as _duration_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SimulationStatus(_message.Message):
    __slots__ = ("simulation_id", "experiment_id", "scenario_name", "start_date_time", "end_date_time", "status", "simulation_started", "simulation_duration", "simulation_current", "ecology_host", "order")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    START_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    SIMULATION_STARTED_FIELD_NUMBER: _ClassVar[int]
    SIMULATION_DURATION_FIELD_NUMBER: _ClassVar[int]
    SIMULATION_CURRENT_FIELD_NUMBER: _ClassVar[int]
    ECOLOGY_HOST_FIELD_NUMBER: _ClassVar[int]
    ORDER_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    experiment_id: str
    scenario_name: str
    start_date_time: _timestamp_pb2.Timestamp
    end_date_time: _timestamp_pb2.Timestamp
    status: str
    simulation_started: _timestamp_pb2.Timestamp
    simulation_duration: _duration_pb2.Duration
    simulation_current: _timestamp_pb2.Timestamp
    ecology_host: str
    order: int
    def __init__(self, simulation_id: _Optional[str] = ..., experiment_id: _Optional[str] = ..., scenario_name: _Optional[str] = ..., start_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., status: _Optional[str] = ..., simulation_started: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., simulation_duration: _Optional[_Union[datetime.timedelta, _duration_pb2.Duration, _Mapping]] = ..., simulation_current: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., ecology_host: _Optional[str] = ..., order: _Optional[int] = ...) -> None: ...
